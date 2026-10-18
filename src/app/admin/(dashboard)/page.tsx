import Link from "next/link";
import { requireStaff } from "@/server/auth/session";
import { getDashboardStats, getRecentOrders } from "@/server/services/analytics";
import { describeEnvironment } from "@/server/env";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/server/services/orders";
import { formatMoney } from "@/lib/money";
import { formatAuPhone } from "@/lib/validation";
import {
  ADMIN_BUTTON,
  ADMIN_BUTTON_SECONDARY,
  Card,
  EmptyState,
  OrderStatusBadge,
  PageHeader,
  PaymentStatusBadge,
  StatCard,
} from "./ui";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  // The layout already guards, but a page is its own entry point.
  await requireStaff();

  const [stats, recent] = await Promise.all([getDashboardStats(), getRecentOrders(8)]);
  const environment = describeEnvironment();

  return (
    <>
      <PageHeader
        title="Today"
        description="What's happening in the shop right now."
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/products/new" className={ADMIN_BUTTON}>
              Add product
            </Link>
            <Link href="/admin/orders" className={ADMIN_BUTTON_SECONDARY}>
              View orders
            </Link>
          </div>
        }
      />

      <div className="px-5 py-6 sm:px-8">
        {/* ── Setup warnings ───────────────────────────────────────── */}
        {environment.missingForProduction.length > 0 ? (
          <Card className="mb-6 border-amber-300 bg-amber-50 p-5">
            <h2 className="text-[0.95rem] font-semibold text-amber-900">
              Not ready for live orders yet
            </h2>
            <p className="mt-1.5 text-[0.85rem] leading-relaxed text-amber-900/85">
              The shop is running in development mode. These still need to be configured
              before taking real payments:
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {environment.missingForProduction.map((item) => (
                <li
                  key={item}
                  className="rounded-full border border-amber-300 bg-white px-3 py-1 text-[0.75rem] font-medium text-amber-900"
                >
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        {stats.unpricedProducts > 0 ? (
          <Card className="mb-6 border-sky-300 bg-sky-50 p-5">
            <h2 className="text-[0.95rem] font-semibold text-sky-900">
              {stats.unpricedProducts} item{stats.unpricedProducts === 1 ? " needs" : "s need"} a
              price
            </h2>
            <p className="mt-1.5 text-[0.85rem] leading-relaxed text-sky-900/85">
              These were brought across from the old menu without a confirmed price, so they
              are switched off until you set one.
            </p>
            <Link
              href="/admin/products"
              className="mt-3 inline-block text-[0.82rem] font-semibold text-sky-900 underline underline-offset-4"
            >
              Set prices
            </Link>
          </Card>
        ) : null}

        {/* ── Stats ────────────────────────────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Orders today" value={String(stats.ordersToday)} />
          <StatCard
            label="Takings today"
            value={formatMoney(stats.revenueToday)}
            hint="Excludes cancelled orders"
          />
          <StatCard
            label="Preparing"
            value={String(stats.preparing)}
            hint="Confirmed and in progress"
          />
          <StatCard
            label="Ready"
            value={String(stats.readyForPickup + stats.outForDelivery)}
            hint="Waiting for the customer"
          />
        </div>

        {(stats.pendingPayment > 0 || stats.newEnquiries > 0 || stats.lowStock.length > 0) && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {stats.pendingPayment > 0 ? (
              <Card className="p-5">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                  Awaiting payment
                </p>
                <p className="mt-2 font-display text-[1.6rem] text-forest-800">
                  {stats.pendingPayment}
                </p>
                <Link
                  href="/admin/orders?paymentStatus=PENDING"
                  className="mt-2 inline-block text-[0.8rem] font-medium text-forest-700 underline underline-offset-4"
                >
                  Review
                </Link>
              </Card>
            ) : null}

            {stats.newEnquiries > 0 ? (
              <Card className="p-5">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                  New catering enquiries
                </p>
                <p className="mt-2 font-display text-[1.6rem] text-forest-800">
                  {stats.newEnquiries}
                </p>
                <Link
                  href="/admin/enquiries"
                  className="mt-2 inline-block text-[0.8rem] font-medium text-forest-700 underline underline-offset-4"
                >
                  Open
                </Link>
              </Card>
            ) : null}

            {stats.lowStock.length > 0 ? (
              <Card className="p-5">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                  Running low
                </p>
                <ul className="mt-2 space-y-1.5 text-[0.85rem]">
                  {stats.lowStock.slice(0, 4).map((item) => (
                    <li
                      key={`${item.productName}-${item.variantName}`}
                      className="flex justify-between gap-3"
                    >
                      <span className="truncate text-ink">
                        {item.productName}{" "}
                        <span className="text-ink-faint">{item.variantName}</span>
                      </span>
                      <span className="shrink-0 font-semibold text-amber-800">
                        {item.stock}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}
          </div>
        )}

        {/* ── Recent orders ────────────────────────────────────────── */}
        <Card className="mt-6 overflow-hidden">
          <div className="flex items-center justify-between border-b border-forest-800/10 px-5 py-3.5">
            <h2 className="text-[0.95rem] font-semibold text-forest-800">Recent orders</h2>
            <Link
              href="/admin/orders"
              className="text-[0.8rem] font-medium text-forest-700 underline underline-offset-4"
            >
              See all
            </Link>
          </div>

          {recent.length === 0 ? (
            <EmptyState
              title="No orders yet"
              description="Orders placed on the website will appear here as soon as they come in."
              action={{ href: "/menu", label: "View the shop" }}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[46rem] text-left text-[0.85rem]">
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
                  {recent.map((order) => (
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
      </div>
    </>
  );
}
