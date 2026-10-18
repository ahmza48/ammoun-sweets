import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import {
  openingHours,
  storeClosures,
  storeSettings,
  type OpeningHour,
  type StoreClosure,
  type StoreSettings,
} from "@/server/db/schema";

/**
 * Store configuration. Single row, id = 1, enforced by a CHECK constraint.
 *
 * These values drive real money and real trading hours, so there is no silent
 * fallback: if the row is missing, the database has not been seeded and that
 * is a deployment error worth failing loudly on rather than papering over with
 * defaults that might be wrong.
 */

export const SETTINGS_ID = 1;

export async function getStoreSettings(): Promise<StoreSettings> {
  const rows = await db
    .select()
    .from(storeSettings)
    .where(eq(storeSettings.id, SETTINGS_ID))
    .limit(1);

  const settings = rows[0];
  if (!settings) {
    throw new Error(
      "Store settings row is missing. Run `pnpm db:seed` to initialise the database.",
    );
  }
  return settings;
}

/** Null instead of throwing — for callers that render before seeding, like health checks. */
export async function tryGetStoreSettings(): Promise<StoreSettings | null> {
  try {
    return await getStoreSettings();
  } catch {
    return null;
  }
}

export async function updateStoreSettings(
  patch: Partial<Omit<StoreSettings, "id">>,
): Promise<StoreSettings> {
  const [updated] = await db
    .update(storeSettings)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(storeSettings.id, SETTINGS_ID))
    .returning();
  return updated;
}

export async function getOpeningHours(): Promise<OpeningHour[]> {
  return db.select().from(openingHours).orderBy(asc(openingHours.dayOfWeek));
}

export async function upsertOpeningHour(input: {
  dayOfWeek: number;
  closed: boolean;
  openTime: string | null;
  closeTime: string | null;
}): Promise<void> {
  await db
    .insert(openingHours)
    .values(input)
    .onConflictDoUpdate({
      target: openingHours.dayOfWeek,
      set: { closed: input.closed, openTime: input.openTime, closeTime: input.closeTime },
    });
}

export async function getClosures(): Promise<StoreClosure[]> {
  return db.select().from(storeClosures).orderBy(asc(storeClosures.date));
}

/** Closures from today onwards — the only ones checkout cares about. */
export async function getUpcomingClosures(todayIso: string): Promise<StoreClosure[]> {
  const all = await getClosures();
  return all.filter((c) => c.date >= todayIso);
}

export async function addClosure(input: {
  date: string;
  reason?: string | null;
  closedAllDay: boolean;
  openTime?: string | null;
  closeTime?: string | null;
}): Promise<void> {
  await db
    .insert(storeClosures)
    .values({
      date: input.date,
      reason: input.reason ?? null,
      closedAllDay: input.closedAllDay,
      openTime: input.openTime ?? null,
      closeTime: input.closeTime ?? null,
    })
    .onConflictDoUpdate({
      target: storeClosures.date,
      set: {
        reason: input.reason ?? null,
        closedAllDay: input.closedAllDay,
        openTime: input.openTime ?? null,
        closeTime: input.closeTime ?? null,
      },
    });
}

export async function removeClosure(id: string): Promise<void> {
  await db.delete(storeClosures).where(eq(storeClosures.id, id));
}
