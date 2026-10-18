import { describe, expect, it } from "vitest";
import { checkoutSchema, formatAuPhone, normalisePhone, postcodeSchema, slugify, variantInputSchema } from "@/lib/validation";

/**
 * Input validation.
 *
 * The checkout cases matter most: this schema is the only thing standing
 * between a hand-crafted POST and the order table.
 */

describe("Australian phone numbers", () => {
  it("normalises the shapes Australians actually type", () => {
    expect(normalisePhone("(02) 8764 1676")).toBe("+61287641676");
    expect(normalisePhone("02 8764 1676")).toBe("+61287641676");
    expect(normalisePhone("0412 345 678")).toBe("+61412345678");
    expect(normalisePhone("+61 2 8764 1676")).toBe("+61287641676");
    expect(normalisePhone("61412345678")).toBe("+61412345678");
  });

  it("rejects numbers that are missing an area code", () => {
    // Ambiguous — guessing an area code would put the shop's calls in the
    // wrong state.
    expect(normalisePhone("87641676")).toBeNull();
    expect(normalisePhone("123")).toBeNull();
  });

  it("formats landlines and mobiles differently", () => {
    expect(formatAuPhone("+61287641676")).toBe("(02) 8764 1676");
    expect(formatAuPhone("+61412345678")).toBe("0412 345 678");
  });
});

describe("postcodes", () => {
  it("requires exactly four digits", () => {
    expect(postcodeSchema.safeParse("2197").success).toBe(true);
    expect(postcodeSchema.safeParse("219").success).toBe(false);
    expect(postcodeSchema.safeParse("21970").success).toBe(false);
    // No US ZIP codes.
    expect(postcodeSchema.safeParse("90210-1234").success).toBe(false);
  });
});

describe("slugify", () => {
  it("makes readable URLs from product names", () => {
    expect(slugify("Halawet El Jeben")).toBe("halawet-el-jeben");
    expect(slugify("Shamiyeh / Halawet El Jeben Roll")).toBe(
      "shamiyeh-halawet-el-jeben-roll",
    );
    expect(slugify("Znoud  Nutella!!")).toBe("znoud-nutella");
  });
});

describe("checkout schema", () => {
  const validPickup = {
    firstName: "Dana",
    lastName: "Haddad",
    email: "Dana@Example.COM",
    phone: "0412 345 678",
    idempotencyKey: "ck_abcdefgh",
    cart: { lines: [{ variantId: "3f2504e0-4f89-41d3-9a0c-0305e82c3301", quantity: 2 }] },
    fulfilment: {
      fulfilmentType: "PICKUP" as const,
      pickupDate: "2026-10-03",
      pickupTime: "14:30",
    },
  };

  it("accepts a valid pickup order and normalises contact details", () => {
    const result = checkoutSchema.safeParse(validPickup);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("dana@example.com");
      expect(result.data.phone).toBe("+61412345678");
    }
  });

  it("has no field for prices at all", () => {
    // The schema deliberately cannot carry a price — a forged total has
    // nowhere to land even before any server check runs.
    const forged = {
      ...validPickup,
      cart: {
        lines: [
          {
            variantId: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
            quantity: 1,
            unitPrice: 1,
            total: 1,
          },
        ],
      },
      subtotal: 1,
      total: 1,
    };
    const result = checkoutSchema.safeParse(forged);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cart.lines[0]).toEqual({
        variantId: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
        quantity: 1,
      });
      expect("total" in result.data).toBe(false);
      expect("subtotal" in result.data).toBe(false);
    }
  });

  it("rejects a delivery order with an invalid postcode", () => {
    const result = checkoutSchema.safeParse({
      ...validPickup,
      fulfilment: {
        fulfilmentType: "DELIVERY" as const,
        address1: "1 Test Street",
        suburb: "Bass Hill",
        state: "NSW",
        postcode: "ABCD",
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-Australian state", () => {
    const result = checkoutSchema.safeParse({
      ...validPickup,
      fulfilment: {
        fulfilmentType: "DELIVERY" as const,
        address1: "1 Test Street",
        suburb: "Somewhere",
        state: "CA",
        postcode: "2197",
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects zero and negative quantities", () => {
    for (const quantity of [0, -1, 1.5]) {
      const result = checkoutSchema.safeParse({
        ...validPickup,
        cart: { lines: [{ variantId: "3f2504e0-4f89-41d3-9a0c-0305e82c3301", quantity }] },
      });
      expect(result.success).toBe(false);
    }
  });

  it("requires an idempotency key", () => {
    const { idempotencyKey: _omitted, ...withoutKey } = validPickup;
    void _omitted;
    expect(checkoutSchema.safeParse(withoutKey).success).toBe(false);
  });
});

describe("variantInputSchema — weight", () => {
  const base = { name: "Half kg", price: 3000 };

  it("defaults to null when the owner leaves it blank", () => {
    const parsed = variantInputSchema.parse(base);
    // Null, not zero: "not sold by weight" is a different fact from "weighs
    // nothing", and the cart total depends on the difference.
    expect(parsed.weightGrams).toBeNull();
  });

  it("accepts a positive whole number of grams", () => {
    expect(variantInputSchema.parse({ ...base, weightGrams: 500 }).weightGrams).toBe(500);
    expect(variantInputSchema.parse({ ...base, weightGrams: 1 }).weightGrams).toBe(1);
  });

  it("rejects zero, negatives and fractions", () => {
    expect(variantInputSchema.safeParse({ ...base, weightGrams: 0 }).success).toBe(false);
    expect(variantInputSchema.safeParse({ ...base, weightGrams: -500 }).success).toBe(false);
    expect(variantInputSchema.safeParse({ ...base, weightGrams: 1.5 }).success).toBe(false);
  });

  it("catches a stray extra digit before it reaches the shop floor", () => {
    // 500 kg of baklava is a typo, not an order.
    expect(variantInputSchema.safeParse({ ...base, weightGrams: 500_000 }).success).toBe(false);
  });
});
