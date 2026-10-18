"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { archiveProduct, restoreProduct, saveProduct, type ActionState } from "../actions";
import { ADMIN_BUTTON, ADMIN_BUTTON_SECONDARY, ADMIN_INPUT, ADMIN_LABEL, Card } from "../ui";
import { centsToInput } from "@/lib/money";
import type { ProductView } from "@/server/services/catalog";
import type { Category } from "@/server/db/schema";
import { images } from "@/data/images";

/**
 * Product editor.
 *
 * Variants are the interesting part: Ammoun Sweets sells the same sweet by the
 * half kilo, the kilo and the tray, each at its own price, so the form is
 * built around adding and repricing sizes without a developer.
 *
 * Prices are typed in dollars and converted to cents by the server action —
 * the database never stores a float.
 */

type VariantRow = {
  key: string;
  id: string;
  name: string;
  sku: string;
  price: string;
  /** Grams, as typed. Blank means "not sold by weight" — never assume a value. */
  weightGrams: string;
  active: boolean;
  inventoryTracked: boolean;
  stockQuantity: string;
};

const initial: ActionState = { status: "idle" };

function toRows(product?: ProductView | null): VariantRow[] {
  if (!product || product.variants.length === 0) {
    return [
      {
        key: crypto.randomUUID(),
        id: "new",
        name: "Half kg",
        sku: "",
        price: "",
        weightGrams: "500",
        active: true,
        inventoryTracked: false,
        stockQuantity: "0",
      },
    ];
  }
  return product.variants.map((v) => ({
    key: v.id,
    id: v.id,
    name: v.name,
    sku: v.sku ?? "",
    price: v.price > 0 ? centsToInput(v.price) : "",
    weightGrams: v.weightGrams === null ? "" : String(v.weightGrams),
    active: v.active,
    inventoryTracked: v.inventoryTracked,
    stockQuantity: String(v.stockQuantity),
  }));
}

export function ProductForm({
  product,
  categories,
}: {
  product?: ProductView | null;
  categories: Category[];
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    saveProduct.bind(null, product?.id ?? null),
    initial,
  );
  const [variants, setVariants] = useState<VariantRow[]>(() => toRows(product));

  const imageKeys = Object.keys(images);
  const error = (key: string) => state.fieldErrors?.[key];

  return (
    <form action={formAction} className="grid gap-5 px-5 py-6 sm:px-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <div className="space-y-5">
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

        {/* ── Basics ─────────────────────────────────────────────── */}
        <Card className="p-5">
          <h2 className="text-[0.95rem] font-semibold text-forest-800">Details</h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={ADMIN_LABEL} htmlFor="name">Name</label>
              <input id="name" name="name" required defaultValue={product?.name ?? ""} className={`mt-1.5 ${ADMIN_INPUT}`} />
              {error("name") ? <p className="mt-1 text-[0.8rem] text-red-700">{error("name")}</p> : null}
            </div>

            <div>
              <label className={ADMIN_LABEL} htmlFor="alsoKnownAs">Arabic name (optional)</label>
              <input id="alsoKnownAs" name="alsoKnownAs" defaultValue={product?.alsoKnownAs ?? ""} className={`mt-1.5 ${ADMIN_INPUT}`} dir="auto" />
            </div>

            <div>
              <label className={ADMIN_LABEL} htmlFor="categoryId">Category</label>
              <select id="categoryId" name="categoryId" defaultValue={product?.categoryId ?? ""} className={`mt-1.5 ${ADMIN_INPUT}`}>
                <option value="">No category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className={ADMIN_LABEL} htmlFor="shortDescription">Short description</label>
              <input id="shortDescription" name="shortDescription" maxLength={500} defaultValue={product?.shortDescription ?? ""} className={`mt-1.5 ${ADMIN_INPUT}`} />
              <p className="mt-1 text-[0.75rem] text-ink-faint">Shown on the menu card.</p>
            </div>

            <div className="sm:col-span-2">
              <label className={ADMIN_LABEL} htmlFor="description">Full description</label>
              <textarea id="description" name="description" rows={4} maxLength={5000} defaultValue={product?.description ?? ""} className={`mt-1.5 resize-y ${ADMIN_INPUT}`} />
            </div>
          </div>
        </Card>

        {/* ── Variants ───────────────────────────────────────────── */}
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[0.95rem] font-semibold text-forest-800">Sizes &amp; prices</h2>
              <p className="mt-1 text-[0.8rem] text-ink-soft">
                Each size has its own price. Prices are in dollars.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setVariants((rows) => [
                  ...rows,
                  {
                    key: crypto.randomUUID(),
                    id: "new",
                    name: "",
                    sku: "",
                    price: "",
                    weightGrams: "",
                    active: true,
                    inventoryTracked: false,
                    stockQuantity: "0",
                  },
                ])
              }
              className={ADMIN_BUTTON_SECONDARY}
            >
              Add size
            </button>
          </div>

          {error("variants") ? (
            <p className="mt-3 text-[0.8rem] text-red-700">{error("variants")}</p>
          ) : null}

          <ul className="mt-4 space-y-3">
            {variants.map((variant, index) => (
              <li key={variant.key} className="rounded-[8px] border border-forest-800/12 bg-[#fbfbfa] p-4">
                <input type="hidden" name="variantId" value={variant.id} />

                <div className="grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
                  <div>
                    <label className={ADMIN_LABEL} htmlFor={`variantName-${index}`}>Size</label>
                    <input
                      id={`variantName-${index}`}
                      name="variantName"
                      required
                      placeholder="Half kg"
                      value={variant.name}
                      onChange={(e) =>
                        setVariants((rows) =>
                          rows.map((r, i) => (i === index ? { ...r, name: e.target.value } : r)),
                        )
                      }
                      className={`mt-1.5 ${ADMIN_INPUT}`}
                    />
                  </div>

                  <div>
                    <label className={ADMIN_LABEL} htmlFor={`variantPrice-${index}`}>Price (AUD)</label>
                    <input
                      id={`variantPrice-${index}`}
                      name="variantPrice"
                      inputMode="decimal"
                      placeholder="30.00"
                      value={variant.price}
                      onChange={(e) =>
                        setVariants((rows) =>
                          rows.map((r, i) => (i === index ? { ...r, price: e.target.value } : r)),
                        )
                      }
                      className={`mt-1.5 ${ADMIN_INPUT}`}
                    />
                  </div>

                  <div>
                    <label className={ADMIN_LABEL} htmlFor={`variantWeight-${index}`}>
                      Weight in grams (optional)
                    </label>
                    <input
                      id={`variantWeight-${index}`}
                      name="variantWeight"
                      inputMode="numeric"
                      placeholder="500"
                      value={variant.weightGrams}
                      onChange={(e) =>
                        setVariants((rows) =>
                          rows.map((r, i) =>
                            i === index
                              ? { ...r, weightGrams: e.target.value.replace(/\D/g, "") }
                              : r,
                          ),
                        )
                      }
                      className={`mt-1.5 ${ADMIN_INPUT}`}
                    />
                    <p className="mt-1 text-[0.75rem] leading-relaxed text-slate-500">
                      Shown to customers as a running total in their cart. Leave blank for
                      anything sold by the piece — a blank is honest, a guess is not.
                    </p>
                  </div>

                  <div>
                    <label className={ADMIN_LABEL} htmlFor={`variantSku-${index}`}>SKU (optional)</label>
                    <input
                      id={`variantSku-${index}`}
                      name="variantSku"
                      value={variant.sku}
                      onChange={(e) =>
                        setVariants((rows) =>
                          rows.map((r, i) => (i === index ? { ...r, sku: e.target.value } : r)),
                        )
                      }
                      className={`mt-1.5 ${ADMIN_INPUT}`}
                    />
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
                  <label className="flex items-center gap-2 text-[0.82rem] text-ink-soft">
                    <input
                      type="checkbox"
                      name="variantActive"
                      checked={variant.active}
                      onChange={(e) =>
                        setVariants((rows) =>
                          rows.map((r, i) => (i === index ? { ...r, active: e.target.checked } : r)),
                        )
                      }
                      className="h-4 w-4 accent-[#123b2a]"
                    />
                    On sale
                  </label>

                  <label className="flex items-center gap-2 text-[0.82rem] text-ink-soft">
                    <input
                      type="checkbox"
                      name="variantTracked"
                      checked={variant.inventoryTracked}
                      onChange={(e) =>
                        setVariants((rows) =>
                          rows.map((r, i) =>
                            i === index ? { ...r, inventoryTracked: e.target.checked } : r,
                          ),
                        )
                      }
                      className="h-4 w-4 accent-[#123b2a]"
                    />
                    Track stock
                  </label>

                  {variant.inventoryTracked ? (
                    <label className="flex items-center gap-2 text-[0.82rem] text-ink-soft">
                      Stock
                      <input
                        name="variantStock"
                        inputMode="numeric"
                        value={variant.stockQuantity}
                        onChange={(e) =>
                          setVariants((rows) =>
                            rows.map((r, i) =>
                              i === index ? { ...r, stockQuantity: e.target.value } : r,
                            ),
                          )
                        }
                        className="w-20 rounded-[6px] border border-forest-800/20 px-2 py-1 text-[0.85rem]"
                      />
                    </label>
                  ) : (
                    <input type="hidden" name="variantStock" value="0" />
                  )}

                  {variants.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => setVariants((rows) => rows.filter((_, i) => i !== index))}
                      className="ml-auto text-[0.8rem] font-medium text-red-700 hover:underline"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>

          <p className="mt-3 text-[0.78rem] leading-relaxed text-ink-faint">
            Removing a size switches it off rather than deleting it, so past orders keep showing
            what was actually bought.
          </p>
        </Card>

        {/* ── Allergens ──────────────────────────────────────────── */}
        <Card className="p-5">
          <h2 className="text-[0.95rem] font-semibold text-forest-800">Allergens &amp; dietary</h2>
          <p className="mt-1 text-[0.8rem] leading-relaxed text-ink-soft">
            Written in your own words and shown on the product page. Only state what you can
            stand behind — don&rsquo;t label anything gluten-free, nut-free or halal unless it
            has been verified.
          </p>
          <div className="mt-4 space-y-4">
            <div>
              <label className={ADMIN_LABEL} htmlFor="allergenInfo">Allergen note</label>
              <textarea id="allergenInfo" name="allergenInfo" rows={2} maxLength={2000} defaultValue={product?.allergenInfo ?? ""} className={`mt-1.5 resize-y ${ADMIN_INPUT}`} />
            </div>
            <div>
              <label className={ADMIN_LABEL} htmlFor="dietaryInfo">Dietary note (optional)</label>
              <textarea id="dietaryInfo" name="dietaryInfo" rows={2} maxLength={2000} defaultValue={product?.dietaryInfo ?? ""} className={`mt-1.5 resize-y ${ADMIN_INPUT}`} />
            </div>
          </div>
        </Card>
      </div>

      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <div className="space-y-5">
        <Card className="p-5">
          <h2 className="text-[0.95rem] font-semibold text-forest-800">Visibility</h2>
          <div className="mt-3 space-y-2.5">
            <label className="flex items-center gap-2.5 text-[0.85rem] text-ink">
              <input type="checkbox" name="active" defaultChecked={product?.active ?? true} className="h-4 w-4 accent-[#123b2a]" />
              Published on the menu
            </label>
            <label className="flex items-center gap-2.5 text-[0.85rem] text-ink">
              <input type="checkbox" name="available" defaultChecked={product?.available ?? true} className="h-4 w-4 accent-[#123b2a]" />
              Available today
            </label>
            <label className="flex items-center gap-2.5 text-[0.85rem] text-ink">
              <input type="checkbox" name="featured" defaultChecked={product?.featured ?? false} className="h-4 w-4 accent-[#123b2a]" />
              Featured on the home page
            </label>
          </div>

          <div className="mt-4">
            <label className={ADMIN_LABEL} htmlFor="displayOrder">Sort order</label>
            <input id="displayOrder" name="displayOrder" inputMode="numeric" defaultValue={product?.displayOrder ?? 0} className={`mt-1.5 ${ADMIN_INPUT}`} />
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-[0.95rem] font-semibold text-forest-800">Photo</h2>
          <label className={`${ADMIN_LABEL} mt-3 block`} htmlFor="image">Image</label>
          <select id="image" name="image" defaultValue={product?.image ?? ""} className={`mt-1.5 ${ADMIN_INPUT}`}>
            <option value="">No photo</option>
            {imageKeys.map((key) => (
              <option key={key} value={key}>{key}</option>
            ))}
          </select>
          <p className="mt-2 text-[0.75rem] leading-relaxed text-ink-faint">
            Photos are managed as files in the site&rsquo;s image library. Upload replacements to{" "}
            <code className="rounded bg-neutral-100 px-1">public/images</code> keeping the same
            filename.
          </p>
        </Card>

        <Card className="p-5">
          <h2 className="text-[0.95rem] font-semibold text-forest-800">Search listing</h2>
          <div className="mt-3 space-y-3">
            <div>
              <label className={ADMIN_LABEL} htmlFor="slug">URL slug</label>
              <input id="slug" name="slug" defaultValue={product?.slug ?? ""} placeholder="auto from the name" className={`mt-1.5 ${ADMIN_INPUT}`} />
            </div>
            <div>
              <label className={ADMIN_LABEL} htmlFor="seoTitle">Page title</label>
              <input id="seoTitle" name="seoTitle" maxLength={200} defaultValue={product?.seoTitle ?? ""} className={`mt-1.5 ${ADMIN_INPUT}`} />
            </div>
            <div>
              <label className={ADMIN_LABEL} htmlFor="seoDescription">Meta description</label>
              <textarea id="seoDescription" name="seoDescription" rows={2} maxLength={500} defaultValue={product?.seoDescription ?? ""} className={`mt-1.5 resize-y ${ADMIN_INPUT}`} />
            </div>
          </div>
        </Card>

        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={pending} className={ADMIN_BUTTON}>
            {pending ? "Saving…" : "Save product"}
          </button>
          <Link href="/admin/products" className={ADMIN_BUTTON_SECONDARY}>Cancel</Link>
        </div>

        {product ? (
          <Card className="p-5">
            <h2 className="text-[0.95rem] font-semibold text-forest-800">
              {product.archivedAt ? "Archived" : "Archive"}
            </h2>
            <p className="mt-1.5 text-[0.8rem] leading-relaxed text-ink-soft">
              {product.archivedAt
                ? "This product is off the menu. Past orders still show it."
                : "Takes it off the menu but keeps it on past orders. Nothing is deleted."}
            </p>
            <button
              type="button"
              onClick={async () => {
                if (
                  !product.archivedAt &&
                  !window.confirm("Archive this product? It comes off the menu immediately.")
                ) {
                  return;
                }
                await (product.archivedAt ? restoreProduct(product.id) : archiveProduct(product.id));
                router.refresh();
              }}
              className="mt-3 rounded-[8px] border border-forest-800/25 px-4 py-2 text-[0.82rem] font-semibold text-forest-800 transition-colors hover:bg-forest-800/5"
            >
              {product.archivedAt ? "Restore product" : "Archive product"}
            </button>
          </Card>
        ) : null}
      </div>
    </form>
  );
}
