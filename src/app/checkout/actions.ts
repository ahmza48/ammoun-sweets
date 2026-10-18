"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { checkoutSchema, toFieldErrors, type FieldErrors } from "@/lib/validation";
import { getSession } from "@/server/auth/session";
import { getOrderById, createOrder } from "@/server/services/orders";
import { blockingIssues, priceCart, type CartIssue } from "@/server/services/pricing";
import { validateCoupon, redeemCoupon } from "@/server/services/coupons";
import {
  isOrderingOpen,
  validateDelivery,
  validatePickupSlot,
} from "@/server/services/fulfilment";
import { getStoreSettings } from "@/server/services/settings";
import { notifyOrderReceived, notifyShopNewOrder } from "@/server/services/notifications";
import { env } from "@/server/env";
import { clientIp, logError, logInfo, rateLimit } from "@/server/services/security";

/**
 * Checkout.
 *
 * ── The security boundary ─────────────────────────────────────────────────
 * This action is reachable by a direct POST, not only through our own form, so
 * it re-derives everything that matters:
 *
 *   · the cart is re-priced from variant ids (`priceCart`) — submitted prices
 *     are not part of the input at all;
 *   · the coupon is re-validated and its value read from the database;
 *   · the pickup slot is re-checked against live availability;
 *   · the delivery postcode is re-checked against the admin's allowed list,
 *     and the fee recomputed.
 *
 * Only after all of that is an order written, inside one transaction, with an
 * idempotency key so a double submit returns the first order rather than
 * creating a second.
 */

export type CheckoutState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: FieldErrors;
  issues?: CartIssue[];
  order?: {
    id: string;
    orderNumber: string;
    email: string;
    total: number;
  };
};

const ORDER_ACCESS_COOKIE = "ammoun_last_order";

/**
 * Assembles the checkout object from individual form fields.
 *
 * Only the cart travels as JSON, because it is genuinely a list; everything
 * else is a normal named input, which means the form degrades sensibly and
 * there is no hidden field to drift out of sync with what the customer typed.
 * The result is still handed to Zod — this function shapes, it does not trust.
 */
function readCheckoutForm(formData: FormData): unknown | null {
  const text = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" ? value : "";
  };

  let lines: unknown = [];
  try {
    lines = JSON.parse(text("cart") || "[]");
  } catch {
    return null;
  }

  const fulfilmentType = text("fulfilmentType") === "DELIVERY" ? "DELIVERY" : "PICKUP";

  return {
    firstName: text("firstName"),
    lastName: text("lastName"),
    email: text("email"),
    phone: text("phone"),
    notes: text("notes"),
    couponCode: text("couponCode"),
    idempotencyKey: text("idempotencyKey"),
    cart: { lines },
    fulfilment:
      fulfilmentType === "PICKUP"
        ? {
            fulfilmentType: "PICKUP" as const,
            pickupDate: text("pickupDate"),
            pickupTime: text("pickupTime"),
          }
        : {
            fulfilmentType: "DELIVERY" as const,
            address1: text("address1"),
            address2: text("address2"),
            suburb: text("suburb"),
            state: text("state"),
            postcode: text("postcode"),
          },
  };
}

export async function submitCheckout(
  _previous: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const ip = await clientIp();
  const limit = await rateLimit(`checkout:${ip}`, env.limits.checkoutPerIp, 60 * 10);
  if (!limit.allowed) {
    return {
      status: "error",
      message: `Too many attempts. Please wait ${Math.ceil(limit.retryAfterSeconds / 60)} minutes and try again.`,
    };
  }

  const raw = readCheckoutForm(formData);
  if (!raw) {
    return { status: "error", message: "We couldn't read your order. Please try again." };
  }

  const parsed = checkoutSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please check the highlighted fields.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }
  const input = parsed.data;

  try {
    const settings = await getStoreSettings();

    const ordering = await isOrderingOpen(settings);
    if (!ordering.open) return { status: "error", message: ordering.message };

    if (input.cart.lines.length === 0) {
      return { status: "error", message: "Your cart is empty." };
    }

    // ── Re-price from ids. Nothing the client sent about money is used. ──
    const fulfilmentType = input.fulfilment.fulfilmentType;
    const provisional = await priceCart(input.cart.lines, { settings, fulfilmentType });

    if (blockingIssues(provisional.issues).length > 0) {
      return {
        status: "error",
        message: "Some items are no longer available.",
        issues: provisional.issues,
      };
    }

    // ── Coupon: value read from the database, never from the request. ────
    let coupon = null;
    if (input.couponCode) {
      const check = await validateCoupon(input.couponCode, provisional.subtotal);
      if (!check.ok) {
        return {
          status: "error",
          message: check.message,
          fieldErrors: { couponCode: check.message },
        };
      }
      coupon = check.coupon;
    }

    // ── Fulfilment, re-validated against live rules ──────────────────────
    if (input.fulfilment.fulfilmentType === "PICKUP") {
      const slot = await validatePickupSlot(
        input.fulfilment.pickupDate,
        input.fulfilment.pickupTime,
        settings,
      );
      if (!slot.ok) {
        return {
          status: "error",
          message: slot.message,
          fieldErrors: { "fulfilment.pickupTime": slot.message },
        };
      }
    } else {
      const delivery = validateDelivery(
        input.fulfilment.postcode,
        provisional.subtotal,
        settings,
      );
      if (!delivery.ok) {
        return {
          status: "error",
          message: delivery.message,
          fieldErrors: { "fulfilment.postcode": delivery.message },
        };
      }
    }

    // Final authoritative pricing, now including the validated coupon.
    const cart = await priceCart(input.cart.lines, { settings, fulfilmentType, coupon });

    if (blockingIssues(cart.issues).length > 0) {
      return {
        status: "error",
        message: "Some items are no longer available.",
        issues: cart.issues,
      };
    }

    const session = await getSession();

    const created = await createOrder({
      cart,
      customer: {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        userId: session?.id ?? null,
      },
      fulfilment:
        input.fulfilment.fulfilmentType === "PICKUP"
          ? {
              type: "PICKUP",
              pickupDate: input.fulfilment.pickupDate,
              pickupTime: input.fulfilment.pickupTime,
            }
          : {
              type: "DELIVERY",
              address1: input.fulfilment.address1,
              address2: input.fulfilment.address2 || null,
              suburb: input.fulfilment.suburb,
              state: input.fulfilment.state,
              postcode: input.fulfilment.postcode,
            },
      notes: input.notes || null,
      idempotencyKey: input.idempotencyKey,
      // Paid in the shop on collection; there is no online gateway.
      paymentProvider: "counter",
    });

    if (!created.ok) return { status: "error", message: created.message };

    const order = created.order;

    // A replayed submit returns the original order without re-charging,
    // re-redeeming the coupon or re-sending the confirmation email.
    if (created.reused) {
      logInfo("checkout.idempotent_replay", { orderNumber: order.orderNumber });
      await rememberOrderAccess(order.orderNumber, order.email);
      return {
        status: "success",
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          email: order.email,
          total: order.total,
        },
      };
    }

    if (coupon) await redeemCoupon(coupon.id);

    // Notifications are fire-and-forget: a mail outage must not stop the
    // customer seeing the confirmation for an order that is already saved.
    const full = await getOrderById(order.id);
    if (full) {
      void notifyOrderReceived(full, settings);
      void notifyShopNewOrder(full, settings);
    }

    await rememberOrderAccess(order.orderNumber, order.email);

    logInfo("checkout.order_created", {
      orderNumber: order.orderNumber,
      total: order.total,
      fulfilment: order.fulfilmentType,
    });

    return {
      status: "success",
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        email: order.email,
        total: order.total,
      },
    };
  } catch (error) {
    logError("checkout.failed", error);
    // Never surface a stack trace or a database message to a customer.
    return {
      status: "error",
      message: "Something went wrong placing your order. Please try again, or call the shop.",
    };
  }
}

/**
 * Lets the confirmation page open without the customer typing their email.
 *
 * Short-lived and httpOnly, and it only names an order — `getOrderForCustomer`
 * still matches the email, so this is a convenience, not the authorisation.
 */
async function rememberOrderAccess(orderNumber: string, email: string) {
  const store = await cookies();
  store.set(ORDER_ACCESS_COOKIE, JSON.stringify({ orderNumber, email }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function readOrderAccess(): Promise<{ orderNumber: string; email: string } | null> {
  const store = await cookies();
  const raw = store.get(ORDER_ACCESS_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = z
      .object({ orderNumber: z.string().max(32), email: z.string().max(255) })
      .safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/* ── Cart-page helpers ──────────────────────────────────────────────────── */

export type CouponPreview =
  | { ok: true; code: string; description: string | null; discount: number }
  | { ok: false; message: string };

export async function previewCoupon(
  code: string,
  lines: { variantId: string; quantity: number }[],
): Promise<CouponPreview> {
  const ip = await clientIp();
  // A coupon code is a short secret, so this endpoint is a brute-force target.
  const limit = await rateLimit(`coupon:${ip}`, 20, 60 * 5);
  if (!limit.allowed) {
    return { ok: false, message: "Too many attempts. Please try again shortly." };
  }

  try {
    const settings = await getStoreSettings();
    const priced = await priceCart(lines, { settings });
    const check = await validateCoupon(code, priced.subtotal);
    if (!check.ok) return { ok: false, message: check.message };

    const withCoupon = await priceCart(lines, { settings, coupon: check.coupon });
    return {
      ok: true,
      code: check.coupon.code,
      description: check.coupon.description,
      discount: withCoupon.discount,
    };
  } catch (error) {
    logError("coupon.preview_failed", error);
    return { ok: false, message: "We couldn't check that code. Please try again." };
  }
}

/**
 * Authoritative cart pricing for the cart and checkout pages.
 *
 * The client renders its own optimistic totals from localStorage for speed;
 * this is what it reconciles against, and what surfaces "sold out" or "price
 * changed" before the customer reaches the payment step.
 */
export async function repriceCart(lines: { variantId: string; quantity: number }[]) {
  const settings = await getStoreSettings();
  const priced = await priceCart(lines, { settings });
  return {
    lines: priced.lines,
    issues: priced.issues,
    subtotal: priced.subtotal,
    total: priced.total,
  };
}
