/**
 * Weights.
 *
 * The shop sells most things by the half kilo, so a cart total is far more
 * useful expressed as weight than as a count of trays: "2 kg of sweets" is
 * something a customer can picture, "4 items" is not.
 *
 * Stored in grams as integers for the same reason money is stored in cents —
 * adding up 0.5 kg four times should give exactly 2 kg.
 */

/** Grams in a kilogram. Named so the arithmetic below reads as intent. */
const GRAMS_PER_KG = 1000;

/**
 * Formats a gram count the way a counter assistant would say it.
 *
 * Under 1 kg stays in grams, because "0.5 kg" of baklava is nobody's phrasing.
 * At or above 1 kg switches to kilograms with at most two decimals and no
 * trailing zeros, so 1000 → "1 kg" and 1250 → "1.25 kg" rather than "1.00 kg".
 */
export function formatWeight(grams: number): string {
  if (!Number.isFinite(grams) || grams <= 0) return "0 g";

  const whole = Math.round(grams);
  if (whole < GRAMS_PER_KG) return `${whole} g`;

  const kg = whole / GRAMS_PER_KG;
  // `parseFloat` after `toFixed` is what drops "1.50" to "1.5" and "2.00" to "2".
  return `${parseFloat(kg.toFixed(2))} kg`;
}

/**
 * Total weight of a set of lines, and whether anything had no published
 * weight.
 *
 * `unweighedLines` is the honest half of this: items sold by the piece have no
 * weight in the database, and a total that silently skipped them would read as
 * the weight of the whole order. Callers use the flag to qualify the figure
 * instead of overstating it.
 */
export function sumWeight(
  lines: readonly { weightGrams: number | null; quantity: number }[],
): { totalGrams: number; unweighedLines: number } {
  let totalGrams = 0;
  let unweighedLines = 0;

  for (const line of lines) {
    if (line.weightGrams === null || line.weightGrams <= 0) {
      unweighedLines++;
      continue;
    }
    totalGrams += line.weightGrams * line.quantity;
  }

  return { totalGrams, unweighedLines };
}

/**
 * The weight a sold-by unit implies, or null when it implies nothing.
 *
 * Only units that genuinely state a weight are mapped. "6 pieces" is left null
 * rather than multiplied by an invented per-piece weight — nobody has weighed
 * a piece, and the brief is explicit that product facts are not to be made up.
 */
export function weightGramsForSize(size: string | undefined | null): number | null {
  if (!size) return null;
  const text = size.trim().toLowerCase();

  if (/^half\s*kg$/.test(text)) return 500;
  if (/^(one|1)\s*kg$/.test(text)) return 1000;
  if (/^quarter\s*kg$/.test(text)) return 250;

  // "750 g", "1.5 kg", "500g"
  const explicit = /^([\d.]+)\s*(g|kg)$/.exec(text);
  if (explicit) {
    const value = Number.parseFloat(explicit[1]);
    if (!Number.isFinite(value) || value <= 0) return null;
    const grams = explicit[2] === "kg" ? value * GRAMS_PER_KG : value;
    return Math.round(grams);
  }

  return null;
}
