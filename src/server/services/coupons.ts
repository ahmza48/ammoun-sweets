import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { coupons, type Coupon } from "@/server/db/schema";

/**
 * Coupon validation.
 *
 * The client sends a code string and nothing else — never a discount amount.
 * Everything about what the code is worth is read from the database here, so
 * a forged `discount: 9999` in the request body has nowhere to land.
 */

export type CouponCheck =
  | { ok: true; coupon: Coupon }
  | { ok: false; message: string };

export async function findCoupon(code: string): Promise<Coupon | null> {
  const trimmed = code.trim();
  if (!trimmed) return null;
  const [row] = await db
    .select()
    .from(coupons)
    .where(sql`lower(${coupons.code}) = lower(${trimmed})`)
    .limit(1);
  return row ?? null;
}

/**
 * Full validity check. `subtotal` is required because minimum-spend is part of
 * validity, not just of the arithmetic.
 */
export async function validateCoupon(
  code: string,
  subtotal: number,
  now: Date = new Date(),
): Promise<CouponCheck> {
  const coupon = await findCoupon(code);

  // One message for "no such code" and "inactive" so the endpoint can't be
  // used to enumerate which codes exist.
  const invalid = { ok: false as const, message: "That promo code isn't valid." };

  if (!coupon || !coupon.active) return invalid;
  if (coupon.startsAt && coupon.startsAt.getTime() > now.getTime()) return invalid;
  if (coupon.expiresAt && coupon.expiresAt.getTime() < now.getTime()) {
    return { ok: false, message: "That promo code has expired." };
  }
  if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
    return { ok: false, message: "That promo code has been fully redeemed." };
  }
  if (subtotal < coupon.minSpend) {
    const min = (coupon.minSpend / 100).toLocaleString("en-AU", {
      style: "currency",
      currency: "AUD",
    });
    return { ok: false, message: `This code needs a minimum spend of ${min}.` };
  }

  return { ok: true, coupon };
}

/**
 * Increments redemption count, but only while the limit still allows it.
 *
 * The `usage_count < usage_limit` predicate makes this safe under concurrency:
 * two simultaneous checkouts redeeming the last use of a code will see one
 * UPDATE match and the other match nothing.
 */
export async function redeemCoupon(couponId: string): Promise<boolean> {
  const updated = await db
    .update(coupons)
    .set({ usageCount: sql`${coupons.usageCount} + 1`, updatedAt: new Date() })
    .where(
      sql`${coupons.id} = ${couponId}
          AND (${coupons.usageLimit} IS NULL OR ${coupons.usageCount} < ${coupons.usageLimit})`,
    )
    .returning({ id: coupons.id });
  return updated.length > 0;
}

export async function releaseCoupon(couponId: string): Promise<void> {
  await db
    .update(coupons)
    .set({
      usageCount: sql`GREATEST(0, ${coupons.usageCount} - 1)`,
      updatedAt: new Date(),
    })
    .where(eq(coupons.id, couponId));
}

export async function listCoupons(): Promise<Coupon[]> {
  return db.select().from(coupons).orderBy(sql`${coupons.createdAt} DESC`);
}
