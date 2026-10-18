/**
 * Money is integer cents everywhere — in the database, in the cart, in the
 * order totals. There is no payment gateway to convert for.
 * Floating point never touches a price: `0.1 + 0.2 !== 0.3` is not a property
 * you want in a shop's books.
 *
 * The only place cents become a decimal is the moment they are rendered.
 */

export const CURRENCY = "AUD" as const;

const formatter = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: CURRENCY,
  minimumFractionDigits: 2,
});

const wholeFormatter = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: CURRENCY,
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** 3000 → "$30.00" */
export function formatMoney(cents: number): string {
  return formatter.format(cents / 100);
}

/**
 * 3000 → "$30", 2650 → "$26.50".
 *
 * The approved menu design shows round prices without trailing zeros, so this
 * drops them only when the amount really is whole dollars.
 */
export function formatMoneyCompact(cents: number): string {
  return cents % 100 === 0 ? wholeFormatter.format(cents / 100) : formatter.format(cents / 100);
}

/**
 * Parses admin price input ("30", "30.5", "$30.50", "1,234.00") into cents.
 * Returns null for anything it cannot read, so the caller can surface a field
 * error rather than silently storing a wrong price.
 */
export function parseMoneyToCents(input: string | number): number | null {
  if (typeof input === "number") {
    return Number.isFinite(input) ? Math.round(input * 100) : null;
  }
  const cleaned = input.trim().replace(/[$\s,]/g, "");
  if (cleaned === "" || !/^-?\d*\.?\d*$/.test(cleaned)) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  // Round rather than truncate: 30.555 → 3056, not 3055.
  return Math.round(value * 100);
}

/** 3000 → "30.00", for populating admin form inputs. */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

/**
 * Percentage of an amount, in cents, rounded half-up.
 * 10% of 2599 → 260.
 */
export function percentOf(cents: number, percent: number): number {
  return Math.round((cents * percent) / 100);
}

/**
 * Splits a tax-inclusive amount into its tax component.
 * At 10% GST, 1100 inclusive → 100 of tax.
 */
export function taxFromInclusive(cents: number, rateBasisPoints: number): number {
  if (rateBasisPoints <= 0) return 0;
  return Math.round((cents * rateBasisPoints) / (10_000 + rateBasisPoints));
}

/** Tax added on top of a tax-exclusive amount. 1000 at 10% → 100. */
export function taxFromExclusive(cents: number, rateBasisPoints: number): number {
  if (rateBasisPoints <= 0) return 0;
  return Math.round((cents * rateBasisPoints) / 10_000);
}
