import Link from "next/link";
import { requireStaff } from "@/server/auth/session";
import { getCustomerSummaries } from "@/server/services/analytics";
import { formatMoney } from "@/lib/money";
import { formatAuPhone } from "@/lib/validation";
import { ADMIN_INPUT, Card, EmptyState, PageHeader } from "../ui";

export const dynamic = "force-dynamic";

/**
 * Customers, aggregated from orders.
 *
 * Deliberately derived rather than a separate table: most customers check out
 * as guests, so an accounts-only list would show almost nobody. Grouping by
 * email covers both.
 *
 * Only what the shop needs to serve someone is shown — name, contact, order
 * history. No addresses in the list view.
 */
export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  await requireStaff();
  const { search } = await searchParams;
  const customers = await getCustomerSummaries(search);

  return (
    <>
      <PageHeader title="Customers" description={`${customers.length} shown`} />

      <div className="px-5 py-6 sm:px-8">
        <Card className="mb-5 p-4">
          <form method="GET" className="flex flex-wrap gap-3">
            <label htmlFor="search" className="sr-only">Search customers</label>
            <input
              id="search"
              name="search"
              defaultValue={search ?? ""}
              placeholder="Name, email or phone"
              className={`flex-1 min-w-[14rem] ${ADMIN_INPUT}`}
            />
            <button type="submit" className="rounded-[8px] bg-forest-800 px-4 py-2 text-[0.82rem] font-semibold text-ivory hover:bg-forest-700">
              Search
            </button>
            {search ? (
              <Link href="/admin/customers" className="flex items-center rounded-[8px] border border-forest-800/25 px-3 text-[0.82rem] font-medium text-forest-800 hover:bg-forest-800/5">
                Clear
              </Link>
            ) : null}
          </form>
        </Card>

        <Card className="overflow-hidden">
          {customers.length === 0 ? (
            <EmptyState
              title={search ? "No customers match" : "No customers yet"}
              description={search ? "Try a different search." : "Customers appear here after their first order."}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[44rem] text-left text-[0.85rem]">
                <thead className="border-b border-forest-800/10 bg-[#fbfbfa] text-[0.72rem] uppercase tracking-[0.1em] text-ink-faint">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-semibold">Customer</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Contact</th>
                    <th scope="col" className="px-5 py-3 text-center font-semibold">Orders</th>
                    <th scope="col" className="px-5 py-3 text-right font-semibold">Spent</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Last order</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-forest-800/8">
                  {customers.map((customer) => (
                    <tr key={customer.email} className="transition-colors hover:bg-[#fbfbfa]">
                      <td className="px-5 py-3.5 text-ink">
                        {customer.firstName} {customer.lastName}
                      </td>
                      <td className="px-5 py-3.5">
                        <a href={`mailto:${customer.email}`} className="block break-all text-forest-700 underline-offset-4 hover:underline">
                          {customer.email}
                        </a>
                        <a href={`tel:${customer.phone}`} className="mt-0.5 block text-[0.78rem] text-ink-faint">
                          {formatAuPhone(customer.phone)}
                        </a>
                      </td>
                      <td className="px-5 py-3.5 text-center text-ink">
                        <Link
                          href={`/admin/orders?search=${encodeURIComponent(customer.email)}`}
                          className="font-semibold text-forest-800 underline-offset-4 hover:underline"
                        >
                          {customer.orderCount}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-forest-800">
                        {formatMoney(customer.totalSpend)}
                      </td>
                      <td className="px-5 py-3.5 text-ink-soft">
                        {new Date(customer.lastOrderAt).toLocaleDateString("en-AU", {
                          timeZone: "Australia/Sydney",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
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
