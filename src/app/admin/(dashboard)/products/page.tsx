import Link from "next/link";
import { requireStaff } from "@/server/auth/session";
import { adminListProducts } from "@/server/services/catalog";
import { formatMoney } from "@/lib/money";
import { ADMIN_BUTTON, Badge, Card, EmptyState, PageHeader } from "../ui";
import { AvailabilityToggle } from "./AvailabilityToggle";

export const dynamic = "force-dynamic";

/**
 * Product list.
 *
 * Built around the two things a shop does most often: seeing what is live, and
 * flipping something to "sold out" the moment the tray empties. The sold-out
 * toggle is inline — making the owner open an edit form to do it ten times a
 * day would guarantee the menu goes stale.
 */
export default async function AdminProductsPage() {
  await requireStaff();
  const products = await adminListProducts();

  const live = products.filter((p) => !p.archivedAt);
  const archived = products.filter((p) => p.archivedAt);
  const needsPrice = live.filter((p) => p.variants.every((v) => v.price === 0));

  return (
    <>
      <PageHeader
        title="Products"
        description={`${live.length} on the menu${archived.length > 0 ? ` · ${archived.length} archived` : ""}`}
        action={
          <Link href="/admin/products/new" className={ADMIN_BUTTON}>
            Add product
          </Link>
        }
      />

      <div className="px-5 py-6 sm:px-8">
        {needsPrice.length > 0 ? (
          <Card className="mb-5 border-sky-300 bg-sky-50 p-4">
            <p className="text-[0.88rem] leading-relaxed text-sky-900">
              <strong>{needsPrice.length}</strong> product
              {needsPrice.length === 1 ? "" : "s"} came across from the old menu without a
              confirmed price. They stay off the menu until you set one.
            </p>
          </Card>
        ) : null}

        <Card className="overflow-hidden">
          {live.length === 0 ? (
            <EmptyState
              title="No products yet"
              description="Add your first product and it will appear on the menu straight away."
              action={{ href: "/admin/products/new", label: "Add product" }}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[48rem] text-left text-[0.85rem]">
                <thead className="border-b border-forest-800/10 bg-[#fbfbfa] text-[0.72rem] uppercase tracking-[0.1em] text-ink-faint">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-semibold">Product</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Category</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Sizes &amp; prices</th>
                    <th scope="col" className="px-5 py-3 font-semibold">State</th>
                    <th scope="col" className="px-5 py-3 text-right font-semibold">Today</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-forest-800/8">
                  {live.map((product) => (
                    <tr key={product.id} className="transition-colors hover:bg-[#fbfbfa]">
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/admin/products/${product.id}`}
                          className="font-semibold text-forest-800 underline-offset-4 hover:underline"
                        >
                          {product.name}
                        </Link>
                        {product.featured ? (
                          <span className="ml-2 text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-gold-700">
                            Featured
                          </span>
                        ) : null}
                      </td>
                      <td className="px-5 py-3.5 text-ink-soft">
                        {product.categoryName ?? "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap gap-1.5">
                          {product.variants.length === 0 ? (
                            <span className="text-[0.8rem] text-red-700">No sizes</span>
                          ) : (
                            product.variants.map((variant) => (
                              <span
                                key={variant.id}
                                className={`rounded-full border px-2 py-0.5 text-[0.72rem] ${
                                  variant.active && variant.price > 0
                                    ? "border-forest-800/20 bg-white text-ink"
                                    : "border-amber-300 bg-amber-50 text-amber-900"
                                }`}
                              >
                                {variant.name}{" "}
                                {variant.price > 0 ? formatMoney(variant.price) : "needs price"}
                                {variant.inventoryTracked ? ` · ${variant.stockQuantity} left` : ""}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {product.active ? (
                          <Badge tone="good">Published</Badge>
                        ) : (
                          <Badge tone="neutral">Draft</Badge>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <AvailabilityToggle
                          productId={product.id}
                          available={product.available}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {archived.length > 0 ? (
          <Card className="mt-5 p-5">
            <h2 className="text-[0.95rem] font-semibold text-forest-800">Archived</h2>
            <p className="mt-1 text-[0.82rem] text-ink-soft">
              Off the menu, but kept so past orders still show what was bought.
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {archived.map((product) => (
                <li key={product.id}>
                  <Link
                    href={`/admin/products/${product.id}`}
                    className="rounded-full border border-forest-800/20 px-3 py-1.5 text-[0.8rem] text-ink-soft transition-colors hover:bg-forest-800/5"
                  >
                    {product.name}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
      </div>
    </>
  );
}
