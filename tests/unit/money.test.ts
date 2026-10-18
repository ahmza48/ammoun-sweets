import { describe, expect, it } from "vitest";
import {
  centsToInput,
  formatMoney,
  formatMoneyCompact,
  parseMoneyToCents,
  percentOf,
  taxFromExclusive,
  taxFromInclusive,
} from "@/lib/money";

/**
 * Money handling.
 *
 * These are the calculations that decide what a customer is charged, so the
 * cases here are the ones that actually go wrong in practice: rounding at the
 * half cent, currency symbols pasted into an admin field, and the classic
 * float error that integer cents exist to prevent.
 */

describe("formatting", () => {
  it("formats whole dollars without decimals in the compact form", () => {
    expect(formatMoneyCompact(3000)).toBe("$30");
    expect(formatMoneyCompact(2650)).toBe("$26.50");
  });

  it("always shows cents in the full form", () => {
    expect(formatMoney(3000)).toBe("$30.00");
    expect(formatMoney(5)).toBe("$0.05");
    expect(formatMoney(0)).toBe("$0.00");
  });

  it("round-trips through the admin input format", () => {
    expect(centsToInput(3000)).toBe("30.00");
    expect(parseMoneyToCents(centsToInput(2699))).toBe(2699);
  });
});

describe("parseMoneyToCents", () => {
  it("accepts what people actually type", () => {
    expect(parseMoneyToCents("30")).toBe(3000);
    expect(parseMoneyToCents("30.5")).toBe(3050);
    expect(parseMoneyToCents("$30.50")).toBe(3050);
    expect(parseMoneyToCents(" 1,234.00 ")).toBe(123400);
  });

  it("rounds rather than truncating", () => {
    // 30.555 → 3056, not 3055. Truncating loses the shop a cent every time.
    expect(parseMoneyToCents("30.555")).toBe(3056);
  });

  it("rejects nonsense instead of silently storing zero", () => {
    expect(parseMoneyToCents("")).toBeNull();
    expect(parseMoneyToCents("abc")).toBeNull();
    expect(parseMoneyToCents("12.34.56")).toBeNull();
  });

  it("avoids the float error that integer cents exist to prevent", () => {
    // 0.1 + 0.2 === 0.30000000000000004 in float arithmetic.
    const total = parseMoneyToCents("0.1")! + parseMoneyToCents("0.2")!;
    expect(total).toBe(30);
    expect(formatMoney(total)).toBe("$0.30");
  });
});

describe("percentages and tax", () => {
  it("rounds percentages half-up", () => {
    expect(percentOf(2599, 10)).toBe(260);
    expect(percentOf(10000, 15)).toBe(1500);
  });

  it("extracts tax from a tax-inclusive amount", () => {
    // $11.00 including 10% GST contains $1.00 of tax.
    expect(taxFromInclusive(1100, 1000)).toBe(100);
  });

  it("adds tax on top of a tax-exclusive amount", () => {
    expect(taxFromExclusive(1000, 1000)).toBe(100);
  });

  it("returns zero when the rate is zero", () => {
    expect(taxFromInclusive(5000, 0)).toBe(0);
    expect(taxFromExclusive(5000, 0)).toBe(0);
  });
});
