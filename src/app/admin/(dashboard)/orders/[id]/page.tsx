import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/server/auth/session";
import {
  allowedTransitions,
  getOrderById,
  getOrderNotes,
  getOrderTimeline,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
} from "@/server/services/orders";
import { formatMoney } from "@/lib/money";
import { formatAuPhone } from "@/lib/validation";
import { formatDayLabel, formatSlotLabel } from "@/server/services/fulfilment";
import { Card, OrderStatusBadge, PageHeader, PaymentStatusBadge } from "../../ui";
import { OrderActions } from "./OrderActions";

export const dynamic = "force-dynamic";

/**
 * Single order — everything the shop needs to prepare and hand it over.
 *
 * Internal notes are visually separated from customer-visible ones, because
 * "customer called, wants it earlier" must never end up in an email.
 */
export default async function AdminOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaff();
  const { id } = await params;

  const order = await getOrderById(id);
  if (!order) notFound();

  const [notes, timeline] = await Promise.all([getOrderNotes(id), getOrderTimeline(id)]);
  const transitions = allowedTransitions(order);

  return (
    <>
      <PageHeader
        title={order.orderNumber}
        description={order.createdAt.toLocaleString("en-AU", {
          timeZone: "Australia/Sydney",
          weekday: "short",
          day: "numeric",
          month: "short",
          hour: "numeric",
          minute: "2-digit",
        })}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/admin/orders/${id}/print`}
              className="rounded-[8px] border border-forest-800/25 px-4 py-2.5 text-[0.82rem] font-semibold text-forest-800 transition-colors hover:bg-forest-800/5"
            >
              Print
            </Link>
            <Link
              href="/admin/orders"
              className="rounded-[8px] border border-forest-800/25 px-4 py-2.5 text-[0.82rem] font-semibold text-forest-800 transition-colors hover:bg-forest-800/5"
            >
              All orders
            </Link>
          </div>
        }
      />

      <div className="grid gap-5 px-5 py-6 sm:px-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          {/* ── Status ─────────────────────────────────────────────── */}
          <Card className="p-5">
            <div className="flex flex-wrap items-center gap-2">
              <OrderStatusBadge
                status={order.orderStatus}
                label={ORDER_STATUS_LABELS[order.orderStatus]}
              />
              <PaymentStatusBadge
                status={order.paymentStatus}
                label={PAYMENT_STATUS_LABELS[order.paymentStatus]}
              />
              {order.refundedAmount > 0 ? (
                <span className="text-[0.8rem] text-ink-soft">
                  {formatMoney(order.refundedAmount)} refunded
                </span>
              ) : null}
            </div>

            <OrderActions
              orderId={id}
              transitions={transitions}
              unpaid={order.paymentStatus !== "PAID"}
            />
          </Card>

          {/* ── Items ──────────────────────────────────────────────── */}
          <Card className="overflow-hidden">
            <h2 className="border-b border-forest-800/10 px-5 py-3.5 text-[0.95rem] font-semibold text-forest-800">
              Items
            </h2>
            <table className="w-full text-left text-[0.85rem]">
              <thead className="border-b border-forest-800/10 bg-[#fbfbfa] text-[0.72rem] uppercase tracking-[0.1em] text-ink-faint">
                <tr>
                  <th scope="col" className="px-5 py-2.5 font-semibold">Item</th>
                  <th scope="col" className="px-5 py-2.5 text-center font-semibold">Qty</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-semibold">Each</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-forest-800/8">
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-5 py-3">
                      <p className="font-medium text-ink">{item.productName}</p>
                      <p className="text-[0.78rem] text-ink-faint">
                        {item.variantName}
                        {item.sku ? ` · ${item.sku}` : ""}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-center text-ink">{item.quantity}</td>
                    <td className="px-5 py-3 text-right text-ink-soft">
                      {formatMoney(item.unitPrice)}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-forest-800">
                      {formatMoney(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <dl className="space-y-1.5 border-t border-forest-800/10 px-5 py-4 text-[0.85rem]">
              <Row label="Subtotal" value={formatMoney(order.subtotal)} />
              {order.discount > 0 ? (
                <Row
                  label={`Discount${order.couponCode ? ` (${order.couponCode})` : ""}`}
                  value={`−${formatMoney(order.discount)}`}
                />
              ) : null}
              {order.deliveryFee > 0 ? (
                <Row label="Delivery" value={formatMoney(order.deliveryFee)} />
              ) : null}
              {order.tax > 0 ? <Row label="Tax" value={formatMoney(order.tax)} /> : null}
              <div className="flex justify-between border-t border-forest-800/10 pt-2">
                <dt className="font-semibold text-forest-800">Total</dt>
                <dd className="font-display text-[1.2rem] font-semibold text-forest-800">
                  {formatMoney(order.total)}
                </dd>
              </div>
            </dl>
          </Card>

          {/* ── Notes ──────────────────────────────────────────────── */}
          <Card className="p-5">
            <h2 className="text-[0.95rem] font-semibold text-forest-800">Notes</h2>

            {order.customerNotes ? (
              <div className="mt-3 rounded-[8px] border border-sky-200 bg-sky-50 px-4 py-3">
                <p className="text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-sky-900">
                  From the customer
                </p>
                <p className="mt-1 text-[0.88rem] leading-relaxed text-sky-950">
                  {order.customerNotes}
                </p>
              </div>
            ) : null}

            {notes.length > 0 ? (
              <ul className="mt-3 space-y-2.5">
                {notes.map(({ note, authorEmail }) => (
                  <li
                    key={note.id}
                    className={`rounded-[8px] border px-4 py-3 ${
                      note.customerVisible
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-forest-800/12 bg-[#fbfbfa]"
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2 text-[0.72rem] text-ink-faint">
                      <span>{authorEmail ?? "Staff"}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {note.createdAt.toLocaleString("en-AU", {
                          timeZone: "Australia/Sydney",
                          day: "numeric",
                          month: "short",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 font-semibold ${
                          note.customerVisible
                            ? "bg-emerald-100 text-emerald-900"
                            : "bg-neutral-200 text-neutral-700"
                        }`}
                      >
                        {note.customerVisible ? "Customer can see this" : "Internal"}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[0.88rem] leading-relaxed text-ink">{note.body}</p>
                  </li>
                ))}
              </ul>
            ) : null}

            <OrderActions orderId={id} transitions={[]} noteOnly />
          </Card>
        </div>

        {/* ── Sidebar ──────────────────────────────────────────────── */}
        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="text-[0.95rem] font-semibold text-forest-800">Customer</h2>
            <p className="mt-2.5 text-[0.95rem] text-ink">
              {order.firstName} {order.lastName}
            </p>
            <p className="mt-1 text-[0.85rem]">
              <a
                href={`tel:${order.phone}`}
                className="text-forest-700 underline underline-offset-4"
              >
                {formatAuPhone(order.phone)}
              </a>
            </p>
            <p className="mt-1 text-[0.85rem]">
              <a
                href={`mailto:${order.email}`}
                className="break-all text-forest-700 underline underline-offset-4"
              >
                {order.email}
              </a>
            </p>
          </Card>

          <Card className="p-5">
            <h2 className="text-[0.95rem] font-semibold text-forest-800">
              {order.fulfilmentType === "PICKUP" ? "Collection" : "Delivery"}
            </h2>
            {order.fulfilmentType === "PICKUP" ? (
              <p className="mt-2.5 text-[0.95rem] text-ink">
                {order.pickupDate && order.pickupTime
                  ? `${formatDayLabel(order.pickupDate)} at ${formatSlotLabel(order.pickupTime)}`
                  : "Not scheduled"}
              </p>
            ) : (
              <address className="mt-2.5 not-italic text-[0.9rem] leading-relaxed text-ink">
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
          </Card>

          <Card className="p-5">
            <h2 className="text-[0.95rem] font-semibold text-forest-800">Payment</h2>
            <dl className="mt-2.5 space-y-1.5 text-[0.85rem]">
              <Row label="Method" value={order.paymentProvider ?? "—"} />
              <Row
                label="Paid at"
                value={
                  order.paidAt
                    ? order.paidAt.toLocaleString("en-AU", {
                        timeZone: "Australia/Sydney",
                        day: "numeric",
                        month: "short",
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    : "—"
                }
              />
            </dl>
          </Card>

          <Card className="p-5">
            <h2 className="text-[0.95rem] font-semibold text-forest-800">History</h2>
            <ol className="mt-3 space-y-3">
              {timeline.map((event) => (
                <li key={event.id} className="flex gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-forest-700/40"
                  />
                  <div>
                    <p className="text-[0.85rem] leading-snug text-ink">{event.message}</p>
                    <p className="mt-0.5 text-[0.72rem] text-ink-faint">
                      {event.createdAt.toLocaleString("en-AU", {
                        timeZone: "Australia/Sydney",
                        day: "numeric",
                        month: "short",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-ink-faint">{label}</dt>
      <dd className="text-right text-ink">{value}</dd>
    </div>
  );
}
