"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  cateringEnquiries,
  categories,
  productVariants,
  products,
  storeSettings,
} from "@/server/db/schema";
import { requireAdmin, requireStaff, AuthorizationError } from "@/server/auth/session";
import {
  categoryInputSchema,
  closureSchema,
  openingHourSchema,
  productInputSchema,
  slugify,
  storeSettingsSchema,
  toFieldErrors,
  type FieldErrors,
} from "@/lib/validation";
import { uniqueSlug } from "@/server/services/catalog";
import {
  addOrderNote,
  cancelOrder,
  getOrderById,
  markOrderPaid,
  updateOrderStatus,
} from "@/server/services/orders";
import { getStoreSettings } from "@/server/services/settings";
import { addClosure, removeClosure, upsertOpeningHour } from "@/server/services/settings";
import { notifyOrderStatus, notifyPaymentConfirmed } from "@/server/services/notifications";
import { audit, logError } from "@/server/services/security";

/**
 * Admin mutations.
 *
 * Every export here starts with `requireStaff()` or `requireAdmin()`. Server
 * Actions are POST endpoints that anyone can call directly — hiding a button,
 * or guarding the layout, protects nothing on its own. The guard next to the
 * data is the control.
 *
 * `requireAdmin` is reserved for things that change money or configuration:
 * prices, settings, coupons. STAFF can run the kitchen (order statuses, notes,
 * marking something sold out) without being able to reprice the menu.
 */

export type ActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: FieldErrors;
};

/** Turns a thrown AuthorizationError into a form error rather than a 500. */
async function guard<T>(fn: () => Promise<T>): Promise<T | ActionState> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { status: "error" as const, message: error.message };
    }
    throw error;
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   ORDERS
   ══════════════════════════════════════════════════════════════════════════ */

export async function changeOrderStatus(
  orderId: string,
  nextStatus: string,
): Promise<ActionState> {
  return (await guard(async () => {
    const actor = await requireStaff();

    const valid = [
      "PENDING_PAYMENT",
      "CONFIRMED",
      "PREPARING",
      "READY_FOR_PICKUP",
      "OUT_FOR_DELIVERY",
      "COMPLETED",
      "CANCELLED",
    ] as const;

    if (!valid.includes(nextStatus as (typeof valid)[number])) {
      return { status: "error", message: "Unknown status." };
    }

    // Cancelling has to return stock, so it has its own path.
    if (nextStatus === "CANCELLED") {
      const result = await cancelOrder(orderId, "Cancelled from admin.", actor);
      if (!result.ok) return { status: "error", message: result.message };
    } else {
      const result = await updateOrderStatus(
        orderId,
        nextStatus as (typeof valid)[number],
        actor,
      );
      if (!result.ok) return { status: "error", message: result.message };
    }

    await audit({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "ORDER_STATUS_CHANGED",
      entity: "order",
      entityId: orderId,
      metadata: { to: nextStatus },
    });

    // Email the customer about the transition, best-effort.
    try {
      const [order, settings] = await Promise.all([
        getOrderById(orderId),
        getStoreSettings(),
      ]);
      if (order) void notifyOrderStatus(order, settings);
    } catch (error) {
      logError("admin.status_notify_failed", error, { orderId });
    }

    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/admin/orders");
    revalidatePath("/admin");
    return { status: "success", message: "Order updated." };
  })) as ActionState;
}

/**
 * Records that an order has been paid in the shop.
 *
 * There is no online payment, so payment status would otherwise be a field
 * nothing could ever change. Staff tick it off when they take the money at the
 * counter — or over the phone before collection.
 *
 * Deliberately one-way: there is no "mark unpaid" button, because the fix for
 * a mis-tap is a note on the order, not quietly rewriting whether the shop was
 * paid. `markOrderPaid` ignores an order that is already paid, so a double tap
 * does not write two timeline entries.
 */
export async function markOrderPaidAtCounter(
  orderId: string,
  method: string,
): Promise<ActionState> {
  return (await guard(async () => {
    const actor = await requireStaff();

    const allowed = ["counter", "cash", "card", "phone"] as const;
    const chosen = allowed.includes(method as (typeof allowed)[number])
      ? (method as (typeof allowed)[number])
      : "counter";

    const updated = await markOrderPaid(orderId, { method: chosen, actorId: actor.id });

    if (!updated) {
      // Either no such order, or it was already paid — both are safe no-ops.
      return { status: "error", message: "That order is already marked paid." };
    }

    await audit({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "ORDER_MARKED_PAID",
      entity: "order",
      entityId: orderId,
      metadata: { method: chosen },
    });

    try {
      const [order, settings] = await Promise.all([
        getOrderById(orderId),
        getStoreSettings(),
      ]);
      if (order) void notifyPaymentConfirmed(order, settings);
    } catch (error) {
      logError("admin.paid_notify_failed", error, { orderId });
    }

    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/admin/orders");
    revalidatePath("/admin");
    return { status: "success", message: "Marked as paid." };
  })) as ActionState;
}

export async function addAdminOrderNote(
  orderId: string,
  formData: FormData,
): Promise<ActionState> {
  return (await guard(async () => {
    const actor = await requireStaff();
    const body = String(formData.get("body") ?? "").trim();
    if (!body) return { status: "error", message: "Write a note first." };
    if (body.length > 2000) return { status: "error", message: "That note is too long." };

    // Internal by default — staff notes must never leak to the customer.
    const customerVisible = formData.get("customerVisible") === "on";

    await addOrderNote(orderId, body, customerVisible, actor.id);
    revalidatePath(`/admin/orders/${orderId}`);
    return { status: "success", message: "Note added." };
  })) as ActionState;
}

/* ══════════════════════════════════════════════════════════════════════════
   PRODUCTS
   ══════════════════════════════════════════════════════════════════════════ */

function parseProductForm(formData: FormData) {
  const number = (key: string, fallback = 0) => {
    const raw = formData.get(key);
    const value = Number(raw);
    return Number.isFinite(value) ? value : fallback;
  };

  /** A positive whole number of grams, or null for anything else. */
  const weightOrNull = (raw: string | undefined): number | null => {
    const value = Number.parseInt((raw ?? "").trim(), 10);
    return Number.isInteger(value) && value > 0 ? value : null;
  };

  // Variants arrive as parallel arrays from the repeating form rows.
  const names = formData.getAll("variantName").map(String);
  const ids = formData.getAll("variantId").map(String);
  const prices = formData.getAll("variantPrice").map(String);
  const skus = formData.getAll("variantSku").map(String);
  const actives = formData.getAll("variantActive").map(String);
  const tracked = formData.getAll("variantTracked").map(String);
  const stocks = formData.getAll("variantStock").map(String);
  const weights = formData.getAll("variantWeight").map(String);

  const variants = names
    .map((name, index) => {
      const dollars = Number(prices[index] ?? "0");
      return {
        id: ids[index] && ids[index] !== "new" ? ids[index] : undefined,
        name: name.trim(),
        sku: (skus[index] ?? "").trim(),
        // The form collects dollars; the database stores cents.
        price: Number.isFinite(dollars) ? Math.round(dollars * 100) : 0,
        /*
         * Blank stays null rather than becoming 0. "Not sold by weight" and
         * "weighs nothing" are different facts, and the cart total depends on
         * telling them apart.
         */
        weightGrams: weightOrNull(weights[index]),
        active: actives[index] === "on",
        inventoryTracked: tracked[index] === "on",
        stockQuantity: Number(stocks[index] ?? "0") || 0,
        minQuantity: 1,
        maxQuantity: null,
        displayOrder: index,
      };
    })
    .filter((v) => v.name.length > 0);

  return {
    name: String(formData.get("name") ?? "").trim(),
    slug: String(formData.get("slug") ?? "").trim() || undefined,
    alsoKnownAs: String(formData.get("alsoKnownAs") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    shortDescription: String(formData.get("shortDescription") ?? "").trim(),
    categoryId: String(formData.get("categoryId") ?? "") || null,
    image: String(formData.get("image") ?? "").trim(),
    featured: formData.get("featured") === "on",
    active: formData.get("active") === "on",
    available: formData.get("available") === "on",
    displayOrder: number("displayOrder"),
    allergenInfo: String(formData.get("allergenInfo") ?? "").trim(),
    dietaryInfo: String(formData.get("dietaryInfo") ?? "").trim(),
    seoTitle: String(formData.get("seoTitle") ?? "").trim(),
    seoDescription: String(formData.get("seoDescription") ?? "").trim(),
    variants,
  };
}

export async function saveProduct(
  productId: string | null,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return (await guard(async () => {
    const actor = await requireAdmin();

    const parsed = productInputSchema.safeParse(parseProductForm(formData));
    if (!parsed.success) {
      return {
        status: "error",
        message: "Please check the highlighted fields.",
        fieldErrors: toFieldErrors(parsed.error),
      };
    }
    const input = parsed.data;

    const slug = await uniqueSlug(
      "products",
      input.slug || slugify(input.name),
      productId ?? undefined,
    );

    const row = {
      name: input.name,
      slug,
      alsoKnownAs: input.alsoKnownAs || null,
      description: input.description || null,
      shortDescription: input.shortDescription || null,
      categoryId: input.categoryId || null,
      image: input.image || null,
      featured: input.featured,
      active: input.active,
      available: input.available,
      displayOrder: input.displayOrder,
      allergenInfo: input.allergenInfo || null,
      dietaryInfo: input.dietaryInfo || null,
      seoTitle: input.seoTitle || null,
      seoDescription: input.seoDescription || null,
      updatedAt: new Date(),
    };

    // The product and its variants must land together, or a half-saved
    // product could go live with no sellable size.
    const savedId = await db.transaction(async (tx) => {
      let id = productId;

      if (id) {
        await tx.update(products).set(row).where(eq(products.id, id));
      } else {
        const [created] = await tx.insert(products).values(row).returning({ id: products.id });
        id = created.id;
      }

      const keptIds: string[] = [];

      for (const variant of input.variants) {
        const values = {
          productId: id,
          name: variant.name,
          sku: variant.sku || null,
          price: variant.price,
          weightGrams: variant.weightGrams,
          active: variant.active,
          inventoryTracked: variant.inventoryTracked,
          stockQuantity: variant.stockQuantity,
          minQuantity: variant.minQuantity,
          maxQuantity: variant.maxQuantity,
          displayOrder: variant.displayOrder,
          updatedAt: new Date(),
        };

        if (variant.id) {
          await tx.update(productVariants).set(values).where(eq(productVariants.id, variant.id));
          keptIds.push(variant.id);
        } else {
          const [created] = await tx
            .insert(productVariants)
            .values(values)
            .returning({ id: productVariants.id });
          keptIds.push(created.id);
        }
      }

      // Variants removed in the form are deactivated, not deleted — historical
      // order items still point at them.
      if (keptIds.length > 0) {
        await tx
          .update(productVariants)
          .set({ active: false, updatedAt: new Date() })
          .where(
            and(
              eq(productVariants.productId, id),
              sql`${productVariants.id} NOT IN (${sql.join(
                keptIds.map((k) => sql`${k}::uuid`),
                sql`, `,
              )})`,
            ),
          );
      }

      return id;
    });

    await audit({
      actorId: actor.id,
      actorEmail: actor.email,
      action: productId ? "PRODUCT_UPDATED" : "PRODUCT_CREATED",
      entity: "product",
      entityId: savedId,
      metadata: { name: input.name, variants: input.variants.length },
    });

    revalidatePath("/admin/products");
    revalidatePath("/menu");
    revalidatePath(`/menu/${slug}`);

    return { status: "success", message: "Product saved." };
  })) as ActionState;
}

/** Fast "sold out today" toggle — the one thing a busy shop needs instantly. */
export async function toggleProductAvailability(
  productId: string,
  available: boolean,
): Promise<ActionState> {
  return (await guard(async () => {
    const actor = await requireStaff();

    await db
      .update(products)
      .set({ available, updatedAt: new Date() })
      .where(eq(products.id, productId));

    await audit({
      actorId: actor.id,
      actorEmail: actor.email,
      action: available ? "PRODUCT_AVAILABLE" : "PRODUCT_SOLD_OUT",
      entity: "product",
      entityId: productId,
    });

    revalidatePath("/admin/products");
    revalidatePath("/menu");
    return { status: "success", message: available ? "Back on the menu." : "Marked sold out." };
  })) as ActionState;
}

/**
 * Archive rather than delete.
 *
 * Order history references products. A hard delete would either cascade into
 * past orders or leave dangling rows; archiving keeps the record intact and
 * takes the product off the menu immediately.
 */
export async function archiveProduct(productId: string): Promise<ActionState> {
  return (await guard(async () => {
    const actor = await requireAdmin();

    await db
      .update(products)
      .set({ archivedAt: new Date(), active: false, updatedAt: new Date() })
      .where(eq(products.id, productId));

    await audit({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "PRODUCT_ARCHIVED",
      entity: "product",
      entityId: productId,
    });

    revalidatePath("/admin/products");
    revalidatePath("/menu");
    return { status: "success", message: "Product archived." };
  })) as ActionState;
}

export async function restoreProduct(productId: string): Promise<ActionState> {
  return (await guard(async () => {
    await requireAdmin();
    await db
      .update(products)
      .set({ archivedAt: null, active: true, updatedAt: new Date() })
      .where(eq(products.id, productId));
    revalidatePath("/admin/products");
    revalidatePath("/menu");
    return { status: "success", message: "Product restored." };
  })) as ActionState;
}

/* ══════════════════════════════════════════════════════════════════════════
   CATEGORIES
   ══════════════════════════════════════════════════════════════════════════ */

export async function saveCategory(
  categoryId: string | null,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return (await guard(async () => {
    const actor = await requireAdmin();

    const parsed = categoryInputSchema.safeParse({
      name: String(formData.get("name") ?? "").trim(),
      slug: String(formData.get("slug") ?? "").trim() || undefined,
      description: String(formData.get("description") ?? "").trim(),
      image: String(formData.get("image") ?? "").trim(),
      active: formData.get("active") === "on",
      displayOrder: Number(formData.get("displayOrder") ?? 0) || 0,
    });

    if (!parsed.success) {
      return {
        status: "error",
        message: "Please check the highlighted fields.",
        fieldErrors: toFieldErrors(parsed.error),
      };
    }

    const input = parsed.data;
    const slug = await uniqueSlug(
      "categories",
      input.slug || slugify(input.name),
      categoryId ?? undefined,
    );

    const row = {
      name: input.name,
      slug,
      description: input.description || null,
      image: input.image || null,
      active: input.active,
      displayOrder: input.displayOrder,
      updatedAt: new Date(),
    };

    if (categoryId) {
      await db.update(categories).set(row).where(eq(categories.id, categoryId));
    } else {
      await db.insert(categories).values(row);
    }

    await audit({
      actorId: actor.id,
      actorEmail: actor.email,
      action: categoryId ? "CATEGORY_UPDATED" : "CATEGORY_CREATED",
      entity: "category",
      entityId: categoryId,
      metadata: { name: input.name },
    });

    revalidatePath("/admin/categories");
    revalidatePath("/menu");
    return { status: "success", message: "Category saved." };
  })) as ActionState;
}

export async function deleteCategory(categoryId: string): Promise<ActionState> {
  return (await guard(async () => {
    const actor = await requireAdmin();

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(products)
      .where(eq(products.categoryId, categoryId));

    if (total > 0) {
      return {
        status: "error",
        message: `Move or archive the ${total} product${total === 1 ? "" : "s"} in this category first.`,
      };
    }

    await db.delete(categories).where(eq(categories.id, categoryId));
    await audit({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "CATEGORY_DELETED",
      entity: "category",
      entityId: categoryId,
    });

    revalidatePath("/admin/categories");
    revalidatePath("/menu");
    return { status: "success", message: "Category deleted." };
  })) as ActionState;
}

/* ══════════════════════════════════════════════════════════════════════════
   STORE SETTINGS
   ══════════════════════════════════════════════════════════════════════════ */

export async function saveStoreSettings(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return (await guard(async () => {
    const actor = await requireAdmin();

    const money = (key: string) => {
      const dollars = Number(String(formData.get(key) ?? "0"));
      return Number.isFinite(dollars) ? Math.round(dollars * 100) : 0;
    };
    const nullableMoney = (key: string) => {
      const raw = String(formData.get(key) ?? "").trim();
      if (!raw) return null;
      const dollars = Number(raw);
      return Number.isFinite(dollars) ? Math.round(dollars * 100) : null;
    };
    const int = (key: string, fallback: number) => {
      const value = Number(String(formData.get(key) ?? ""));
      return Number.isFinite(value) ? Math.trunc(value) : fallback;
    };

    const postcodes = String(formData.get("deliveryPostcodes") ?? "")
      .split(/[\s,]+/)
      .map((p) => p.trim())
      .filter(Boolean);

    const parsed = storeSettingsSchema.safeParse({
      businessName: String(formData.get("businessName") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim(),
      addressLine: String(formData.get("addressLine") ?? "").trim(),
      suburb: String(formData.get("suburb") ?? "").trim(),
      state: String(formData.get("state") ?? "NSW"),
      postcode: String(formData.get("postcode") ?? "").trim(),
      orderNotificationEmail: String(formData.get("orderNotificationEmail") ?? "").trim(),

      pickupEnabled: formData.get("pickupEnabled") === "on",
      deliveryEnabled: formData.get("deliveryEnabled") === "on",

      preparationLeadMinutes: int("preparationLeadMinutes", 120),
      pickupSlotMinutes: int("pickupSlotMinutes", 30),
      maxAdvanceDays: int("maxAdvanceDays", 14),
      maxOrdersPerSlot: String(formData.get("maxOrdersPerSlot") ?? "").trim()
        ? int("maxOrdersPerSlot", 10)
        : null,

      deliveryFee: money("deliveryFee"),
      deliveryMinimum: money("deliveryMinimum"),
      freeDeliveryThreshold: nullableMoney("freeDeliveryThreshold"),
      deliveryPostcodes: postcodes,

      taxEnabled: formData.get("taxEnabled") === "on",
      taxRateBasisPoints: int("taxRateBasisPoints", 1000),
      taxInclusive: formData.get("taxInclusive") === "on",
      taxLabel: String(formData.get("taxLabel") ?? "GST").trim() || "GST",

      announcementEnabled: formData.get("announcementEnabled") === "on",
      announcementText: String(formData.get("announcementText") ?? "").trim(),
      announcementLinkHref: String(formData.get("announcementLinkHref") ?? "").trim(),
      announcementLinkLabel: String(formData.get("announcementLinkLabel") ?? "").trim(),

      orderingPaused: formData.get("orderingPaused") === "on",
      orderingPausedMessage: String(formData.get("orderingPausedMessage") ?? "").trim(),
    });

    if (!parsed.success) {
      return {
        status: "error",
        message: "Please check the highlighted fields.",
        fieldErrors: toFieldErrors(parsed.error),
      };
    }

    const input = parsed.data;

    await db
      .update(storeSettings)
      .set({
        ...input,
        email: input.email || null,
        orderNotificationEmail: input.orderNotificationEmail || null,
        announcementText: input.announcementText || null,
        announcementLinkHref: input.announcementLinkHref || null,
        announcementLinkLabel: input.announcementLinkLabel || null,
        orderingPausedMessage: input.orderingPausedMessage || null,
        updatedAt: new Date(),
      })
      .where(eq(storeSettings.id, 1));

    await audit({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "SETTINGS_UPDATED",
      entity: "store_settings",
      entityId: "1",
    });

    revalidatePath("/admin/settings");
    revalidatePath("/", "layout");
    return { status: "success", message: "Settings saved." };
  })) as ActionState;
}

export async function saveOpeningHour(formData: FormData): Promise<ActionState> {
  return (await guard(async () => {
    await requireAdmin();

    const closed = formData.get("closed") === "on";
    const parsed = openingHourSchema.safeParse({
      dayOfWeek: Number(formData.get("dayOfWeek")),
      closed,
      openTime: closed ? null : String(formData.get("openTime") ?? "") || null,
      closeTime: closed ? null : String(formData.get("closeTime") ?? "") || null,
    });

    if (!parsed.success) {
      return { status: "error", message: toFieldErrors(parsed.error).openTime ?? "Invalid hours." };
    }

    await upsertOpeningHour(parsed.data);
    revalidatePath("/admin/settings");
    revalidatePath("/visit");
    return { status: "success", message: "Hours updated." };
  })) as ActionState;
}

export async function createClosure(formData: FormData): Promise<ActionState> {
  return (await guard(async () => {
    await requireAdmin();

    const parsed = closureSchema.safeParse({
      date: String(formData.get("date") ?? ""),
      reason: String(formData.get("reason") ?? "").trim(),
      closedAllDay: formData.get("closedAllDay") !== "off",
      openTime: String(formData.get("openTime") ?? "") || null,
      closeTime: String(formData.get("closeTime") ?? "") || null,
    });

    if (!parsed.success) {
      return { status: "error", message: "Choose a valid date." };
    }

    await addClosure(parsed.data);
    revalidatePath("/admin/settings");
    return { status: "success", message: "Closure added." };
  })) as ActionState;
}

export async function deleteClosure(id: string): Promise<ActionState> {
  return (await guard(async () => {
    await requireAdmin();
    await removeClosure(id);
    revalidatePath("/admin/settings");
    return { status: "success", message: "Closure removed." };
  })) as ActionState;
}

/* ══════════════════════════════════════════════════════════════════════════
   ENQUIRIES
   ══════════════════════════════════════════════════════════════════════════ */

export async function setEnquiryStatus(
  enquiryId: string,
  status: "NEW" | "IN_PROGRESS" | "CLOSED",
): Promise<ActionState> {
  return (await guard(async () => {
    await requireStaff();
    await db
      .update(cateringEnquiries)
      .set({ status })
      .where(eq(cateringEnquiries.id, enquiryId));
    revalidatePath("/admin/enquiries");
    revalidatePath("/admin");
    return { status: "success", message: "Enquiry updated." };
  })) as ActionState;
}
