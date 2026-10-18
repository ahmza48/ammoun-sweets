"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/shop/CartProvider";
import { Ornament } from "@/components/Ornament";
import { formatMoney } from "@/lib/money";
import { formatWeight } from "@/lib/weight";
import { AU_STATES } from "@/lib/validation";
import { submitCheckout, type CheckoutState } from "./actions";
import type { PickupDay } from "@/server/services/fulfilment";

/**
 * Checkout form.
 *
 * Everything the customer sees here is a *preview*: the totals shown are
 * computed from the cart's cached prices for responsiveness, and the server
 * recomputes them from scratch before any order exists. If the two disagree,
 * the server wins and the discrepancy comes back as an issue message.
 *
 * The idempotency key is minted once per mounted form, so double-clicking
 * "Place order" — or a flaky connection retrying — resolves to one order.
 */

export type CheckoutFormProps = {
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  pickupDays: PickupDay[];
  deliveryFee: number;
  deliveryMinimum: number;
  freeDeliveryThreshold: number | null;
  deliveryPostcodes: string[];
  taxLabel: string;
};

const FIELD =
  "w-full rounded-[10px] border border-sand-dark bg-ivory px-4 py-3 text-[0.95rem] text-ink " +
  "placeholder:text-ink-faint/70 transition-colors duration-300 " +
  "focus:border-forest-700 focus:outline-none focus:ring-2 focus:ring-forest-700/25";

const LABEL = "block text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-forest-800";

const initialState: CheckoutState = { status: "idle" };

export function CheckoutForm(props: CheckoutFormProps) {
  const { lines, estimatedSubtotal, estimatedWeightGrams, unweighedLines, clear } = useCart();
  const router = useRouter();
  const [state, formAction, pending] = useActionState(submitCheckout, initialState);

  const [fulfilmentType, setFulfilmentType] = useState<"PICKUP" | "DELIVERY">(
    props.pickupEnabled ? "PICKUP" : "DELIVERY",
  );
  const [chosenDate, setPickupDate] = useState("");
  const [chosenTime, setPickupTime] = useState("");
  const [postcode, setPostcode] = useState("");
  const [couponCode, setCouponCode] = useState("");

  /**
   * One key per mounted form. Minted on first submit rather than during
   * render: generating it in render would differ between the server and the
   * client pass, and reading a ref during render is its own hazard. A retry
   * after a validation error reuses the same key, which is exactly what makes
   * the retry safe.
   */
  const idempotencyKey = useRef<string | null>(null);

  const availableDays = useMemo(
    () => props.pickupDays.filter((d) => d.slots.length > 0),
    [props.pickupDays],
  );

  /*
   * Both of these are derived, not synced. Storing a default in state and
   * correcting it from an effect causes a render with the wrong value first,
   * and React now flags that pattern outright. Falling back to the first
   * available option keeps the common path one tap.
   */
  const pickupDate = chosenDate || availableDays[0]?.date || "";

  const slotsForDate = useMemo(
    () => availableDays.find((d) => d.date === pickupDate)?.slots ?? [],
    [availableDays, pickupDate],
  );

  const pickupTime = slotsForDate.includes(chosenTime) ? chosenTime : (slotsForDate[0] ?? "");

  const deliveryFee = useMemo(() => {
    if (fulfilmentType !== "DELIVERY") return 0;
    if (
      props.freeDeliveryThreshold !== null &&
      estimatedSubtotal >= props.freeDeliveryThreshold
    ) {
      return 0;
    }
    return props.deliveryFee;
  }, [fulfilmentType, estimatedSubtotal, props.deliveryFee, props.freeDeliveryThreshold]);

  const estimatedTotal = estimatedSubtotal + deliveryFee;

  const postcodeAllowed =
    postcode.length !== 4 || props.deliveryPostcodes.includes(postcode);

  // On success the cart is cleared and the customer moves to confirmation.
  useEffect(() => {
    if (state.status === "success" && state.order) {
      clear();
      router.push(`/orders/${state.order.orderNumber}`);
    }
  }, [state, clear, router]);

  if (lines.length === 0 && state.status !== "success") {
    return (
      <div className="container-narrow py-20 text-center">
        <Ornament width="sm" className="mx-auto" />
        <h1 className="mt-6 font-display text-[2rem] text-forest-800">Your cart is empty</h1>
        <p className="mt-3 text-[0.95rem] text-ink-soft">
          Add a few things from the menu and come back.
        </p>
        <Link
          href="/menu"
          className="mt-8 inline-flex rounded-full bg-gold-400 px-7 py-3.5 text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-forest-900 transition-all duration-300 hover:-translate-y-px hover:bg-gold-300"
        >
          Browse the Menu
        </Link>
      </div>
    );
  }

  const fieldError = (key: string) => state.fieldErrors?.[key];

  return (
    <form
      action={(formData) => {
        // Reading and writing the ref here is inside an event handler, not
        // during render.
        idempotencyKey.current ??=
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `ck_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        formData.set("idempotencyKey", idempotencyKey.current);
        return formAction(formData);
      }}
      className="on-light container-page grid gap-10 py-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-14 lg:py-14"
    >
      {/*
        Only the cart is a hidden field — it is genuinely a list. Every other
        value is a normal named input the customer can see, which is what stops
        the submitted data drifting from what is on screen.
      */}
      <input
        type="hidden"
        name="cart"
        value={JSON.stringify(
          lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
        )}
      />
      <input type="hidden" name="fulfilmentType" value={fulfilmentType} />
      {fulfilmentType === "PICKUP" ? (
        <>
          <input type="hidden" name="pickupDate" value={pickupDate} />
          <input type="hidden" name="pickupTime" value={pickupTime} />
        </>
      ) : null}

      <div>
        <h1 className="font-display text-[2.1rem] leading-tight text-forest-800 sm:text-[2.5rem]">
          Checkout
        </h1>
        <Ornament width="sm" className="mt-4" />

        {state.status === "error" && state.message ? (
          <div
            role="alert"
            className="mt-6 rounded-[12px] border border-red-300 bg-red-50 px-4 py-3.5 text-[0.9rem] leading-relaxed text-red-900"
          >
            <p className="font-semibold">{state.message}</p>
            {state.issues && state.issues.length > 0 ? (
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {state.issues.map((issue) => (
                  <li key={`${issue.variantId}-${issue.code}`}>{issue.message}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {/* ── Contact ─────────────────────────────────────────────────── */}
        <fieldset className="mt-8 border-0 p-0">
          <legend className="eyebrow text-gold-700">Your details</legend>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field
              id="firstName"
              label="First name"
              autoComplete="given-name"
              required
              error={fieldError("firstName")}
            />
            <Field
              id="lastName"
              label="Last name"
              autoComplete="family-name"
              required
              error={fieldError("lastName")}
            />
            <Field
              id="email"
              label="Email"
              type="email"
              autoComplete="email"
              required
              error={fieldError("email")}
              hint="We'll send your order confirmation here."
            />
            <Field
              id="phone"
              label="Phone"
              type="tel"
              autoComplete="tel"
              required
              placeholder="0412 345 678"
              error={fieldError("phone")}
            />
          </div>
        </fieldset>

        {/* ── Fulfilment ──────────────────────────────────────────────── */}
        <fieldset className="mt-9 border-0 p-0">
          <legend className="eyebrow text-gold-700">How would you like it?</legend>

          <div className="mt-4 flex flex-wrap gap-3">
            {props.pickupEnabled ? (
              <FulfilmentOption
                active={fulfilmentType === "PICKUP"}
                onSelect={() => setFulfilmentType("PICKUP")}
                title="Collect from the shop"
                detail="Choose a day and time"
              />
            ) : null}
            {props.deliveryEnabled ? (
              <FulfilmentOption
                active={fulfilmentType === "DELIVERY"}
                onSelect={() => setFulfilmentType("DELIVERY")}
                title="Local delivery"
                detail={
                  props.deliveryFee > 0 ? `${formatMoney(props.deliveryFee)} delivery` : "Free delivery"
                }
              />
            ) : null}
          </div>

          {fulfilmentType === "PICKUP" ? (
            <div className="mt-6">
              {availableDays.length === 0 ? (
                <p className="rounded-[10px] border border-sand-dark bg-sand/50 px-4 py-3 text-[0.9rem] text-ink-soft">
                  There are no collection times available right now. Please call the shop.
                </p>
              ) : (
                <>
                  <label className={LABEL} htmlFor="pickupDate">
                    Collection day
                  </label>
                  <select
                    id="pickupDate"
                    value={pickupDate}
                    aria-describedby="pickup-help"
                    onChange={(e) => setPickupDate(e.target.value)}
                    className={`mt-2 ${FIELD}`}
                  >
                    {availableDays.map((day) => (
                      <option key={day.date} value={day.date}>
                        {day.label}
                      </option>
                    ))}
                  </select>

                  <fieldset className="mt-5 border-0 p-0">
                    <legend className={LABEL}>Collection time</legend>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {slotsForDate.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setPickupTime(slot)}
                          aria-pressed={pickupTime === slot}
                          className={[
                            "rounded-full border px-4 py-2.5 text-[0.82rem] font-medium transition-all duration-300",
                            pickupTime === slot
                              ? "border-gold-400 bg-gold-400 text-forest-900"
                              : "border-sand-dark bg-ivory text-forest-800 hover:border-gold-500/60",
                          ].join(" ")}
                        >
                          {formatSlot(slot)}
                        </button>
                      ))}
                    </div>
                    {fieldError("fulfilment.pickupTime") ? (
                      <p className="mt-2 text-[0.82rem] text-red-700">
                        {fieldError("fulfilment.pickupTime")}
                      </p>
                    ) : null}
                  </fieldset>
                </>
              )}
            </div>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field id="address1" label="Address" autoComplete="address-line1" required error={fieldError("fulfilment.address1")} />
              </div>
              <div className="sm:col-span-2">
                <Field id="address2" label="Apartment, unit (optional)" autoComplete="address-line2" />
              </div>
              <Field id="suburb" label="Suburb" autoComplete="address-level2" required error={fieldError("fulfilment.suburb")} />
              <div>
                <label className={LABEL} htmlFor="state">
                  State
                </label>
                <select id="state" name="state" defaultValue="NSW" className={`mt-2 ${FIELD}`}>
                  {AU_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL} htmlFor="postcode">
                  Postcode
                </label>
                <input
                  id="postcode"
                  name="postcode"
                  inputMode="numeric"
                  maxLength={4}
                  value={postcode}
                  onChange={(e) => setPostcode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  required
                  aria-invalid={!postcodeAllowed}
                  className={`mt-2 ${FIELD}`}
                />
                {!postcodeAllowed ? (
                  <p className="mt-2 text-[0.82rem] leading-relaxed text-red-700">
                    We don&rsquo;t deliver to {postcode} yet — you&rsquo;re welcome to collect
                    from the shop instead.
                  </p>
                ) : null}
                {fieldError("fulfilment.postcode") ? (
                  <p className="mt-2 text-[0.82rem] text-red-700">
                    {fieldError("fulfilment.postcode")}
                  </p>
                ) : null}
              </div>
              {props.deliveryMinimum > 0 ? (
                <p className="text-[0.82rem] text-ink-soft sm:col-span-2">
                  Delivery orders start at {formatMoney(props.deliveryMinimum)}.
                </p>
              ) : null}
            </div>
          )}
        </fieldset>

        {/* ── Notes ───────────────────────────────────────────────────── */}
        <div className="mt-9">
          <label className={LABEL} htmlFor="notes">
            Anything we should know? (optional)
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            maxLength={1000}
            placeholder="Allergies, a message for a gift box, collection details…"
            className={`mt-2 resize-y ${FIELD}`}
          />
        </div>
      </div>

      {/* ── Summary ───────────────────────────────────────────────────── */}
      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="rounded-[var(--radius-lg-card)] border border-sand-dark bg-ivory p-6 shadow-[0_20px_50px_-36px_rgba(18,59,42,0.5)]">
          <h2 className="font-display text-[1.5rem] text-forest-800">Your order</h2>

          <ul className="mt-5 divide-y divide-sand-dark/70">
            {lines.map((line) => (
              <li key={line.variantId} className="flex gap-3 py-3">
                <span className="flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full bg-forest-800/8 text-[0.78rem] font-semibold text-forest-800">
                  {line.quantity}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.92rem] font-medium leading-snug text-forest-800">
                    {line.productName}
                  </p>
                  <p className="text-[0.78rem] text-ink-faint">{line.variantName}</p>
                </div>
                <span className="text-[0.92rem] text-forest-800">
                  {formatMoney(line.unitPrice * line.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4 border-t border-sand-dark pt-4">
            <label className={LABEL} htmlFor="couponCode">
              Promo code
            </label>
            <input
              id="couponCode"
              name="couponCode"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="Optional"
              className={`mt-2 ${FIELD}`}
            />
            {fieldError("couponCode") ? (
              <p className="mt-2 text-[0.82rem] text-red-700">{fieldError("couponCode")}</p>
            ) : null}
          </div>

          <dl className="mt-5 space-y-2 border-t border-sand-dark pt-4 text-[0.92rem]">
            {estimatedWeightGrams > 0 ? (
              <Row
                label={unweighedLines > 0 ? "Weight (weighed items)" : "Total weight"}
                value={formatWeight(estimatedWeightGrams)}
              />
            ) : null}
            <Row label="Subtotal" value={formatMoney(estimatedSubtotal)} />
            {fulfilmentType === "DELIVERY" ? (
              <Row
                label="Delivery"
                value={deliveryFee === 0 ? "Free" : formatMoney(deliveryFee)}
              />
            ) : null}
            <div className="flex items-baseline justify-between border-t border-sand-dark pt-3">
              <dt className="font-display text-[1.1rem] font-semibold text-forest-800">Total</dt>
              <dd className="font-display text-[1.35rem] font-semibold text-forest-800">
                {formatMoney(estimatedTotal)}
              </dd>
            </div>
          </dl>

          <p className="mt-2 text-[0.72rem] leading-relaxed text-ink-faint">
            Totals are confirmed by the shop when your order is placed. Any promo code is
            applied then.
          </p>

          <button
            type="submit"
            disabled={pending || (fulfilmentType === "PICKUP" && !pickupTime)}
            className="mt-5 w-full rounded-full bg-gold-400 px-6 py-4 text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-forest-900 transition-all duration-300 hover:-translate-y-px hover:bg-gold-300 disabled:cursor-not-allowed disabled:bg-sand-dark disabled:text-ink-faint disabled:hover:translate-y-0"
          >
            {pending ? "Placing your order…" : "Place Order"}
          </button>

          <p className="mt-3 text-center text-[0.75rem] leading-relaxed text-ink-faint">
            Payment is taken in the shop when you collect your order.
          </p>

          <p aria-live="polite" className="sr-only">
            {pending ? "Placing your order" : state.message ?? ""}
          </p>
        </div>
      </aside>
    </form>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="text-forest-800">{value}</dd>
    </div>
  );
}

function FulfilmentOption({
  active,
  onSelect,
  title,
  detail,
}: {
  active: boolean;
  onSelect: () => void;
  title: string;
  detail: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={[
        "flex min-w-[13rem] flex-1 flex-col items-start gap-1 rounded-[12px] border px-5 py-4 text-left transition-all duration-300",
        active
          ? "border-gold-400 bg-gold-400/10 shadow-[0_0_0_1px_var(--color-gold-400)]"
          : "border-sand-dark bg-ivory hover:border-gold-500/55",
      ].join(" ")}
    >
      <span className="text-[0.95rem] font-semibold text-forest-800">{title}</span>
      <span className="text-[0.8rem] text-ink-soft">{detail}</span>
    </button>
  );
}

function Field({
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
      <label className={LABEL} htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        name={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={`mt-2 ${FIELD}`}
        {...rest}
      />
      {hint && !error ? (
        <p id={`${id}-hint`} className="mt-1.5 text-[0.78rem] text-ink-faint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-[0.82rem] text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function formatSlot(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour}${suffix}` : `${hour}:${String(m).padStart(2, "0")}${suffix}`;
}
