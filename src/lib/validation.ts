import { z } from "zod";

/**
 * Runtime validation for everything that crosses a trust boundary.
 *
 * TypeScript types are erased at runtime — a Server Action is reachable by a
 * direct POST from anywhere, so every input is parsed here before it reaches a
 * service. These schemas are the single definition shared by the client forms
 * and the server handlers.
 */

/* ── Australian primitives ──────────────────────────────────────────────── */

export const AU_STATES = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "ACT", "NT"] as const;
export type AuState = (typeof AU_STATES)[number];

export const auStateSchema = z.enum(AU_STATES);

/** Australian postcodes are exactly four digits. */
export const postcodeSchema = z
  .string()
  .trim()
  .regex(/^\d{4}$/, "Enter a 4-digit Australian postcode");

/**
 * Accepts the shapes Australians actually type — 02 8764 1676,
 * (02) 8764 1676, 0412 345 678, +61 2 8764 1676 — and normalises to E.164.
 */
export const phoneSchema = z
  .string()
  .trim()
  .min(6, "Enter a phone number")
  .max(32)
  .refine((v) => /^[\d\s()+-]+$/.test(v), "Enter a valid phone number")
  .transform(normalisePhone)
  .refine((v) => v !== null, "Enter a valid Australian phone number")
  .transform((v) => v as string);

export function normalisePhone(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, "");
  if (digits.startsWith("+61")) {
    const rest = digits.slice(3).replace(/^0/, "");
    return rest.length === 9 ? `+61${rest}` : null;
  }
  if (digits.startsWith("61") && digits.length === 11) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 10) return `+61${digits.slice(1)}`;
  // Local landline without an area code is ambiguous — reject rather than guess.
  return null;
}

/**
 * "+61287641676" → "(02) 8764 1676", "+61412345678" → "0412 345 678".
 *
 * Mobiles and landlines are grouped differently in Australia: mobiles read as
 * 4-3-3, landlines as an area code plus 4-4. Using one pattern for both
 * produces "041234 5678", which nobody writes.
 */
export function formatAuPhone(e164: string): string {
  const m = /^\+61(\d{9})$/.exec(e164);
  if (!m) return e164;

  const digits = m[1];
  const isMobile = digits.startsWith("4") || digits.startsWith("5");

  return isMobile
    ? `0${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
    : `(0${digits.slice(0, 1)}) ${digits.slice(1, 5)} ${digits.slice(5)}`;
}

export const emailSchema = z
  .string()
  .trim()
  .min(3)
  .max(255)
  .pipe(z.email("Enter a valid email address"))
  .transform((v) => v.toLowerCase());

export const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens");

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200);
}

/** YYYY-MM-DD, validated as a real calendar date. */
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date")
  .refine((v) => {
    const d = new Date(`${v}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, "Choose a valid date");

export const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Choose a time");

/* ── Cart ───────────────────────────────────────────────────────────────── */

/**
 * The client only ever sends variant ids and quantities. Prices are never
 * accepted from the browser — they are looked up server-side at checkout.
 */
export const cartLineSchema = z.object({
  variantId: z.uuid(),
  quantity: z.number().int().min(1).max(99),
});

export const cartSchema = z.object({
  lines: z.array(cartLineSchema).max(50),
});

export type CartLineInput = z.infer<typeof cartLineSchema>;

/* ── Checkout ───────────────────────────────────────────────────────────── */

export const fulfilmentSchema = z.discriminatedUnion("fulfilmentType", [
  z.object({
    fulfilmentType: z.literal("PICKUP"),
    pickupDate: isoDateSchema,
    pickupTime: timeSchema,
  }),
  z.object({
    fulfilmentType: z.literal("DELIVERY"),
    address1: z.string().trim().min(3, "Enter a street address").max(200),
    address2: z.string().trim().max(200).optional().or(z.literal("")),
    suburb: z.string().trim().min(2, "Enter a suburb").max(120),
    state: auStateSchema,
    postcode: postcodeSchema,
  }),
]);

export const checkoutSchema = z.object({
  firstName: z.string().trim().min(1, "Enter your first name").max(100),
  lastName: z.string().trim().min(1, "Enter your last name").max(100),
  email: emailSchema,
  phone: phoneSchema,
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  couponCode: z.string().trim().max(64).optional().or(z.literal("")),
  fulfilment: fulfilmentSchema,
  cart: cartSchema,
  /** Stops a double-clicked submit becoming two orders. */
  idempotencyKey: z.string().trim().min(8).max(100),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

/* ── Auth ───────────────────────────────────────────────────────────────── */

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password").max(200),
});

/**
 * 12 characters minimum, matching current NIST guidance: length beats forced
 * character classes, which mostly produce `Password1!`.
 */
export const passwordSchema = z
  .string()
  .min(12, "Use at least 12 characters")
  .max(200, "That password is too long");

export const registerSchema = z.object({
  firstName: z.string().trim().min(1, "Enter your first name").max(100),
  lastName: z.string().trim().min(1, "Enter your last name").max(100),
  email: emailSchema,
  phone: phoneSchema.optional(),
  password: passwordSchema,
});

/* ── Admin: catalogue ───────────────────────────────────────────────────── */

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1, "Enter a name").max(120),
  slug: slugSchema.optional(),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  image: z.string().trim().max(500).optional().or(z.literal("")),
  active: z.boolean().default(true),
  displayOrder: z.number().int().min(0).max(9999).default(0),
});

export const variantInputSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1, "Enter a size, e.g. Half kg").max(120),
  sku: z.string().trim().max(64).optional().or(z.literal("")),
  /** Cents. The admin form parses the dollar input before it gets here. */
  price: z.number().int().min(0, "Price cannot be negative").max(10_000_00),
  /**
   * Grams. Null means the size is not sold by weight, which is different from
   * zero — the cart adds these up and tells the customer what their order
   * weighs, so an invented figure would be a claim about the product.
   * Ceiling of 50 kg catches a stray extra digit before it reaches the shop
   * floor as "500 kg of baklava".
   */
  weightGrams: z.number().int().min(1).max(50_000).nullable().default(null),
  active: z.boolean().default(true),
  inventoryTracked: z.boolean().default(false),
  stockQuantity: z.number().int().min(0, "Stock cannot be negative").max(1_000_000).default(0),
  minQuantity: z.number().int().min(1).max(99).default(1),
  maxQuantity: z.number().int().min(1).max(999).nullable().default(null),
  displayOrder: z.number().int().min(0).max(999).default(0),
});

export const productInputSchema = z.object({
  name: z.string().trim().min(1, "Enter a product name").max(200),
  slug: slugSchema.optional(),
  alsoKnownAs: z.string().trim().max(200).optional().or(z.literal("")),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  shortDescription: z.string().trim().max(500).optional().or(z.literal("")),
  categoryId: z.uuid().nullable().optional(),
  image: z.string().trim().max(500).optional().or(z.literal("")),
  featured: z.boolean().default(false),
  active: z.boolean().default(true),
  available: z.boolean().default(true),
  displayOrder: z.number().int().min(0).max(9999).default(0),
  allergenInfo: z.string().trim().max(2000).optional().or(z.literal("")),
  dietaryInfo: z.string().trim().max(2000).optional().or(z.literal("")),
  seoTitle: z.string().trim().max(200).optional().or(z.literal("")),
  seoDescription: z.string().trim().max(500).optional().or(z.literal("")),
  variants: z.array(variantInputSchema).min(1, "Add at least one size"),
});

export type ProductInput = z.infer<typeof productInputSchema>;
export type VariantInput = z.infer<typeof variantInputSchema>;

/* ── Admin: settings ────────────────────────────────────────────────────── */

export const storeSettingsSchema = z.object({
  businessName: z.string().trim().min(1).max(200),
  email: emailSchema.optional().or(z.literal("")),
  phone: phoneSchema,
  addressLine: z.string().trim().min(1).max(200),
  suburb: z.string().trim().min(1).max(120),
  state: auStateSchema,
  postcode: postcodeSchema,
  orderNotificationEmail: emailSchema.optional().or(z.literal("")),

  pickupEnabled: z.boolean(),
  deliveryEnabled: z.boolean(),

  preparationLeadMinutes: z.number().int().min(0).max(60 * 24 * 7),
  pickupSlotMinutes: z.number().int().min(5).max(240),
  maxAdvanceDays: z.number().int().min(1).max(120),
  maxOrdersPerSlot: z.number().int().min(1).max(500).nullable(),

  deliveryFee: z.number().int().min(0).max(1_000_00),
  deliveryMinimum: z.number().int().min(0).max(10_000_00),
  freeDeliveryThreshold: z.number().int().min(0).max(10_000_00).nullable(),
  deliveryPostcodes: z.array(postcodeSchema).max(500),

  taxEnabled: z.boolean(),
  taxRateBasisPoints: z.number().int().min(0).max(10_000),
  taxInclusive: z.boolean(),
  taxLabel: z.string().trim().min(1).max(32),

  announcementEnabled: z.boolean(),
  announcementText: z.string().trim().max(300).optional().or(z.literal("")),
  announcementLinkHref: z.string().trim().max(300).optional().or(z.literal("")),
  announcementLinkLabel: z.string().trim().max(100).optional().or(z.literal("")),

  orderingPaused: z.boolean(),
  orderingPausedMessage: z.string().trim().max(300).optional().or(z.literal("")),
});

export const openingHourSchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    closed: z.boolean(),
    openTime: timeSchema.nullable(),
    closeTime: timeSchema.nullable(),
  })
  .refine((v) => v.closed || (v.openTime !== null && v.closeTime !== null), {
    message: "Set both an opening and a closing time",
    path: ["openTime"],
  })
  .refine((v) => v.closed || !v.openTime || !v.closeTime || v.openTime < v.closeTime, {
    message: "Closing time must be after opening time",
    path: ["closeTime"],
  });

export const closureSchema = z.object({
  date: isoDateSchema,
  reason: z.string().trim().max(200).optional().or(z.literal("")),
  closedAllDay: z.boolean().default(true),
  openTime: timeSchema.nullable().optional(),
  closeTime: timeSchema.nullable().optional(),
});

export const couponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3, "Codes need at least 3 characters")
      .max(64)
      .regex(/^[A-Za-z0-9_-]+$/, "Letters, numbers, hyphens and underscores only"),
    description: z.string().trim().max(300).optional().or(z.literal("")),
    discountType: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]),
    discountValue: z.number().int().min(1),
    minSpend: z.number().int().min(0).max(10_000_00).default(0),
    usageLimit: z.number().int().min(1).max(1_000_000).nullable().default(null),
    startsAt: z.string().optional().nullable(),
    expiresAt: z.string().optional().nullable(),
    active: z.boolean().default(true),
  })
  .refine((v) => v.discountType !== "PERCENTAGE" || v.discountValue <= 100, {
    message: "A percentage discount cannot exceed 100",
    path: ["discountValue"],
  });

/* ── Catering enquiry ───────────────────────────────────────────────────── */

export const cateringEnquirySchema = z
  .object({
    name: z.string().trim().min(1, "Enter your name").max(200),
    email: emailSchema.optional().or(z.literal("")),
    phone: phoneSchema.optional().or(z.literal("")),
    eventDate: isoDateSchema.optional().or(z.literal("")),
    guests: z.number().int().min(1).max(100_000).nullable().optional(),
    occasion: z.string().trim().max(120).optional().or(z.literal("")),
    message: z.string().trim().max(2000).optional().or(z.literal("")),
    /** Honeypot — real people leave it empty. */
    website: z.string().max(0).optional().or(z.literal("")),
  })
  .refine((v) => Boolean(v.email) || Boolean(v.phone), {
    message: "Give us either an email or a phone number so we can reply",
    path: ["email"],
  });

export type CateringEnquiryInput = z.infer<typeof cateringEnquirySchema>;

/* ── Helpers ────────────────────────────────────────────────────────────── */

export type FieldErrors = Record<string, string>;

/** Flattens a ZodError into `{ fieldPath: firstMessage }` for form rendering. */
export function toFieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
