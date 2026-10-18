import { describe, expect, it } from "vitest";
import { formatWeight, sumWeight, weightGramsForSize } from "@/lib/weight";

/**
 * Weight arithmetic and display.
 *
 * The cart shows these figures to customers deciding how much to order, so the
 * cases that matter are the ones where a plausible-looking implementation lies:
 * items with no published weight, and kilogram rounding.
 */

describe("formatWeight", () => {
  it("keeps sub-kilogram amounts in grams", () => {
    expect(formatWeight(500)).toBe("500 g");
    expect(formatWeight(999)).toBe("999 g");
    expect(formatWeight(1)).toBe("1 g");
  });

  it("switches to kilograms at 1000 g and drops trailing zeros", () => {
    expect(formatWeight(1000)).toBe("1 kg");
    expect(formatWeight(1500)).toBe("1.5 kg");
    expect(formatWeight(2000)).toBe("2 kg");
    expect(formatWeight(1250)).toBe("1.25 kg");
  });

  it("never renders a negative or nonsense weight", () => {
    expect(formatWeight(0)).toBe("0 g");
    expect(formatWeight(-500)).toBe("0 g");
    expect(formatWeight(Number.NaN)).toBe("0 g");
    expect(formatWeight(Number.POSITIVE_INFINITY)).toBe("0 g");
  });

  it("adds up half-kilo trays without floating-point drift", () => {
    // The reason weights are stored in grams: 0.5 * 4 in kilograms is exact
    // here, but the same sum built from 0.1 kg units would not be.
    const { totalGrams } = sumWeight([
      { weightGrams: 500, quantity: 4 },
      { weightGrams: 100, quantity: 3 },
    ]);
    expect(totalGrams).toBe(2300);
    expect(formatWeight(totalGrams)).toBe("2.3 kg");
  });
});

describe("sumWeight", () => {
  it("multiplies by quantity", () => {
    expect(sumWeight([{ weightGrams: 500, quantity: 3 }])).toEqual({
      totalGrams: 1500,
      unweighedLines: 0,
    });
  });

  it("counts lines with no weight instead of treating them as zero", () => {
    // A total that silently skipped the piece-sold item would read as the
    // weight of the whole order. The count is what lets the UI qualify it.
    const result = sumWeight([
      { weightGrams: 500, quantity: 2 },
      { weightGrams: null, quantity: 1 },
    ]);
    expect(result.totalGrams).toBe(1000);
    expect(result.unweighedLines).toBe(1);
  });

  it("treats a zero or negative stored weight as unweighed", () => {
    expect(sumWeight([{ weightGrams: 0, quantity: 2 }])).toEqual({
      totalGrams: 0,
      unweighedLines: 1,
    });
  });

  it("is zero for an empty cart", () => {
    expect(sumWeight([])).toEqual({ totalGrams: 0, unweighedLines: 0 });
  });
});

describe("weightGramsForSize", () => {
  it("reads the units the shop actually uses", () => {
    expect(weightGramsForSize("Half kg")).toBe(500);
    expect(weightGramsForSize("half kg")).toBe(500);
    expect(weightGramsForSize("1 kg")).toBe(1000);
    expect(weightGramsForSize("Quarter kg")).toBe(250);
    expect(weightGramsForSize("750 g")).toBe(750);
    expect(weightGramsForSize("1.5kg")).toBe(1500);
  });

  it("refuses to invent a weight for piece-sold items", () => {
    // Nobody has weighed a piece of baklava, so nothing may be implied from
    // the count. This is the DO-NOT-FAKE rule in code.
    expect(weightGramsForSize("6 pieces")).toBeNull();
    expect(weightGramsForSize("Pieces")).toBeNull();
    expect(weightGramsForSize("Each")).toBeNull();
    expect(weightGramsForSize("Large tray")).toBeNull();
    expect(weightGramsForSize(undefined)).toBeNull();
    expect(weightGramsForSize(null)).toBeNull();
    expect(weightGramsForSize("")).toBeNull();
  });

  it("rejects a zero or unparseable numeric size", () => {
    expect(weightGramsForSize("0 kg")).toBeNull();
    expect(weightGramsForSize("kg")).toBeNull();
  });
});
