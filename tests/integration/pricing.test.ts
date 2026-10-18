import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createProduct, createTestDatabase, seedBaseline, schema } from "../helpers/db";
import type { Database } from "@/server/db";
import { blockingIssues, priceCart } from "@/server/services/pricing";
import { getStoreSettings, updateStoreSettings } from "@/server/services/settings";
import { validateCoupon } from "@/server/services/coupons";
import type { StoreSettings } from "@/server/db/schema";

/**
 * Server-side pricing.
 *
 * This is the boundary that makes forged client prices irrelevant, so the
 * tests are written as attacks: send ids for things that are sold out,
 * disabled, or over the stock level, and check the server re-derives the
 * truth rather than believing the request.
 */

let db: Database;
let settings: StoreSettings;

beforeAll(async () => {
  db = await createTestDatabase();
  await seedBaseline(db);
  settings = await getStoreSettings();
});

describe("priceCart", () => {
  it("prices from the database, not from the request", async () => {
    const { variant } = await createProduct(db, {
      name: "Baklava Mix",
      slug: "baklava-mix",
      price: 3000,
    });

    const cart = await priceCart([{ variantId: variant.id, quantity: 2 }], { settings });

    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0].unitPrice).toBe(3000);
    expect(cart.subtotal).toBe(6000);
    expect(cart.total).toBe(6000);
  });

  it("collapses duplicate lines for the same variant", async () => {
    const { variant } = await createProduct(db, {
      name: "Pistachio Mix",
      slug: "pistachio-mix",
      price: 3600,
    });

    const cart = await priceCart(
      [
        { variantId: variant.id, quantity: 1 },
        { variantId: variant.id, quantity: 2 },
      ],
      { settings },
    );

    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0].quantity).toBe(3);
    expect(cart.subtotal).toBe(10800);
  });

  it("reports an unknown variant instead of pricing it", async () => {
    const cart = await priceCart(
      [{ variantId: "3f2504e0-4f89-41d3-9a0c-0305e82c3301", quantity: 1 }],
      { settings },
    );

    expect(cart.lines).toHaveLength(0);
    expect(cart.subtotal).toBe(0);
    expect(cart.issues[0].code).toBe("NOT_FOUND");
    expect(blockingIssues(cart.issues)).toHaveLength(1);
  });

  it("refuses a product the shop has marked unavailable", async () => {
    const { variant } = await createProduct(db, {
      name: "Knafeh",
      slug: "knafeh-unavailable",
      price: 2600,
      available: false,
    });

    const cart = await priceCart([{ variantId: variant.id, quantity: 1 }], { settings });

    expect(cart.lines).toHaveLength(0);
    expect(cart.issues[0].code).toBe("UNAVAILABLE");
    expect(blockingIssues(cart.issues)).toHaveLength(1);
  });

  it("refuses a sold-out tracked variant and clamps a partial one", async () => {
    const soldOut = await createProduct(db, {
      name: "Namoura",
      slug: "namoura-sold-out",
      price: 2200,
      inventoryTracked: true,
      stockQuantity: 0,
    });

    const partial = await createProduct(db, {
      name: "Mafroukeh",
      slug: "mafroukeh-low",
      price: 2600,
      inventoryTracked: true,
      stockQuantity: 2,
    });

    const cart = await priceCart(
      [
        { variantId: soldOut.variant.id, quantity: 1 },
        { variantId: partial.variant.id, quantity: 10 },
      ],
      { settings },
    );

    const codes = cart.issues.map((i) => i.code);
    expect(codes).toContain("OUT_OF_STOCK");
    expect(codes).toContain("INSUFFICIENT_STOCK");

    // The sold-out line is dropped; the partial one is clamped to real stock.
    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0].quantity).toBe(2);
    expect(cart.subtotal).toBe(5200);
  });

  it("flags a price change without letting the old price win", async () => {
    const { variant } = await createProduct(db, {
      name: "Znoud",
      slug: "znoud-repriced",
      price: 2600,
    });

    const cart = await priceCart([{ variantId: variant.id, quantity: 1 }], {
      settings,
      // What the browser last saw — deliberately stale and much cheaper.
      expectedPrices: { [variant.id]: 100 },
    });

    expect(cart.issues.some((i) => i.code === "PRICE_CHANGED")).toBe(true);
    expect(cart.lines[0].unitPrice).toBe(2600);
    expect(cart.subtotal).toBe(2600);
  });
});

describe("delivery fees", () => {
  it("charges the configured fee and waives it past the free threshold", async () => {
    await updateStoreSettings({
      deliveryEnabled: true,
      deliveryFee: 800,
      freeDeliveryThreshold: 10000,
      deliveryPostcodes: ["2197"],
    });
    const withDelivery = await getStoreSettings();

    const { variant } = await createProduct(db, {
      name: "Gift Tin",
      slug: "gift-tin",
      price: 3000,
    });

    const small = await priceCart([{ variantId: variant.id, quantity: 1 }], {
      settings: withDelivery,
      fulfilmentType: "DELIVERY",
    });
    expect(small.deliveryFee).toBe(800);
    expect(small.total).toBe(3800);

    const large = await priceCart([{ variantId: variant.id, quantity: 4 }], {
      settings: withDelivery,
      fulfilmentType: "DELIVERY",
    });
    expect(large.deliveryFee).toBe(0);
    expect(large.total).toBe(12000);

    // Pickup never attracts a delivery fee.
    const pickup = await priceCart([{ variantId: variant.id, quantity: 1 }], {
      settings: withDelivery,
      fulfilmentType: "PICKUP",
    });
    expect(pickup.deliveryFee).toBe(0);

    await updateStoreSettings({
      deliveryEnabled: false,
      deliveryFee: 0,
      freeDeliveryThreshold: null,
      deliveryPostcodes: [],
    });
    settings = await getStoreSettings();
  });
});

describe("coupons", () => {
  it("applies a percentage discount computed from the database value", async () => {
    const [coupon] = await db
      .insert(schema.coupons)
      .values({
        code: "SWEET10",
        discountType: "PERCENTAGE",
        discountValue: 10,
        active: true,
      })
      .returning();

    const { variant } = await createProduct(db, {
      name: "Coupon Test",
      slug: "coupon-test",
      price: 5000,
    });

    const cart = await priceCart([{ variantId: variant.id, quantity: 2 }], {
      settings,
      coupon,
    });

    expect(cart.subtotal).toBe(10000);
    expect(cart.discount).toBe(1000);
    expect(cart.total).toBe(9000);
  });

  it("never lets a fixed discount push a total below zero", async () => {
    const [coupon] = await db
      .insert(schema.coupons)
      .values({
        code: "HUGE",
        discountType: "FIXED_AMOUNT",
        discountValue: 100000,
        active: true,
      })
      .returning();

    const { variant } = await createProduct(db, {
      name: "Small Item",
      slug: "small-item",
      price: 1000,
    });

    const cart = await priceCart([{ variantId: variant.id, quantity: 1 }], {
      settings,
      coupon,
    });

    expect(cart.discount).toBe(1000);
    expect(cart.total).toBe(0);
    expect(cart.total).toBeGreaterThanOrEqual(0);
  });

  it("rejects an expired code and one below its minimum spend", async () => {
    await db.insert(schema.coupons).values({
      code: "EXPIRED",
      discountType: "PERCENTAGE",
      discountValue: 50,
      active: true,
      expiresAt: new Date(Date.now() - 86_400_000),
    });

    await db.insert(schema.coupons).values({
      code: "BIGSPEND",
      discountType: "PERCENTAGE",
      discountValue: 20,
      active: true,
      minSpend: 20000,
    });

    expect((await validateCoupon("EXPIRED", 10000)).ok).toBe(false);
    expect((await validateCoupon("BIGSPEND", 5000)).ok).toBe(false);
    expect((await validateCoupon("BIGSPEND", 25000)).ok).toBe(true);
    // Unknown codes fail without revealing that they don't exist.
    expect((await validateCoupon("NOPE", 10000)).ok).toBe(false);
  });

  it("stops redeeming once the usage limit is reached", async () => {
    const [coupon] = await db
      .insert(schema.coupons)
      .values({
        code: "ONCE",
        discountType: "FIXED_AMOUNT",
        discountValue: 500,
        active: true,
        usageLimit: 1,
        usageCount: 0,
      })
      .returning();

    const { redeemCoupon } = await import("@/server/services/coupons");

    expect(await redeemCoupon(coupon.id)).toBe(true);
    // Second redemption must fail — the UPDATE matches no rows.
    expect(await redeemCoupon(coupon.id)).toBe(false);

    const [after] = await db
      .select()
      .from(schema.coupons)
      .where(eq(schema.coupons.id, coupon.id));
    expect(after.usageCount).toBe(1);
  });
});

describe("tax", () => {
  it("does not add tax on top when prices are tax-inclusive", async () => {
    await updateStoreSettings({
      taxEnabled: true,
      taxInclusive: true,
      taxRateBasisPoints: 1000,
    });
    const taxed = await getStoreSettings();

    const { variant } = await createProduct(db, {
      name: "Taxed Item",
      slug: "taxed-item",
      price: 1100,
    });

    const cart = await priceCart([{ variantId: variant.id, quantity: 1 }], {
      settings: taxed,
    });

    // $11.00 inclusive of 10% GST: $1.00 is tax, and the customer pays $11.00.
    expect(cart.tax).toBe(100);
    expect(cart.total).toBe(1100);

    await updateStoreSettings({ taxEnabled: false, taxInclusive: true });
    settings = await getStoreSettings();
  });
});

describe("weight totals", () => {
  it("adds up weight from the database and multiplies by quantity", async () => {
    const { variant } = await createProduct(db, {
      name: "Weighed Tray",
      slug: "weighed-tray",
      price: 3000,
      weightGrams: 500,
    });

    const cart = await priceCart([{ variantId: variant.id, quantity: 3 }], { settings });

    expect(cart.lines[0].weightGrams).toBe(500);
    expect(cart.totalWeightGrams).toBe(1500);
    expect(cart.unweighedLines).toBe(0);
  });

  it("reports piece-sold items as unweighed rather than counting them as nothing", async () => {
    const weighed = await createProduct(db, {
      name: "Weighed Half Kilo",
      slug: "weighed-half-kilo",
      price: 3000,
      weightGrams: 500,
    });
    const pieces = await createProduct(db, {
      name: "Sold By Piece",
      slug: "sold-by-piece",
      price: 600,
      variantName: "6 pieces",
      // No weight: nobody has weighed a piece, so the column stays null.
    });

    const cart = await priceCart(
      [
        { variantId: weighed.variant.id, quantity: 2 },
        { variantId: pieces.variant.id, quantity: 1 },
      ],
      { settings },
    );

    expect(cart.totalWeightGrams).toBe(1000);
    // The flag is what stops the UI presenting 1 kg as the whole order's weight.
    expect(cart.unweighedLines).toBe(1);
  });

  it("is zero for an empty cart", async () => {
    const cart = await priceCart([], { settings });
    expect(cart.totalWeightGrams).toBe(0);
    expect(cart.unweighedLines).toBe(0);
  });
});
