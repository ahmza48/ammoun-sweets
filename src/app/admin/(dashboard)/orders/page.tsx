import Link from "next/link";
import { requireStaff } from "@/server/auth/session";
import {
  adminListOrders,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
} from "@/server/services/orders";
import { formatMoney } from "@/lib/money";
import { formatAuPhone } from "@/lib/validation";
import type { OrderStatus, PaymentStatus } from "@/server/db/schema";
import {
  ADMIN_INPUT,
  Card,
  EmptyState,
  OrderStatusBadge,
  PageHeader,
  PaymentStatusBadge,
} from "../ui";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  search?: string;
  orderStatus?: string;
  paymentStatus?: string;
  fulfilmentType?: string;
  from?: string;
  to?: string;
  page?: string;
}>;

/**
 * Orders list.
 *
 * Filters live in the URL rather than component state, so the shop can
 * bookmark "unpaid pickups" or share a filtered view, and paging survives a
 * refresh. Pagination is server-side — a busy shop will have thousands of rows
 * and this table must never try to render them all.
 */
export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireStaff();
  const params = await searchParams;

  const result = await adminListOrders({
    search: params.search,
    orderStatus: params.orderStatus as OrderStatus | undefined,
    paymentStatus: params.paymentStatus as PaymentStatus | undefined,
    fulfilmentType: params.fulfilmentType as "PICKUP" | "DELIVERY" | undefined,
    from: params.from,
    to: params.to,
    page: Number(params.page ?? 1) || 1,
  });

  const hasFilters = Boolean(
    params.search ||
      params.orderStatus ||
      params.paymentStatus ||
      params.fulfilmentType ||
      params.from,
  );

  return (
    <>
      <PageHeader
        title="Orders"
        description={`${result.total} order${result.total === 1 ? "" : "s"}`}
      />

      <div className="px-5 py-6 sm:px-8">
        <Card className="mb-5 p-4">
          <form method="GET" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <label htmlFor="search" className="sr-only">
                Search orders
              </label>
              <input
                id="search"
                name="search"
                defaultValue={params.search ?? ""}
                placeholder="Order number, name, email or phone"
                className={ADMIN_INPUT}
              />
            </div>

            <div>
              <label htmlFor="orderStatus" className="sr-only">
                Order status
              </label>
              <select
                id="orderStatus"
                name="orderStatus"
                defaultValue={params.orderStatus ?? ""}
                className={ADMIN_INPUT}
              >
                <option value="">All statuses</option>
                {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="paymentStatus" className="sr-only">
                Payment status
              </label>
              <select
                id="paymentStatus"
                name="paymentStatus"
                defaultValue={params.paymentStatus ?? ""}
                className={ADMIN_INPUT}
              >
                <option value="">All payments</option>
                {Object.entries(PAYMENT_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 rounded-[8px] bg-forest-800 px-4 py-2 text-[0.82rem] font-semibold text-ivory transition-colors hover:bg-forest-700"
              >
                Filter
              </button>
              {hasFilters ? (
                <Link
                  href="/admin/orders"
                  className="flex items-center rounded-[8px] border border-forest-800/25 px-3 text-[0.82rem] font-medium text-forest-800 hover:bg-forest-800/5"
                >
                  Clear
                </Link>
              ) : null}
            </div>
          </form>
        </Card>

        <Card className="overflow-hidden">
          {result.orders.length === 0 ? (
            <EmptyState
              title={hasFilters ? "No orders match those filters" : "No orders yet"}
              description={
                hasFilters
                  ? "Try widening the search or clearing the filters."
                  : "Orders placed on the website will appear here straight away."
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[52rem] text-left text-[0.85rem]">
                <thead className="border-b border-forest-800/10 bg-[#fbfbfa] text-[0.72rem] uppercase tracking-[0.1em] text-ink-faint">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-semibold">Order</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Customer</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Fulfilment</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Payment</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Status</th>
                    <th scope="col" className="px-5 py-3 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-forest-800/8">
                  {result.orders.map((order) => (
                    <tr key={order.id} className="transition-colors hover:bg-[#fbfbfa]">
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="font-semibold text-forest-800 underline-offset-4 hover:underline"
                        >
                          {order.orderNumber}
                        </Link>
                        <p className="mt-0.5 text-[0.75rem] text-ink-faint">
                          {order.createdAt.toLocaleString("en-AU", {
                            timeZone: "Australia/Sydney",
                            day: "numeric",
                            month: "short",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-ink">
                          {order.firstName} {order.lastName}
                        </p>
                        <p className="mt-0.5 text-[0.75rem] text-ink-faint">
                          {formatAuPhone(order.phone)}
                        </p>
                      </td>
                      <td className="px-5 py-3.5 text-ink-soft">
                        {order.fulfilmentType === "PICKUP" ? "Pickup" : "Delivery"}
                        {order.pickupDate ? (
                          <p className="mt-0.5 text-[0.75rem] text-ink-faint">
                            {order.pickupDate} {order.pickupTime}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-5 py-3.5">
                        <PaymentStatusBadge
                          status={order.paymentStatus}
                          label={PAYMENT_STATUS_LABELS[order.paymentStatus]}
                        />
                      </td>
                      <td className="px-5 py-3.5">
                        <OrderStatusBadge
                          status={order.orderStatus}
                          label={ORDER_STATUS_LABELS[order.orderStatus]}
                        />
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-forest-800">
                        {formatMoney(order.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {result.pageCount > 1 ? (
          <nav aria-label="Pagination" className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {Array.from({ length: result.pageCount }, (_, i) => i + 1).map((n) => {
              const query = new URLSearchParams(
                Object.entries(params).filter(([, v]) => Boolean(v)) as [string, string][],
              );
              query.set("page", String(n));
              return (
                <Link
                  key={n}
                  href={`/admin/orders?${query.toString()}`}
                  aria-current={n === result.page ? "page" : undefined}
                  className={[
                    "rounded-[8px] px-3 py-1.5 text-[0.82rem] font-medium transition-colors",
                    n === result.page
                      ? "bg-forest-800 text-ivory"
                      : "border border-forest-800/20 text-forest-800 hover:bg-forest-800/5",
                  ].join(" ")}
                >
                  {n}
                </Link>
              );
            })}
          </nav>
        ) : null}
      </div>
    </>
  );
}
