import type { Metadata } from "next";
import Link from "next/link";
import { Ornament } from "@/components/Ornament";
import { formatMoney } from "@/lib/money";
import { formatWeight, sumWeight } from "@/lib/weight";
import { formatAuPhone } from "@/lib/validation";
import { business } from "@/data/business";
import { readOrderAccess } from "@/app/checkout/actions";
import { getOrderForCustomer } from "@/server/services/orders";
import { ORDER_STATUS_LABELS } from "@/server/services/orders";
import { formatDayLabel, formatSlotLabel } from "@/server/services/fulfilment";
import { OrderLookupForm } from "./OrderLookupForm";

export const metadata: Metadata = {
  title: "Your order",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Order confirmation and status.
 *
 * ── Why this isn't just /orders/AS-10482 ──────────────────────────────────
 * Order numbers are sequential and guessable. If the number alone were enough
 * to view an order, anyone could walk the range and read every customer's
 * name, phone number and delivery address.
 *
 * So the page needs the number *and* the email that placed it. Straight after
 * checkout that pairing comes from a short-lived httpOnly cookie, so the
 * customer sees their confirmation without typing anything; anyone arriving
 * later — a bookmarked link, a forwarded URL — is asked for the email.
 */

type PageProps = {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ email?: string }>;
};

export default async function OrderPage({ params, searchParams }: PageProps) {
  const { orderNumber } = await params;
  const { email: emailFromQuery } = await searchParams;

  const remembered = await readOrderAccess();
  const email =
    emailFromQuery ??
    (remembered?.orderNumber === orderNumber ? remembered.email : undefined);

  if (!email) {
    return <OrderLookupForm orderNumber={orderNumber} />;
  }

  const order = await getOrderForCustomer(orderNumber, email);
  if (!order) {
    // One message for "wrong email" and "no such order" — anything more
    // specific confirms whether an order number exists.
    return <OrderLookupForm orderNumber={orderNumber} notFoundMessage />;
  }

  const paid = order.paymentStatus === "PAID";
  const cancelled = order.orderStatus === "CANCELLED";

  const { totalGrams, unweighedLines } = sumWeight(order.items);

  return (
    <div className="bg-cream pt-[4.5rem] lg:pt-[5.25rem]">
      <section className="container-narrow py-12 sm:py-16">
        <div className="text-center">
          <p className="eyebrow text-gold-700">
            {cancelled ? "Order cancelled" : "Thank you"}
          </p>
          <h1 className="mt-4 font-display text-[2.2rem] leading-tight text-forest-800 sm:text-[2.8rem]">
            {cancelled ? "This order was cancelled" : "We've got your order"}
          </h1>
          <Ornament width="sm" className="mx-auto mt-5" />
          <p className="mt-5 text-[1rem] leading-[1.75] text-ink-soft">
            Order <strong className="text-forest-800">{order.orderNumber}</strong>
            {!cancelled ? (
              <>
                {" "}
                &middot; we&rsquo;ve emailed a copy to{" "}
                <span className="text-forest-800">{order.email}</span>
              </>
            ) : null}
          </p>
        </div>

        {/* ── Status ─────────────────────────────────────────────────── */}
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <StatusPill
            label={ORDER_STATUS_LABELS[order.orderStatus]}
            tone={cancelled ? "muted" : "green"}
          />
          <StatusPill
            label={paid ? "Paid" : "Payment on collection"}
            tone={paid ? "gold" : "muted"}
          />
        </div>

        {/* ── Fulfilment ─────────────────────────────────────────────── */}
        <div className="mt-9 rounded-[var(--radius-lg-card)] border border-sand-dark bg-ivory p-6 sm:p-8">
          <h2 className="eyebrow text-gold-700">
            {order.fulfilmentType === "PICKUP" ? "Collection" : "Delivery"}
          </h2>

          {order.fulfilmentType === "PICKUP" ? (
            <>
              <p className="mt-3 font-display text-[1.5rem] leading-tight text-forest-800">
                {order.pickupDate && order.pickupTime
                  ? `${formatDayLabel(order.pickupDate)} at ${formatSlotLabel(order.pickupTime)}`
                  : "We'll confirm a time with you"}
              </p>
              <address className="mt-3 not-italic text-[0.95rem] leading-[1.7] text-ink-soft">
                {business.address.shop}, {business.address.street}
                <br />
                {business.address.suburb} {business.address.state}{" "}
                {business.address.postcode}
              </address>
            </>
          ) : (
            <address className="mt-3 not-italic text-[1rem] leading-[1.7] text-forest-800">
              {order.deliveryAddress1}
              {order.deliveryAddress2 ? (
                <>
                  <br />
                  {order.deliveryAddress2}
                </>
              ) : null}
              <br />
              {order.deliverySuburb} {order.deliveryState} {order.deliveryPostcode}
            </address>
          )}

          {order.customerNotes ? (
            <p className="mt-4 rounded-[10px] bg-sand/60 px-4 py-3 text-[0.9rem] leading-relaxed text-ink-soft">
              <span className="font-semibold text-forest-800">Your note:</span>{" "}
              {order.customerNotes}
            </p>
          ) : null}
        </div>

        {/* ── Items ──────────────────────────────────────────────────── */}
        <div className="mt-6 rounded-[var(--radius-lg-card)] border border-sand-dark bg-ivory p-6 sm:p-8">
          <h2 className="eyebrow text-gold-700">Your items</h2>

          <ul className="mt-4 divide-y divide-sand-dark/70">
            {order.items.map((item) => (
              <li key={item.id} className="flex gap-3 py-3.5">
                <span className="flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full bg-forest-800/8 text-[0.78rem] font-semibold text-forest-800">
                  {item.quantity}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.98rem] font-medium leading-snug text-forest-800">
                    {item.productName}
                  </p>
                  <p className="text-[0.82rem] text-ink-faint">{item.variantName}</p>
                </div>
                <span className="text-[0.95rem] text-forest-800">
                  {formatMoney(item.total)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="mt-4 space-y-2 border-t border-sand-dark pt-4 text-[0.95rem]">
            {totalGrams > 0 ? (
              <SummaryRow
                label={unweighedLines > 0 ? "Total weight (weighed items)" : "Total weight"}
                value={formatWeight(totalGrams)}
              />
            ) : null}
            <SummaryRow label="Subtotal" value={formatMoney(order.subtotal)} />
            {order.discount > 0 ? (
              <SummaryRow
                label={`Discount${order.couponCode ? ` (${order.couponCode})` : ""}`}
                value={`−${formatMoney(order.discount)}`}
              />
            ) : null}
            {order.deliveryFee > 0 ? (
              <SummaryRow label="Delivery" value={formatMoney(order.deliveryFee)} />
            ) : null}
            <div className="flex items-baseline justify-between border-t border-sand-dark pt-3">
              <dt className="font-display text-[1.15rem] font-semibold text-forest-800">
                Total
              </dt>
              <dd className="font-display text-[1.45rem] font-semibold text-forest-800">
                {formatMoney(order.total)}
              </dd>
            </div>
          </dl>
        </div>

        {/* ── Next steps ─────────────────────────────────────────────── */}
        {!cancelled ? (
          <div className="mt-6 rounded-[var(--radius-lg-card)] border border-gold-500/35 bg-gold-400/10 p-6 sm:p-8">
            <h2 className="eyebrow text-gold-700">What happens next</h2>
            <ol className="mt-3 space-y-2 text-[0.95rem] leading-[1.7] text-ink-soft">
              <li>We&rsquo;ll confirm your order and start preparing it.</li>
              <li>
                You&rsquo;ll get an email when it&rsquo;s{" "}
                {order.fulfilmentType === "PICKUP" ? "ready to collect" : "on its way"}.
              </li>
              {!paid ? <li>Pay in the shop when you collect — cash or card.</li> : null}
            </ol>
            <p className="mt-4 text-[0.9rem] leading-relaxed text-ink-soft">
              Any questions, call us on{" "}
              <a
                href={`tel:${business.phone}`}
                className="font-semibold text-forest-800 underline underline-offset-4"
              >
                {formatAuPhone(business.phone)}
              </a>{" "}
              and quote {order.orderNumber}.
            </p>
          </div>
        ) : null}

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link
            href="/menu"
            className="rounded-full border border-forest-800/25 px-6 py-3 text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-forest-800 transition-colors duration-300 hover:bg-forest-800/5"
          >
            Back to the Menu
          </Link>
        </div>
      </section>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="text-forest-800">{value}</dd>
    </div>
  );
}

function StatusPill({ label, tone }: { label: string; tone: "green" | "gold" | "muted" }) {
  const styles = {
    green: "border-forest-700/35 bg-forest-800/8 text-forest-800",
    gold: "border-gold-500/45 bg-gold-400/15 text-gold-700",
    muted: "border-sand-dark bg-sand/60 text-ink-soft",
  }[tone];

  return (
    <span
      className={`eyebrow inline-flex items-center gap-2 rounded-full border px-4 py-2 ${styles}`}
    >
      {label}
    </span>
  );
}
