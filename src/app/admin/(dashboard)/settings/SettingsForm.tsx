"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createClosure,
  deleteClosure,
  saveOpeningHour,
  saveStoreSettings,
  type ActionState,
} from "../actions";
import { ADMIN_BUTTON, ADMIN_BUTTON_SECONDARY, ADMIN_INPUT, ADMIN_LABEL, Card } from "../ui";
import { centsToInput } from "@/lib/money";
import { AU_STATES } from "@/lib/validation";
import type { OpeningHour, StoreClosure, StoreSettings } from "@/server/db/schema";
import type { EnvironmentReport } from "@/server/env";

const initial: ActionState = { status: "idle" };

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Store settings.
 *
 * Grouped by the decision the owner is actually making, not by database table.
 * Two things are deliberately conservative:
 *
 *  · Delivery is off until postcodes are entered. There is no radius guess —
 *    the shop decides where it delivers.
 *  · GST is off by default, with a visible warning, because Australian food
 *    retail is largely GST-free and that is an accountant's call.
 */
export function SettingsForm({
  settings,
  hours,
  closures,
  environment,
}: {
  settings: StoreSettings;
  hours: OpeningHour[];
  closures: StoreClosure[];
  environment: EnvironmentReport;
}) {
  const [state, formAction, pending] = useActionState(saveStoreSettings, initial);
  const [deliveryOn, setDeliveryOn] = useState(settings.deliveryEnabled);
  const [taxOn, setTaxOn] = useState(settings.taxEnabled);

  const error = (key: string) => state.fieldErrors?.[key];

  return (
    <div className="space-y-5 px-5 py-6 sm:px-8">
      {environment.missingForProduction.length > 0 ? (
        <Card className="border-amber-300 bg-amber-50 p-5">
          <h2 className="text-[0.95rem] font-semibold text-amber-900">Environment</h2>
          <p className="mt-1.5 text-[0.85rem] leading-relaxed text-amber-900/85">
            Database: <strong>{environment.database}</strong> · Email:{" "}
            <strong>{environment.email}</strong>
          </p>
          <p className="mt-2 text-[0.85rem] text-amber-900/85">
            Still to configure: {environment.missingForProduction.join(", ")}
          </p>
        </Card>
      ) : null}

      <form action={formAction} className="space-y-5">
        {state.status === "error" && state.message ? (
          <p role="alert" className="rounded-[8px] border border-red-300 bg-red-50 px-4 py-3 text-[0.85rem] text-red-900">
            {state.message}
          </p>
        ) : null}
        {state.status === "success" && state.message ? (
          <p role="status" className="rounded-[8px] border border-emerald-300 bg-emerald-50 px-4 py-3 text-[0.85rem] text-emerald-900">
            {state.message}
          </p>
        ) : null}

        {/* ── Business ─────────────────────────────────────────────── */}
        <Card className="p-5">
          <h2 className="text-[0.95rem] font-semibold text-forest-800">Business details</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Text id="businessName" label="Business name" defaultValue={settings.businessName} required error={error("businessName")} />
            <Text id="phone" label="Phone" defaultValue={settings.phone} required error={error("phone")} />
            <Text id="email" label="Public email" type="email" defaultValue={settings.email ?? ""} error={error("email")} hint="Shown to customers." />
            <Text id="orderNotificationEmail" label="Send new orders to" type="email" defaultValue={settings.orderNotificationEmail ?? ""} error={error("orderNotificationEmail")} hint="Where order alerts arrive." />
            <div className="sm:col-span-2">
              <Text id="addressLine" label="Street address" defaultValue={settings.addressLine} required error={error("addressLine")} />
            </div>
            <Text id="suburb" label="Suburb" defaultValue={settings.suburb} required error={error("suburb")} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={ADMIN_LABEL} htmlFor="state">State</label>
                <select id="state" name="state" defaultValue={settings.state} className={`mt-1.5 ${ADMIN_INPUT}`}>
                  {AU_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <Text id="postcode" label="Postcode" defaultValue={settings.postcode} required error={error("postcode")} />
            </div>
          </div>
        </Card>

        {/* ── Ordering ─────────────────────────────────────────────── */}
        <Card className="p-5">
          <h2 className="text-[0.95rem] font-semibold text-forest-800">Ordering</h2>

          <div className="mt-4 space-y-2.5">
            <Check id="pickupEnabled" label="Accept pickup orders" defaultChecked={settings.pickupEnabled} />
            <Check
              id="deliveryEnabled"
              label="Accept delivery orders"
              defaultChecked={settings.deliveryEnabled}
              onChange={setDeliveryOn}
            />
            <Check id="orderingPaused" label="Pause online ordering" defaultChecked={settings.orderingPaused} />
          </div>

          <div className="mt-4">
            <Text id="orderingPausedMessage" label="Message when paused" defaultValue={settings.orderingPausedMessage ?? ""} hint="Shown on the menu and product pages." />
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-4">
            <Text id="preparationLeadMinutes" label="Prep time (minutes)" inputMode="numeric" defaultValue={String(settings.preparationLeadMinutes)} hint="Earliest pickup." />
            <Text id="pickupSlotMinutes" label="Slot length (minutes)" inputMode="numeric" defaultValue={String(settings.pickupSlotMinutes)} />
            <Text id="maxAdvanceDays" label="Book ahead (days)" inputMode="numeric" defaultValue={String(settings.maxAdvanceDays)} />
            <Text id="maxOrdersPerSlot" label="Max per slot" inputMode="numeric" defaultValue={settings.maxOrdersPerSlot === null ? "" : String(settings.maxOrdersPerSlot)} hint="Blank = no limit." />
          </div>
        </Card>

        {/* ── Delivery ─────────────────────────────────────────────── */}
        <Card className={`p-5 ${deliveryOn ? "" : "opacity-60"}`}>
          <h2 className="text-[0.95rem] font-semibold text-forest-800">Delivery</h2>
          <p className="mt-1 text-[0.8rem] leading-relaxed text-ink-soft">
            You choose exactly which postcodes you deliver to. Anything not listed is offered
            pickup instead.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Text id="deliveryFee" label="Delivery fee (AUD)" inputMode="decimal" defaultValue={centsToInput(settings.deliveryFee)} />
            <Text id="deliveryMinimum" label="Minimum order (AUD)" inputMode="decimal" defaultValue={centsToInput(settings.deliveryMinimum)} />
            <Text id="freeDeliveryThreshold" label="Free over (AUD)" inputMode="decimal" defaultValue={settings.freeDeliveryThreshold === null ? "" : centsToInput(settings.freeDeliveryThreshold)} hint="Blank = never free." />
          </div>

          <div className="mt-4">
            <label className={ADMIN_LABEL} htmlFor="deliveryPostcodes">Delivery postcodes</label>
            <textarea
              id="deliveryPostcodes"
              name="deliveryPostcodes"
              rows={3}
              defaultValue={settings.deliveryPostcodes.join(", ")}
              placeholder="2197, 2200, 2198"
              className={`mt-1.5 resize-y ${ADMIN_INPUT}`}
            />
            <p className="mt-1 text-[0.75rem] text-ink-faint">
              Separate with commas or spaces. Leave empty to turn delivery off entirely.
            </p>
            {error("deliveryPostcodes") ? (
              <p className="mt-1 text-[0.8rem] text-red-700">{error("deliveryPostcodes")}</p>
            ) : null}
          </div>
        </Card>

        {/* ── Tax ──────────────────────────────────────────────────── */}
        <Card className="p-5">
          <h2 className="text-[0.95rem] font-semibold text-forest-800">Tax</h2>
          <p className="mt-1.5 rounded-[8px] border border-amber-300 bg-amber-50 px-3 py-2 text-[0.82rem] leading-relaxed text-amber-900">
            Most basic food in Australia is GST-free, but prepared and confectionery items
            often are not. Confirm your GST treatment with your accountant before switching
            this on — this setting changes what customers are charged.
          </p>

          <div className="mt-4 space-y-2.5">
            <Check id="taxEnabled" label="Apply tax to orders" defaultChecked={settings.taxEnabled} onChange={setTaxOn} />
            <Check id="taxInclusive" label="Menu prices already include tax" defaultChecked={settings.taxInclusive} />
          </div>

          <div className={`mt-4 grid gap-4 sm:grid-cols-2 ${taxOn ? "" : "opacity-60"}`}>
            <Text id="taxLabel" label="Tax name" defaultValue={settings.taxLabel} />
            <Text id="taxRateBasisPoints" label="Rate (basis points)" inputMode="numeric" defaultValue={String(settings.taxRateBasisPoints)} hint="1000 = 10%." />
          </div>
        </Card>

        {/* ── Announcement ─────────────────────────────────────────── */}
        <Card className="p-5">
          <h2 className="text-[0.95rem] font-semibold text-forest-800">Announcement bar</h2>
          <div className="mt-4 space-y-4">
            <Check id="announcementEnabled" label="Show the announcement bar" defaultChecked={settings.announcementEnabled} />
            <Text id="announcementText" label="Message" defaultValue={settings.announcementText ?? ""} placeholder="Eid orders now open." />
            <div className="grid gap-4 sm:grid-cols-2">
              <Text id="announcementLinkLabel" label="Link text (optional)" defaultValue={settings.announcementLinkLabel ?? ""} />
              <Text id="announcementLinkHref" label="Link URL (optional)" defaultValue={settings.announcementLinkHref ?? ""} placeholder="/menu" />
            </div>
          </div>
        </Card>

        <button type="submit" disabled={pending} className={ADMIN_BUTTON}>
          {pending ? "Saving…" : "Save settings"}
        </button>
      </form>

      <OpeningHoursEditor hours={hours} />
      <ClosuresEditor closures={closures} />
    </div>
  );
}

/* ── Opening hours ────────────────────────────────────────────────────── */

function OpeningHoursEditor({ hours }: { hours: OpeningHour[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const byDay = new Map(hours.map((h) => [h.dayOfWeek, h]));

  return (
    <Card className="p-5">
      <h2 className="text-[0.95rem] font-semibold text-forest-800">Trading hours</h2>
      <p className="mt-1 text-[0.8rem] text-ink-soft">
        These drive the pickup times customers can book, and the hours shown on the website.
      </p>

      <ul className="mt-4 space-y-2">
        {DAYS.map((label, dayOfWeek) => {
          const day = byDay.get(dayOfWeek);
          return (
            <li key={dayOfWeek}>
              <form
                action={(formData) =>
                  startTransition(async () => {
                    const result = await saveOpeningHour(formData);
                    setMessage(result.message ?? null);
                    router.refresh();
                  })
                }
                className="flex flex-wrap items-center gap-3 rounded-[8px] border border-forest-800/12 bg-[#fbfbfa] px-4 py-3"
              >
                <input type="hidden" name="dayOfWeek" value={dayOfWeek} />
                <span className="w-24 text-[0.85rem] font-medium text-ink">{label}</span>

                <label className="flex items-center gap-2 text-[0.8rem] text-ink-soft">
                  <input type="checkbox" name="closed" defaultChecked={day?.closed ?? false} className="h-4 w-4 accent-[#123b2a]" />
                  Closed
                </label>

                <label className="flex items-center gap-1.5 text-[0.8rem] text-ink-soft">
                  <span className="sr-only">{label} opening time</span>
                  <input type="time" name="openTime" defaultValue={day?.openTime ?? "09:00"} className="rounded-[6px] border border-forest-800/20 px-2 py-1 text-[0.85rem]" />
                </label>
                <span aria-hidden="true" className="text-ink-faint">to</span>
                <label className="flex items-center gap-1.5 text-[0.8rem] text-ink-soft">
                  <span className="sr-only">{label} closing time</span>
                  <input type="time" name="closeTime" defaultValue={day?.closeTime ?? "22:00"} className="rounded-[6px] border border-forest-800/20 px-2 py-1 text-[0.85rem]" />
                </label>

                <button type="submit" disabled={pending} className="ml-auto rounded-[6px] border border-forest-800/25 px-3 py-1.5 text-[0.8rem] font-medium text-forest-800 hover:bg-forest-800/5 disabled:opacity-50">
                  Save
                </button>
              </form>
            </li>
          );
        })}
      </ul>

      {message ? (
        <p role="status" className="mt-3 text-[0.82rem] text-emerald-800">{message}</p>
      ) : null}
    </Card>
  );
}

/* ── Closures ─────────────────────────────────────────────────────────── */

function ClosuresEditor({ closures }: { closures: StoreClosure[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Card className="p-5">
      <h2 className="text-[0.95rem] font-semibold text-forest-800">Closures &amp; holidays</h2>
      <p className="mt-1 text-[0.8rem] text-ink-soft">
        Customers cannot book a pickup on these dates.
      </p>

      <form
        action={(formData) =>
          startTransition(async () => {
            await createClosure(formData);
            router.refresh();
          })
        }
        className="mt-4 flex flex-wrap items-end gap-3"
      >
        <div>
          <label className={ADMIN_LABEL} htmlFor="closure-date">Date</label>
          <input id="closure-date" name="date" type="date" required className={`mt-1.5 ${ADMIN_INPUT}`} />
        </div>
        <div className="flex-1 min-w-[12rem]">
          <label className={ADMIN_LABEL} htmlFor="closure-reason">Reason</label>
          <input id="closure-reason" name="reason" placeholder="Public holiday" className={`mt-1.5 ${ADMIN_INPUT}`} />
        </div>
        <button type="submit" disabled={pending} className={ADMIN_BUTTON_SECONDARY}>
          Add closure
        </button>
      </form>

      {closures.length > 0 ? (
        <ul className="mt-4 flex flex-wrap gap-2">
          {closures.map((closure) => (
            <li key={closure.id} className="flex items-center gap-2 rounded-full border border-forest-800/20 bg-white px-3 py-1.5 text-[0.8rem]">
              <span className="text-ink">{closure.date}</span>
              {closure.reason ? <span className="text-ink-faint">{closure.reason}</span> : null}
              <button
                type="button"
                onClick={() =>
                  startTransition(async () => {
                    await deleteClosure(closure.id);
                    router.refresh();
                  })
                }
                className="text-red-700 hover:underline"
              >
                <span className="sr-only">Remove closure on {closure.date}</span>
                &times;
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}

/* ── Field primitives ─────────────────────────────────────────────────── */

function Text({
  id,
  label,
  error,
  hint,
  ...rest
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className={ADMIN_LABEL} htmlFor={id}>{label}</label>
      <input id={id} name={id} aria-invalid={Boolean(error)} className={`mt-1.5 ${ADMIN_INPUT}`} {...rest} />
      {hint && !error ? <p className="mt-1 text-[0.75rem] text-ink-faint">{hint}</p> : null}
      {error ? <p className="mt-1 text-[0.8rem] text-red-700">{error}</p> : null}
    </div>
  );
}

function Check({
  id,
  label,
  defaultChecked,
  onChange,
}: {
  id: string;
  label: string;
  defaultChecked: boolean;
  onChange?: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2.5 text-[0.85rem] text-ink">
      <input
        type="checkbox"
        id={id}
        name={id}
        defaultChecked={defaultChecked}
        onChange={(e) => onChange?.(e.target.checked)}
        className="h-4 w-4 accent-[#123b2a]"
      />
      {label}
    </label>
  );
}
