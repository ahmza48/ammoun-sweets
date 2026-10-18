import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "@/server/db/schema";
import { runMigrations } from "@/server/db/migrate";
import { __setTestDatabase, type Database } from "@/server/db";

/**
 * Builds a fresh, fully-migrated PostgreSQL database for a test file and
 * installs it as the app's database.
 *
 * Every test therefore runs against real Postgres semantics — CHECK
 * constraints, partial unique indexes, row locks, genuine transaction
 * rollback — rather than a mock that would happily accept a negative price.
 */
export async function createTestDatabase(): Promise<Database> {
  const client = new PGlite();
  const db = drizzle(client, { schema, casing: "snake_case" }) as unknown as Database;
  await runMigrations(db);
  __setTestDatabase(db, "pglite");
  return db;
}

/** The minimum rows the services assume exist. */
export async function seedBaseline(db: Database) {
  await db.insert(schema.storeSettings).values({
    id: 1,
    businessName: "Ammoun Sweets",
    phone: "+61287641676",
    addressLine: "Shop 2, 972 Hume Highway",
    suburb: "Bass Hill",
    state: "NSW",
    postcode: "2197",
    pickupEnabled: true,
    deliveryEnabled: false,
    preparationLeadMinutes: 120,
    pickupSlotMinutes: 30,
    maxAdvanceDays: 14,
    deliveryFee: 0,
    deliveryMinimum: 0,
    deliveryPostcodes: [],
    taxEnabled: false,
    taxRateBasisPoints: 1000,
    taxInclusive: true,
    taxLabel: "GST",
  });

  await db.insert(schema.orderNumberSequence).values({ id: 1, current: 10000 });

  // Open every day, 09:00–22:00.
  for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
    await db.insert(schema.openingHours).values({
      dayOfWeek,
      closed: false,
      openTime: "09:00",
      closeTime: "22:00",
    });
  }
}

export async function createProduct(
  db: Database,
  options: {
    name: string;
    slug: string;
    price: number;
    variantName?: string;
    available?: boolean;
    active?: boolean;
    inventoryTracked?: boolean;
    stockQuantity?: number;
    variantActive?: boolean;
    /** Net weight of one unit. Undefined leaves it null, as piece-sold items are. */
    weightGrams?: number | null;
  },
) {
  const [product] = await db
    .insert(schema.products)
    .values({
      name: options.name,
      slug: options.slug,
      active: options.active ?? true,
      available: options.available ?? true,
    })
    .returning();

  const [variant] = await db
    .insert(schema.productVariants)
    .values({
      productId: product.id,
      name: options.variantName ?? "Half kg",
      price: options.price,
      active: options.variantActive ?? true,
      inventoryTracked: options.inventoryTracked ?? false,
      stockQuantity: options.stockQuantity ?? 0,
      weightGrams: options.weightGrams ?? null,
    })
    .returning();

  return { product, variant };
}

export { schema };
