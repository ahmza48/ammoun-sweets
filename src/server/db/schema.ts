import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * AMMOUN SWEETS — database schema (PostgreSQL via Drizzle).
 *
 * ── Money ─────────────────────────────────────────────────────────────────
 * Every monetary column is an INTEGER of cents (AUD $30.00 → 3000). No
 * floats anywhere: `0.1 + 0.2 !== 0.3` is not something a shop's books should
 * ever have to care about. `src/lib/money.ts` owns the formatting.
 *
 * ── Order immutability ────────────────────────────────────────────────────
 * `order_items` snapshots the product name, variant name, SKU and unit price
 * at the moment of purchase, and its foreign keys are ON DELETE SET NULL. An
 * order from last year must still show what the customer actually paid even
 * after the product is renamed, repriced or archived.
 *
 * ── Constraints ───────────────────────────────────────────────────────────
 * Non-negative money, non-negative stock, unique slugs/SKUs/order numbers and
 * the foreign keys are all enforced in the database, not just in Zod. The app
 * is not the only thing that will ever touch this data.
 */

/* ══════════════════════════════════════════════════════════════════════════
   ENUMS
   ══════════════════════════════════════════════════════════════════════════ */

export const userRoleEnum = pgEnum("user_role", ["ADMIN", "STAFF", "CUSTOMER"]);

export const fulfilmentTypeEnum = pgEnum("fulfilment_type", [
  "PICKUP",
  "DELIVERY",
]);

/**
 * Payment state and fulfilment state are deliberately separate columns. An
 * order can be PAID but still PREPARING, or COMPLETED but REFUNDED. Folding
 * them into one field is the classic mistake that makes reporting impossible.
 */
export const paymentStatusEnum = pgEnum("payment_status", [
  "PENDING",
  "PAID",
  "FAILED",
  "CANCELLED",
  "PARTIALLY_REFUNDED",
  "REFUNDED",
]);

/**
 * `PENDING_PAYMENT` is retained but never set. Nothing takes payment online,
 * so a placed order starts CONFIRMED. Removing a value from a PostgreSQL enum
 * means rebuilding the type and every column using it, which is not worth it
 * for a value no code writes.
 */
export const orderStatusEnum = pgEnum("order_status", [
  "PENDING_PAYMENT",
  "CONFIRMED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
  "COMPLETED",
  "CANCELLED",
]);

export const discountTypeEnum = pgEnum("discount_type", [
  "PERCENTAGE",
  "FIXED_AMOUNT",
]);

export const enquiryStatusEnum = pgEnum("enquiry_status", [
  "NEW",
  "IN_PROGRESS",
  "CLOSED",
]);

/* ══════════════════════════════════════════════════════════════════════════
   USERS, SESSIONS
   ══════════════════════════════════════════════════════════════════════════ */

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull(),
    /** scrypt hash — see src/server/auth/password.ts. Null for guest-derived records. */
    passwordHash: text("password_hash"),
    firstName: varchar("first_name", { length: 100 }),
    lastName: varchar("last_name", { length: 100 }),
    phone: varchar("phone", { length: 32 }),
    role: userRoleEnum("role").notNull().default("CUSTOMER"),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    /** Populated by the login rate limiter; cleared on a successful login. */
    failedLoginCount: integer("failed_login_count").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Case-insensitive uniqueness: Ammoun@x.com and ammoun@x.com are one person.
    uniqueIndex("users_email_lower_key").on(sql`lower(${t.email})`),
    index("users_phone_idx").on(t.phone),
    index("users_role_idx").on(t.role),
  ],
);

/**
 * Opaque server-side sessions. The cookie carries a random id; everything
 * authoritative lives here, so revoking a session is a DELETE rather than
 * waiting for a JWT to expire.
 */
export const sessions = pgTable(
  "sessions",
  {
    /** SHA-256 of the cookie token — a leaked DB dump can't be replayed as a login. */
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    ipAddress: varchar("ip_address", { length: 64 }),
    userAgent: text("user_agent"),
  },
  (t) => [
    index("sessions_user_id_idx").on(t.userId),
    index("sessions_expires_at_idx").on(t.expiresAt),
  ],
);

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: text("id").primaryKey(), // SHA-256 of the emailed token
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("password_reset_tokens_user_id_idx").on(t.userId)],
);

/* ══════════════════════════════════════════════════════════════════════════
   CATALOGUE
   ══════════════════════════════════════════════════════════════════════════ */

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 140 }).notNull().unique(),
    description: text("description"),
    /** Key into the image registry, or an uploaded storage path. */
    image: text("image"),
    active: boolean("active").notNull().default(true),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("categories_active_order_idx").on(t.active, t.displayOrder)],
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 220 }).notNull().unique(),
    /** Arabic / transliterated alternate name, shown as a subtitle. */
    alsoKnownAs: varchar("also_known_as", { length: 200 }),
    description: text("description"),
    shortDescription: text("short_description"),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    image: text("image"),
    /** Extra gallery images, as an ordered array of registry keys / paths. */
    additionalImages: jsonb("additional_images").$type<string[]>().notNull().default([]),
    featured: boolean("featured").notNull().default(false),
    /** `active` = published at all. `available` = in stock today. */
    active: boolean("active").notNull().default(true),
    available: boolean("available").notNull().default(true),
    /**
     * Soft delete. Archived products vanish from the shop but stay joinable
     * from historical orders.
     */
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    displayOrder: integer("display_order").notNull().default(0),
    /**
     * Free-text allergen note written by the shop. NOT a structured claim —
     * we never assert gluten-free / nut-free / halal on the owner's behalf.
     */
    allergenInfo: text("allergen_info"),
    dietaryInfo: text("dietary_info"),
    seoTitle: varchar("seo_title", { length: 200 }),
    seoDescription: text("seo_description"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("products_category_idx").on(t.categoryId),
    index("products_active_idx").on(t.active, t.available),
    index("products_featured_idx").on(t.featured),
    index("products_archived_idx").on(t.archivedAt),
  ],
);

/**
 * Sizes: "Half kg", "1kg", "6 pieces", "Large tray". Price lives here, never
 * on the product — Ammoun Sweets sells almost everything by weight or count.
 */
export const productVariants = pgTable(
  "product_variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    sku: varchar("sku", { length: 64 }),
    /** AUD cents. */
    price: integer("price").notNull(),
    /**
     * Net weight in grams, or null when the size is not sold by weight
     * ("6 pieces"). Nullable on purpose: a weight nobody has measured must not
     * be guessed, because the cart adds these up and shows the customer a
     * total. Null means "we don't publish a weight for this", and the totals
     * say so rather than quietly under-reporting.
     */
    weightGrams: integer("weight_grams"),
    active: boolean("active").notNull().default(true),
    /** When false, availability is purely the active/available flags. */
    inventoryTracked: boolean("inventory_tracked").notNull().default(false),
    stockQuantity: integer("stock_quantity").notNull().default(0),
    minQuantity: integer("min_quantity").notNull().default(1),
    /** Null = no ceiling. */
    maxQuantity: integer("max_quantity"),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("product_variants_product_idx").on(t.productId),
    uniqueIndex("product_variants_sku_key").on(t.sku).where(sql`${t.sku} is not null`),
    check("product_variants_price_check", sql`${t.price} >= 0`),
    check(
      "product_variants_weight_check",
      sql`${t.weightGrams} is null or ${t.weightGrams} > 0`,
    ),
    check("product_variants_stock_check", sql`${t.stockQuantity} >= 0`),
    check("product_variants_min_qty_check", sql`${t.minQuantity} >= 1`),
    check(
      "product_variants_max_qty_check",
      sql`${t.maxQuantity} is null or ${t.maxQuantity} >= ${t.minQuantity}`,
    ),
  ],
);

/* ══════════════════════════════════════════════════════════════════════════
   ORDERS
   ══════════════════════════════════════════════════════════════════════════ */

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Customer-facing, e.g. AS-10482. Never expose the uuid or a row count. */
    orderNumber: varchar("order_number", { length: 32 }).notNull().unique(),

    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),

    // Contact details are snapshotted too — a customer can change their
    // account email without rewriting the history of past orders.
    firstName: varchar("first_name", { length: 100 }).notNull(),
    lastName: varchar("last_name", { length: 100 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 32 }).notNull(),

    // All AUD cents, all server-computed. See src/server/services/pricing.ts.
    subtotal: integer("subtotal").notNull(),
    discount: integer("discount").notNull().default(0),
    deliveryFee: integer("delivery_fee").notNull().default(0),
    tax: integer("tax").notNull().default(0),
    total: integer("total").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("AUD"),

    couponCode: varchar("coupon_code", { length: 64 }),

    fulfilmentType: fulfilmentTypeEnum("fulfilment_type").notNull(),
    /** Local shop date (Australia/Sydney), stored as YYYY-MM-DD. */
    pickupDate: varchar("pickup_date", { length: 10 }),
    /** Local shop time, stored as HH:MM. */
    pickupTime: varchar("pickup_time", { length: 5 }),

    deliveryAddress1: varchar("delivery_address1", { length: 200 }),
    deliveryAddress2: varchar("delivery_address2", { length: 200 }),
    deliverySuburb: varchar("delivery_suburb", { length: 120 }),
    deliveryState: varchar("delivery_state", { length: 3 }),
    deliveryPostcode: varchar("delivery_postcode", { length: 4 }),

    customerNotes: text("customer_notes"),

    paymentStatus: paymentStatusEnum("payment_status").notNull().default("PENDING"),
    orderStatus: orderStatusEnum("order_status").notNull().default("PENDING_PAYMENT"),

    /**
     * How the shop took the money. "counter" for cash or card in the shop,
     * which is the only way today — there is no online gateway. Kept as free
     * text rather than an enum so adding one later is not a migration.
     */
    paymentProvider: varchar("payment_provider", { length: 32 }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    refundedAmount: integer("refunded_amount").notNull().default(0),

    /**
     * Client-supplied idempotency key. The unique index is what actually stops
     * a double-clicked "Place order" from creating two orders.
     */
    idempotencyKey: varchar("idempotency_key", { length: 100 }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("orders_created_at_idx").on(t.createdAt),
    index("orders_order_status_idx").on(t.orderStatus),
    index("orders_payment_status_idx").on(t.paymentStatus),
    index("orders_email_idx").on(t.email),
    index("orders_user_idx").on(t.userId),
    index("orders_pickup_date_idx").on(t.pickupDate),
    uniqueIndex("orders_idempotency_key")
      .on(t.idempotencyKey)
      .where(sql`${t.idempotencyKey} is not null`),
    check("orders_subtotal_check", sql`${t.subtotal} >= 0`),
    check("orders_total_check", sql`${t.total} >= 0`),
    check("orders_discount_check", sql`${t.discount} >= 0`),
    check("orders_refund_check", sql`${t.refundedAmount} >= 0 and ${t.refundedAmount} <= ${t.total}`),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),

    // Nullable + SET NULL: deleting a product must never delete order history.
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    variantId: uuid("variant_id").references(() => productVariants.id, {
      onDelete: "set null",
    }),

    // The snapshot. This is what the customer bought, at the price they paid.
    productName: varchar("product_name", { length: 200 }).notNull(),
    variantName: varchar("variant_name", { length: 120 }).notNull(),
    sku: varchar("sku", { length: 64 }),
    unitPrice: integer("unit_price").notNull(),
    quantity: integer("quantity").notNull(),
    total: integer("total").notNull(),
    /**
     * Snapshotted with everything else. If the shop later corrects a tray's
     * weight, last month's receipt must still say what that order actually
     * weighed.
     */
    weightGrams: integer("weight_grams"),
  },
  (t) => [
    index("order_items_order_idx").on(t.orderId),
    check("order_items_quantity_check", sql`${t.quantity} > 0`),
    check("order_items_unit_price_check", sql`${t.unitPrice} >= 0`),
  ],
);

/** Append-only status history, shown as a timeline on the admin order page. */
export const orderEvents = pgTable(
  "order_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 64 }).notNull(),
    message: text("message").notNull(),
    /** Null for system/webhook events. */
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("order_events_order_idx").on(t.orderId, t.createdAt)],
);

export const orderNotes = pgTable(
  "order_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    /** Internal by default — staff notes must never leak to the customer. */
    customerVisible: boolean("customer_visible").notNull().default(false),
    authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("order_notes_order_idx").on(t.orderId)],
);

/* ══════════════════════════════════════════════════════════════════════════
   PROMOTIONS
   ══════════════════════════════════════════════════════════════════════════ */

export const coupons = pgTable(
  "coupons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 64 }).notNull(),
    description: text("description"),
    discountType: discountTypeEnum("discount_type").notNull(),
    /** Percent (1–100) or AUD cents, depending on discountType. */
    discountValue: integer("discount_value").notNull(),
    minSpend: integer("min_spend").notNull().default(0),
    /** Null = unlimited. */
    usageLimit: integer("usage_limit"),
    usageCount: integer("usage_count").notNull().default(0),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("coupons_code_lower_key").on(sql`lower(${t.code})`),
    check("coupons_value_check", sql`${t.discountValue} > 0`),
    check("coupons_usage_check", sql`${t.usageCount} >= 0`),
  ],
);

/* ══════════════════════════════════════════════════════════════════════════
   STORE CONFIGURATION
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Single-row settings table (id is fixed to 1). A key/value bag was the
 * alternative, but typed columns mean the admin form and the checkout read
 * the same shape and the database rejects nonsense.
 */
export const storeSettings = pgTable(
  "store_settings",
  {
    id: integer("id").primaryKey().default(1),

    businessName: varchar("business_name", { length: 200 }).notNull(),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 32 }).notNull(),
    addressLine: varchar("address_line", { length: 200 }).notNull(),
    suburb: varchar("suburb", { length: 120 }).notNull(),
    state: varchar("state", { length: 3 }).notNull(),
    postcode: varchar("postcode", { length: 4 }).notNull(),

    /** Where new-order notifications go. Falls back to `email`. */
    orderNotificationEmail: varchar("order_notification_email", { length: 255 }),

    pickupEnabled: boolean("pickup_enabled").notNull().default(true),
    deliveryEnabled: boolean("delivery_enabled").notNull().default(false),

    /** Minutes the kitchen needs before the earliest pickup slot. */
    preparationLeadMinutes: integer("preparation_lead_minutes").notNull().default(120),
    /** Minutes between offered pickup slots. */
    pickupSlotMinutes: integer("pickup_slot_minutes").notNull().default(30),
    /** How far ahead a customer may book. */
    maxAdvanceDays: integer("max_advance_days").notNull().default(14),
    /** Null = no cap. Applies per pickup slot. */
    maxOrdersPerSlot: integer("max_orders_per_slot"),

    deliveryFee: integer("delivery_fee").notNull().default(0),
    deliveryMinimum: integer("delivery_minimum").notNull().default(0),
    /** Null = never free. */
    freeDeliveryThreshold: integer("free_delivery_threshold"),
    /** Postcodes the shop will deliver to. Empty = delivery effectively off. */
    deliveryPostcodes: jsonb("delivery_postcodes").$type<string[]>().notNull().default([]),

    /**
     * GST. Australian food retail is largely GST-free, so this defaults to
     * OFF and must be confirmed with the owner's accountant before launch.
     * `taxInclusive` means listed prices already contain the tax.
     */
    taxEnabled: boolean("tax_enabled").notNull().default(false),
    taxRateBasisPoints: integer("tax_rate_basis_points").notNull().default(1000),
    taxInclusive: boolean("tax_inclusive").notNull().default(true),
    taxLabel: varchar("tax_label", { length: 32 }).notNull().default("GST"),

    announcementEnabled: boolean("announcement_enabled").notNull().default(false),
    announcementText: text("announcement_text"),
    announcementLinkHref: varchar("announcement_link_href", { length: 300 }),
    announcementLinkLabel: varchar("announcement_link_label", { length: 100 }),

    /** Shop closed to new orders entirely, regardless of hours. */
    orderingPaused: boolean("ordering_paused").notNull().default(false),
    orderingPausedMessage: text("ordering_paused_message"),

    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("store_settings_singleton", sql`${t.id} = 1`),
    check("store_settings_delivery_fee_check", sql`${t.deliveryFee} >= 0`),
    check(
      "store_settings_tax_rate_check",
      sql`${t.taxRateBasisPoints} >= 0 and ${t.taxRateBasisPoints} <= 10000`,
    ),
  ],
);

/** Regular weekly trading hours. dayOfWeek: 0 = Sunday … 6 = Saturday. */
export const openingHours = pgTable(
  "opening_hours",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dayOfWeek: integer("day_of_week").notNull(),
    /** HH:MM local. Null/null with closed=true means shut that day. */
    openTime: varchar("open_time", { length: 5 }),
    closeTime: varchar("close_time", { length: 5 }),
    closed: boolean("closed").notNull().default(false),
  },
  (t) => [
    uniqueIndex("opening_hours_day_key").on(t.dayOfWeek),
    check("opening_hours_day_check", sql`${t.dayOfWeek} between 0 and 6`),
  ],
);

/** Public holidays, one-off closures and special trading hours. */
export const storeClosures = pgTable(
  "store_closures",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** YYYY-MM-DD local. */
    date: varchar("date", { length: 10 }).notNull(),
    reason: varchar("reason", { length: 200 }),
    /** False = open but on different hours (openTime/closeTime below). */
    closedAllDay: boolean("closed_all_day").notNull().default(true),
    openTime: varchar("open_time", { length: 5 }),
    closeTime: varchar("close_time", { length: 5 }),
  },
  (t) => [uniqueIndex("store_closures_date_key").on(t.date)],
);

/* ══════════════════════════════════════════════════════════════════════════
   ENQUIRIES & AUDIT
   ══════════════════════════════════════════════════════════════════════════ */

export const cateringEnquiries = pgTable(
  "catering_enquiries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 200 }).notNull(),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 32 }),
    eventDate: varchar("event_date", { length: 10 }),
    guests: integer("guests"),
    occasion: varchar("occasion", { length: 120 }),
    message: text("message"),
    status: enquiryStatusEnum("status").notNull().default("NEW"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("catering_enquiries_status_idx").on(t.status, t.createdAt)],
);

/** Who changed what. Invaluable the first time a price is "mysteriously" wrong. */
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    actorEmail: varchar("actor_email", { length: 255 }),
    action: varchar("action", { length: 100 }).notNull(),
    entity: varchar("entity", { length: 64 }).notNull(),
    entityId: varchar("entity_id", { length: 64 }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_logs_created_idx").on(t.createdAt), index("audit_logs_entity_idx").on(t.entity, t.entityId)],
);

/** Backs the login / checkout / enquiry throttles. Swap for Redis at scale. */
export const rateLimits = pgTable("rate_limits", {
  key: varchar("key", { length: 200 }).primaryKey(),
  count: integer("count").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

/** Counter behind the human-readable order number. */
export const orderNumberSequence = pgTable("order_number_sequence", {
  id: integer("id").primaryKey().default(1),
  current: integer("current").notNull().default(10000),
});

/* ══════════════════════════════════════════════════════════════════════════
   RELATIONS
   ══════════════════════════════════════════════════════════════════════════ */

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  variants: many(productVariants),
}));

export const productVariantsRelations = relations(productVariants, ({ one }) => ({
  product: one(products, {
    fields: [productVariants.productId],
    references: [products.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  items: many(orderItems),
  events: many(orderEvents),
  notes: many(orderNotes),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
}));

export const orderEventsRelations = relations(orderEvents, ({ one }) => ({
  order: one(orders, { fields: [orderEvents.orderId], references: [orders.id] }),
}));

export const orderNotesRelations = relations(orderNotes, ({ one }) => ({
  order: one(orders, { fields: [orderNotes.orderId], references: [orders.id] }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  orders: many(orders),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

/* ══════════════════════════════════════════════════════════════════════════
   INFERRED TYPES
   ══════════════════════════════════════════════════════════════════════════ */

export type User = typeof users.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Product = typeof products.$inferSelect;
export type ProductVariant = typeof productVariants.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type OrderEvent = typeof orderEvents.$inferSelect;
export type OrderNote = typeof orderNotes.$inferSelect;
export type Coupon = typeof coupons.$inferSelect;
export type StoreSettings = typeof storeSettings.$inferSelect;
export type OpeningHour = typeof openingHours.$inferSelect;
export type StoreClosure = typeof storeClosures.$inferSelect;
export type CateringEnquiry = typeof cateringEnquiries.$inferSelect;
export type UserRole = (typeof userRoleEnum.enumValues)[number];
export type OrderStatus = (typeof orderStatusEnum.enumValues)[number];
export type PaymentStatus = (typeof paymentStatusEnum.enumValues)[number];
export type FulfilmentType = (typeof fulfilmentTypeEnum.enumValues)[number];
