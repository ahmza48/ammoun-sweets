import Link from "next/link";
import { formatPrice, type MenuItem } from "@/data/menu";
import { Photo } from "./Photo";

/**
 * Product card — image occupies roughly two-thirds of the card.
 *
 * There is deliberately no per-item "Buy now": ordering happens on one
 * external platform, so a button on every card would be noise. The whole
 * card is a single link to the relevant menu category instead.
 */

type ProductCardProps = {
  item: MenuItem;
  /** Category label shown in gold above the name. */
  categoryLabel?: string;
  /** Where the card links to — defaults to the menu anchor for its item. */
  href?: string;
  priority?: boolean;
  className?: string;
};

export function ProductCard({
  item,
  categoryLabel,
  href = `/menu#${item.id}`,
  priority = false,
  className = "",
}: ProductCardProps) {
  return (
    <article className={`group relative h-full ${className}`}>
      <Link
        href={href}
        className="flex h-full flex-col overflow-hidden rounded-[var(--radius-lg-card)] border border-sand-dark/70 bg-ivory transition-all duration-500 ease-[var(--ease-soft)] hover:-translate-y-1 hover:border-gold-400/55 hover:shadow-[0_24px_50px_-28px_rgba(18,59,42,0.45)]"
      >
        <div className="relative aspect-[4/3] overflow-hidden">
          <Photo
            image={item.image}
            fill
            priority={priority}
            sizes="(min-width: 1280px) 22rem, (min-width: 768px) 32vw, (min-width: 640px) 45vw, 80vw"
            className="object-cover group-hover:scale-[1.06]"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-forest-950/20 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          />
        </div>

        <div className="flex flex-1 flex-col p-5 sm:p-6">
          {categoryLabel ? (
            <p className="eyebrow text-gold-700">{categoryLabel}</p>
          ) : null}

          <h3 className="mt-2.5 text-[1.4rem] leading-tight text-forest-800 sm:text-[1.5rem]">
            {item.name}
          </h3>

          {item.alsoKnownAs ? (
            <p
              lang="ar"
              dir="rtl"
              className="mt-1 text-[0.95rem] text-ink-faint"
            >
              {item.alsoKnownAs}
            </p>
          ) : null}

          <p className="mt-3 flex-1 text-[0.9rem] leading-[1.65] text-ink-soft">
            {item.description}
          </p>

          <div className="mt-5 flex items-end justify-between gap-3 border-t border-sand-dark/70 pt-4">
            <div>
              <p className="font-display text-[1.15rem] font-semibold text-forest-800">
                {formatPrice(item.price)}
              </p>
              {item.size ? (
                <p className="mt-0.5 text-[0.75rem] text-ink-faint">{item.size}</p>
              ) : null}
            </div>

            <span className="eyebrow flex items-center gap-1.5 text-forest-700 transition-colors duration-300 group-hover:text-gold-700">
              View Menu
              <svg
                viewBox="0 0 16 16"
                className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-0.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                aria-hidden="true"
              >
                <path d="M2 8h11M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
