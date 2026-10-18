import { eq, sql } from "drizzle-orm";
import { db } from "./index";
import { runMigrations } from "./migrate";
import {
  categories,
  openingHours,
  orderNumberSequence,
  productVariants,
  products,
  storeSettings,
  users,
} from "./schema";
import { menu as demoMenu } from "@/data/menu";
import { business } from "@/data/business";
import { hashPassword } from "@/server/auth/password";
import { slugify } from "@/lib/validation";
import { weightGramsForSize } from "@/lib/weight";

/**
 * Seeds the database from the approved demo menu.
 *
 * ── What is and isn't verified ────────────────────────────────────────────
 * The product names, descriptions and the prices that exist came from Ammoun
 * Sweets' public online ordering listing. Items whose price we never had are
 * seeded with `price: 0` and `active: false`, so they appear in the admin
 * panel for the owner to price rather than going live at a made-up number.
 * Nothing here invents a price.
 *
 * Opening hours mirror the demo's most widely listed hours and are flagged in
 * the launch checklist as needing the owner's confirmation. GST is seeded OFF
 * — Australian food retail is largely GST-free and that is an accountant's
 * call, not ours.
 *
 * Idempotent: products and categories are matched on slug, so re-running
 * updates rather than duplicating.
 */

export type SeedOptions = {
  /** Also create the first admin from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD. */
  withAdmin?: boolean;
  quiet?: boolean;
};

export type SeedResult = {
  categories: number;
  products: number;
  variants: number;
  unpricedVariants: string[];
  adminCreated: string | null;
};

/** Half-kg is the shop's default unit; "Pieces" items are sold per pack. */
function variantNameFor(size: string | undefined): string {
  if (!size) return "Each";
  if (/^half kg$/i.test(size)) return "Half kg";
  return size;
}

export async function seed(options: SeedOptions = {}): Promise<SeedResult> {
  const log = options.quiet ? () => {} : (...a: unknown[]) => console.log(...a);

  await runMigrations(db);

  /* ── Store settings ──────────────────────────────────────────────────── */

  await db
    .insert(storeSettings)
    .values({
      id: 1,
      businessName: business.name,
      phone: business.phone,
      addressLine: `${business.address.shop}, ${business.address.street}`,
      suburb: business.address.suburb,
      state: business.address.state,
      postcode: business.address.postcode,
      // No public email address has been confirmed for the business, so this
      // is deliberately left empty for the owner to fill in.
      email: null,
      orderNotificationEmail: null,
      pickupEnabled: true,
      // Delivery starts OFF: the owner has to choose their own suburbs and
      // fee before we offer it to anyone.
      deliveryEnabled: false,
      preparationLeadMinutes: 120,
      pickupSlotMinutes: 30,
      maxAdvanceDays: 14,
      maxOrdersPerSlot: null,
      deliveryFee: 0,
      deliveryMinimum: 0,
      freeDeliveryThreshold: null,
      deliveryPostcodes: [],
      taxEnabled: false,
      taxRateBasisPoints: 1000,
      taxInclusive: true,
      taxLabel: "GST",
      announcementEnabled: false,
      orderingPaused: false,
    })
    .onConflictDoNothing({ target: storeSettings.id });

  /* ── Opening hours ───────────────────────────────────────────────────── */

  for (const [index, day] of business.hours.days.entries()) {
    // business.hours.days starts on Monday; the table is 0 = Sunday.
    const dayOfWeek = (index + 1) % 7;
    await db
      .insert(openingHours)
      .values({
        dayOfWeek,
        closed: !day.open || !day.close,
        openTime: day.open ?? null,
        closeTime: day.close ?? null,
      })
      .onConflictDoNothing({ target: openingHours.dayOfWeek });
  }

  await db
    .insert(orderNumberSequence)
    .values({ id: 1, current: 10000 })
    .onConflictDoNothing({ target: orderNumberSequence.id });

  /* ── Catalogue ───────────────────────────────────────────────────────── */

  let categoryCount = 0;
  let productCount = 0;
  let variantCount = 0;
  const unpriced: string[] = [];

  for (const [categoryIndex, demoCategory] of demoMenu.entries()) {
    const categorySlug = slugify(demoCategory.name);

    const [category] = await db
      .insert(categories)
      .values({
        name: demoCategory.name,
        slug: categorySlug,
        description: demoCategory.tagline,
        image: demoCategory.image,
        active: true,
        displayOrder: categoryIndex,
      })
      .onConflictDoUpdate({
        target: categories.slug,
        set: {
          name: demoCategory.name,
          description: demoCategory.tagline,
          image: demoCategory.image,
          displayOrder: categoryIndex,
          updatedAt: new Date(),
        },
      })
      .returning();

    categoryCount++;

    for (const [productIndex, item] of demoCategory.items.entries()) {
      const productSlug = slugify(item.name);

      const [product] = await db
        .insert(products)
        .values({
          name: item.name,
          slug: productSlug,
          alsoKnownAs: item.alsoKnownAs ?? null,
          description: item.description,
          shortDescription: item.description,
          categoryId: category.id,
          image: item.image,
          featured: item.featured ?? false,
          active: true,
          available: true,
          displayOrder: productIndex,
          // A real allergen statement has to come from the shop. This is a
          // prompt to contact them, not a claim about the product.
          allergenInfo:
            "Please contact us about allergies or dietary requirements before ordering.",
        })
        .onConflictDoUpdate({
          target: products.slug,
          set: {
            name: item.name,
            alsoKnownAs: item.alsoKnownAs ?? null,
            description: item.description,
            shortDescription: item.description,
            categoryId: category.id,
            image: item.image,
            featured: item.featured ?? false,
            displayOrder: productIndex,
            updatedAt: new Date(),
          },
        })
        .returning();

      productCount++;

      const variantName = variantNameFor(item.size);
      const priceCents = item.price === null ? 0 : item.price * 100;
      const hasPrice = item.price !== null;

      if (!hasPrice) unpriced.push(`${item.name} (${variantName})`);

      const existing = await db
        .select({ id: productVariants.id })
        .from(productVariants)
        .where(
          sql`${productVariants.productId} = ${product.id} AND ${productVariants.name} = ${variantName}`,
        )
        .limit(1);

      if (existing[0]) {
        await db
          .update(productVariants)
          .set({
            price: priceCents,
            weightGrams: weightGramsForSize(item.size),
            active: hasPrice,
            updatedAt: new Date(),
          })
          .where(eq(productVariants.id, existing[0].id));
      } else {
        await db.insert(productVariants).values({
          productId: product.id,
          name: variantName,
          price: priceCents,
          weightGrams: weightGramsForSize(item.size),
          // Unpriced items stay switched off so nothing can be bought for $0.
          active: hasPrice,
          inventoryTracked: false,
          stockQuantity: 0,
          minQuantity: 1,
          maxQuantity: null,
          displayOrder: 0,
        });
      }
      variantCount++;
    }
  }

  /* ── First admin ─────────────────────────────────────────────────────── */

  let adminCreated: string | null = null;

  if (options.withAdmin) {
    const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.SEED_ADMIN_PASSWORD;

    if (!email || !password) {
      log(
        "\n  Skipped admin creation — set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD.\n" +
          "  There is deliberately no default admin account.",
      );
    } else if (password.length < 12) {
      throw new Error("SEED_ADMIN_PASSWORD must be at least 12 characters.");
    } else {
      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(sql`lower(${users.email}) = ${email}`)
        .limit(1);

      if (existing[0]) {
        await db
          .update(users)
          .set({ role: "ADMIN", passwordHash: await hashPassword(password), updatedAt: new Date() })
          .where(eq(users.id, existing[0].id));
        adminCreated = `${email} (updated)`;
      } else {
        await db.insert(users).values({
          email,
          passwordHash: await hashPassword(password),
          role: "ADMIN",
          firstName: "Ammoun",
          lastName: "Admin",
          emailVerifiedAt: new Date(),
        });
        adminCreated = email;
      }
    }
  }

  const result: SeedResult = {
    categories: categoryCount,
    products: productCount,
    variants: variantCount,
    unpricedVariants: unpriced,
    adminCreated,
  };

  log(
    `\n  Seeded ${result.categories} categories, ${result.products} products, ${result.variants} variants.`,
  );
  if (adminCreated) log(`  Admin: ${adminCreated}`);
  if (unpriced.length > 0) {
    log(
      `\n  ${unpriced.length} items have no confirmed price and are INACTIVE until the owner sets one:`,
    );
    for (const name of unpriced) log(`    · ${name}`);
  }

  return result;
}
