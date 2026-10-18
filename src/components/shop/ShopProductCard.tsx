import Link from "next/link";
import { Photo } from "@/components/Photo";
import { formatMoneyCompact } from "@/lib/money";
import { isImageKey } from "@/data/images";
import { cheapestVariant, isPurchasable, type ProductView } from "@/server/services/catalog";

/**
 * Menu card for a database-backed product.
 *
 * Visually identical to the approved demo card — arch-free rounded frame,
 * image occupying roughly two-thirds, gold category label, serif name — with
 * the price now coming from the cheapest live variant rather than a hardcoded
 * number, and a "Sold out" state the shop can toggle from the admin panel.
 *
 * There is still no per-card "Buy now": the whole card links through to the
 * product page where the size has to be chosen anyway.
 */

export function ShopProductCard({
  product,
  categoryLabel,
  priority = false,
}: {
  product: ProductView;
  categoryLabel?: string | null;
  priority?: boolean;
}) {
  const cheapest = cheapestVariant(product.variants);
  const available = isPurchasable(product);
  const multipleSizes = product.variants.filter((v) => v.active).length > 1;

  return (
    <article className="group relative h-full">
      <Link
        href={`/menu/${product.slug}`}
        className="flex h-full flex-col overflow-hidden rounded-[var(--radius-lg-card)] border border-sand-dark/70 bg-ivory transition-all duration-500 ease-[var(--ease-soft)] hover:-translate-y-1 hover:border-gold-400/55 hover:shadow-[0_24px_50px_-28px_rgba(18,59,42,0.45)]"
      >
        <div className="relative aspect-[4/3] overflow-hidden">
          {isImageKey(product.image) ? (
            <Photo
              image={product.image}
              fill
              priority={priority}
              sizes="(min-width: 1280px) 22rem, (min-width: 768px) 32vw, (min-width: 640px) 45vw, 80vw"
              className="object-cover group-hover:scale-[1.06]"
            />
          ) : (
            <div className="h-full w-full bg-sand" />
          )}

          {!available ? (
            <div className="absolute inset-0 flex items-center justify-center bg-forest-950/55">
              <span className="eyebrow rounded-full border border-gold-400/50 bg-forest-950/80 px-4 py-2 text-gold-200">
                Sold out today
              </span>
            </div>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col p-5 sm:p-6">
          {categoryLabel ? <p className="eyebrow text-gold-700">{categoryLabel}</p> : null}

          <h3 className="mt-2.5 text-[1.4rem] leading-tight text-forest-800 sm:text-[1.5rem]">
            {product.name}
          </h3>

          {product.alsoKnownAs ? (
            <p
              lang={/[؀-ۿ]/.test(product.alsoKnownAs) ? "ar" : undefined}
              dir={/[؀-ۿ]/.test(product.alsoKnownAs) ? "rtl" : undefined}
              className="mt-1 text-[0.95rem] text-ink-faint"
            >
              {product.alsoKnownAs}
            </p>
          ) : null}

          {product.shortDescription ? (
            <p className="mt-3 flex-1 text-[0.9rem] leading-[1.65] text-ink-soft">
              {product.shortDescription}
            </p>
          ) : (
            <div className="flex-1" />
          )}

          <div className="mt-5 flex items-end justify-between gap-3 border-t border-sand-dark/70 pt-4">
            <div>
              <p className="font-display text-[1.15rem] font-semibold text-forest-800">
                {cheapest ? (
                  <>
                    {multipleSizes ? (
                      <span className="text-[0.75rem] font-medium text-ink-faint">from </span>
                    ) : null}
                    {formatMoneyCompact(cheapest.price)}
                  </>
                ) : (
                  "Ask in store"
                )}
              </p>
              {cheapest ? (
                <p className="mt-0.5 text-[0.75rem] text-ink-faint">{cheapest.name}</p>
              ) : null}
            </div>

            <span className="eyebrow flex items-center gap-1.5 text-forest-700 transition-colors duration-300 group-hover:text-gold-700">
              {available ? "Order" : "View"}
              <svg viewBox="0 0 16 16" className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                <path d="M2 8h11M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
