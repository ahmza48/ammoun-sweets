"use client";

import { useState } from "react";
import { useCart } from "./CartProvider";
import { QuantityStepper } from "./CartDrawer";
import { formatMoneyCompact } from "@/lib/money";

/**
 * Variant picker + quantity + add-to-cart.
 *
 * Only variants the server said are sellable are passed in, so there is no
 * client-side filtering to get wrong. If a product has a single size the
 * selector collapses to a price line — a radio group of one is just noise.
 */

export type SellableVariant = {
  id: string;
  name: string;
  price: number;
  minQuantity: number;
  maxQuantity: number | null;
  inventoryTracked: boolean;
  stockQuantity: number;
  /** Null when this size is not sold by weight. */
  weightGrams: number | null;
};

type AddToCartProps = {
  productId: string;
  productName: string;
  productSlug: string;
  image: string | null;
  variants: SellableVariant[];
  /** False when the shop has marked the product unavailable today. */
  purchasable: boolean;
};

function stockLabel(variant: SellableVariant): string | null {
  if (!variant.inventoryTracked) return null;
  if (variant.stockQuantity <= 0) return "Sold out";
  if (variant.stockQuantity <= 5) return `Only ${variant.stockQuantity} left`;
  return null;
}

export function AddToCart({
  productId,
  productName,
  productSlug,
  image,
  variants,
  purchasable,
}: AddToCartProps) {
  const { addItem } = useCart();
  const sellable = variants.filter((v) => !v.inventoryTracked || v.stockQuantity > 0);
  const [selectedId, setSelectedId] = useState(sellable[0]?.id ?? variants[0]?.id ?? "");
  const selected = variants.find((v) => v.id === selectedId) ?? variants[0];
  const [quantity, setQuantity] = useState(selected?.minQuantity ?? 1);

  if (!selected) {
    return (
      <p className="rounded-[12px] border border-sand-dark bg-sand/50 px-4 py-3 text-[0.9rem] text-ink-soft">
        This item isn&rsquo;t available to order online. Please call the shop.
      </p>
    );
  }

  const soldOut = selected.inventoryTracked && selected.stockQuantity <= 0;
  const disabled = !purchasable || soldOut;

  return (
    <div className="on-light">
      {variants.length > 1 ? (
        <fieldset className="border-0 p-0">
          <legend className="eyebrow text-gold-700">Choose a size</legend>
          <div className="mt-3 flex flex-wrap gap-2.5">
            {variants.map((variant) => {
              const out = variant.inventoryTracked && variant.stockQuantity <= 0;
              const active = variant.id === selectedId;
              return (
                <label
                  key={variant.id}
                  className={[
                    "relative flex cursor-pointer flex-col gap-0.5 rounded-[12px] border px-4 py-3 transition-all duration-300",
                    active
                      ? "border-gold-400 bg-gold-400/10 shadow-[0_0_0_1px_var(--color-gold-400)]"
                      : "border-sand-dark bg-ivory hover:border-gold-500/55",
                    out ? "cursor-not-allowed opacity-45" : "",
                  ].join(" ")}
                >
                  <input
                    type="radio"
                    name={`variant-${productId}`}
                    value={variant.id}
                    checked={active}
                    disabled={out}
                    onChange={() => {
                      setSelectedId(variant.id);
                      setQuantity(variant.minQuantity);
                    }}
                    className="sr-only"
                  />
                  <span className="text-[0.85rem] font-semibold text-forest-800">
                    {variant.name}
                  </span>
                  <span className="font-display text-[1.05rem] font-semibold text-forest-800">
                    {formatMoneyCompact(variant.price)}
                  </span>
                  {out ? (
                    <span className="eyebrow mt-0.5 text-ink-faint">Sold out</span>
                  ) : null}
                </label>
              );
            })}
          </div>
        </fieldset>
      ) : (
        <div className="flex items-baseline gap-3">
          <span className="font-display text-[1.7rem] font-semibold text-forest-800">
            {formatMoneyCompact(selected.price)}
          </span>
          <span className="text-[0.85rem] text-ink-faint">{selected.name}</span>
        </div>
      )}

      {stockLabel(selected) && !soldOut ? (
        <p className="mt-3 text-[0.82rem] font-medium text-gold-700">{stockLabel(selected)}</p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <QuantityStepper
          value={quantity}
          max={
            selected.inventoryTracked
              ? Math.min(selected.maxQuantity ?? 99, selected.stockQuantity)
              : selected.maxQuantity
          }
          label={`${productName}, ${selected.name}`}
          size="md"
          onChange={(q) => setQuantity(Math.max(selected.minQuantity, q))}
        />

        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            addItem(
              {
                variantId: selected.id,
                productId,
                productSlug,
                productName,
                variantName: selected.name,
                unitPrice: selected.price,
                weightGrams: selected.weightGrams,
                image,
                maxQuantity: selected.maxQuantity,
              },
              quantity,
            )
          }
          className="group/btn relative isolate inline-flex flex-1 items-center justify-center gap-2 overflow-hidden rounded-full bg-gold-400 px-7 py-3.5 text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-forest-900 transition-all duration-300 ease-[var(--ease-soft)] hover:-translate-y-px hover:bg-gold-300 hover:shadow-[0_6px_20px_-8px_rgba(201,164,92,0.75)] disabled:cursor-not-allowed disabled:bg-sand-dark disabled:text-ink-faint disabled:hover:translate-y-0 disabled:hover:shadow-none"
        >
          {soldOut ? "Sold Out" : !purchasable ? "Unavailable Today" : "Add to Cart"}
        </button>
      </div>

      {!purchasable && !soldOut ? (
        <p className="mt-3 text-[0.85rem] leading-relaxed text-ink-soft">
          We&rsquo;ve sold out of this today. It will be back — call the shop if you need
          it for a particular date.
        </p>
      ) : null}
    </div>
  );
}
