import "server-only";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import {
  products,
  productVariants,
  type Coupon,
  type StoreSettings,
} from "@/server/db/schema";
import { percentOf, taxFromExclusive, taxFromInclusive } from "@/lib/money";
import { sumWeight } from "@/lib/weight";
import type { CartLineInput } from "@/lib/validation";

/**
 * THE pricing engine.
 *
 * Every total the customer is ever charged is produced here, from ids and
 * quantities alone. The browser sends `{ variantId, quantity }` and nothing
 * else — no prices, no subtotal, no discount. Anything a client could forge is
 * simply not part of the input.
 *
 * It is also the revalidation step: the same function that prices the cart
 * reports what changed since the customer added things (sold out, disabled,
 * repriced), so checkout can refuse and explain rather than quietly charging
 * the wrong amount.
 */

export type PricedLine = {
  variantId: string;
  productId: string;
  productName: string;
  productSlug: string;
  variantName: string;
  sku: string | null;
  image: string | null;
  unitPrice: number;
  quantity: number;
  total: number;
  /** Null when this size is not sold by weight. See src/lib/weight.ts. */
  weightGrams: number | null;
};

export type CartIssue = {
  variantId: string;
  /** Present when we know what it was called, for a readable message. */
  productName?: string;
  code:
    | "NOT_FOUND"
    | "UNAVAILABLE"
    | "OUT_OF_STOCK"
    | "INSUFFICIENT_STOCK"
    | "PRICE_CHANGED"
    | "BELOW_MIN_QUANTITY"
    | "ABOVE_MAX_QUANTITY";
  message: string;
  /** For INSUFFICIENT_STOCK / quantity bounds — what we clamped to. */
  adjustedQuantity?: number;
};

export type PricedCart = {
  lines: PricedLine[];
  issues: CartIssue[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  tax: number;
  total: number;
  /** Sum of `weightGrams * quantity` across the lines that have a weight. */
  totalWeightGrams: number;
  /**
   * How many lines had no published weight. When this is above zero the total
   * above describes only part of the order, and the UI says so.
   */
  unweighedLines: number;
  /** The coupon actually applied, after server-side validation. */
  appliedCoupon: { code: string; description: string | null } | null;
};

export type PriceCartOptions = {
  settings: StoreSettings;
  fulfilmentType?: "PICKUP" | "DELIVERY";
  coupon?: Coupon | null;
  /**
   * Prices the client last saw, keyed by variant id. Only used to report
   * PRICE_CHANGED — it never influences what is charged.
   */
  expectedPrices?: Record<string, number>;
};

/**
 * Prices a cart. Never throws on bad lines: it returns them as `issues` so the
 * caller can decide whether to show a warning (cart page) or block the order
 * (checkout).
 */
export async function priceCart(
  lines: CartLineInput[],
  options: PriceCartOptions,
): Promise<PricedCart> {
  const { settings, fulfilmentType = "PICKUP", coupon = null, expectedPrices } = options;

  const empty: PricedCart = {
    lines: [],
    issues: [],
    subtotal: 0,
    discount: 0,
    deliveryFee: 0,
    tax: 0,
    total: 0,
    totalWeightGrams: 0,
    unweighedLines: 0,
    appliedCoupon: null,
  };

  if (lines.length === 0) return empty;

  // Collapse duplicate variant ids — the client can send the same line twice.
  const wanted = new Map<string, number>();
  for (const line of lines) {
    wanted.set(line.variantId, (wanted.get(line.variantId) ?? 0) + line.quantity);
  }

  const rows = await db
    .select({ variant: productVariants, product: products })
    .from(productVariants)
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(inArray(productVariants.id, [...wanted.keys()]));

  const byVariant = new Map(rows.map((r) => [r.variant.id, r]));

  const priced: PricedLine[] = [];
  const issues: CartIssue[] = [];

  for (const [variantId, requestedQuantity] of wanted) {
    const row = byVariant.get(variantId);

    if (!row) {
      issues.push({
        variantId,
        code: "NOT_FOUND",
        message: "This item is no longer on the menu.",
      });
      continue;
    }

    const { variant, product } = row;
    const name = `${product.name} — ${variant.name}`;

    const purchasable =
      variant.active &&
      product.active &&
      product.available &&
      product.archivedAt === null;

    if (!purchasable) {
      issues.push({
        variantId,
        productName: name,
        code: "UNAVAILABLE",
        message: `${name} is not available at the moment.`,
      });
      continue;
    }

    let quantity = requestedQuantity;

    if (quantity < variant.minQuantity) {
      issues.push({
        variantId,
        productName: name,
        code: "BELOW_MIN_QUANTITY",
        message: `${name} has a minimum of ${variant.minQuantity}.`,
        adjustedQuantity: variant.minQuantity,
      });
      quantity = variant.minQuantity;
    }

    if (variant.maxQuantity !== null && quantity > variant.maxQuantity) {
      issues.push({
        variantId,
        productName: name,
        code: "ABOVE_MAX_QUANTITY",
        message: `${name} is limited to ${variant.maxQuantity} per order.`,
        adjustedQuantity: variant.maxQuantity,
      });
      quantity = variant.maxQuantity;
    }

    if (variant.inventoryTracked) {
      if (variant.stockQuantity <= 0) {
        issues.push({
          variantId,
          productName: name,
          code: "OUT_OF_STOCK",
          message: `${name} has sold out.`,
        });
        continue;
      }
      if (quantity > variant.stockQuantity) {
        issues.push({
          variantId,
          productName: name,
          code: "INSUFFICIENT_STOCK",
          message: `Only ${variant.stockQuantity} left of ${name}.`,
          adjustedQuantity: variant.stockQuantity,
        });
        quantity = variant.stockQuantity;
      }
    }

    const expected = expectedPrices?.[variantId];
    if (expected !== undefined && expected !== variant.price) {
      issues.push({
        variantId,
        productName: name,
        code: "PRICE_CHANGED",
        message: `The price of ${name} has changed.`,
      });
    }

    priced.push({
      variantId: variant.id,
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      variantName: variant.name,
      sku: variant.sku,
      image: product.image,
      unitPrice: variant.price,
      quantity,
      total: variant.price * quantity,
      weightGrams: variant.weightGrams,
    });
  }

  const subtotal = priced.reduce((sum, line) => sum + line.total, 0);

  const { discount, appliedCoupon } = applyCoupon(subtotal, coupon);
  const discountedSubtotal = Math.max(0, subtotal - discount);

  const deliveryFee =
    fulfilmentType === "DELIVERY" ? calculateDeliveryFee(discountedSubtotal, settings) : 0;

  const tax = calculateTax(discountedSubtotal + deliveryFee, settings);

  // Tax-inclusive pricing means the tax is *already inside* the line prices,
  // so it is reported for the receipt but must not be added again.
  const total = settings.taxInclusive
    ? discountedSubtotal + deliveryFee
    : discountedSubtotal + deliveryFee + tax;

  const { totalGrams, unweighedLines } = sumWeight(priced);

  return {
    lines: priced,
    issues,
    subtotal,
    discount,
    deliveryFee,
    tax,
    total,
    totalWeightGrams: totalGrams,
    unweighedLines,
    appliedCoupon,
  };
}

/** Blocking issues — the ones that must stop an order being created. */
export function blockingIssues(issues: CartIssue[]): CartIssue[] {
  return issues.filter(
    (i) => i.code === "NOT_FOUND" || i.code === "UNAVAILABLE" || i.code === "OUT_OF_STOCK",
  );
}

export function calculateDeliveryFee(subtotal: number, settings: StoreSettings): number {
  if (
    settings.freeDeliveryThreshold !== null &&
    subtotal >= settings.freeDeliveryThreshold
  ) {
    return 0;
  }
  return settings.deliveryFee;
}

export function calculateTax(amount: number, settings: StoreSettings): number {
  if (!settings.taxEnabled || settings.taxRateBasisPoints <= 0) return 0;
  return settings.taxInclusive
    ? taxFromInclusive(amount, settings.taxRateBasisPoints)
    : taxFromExclusive(amount, settings.taxRateBasisPoints);
}

/**
 * Computes the discount for an already-validated coupon.
 *
 * Validity (active, dates, usage limit) is checked in `coupons.ts` before the
 * coupon ever reaches here; this function only does the arithmetic, and caps
 * the result at the subtotal so a generous fixed-amount coupon can never
 * produce a negative order.
 */
export function applyCoupon(
  subtotal: number,
  coupon: Coupon | null,
): { discount: number; appliedCoupon: { code: string; description: string | null } | null } {
  if (!coupon || subtotal <= 0) return { discount: 0, appliedCoupon: null };
  if (subtotal < coupon.minSpend) return { discount: 0, appliedCoupon: null };

  const raw =
    coupon.discountType === "PERCENTAGE"
      ? percentOf(subtotal, coupon.discountValue)
      : coupon.discountValue;

  const discount = Math.min(raw, subtotal);
  if (discount <= 0) return { discount: 0, appliedCoupon: null };

  return {
    discount,
    appliedCoupon: { code: coupon.code, description: coupon.description },
  };
}
