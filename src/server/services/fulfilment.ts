import "server-only";
import { and, count, eq, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import { orders, type OpeningHour, type StoreClosure, type StoreSettings } from "@/server/db/schema";
import { getClosures, getOpeningHours } from "./settings";

/**
 * Pickup scheduling and delivery-area rules.
 *
 * ── Timezone ──────────────────────────────────────────────────────────────
 * The shop is in Australia/Sydney, which observes daylight saving. Every
 * "what time is it at the shop" question is answered by formatting `new Date()`
 * in that zone via `Intl`, never by adding a fixed offset — a hardcoded +10/+11
 * is wrong for half the year and silently breaks pickup slots twice a year.
 *
 * Pickup dates and times are stored as local wall-clock strings (YYYY-MM-DD,
 * HH:MM) because that is what the shop and the customer both mean: "3pm
 * Saturday" is 3pm at the counter regardless of the customer's device zone.
 */

export const SHOP_TIMEZONE = "Australia/Sydney";

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: SHOP_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: SHOP_TIMEZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** Today at the shop, as YYYY-MM-DD. */
export function shopToday(now: Date = new Date()): string {
  return dateFormatter.format(now);
}

/** Current shop wall-clock time, as HH:MM. */
export function shopTime(now: Date = new Date()): string {
  return timeFormatter.format(now);
}

/** 0 = Sunday … 6 = Saturday, for a YYYY-MM-DD shop date. */
export function dayOfWeekForIso(iso: string): number {
  // Parsed as UTC midnight: the weekday of a calendar date is zone-independent.
  return new Date(`${iso}T00:00:00Z`).getUTCDay();
}

export function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function fromMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function formatSlotLabel(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour}${suffix}` : `${hour}:${String(m).padStart(2, "0")}${suffix}`;
}

/* ── Trading hours for a given date ─────────────────────────────────────── */

export type DayHours = { open: string; close: string } | null;

export function hoursForDate(
  iso: string,
  weekly: OpeningHour[],
  closures: StoreClosure[],
): DayHours {
  const closure = closures.find((c) => c.date === iso);
  if (closure) {
    if (closure.closedAllDay) return null;
    if (closure.openTime && closure.closeTime) {
      return { open: closure.openTime, close: closure.closeTime };
    }
    return null;
  }

  const weekday = weekly.find((w) => w.dayOfWeek === dayOfWeekForIso(iso));
  if (!weekday || weekday.closed || !weekday.openTime || !weekday.closeTime) return null;
  return { open: weekday.openTime, close: weekday.closeTime };
}

/* ── Pickup slots ───────────────────────────────────────────────────────── */

export type PickupDay = {
  date: string;
  /** e.g. "Sat 27 Sep" */
  label: string;
  slots: string[];
  closedReason?: string;
};

const labelFormatter = new Intl.DateTimeFormat("en-AU", {
  timeZone: "UTC",
  weekday: "short",
  day: "numeric",
  month: "short",
});

export function formatDayLabel(iso: string): string {
  return labelFormatter.format(new Date(`${iso}T00:00:00Z`));
}

/**
 * Every bookable pickup slot within the configured advance window.
 *
 * Respects, in order: the shop being closed that day, the preparation lead
 * time (so nobody books a 10-minute-away pickup when the kitchen needs two
 * hours), the last slot before closing, and the per-slot order cap.
 */
export async function getPickupAvailability(
  settings: StoreSettings,
  now: Date = new Date(),
): Promise<PickupDay[]> {
  if (!settings.pickupEnabled) return [];

  const [weekly, closures] = await Promise.all([getOpeningHours(), getClosures()]);

  const today = shopToday(now);
  const nowMinutes = toMinutes(shopTime(now));
  const earliestToday = nowMinutes + settings.preparationLeadMinutes;

  const days: PickupDay[] = [];
  const candidateDates: string[] = [];
  for (let i = 0; i < settings.maxAdvanceDays; i++) {
    candidateDates.push(addDaysIso(today, i));
  }

  const slotCounts = await countOrdersPerSlot(candidateDates);

  for (const date of candidateDates) {
    const hours = hoursForDate(date, weekly, closures);
    if (!hours) {
      const closure = closures.find((c) => c.date === date);
      days.push({
        date,
        label: formatDayLabel(date),
        slots: [],
        closedReason: closure?.reason ?? "Closed",
      });
      continue;
    }

    const open = toMinutes(hours.open);
    const close = toMinutes(hours.close);
    const step = settings.pickupSlotMinutes;

    // A slot must leave enough time to actually hand the order over, so the
    // last one starts a full slot before closing.
    const lastSlot = close - step;
    const startFrom = date === today ? Math.max(open, earliestToday) : open;
    // Round up to the next clean slot boundary from opening.
    const firstSlot = open + Math.ceil(Math.max(0, startFrom - open) / step) * step;

    const slots: string[] = [];
    for (let m = firstSlot; m <= lastSlot; m += step) {
      const slot = fromMinutes(m);
      if (settings.maxOrdersPerSlot !== null) {
        const used = slotCounts.get(`${date}T${slot}`) ?? 0;
        if (used >= settings.maxOrdersPerSlot) continue;
      }
      slots.push(slot);
    }

    days.push({ date, label: formatDayLabel(date), slots });
  }

  return days;
}

/** Orders already booked into each slot, for the per-slot cap. */
async function countOrdersPerSlot(dates: string[]): Promise<Map<string, number>> {
  if (dates.length === 0) return new Map();

  const rows = await db
    .select({
      date: orders.pickupDate,
      time: orders.pickupTime,
      total: count(),
    })
    .from(orders)
    .where(
      and(
        inArray(orders.pickupDate, dates),
        eq(orders.fulfilmentType, "PICKUP"),
        // Cancelled orders free their slot again.
        inArray(orders.orderStatus, [
          "CONFIRMED",
          "PREPARING",
          "READY_FOR_PICKUP",
          "COMPLETED",
        ]),
      ),
    )
    .groupBy(orders.pickupDate, orders.pickupTime);

  const map = new Map<string, number>();
  for (const row of rows) {
    if (row.date && row.time) map.set(`${row.date}T${row.time}`, Number(row.total));
  }
  return map;
}

export type SlotValidation = { ok: true } | { ok: false; message: string };

/**
 * Re-checks a chosen slot at order time.
 *
 * The customer may have had the checkout page open for an hour, or crafted the
 * request by hand — either way the slot they send is validated against live
 * availability before an order is created.
 */
export async function validatePickupSlot(
  date: string,
  time: string,
  settings: StoreSettings,
  now: Date = new Date(),
): Promise<SlotValidation> {
  if (!settings.pickupEnabled) {
    return { ok: false, message: "Pickup is not available at the moment." };
  }

  const availability = await getPickupAvailability(settings, now);
  const day = availability.find((d) => d.date === date);

  if (!day) {
    return { ok: false, message: "That pickup date is no longer available." };
  }
  if (day.slots.length === 0) {
    return {
      ok: false,
      message: day.closedReason
        ? `We're closed on ${formatDayLabel(date)} (${day.closedReason}).`
        : `There are no pickup times left on ${formatDayLabel(date)}.`,
    };
  }
  if (!day.slots.includes(time)) {
    return {
      ok: false,
      message: `${formatSlotLabel(time)} is no longer available. Please choose another time.`,
    };
  }
  return { ok: true };
}

/* ── Delivery ───────────────────────────────────────────────────────────── */

export type DeliveryValidation =
  | { ok: true; fee: number }
  | { ok: false; code: "DISABLED" | "OUT_OF_AREA" | "BELOW_MINIMUM"; message: string };

/**
 * Whether the shop will deliver to this postcode, and for how much.
 *
 * The allowed postcode list is admin-managed. There is deliberately no
 * radius-from-the-shop calculation — the owner decides where they deliver,
 * not a guess about what "local" means.
 */
export function validateDelivery(
  postcode: string,
  subtotal: number,
  settings: StoreSettings,
): DeliveryValidation {
  if (!settings.deliveryEnabled) {
    return {
      ok: false,
      code: "DISABLED",
      message: "We're not delivering at the moment — pickup is available instead.",
    };
  }

  const allowed = settings.deliveryPostcodes;
  if (allowed.length === 0 || !allowed.includes(postcode)) {
    return {
      ok: false,
      code: "OUT_OF_AREA",
      message: `Sorry, we don't deliver to ${postcode} yet. You're welcome to collect from the shop instead.`,
    };
  }

  if (subtotal < settings.deliveryMinimum) {
    return {
      ok: false,
      code: "BELOW_MINIMUM",
      message: `Delivery orders start at ${(settings.deliveryMinimum / 100).toLocaleString(
        "en-AU",
        { style: "currency", currency: "AUD" },
      )}.`,
    };
  }

  const fee =
    settings.freeDeliveryThreshold !== null && subtotal >= settings.freeDeliveryThreshold
      ? 0
      : settings.deliveryFee;

  return { ok: true, fee };
}

/** Whether the shop is accepting orders at all right now. */
export async function isOrderingOpen(
  settings: StoreSettings,
): Promise<{ open: boolean; message?: string }> {
  if (settings.orderingPaused) {
    return {
      open: false,
      message:
        settings.orderingPausedMessage ??
        "Online ordering is paused at the moment. Please call the shop.",
    };
  }
  if (!settings.pickupEnabled && !settings.deliveryEnabled) {
    return { open: false, message: "Online ordering is currently unavailable." };
  }
  return { open: true };
}
