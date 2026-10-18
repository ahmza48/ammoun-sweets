import { notFound } from "next/navigation";
import { requireStaff } from "@/server/auth/session";
import { getOrderById } from "@/server/services/orders";
import { formatMoney } from "@/lib/money";
import { formatAuPhone } from "@/lib/validation";
import { formatDayLabel, formatSlotLabel } from "@/server/services/fulfilment";
import { business } from "@/data/business";

export const dynamic = "force-dynamic";

/**
 * Printable order docket for the kitchen and the counter.
 *
 * Plain black on white with no admin chrome — `print:hidden` removes the
 * button, and the layout is sized for a receipt or an A4 sheet. Everything the
 * staff need to pick, pack and hand over is on one page.
 */
export default async function PrintOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaff();
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) notFound();

  return (
    <div className="mx-auto max-w-[21cm] bg-white p-8 text-black print:p-0">
      <div className="mb-6 flex items-start justify-between gap-6 border-b-2 border-black pb-4">
        <div>
          <h1 className="text-2xl font-bold">{order.orderNumber}</h1>
          <p className="mt-1 text-sm">
            {order.createdAt.toLocaleString("en-AU", {
              timeZone: "Australia/Sydney",
              weekday: "short", day: "numeric", month: "short",
              hour: "numeric", minute: "2-digit",
            })}
          </p>
        </div>
        <div className="text-right text-sm">
          <p className="font-bold">{business.name}</p>
          <p>{business.address.street}</p>
          <p>{business.address.suburb} {business.address.state} {business.address.postcode}</p>
          <p>{business.displayPhone}</p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-6 text-sm">
        <div>
          <p className="font-bold uppercase tracking-wide">Customer</p>
          <p className="mt-1">{order.firstName} {order.lastName}</p>
          <p>{formatAuPhone(order.phone)}</p>
          <p className="break-all">{order.email}</p>
        </div>
        <div>
          <p className="font-bold uppercase tracking-wide">
            {order.fulfilmentType === "PICKUP" ? "Collection" : "Delivery"}
          </p>
          {order.fulfilmentType === "PICKUP" ? (
            <p className="mt-1 text-lg font-bold">
              {order.pickupDate && order.pickupTime
                ? `${formatDayLabel(order.pickupDate)} — ${formatSlotLabel(order.pickupTime)}`
                : "Not scheduled"}
            </p>
          ) : (
            <p className="mt-1">
              {order.deliveryAddress1}
              {order.deliveryAddress2 ? <><br />{order.deliveryAddress2}</> : null}
              <br />
              {order.deliverySuburb} {order.deliveryState} {order.deliveryPostcode}
            </p>
          )}
          <p className="mt-2">
            Payment: <strong>{order.paymentStatus === "PAID" ? "PAID" : "TAKE PAYMENT"}</strong>
          </p>
        </div>
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-y-2 border-black text-left">
            <th scope="col" className="py-2">Item</th>
            <th scope="col" className="py-2 text-center">Qty</th>
            <th scope="col" className="py-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id} className="border-b border-neutral-300">
              <td className="py-2.5">
                <span className="font-semibold">{item.productName}</span>
                <br />
                <span className="text-xs">{item.variantName}</span>
              </td>
              <td className="py-2.5 text-center text-lg font-bold">{item.quantity}</td>
              <td className="py-2.5 text-right">{formatMoney(item.total)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-black">
            <td colSpan={2} className="py-2 text-right font-bold">Total</td>
            <td className="py-2 text-right text-lg font-bold">{formatMoney(order.total)}</td>
          </tr>
        </tfoot>
      </table>

      {order.customerNotes ? (
        <div className="mt-6 border-2 border-black p-3">
          <p className="text-xs font-bold uppercase tracking-wide">Customer note</p>
          <p className="mt-1 text-sm">{order.customerNotes}</p>
        </div>
      ) : null}

      <button
        type="button"
        className="mt-8 rounded border border-black px-4 py-2 text-sm font-semibold print:hidden"
      >
        Use your browser&rsquo;s print command (Ctrl/Cmd + P)
      </button>
    </div>
  );
}
