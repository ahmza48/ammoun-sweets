"use client";

import { useCart } from "./CartProvider";

/**
 * Header cart control with an item-count badge.
 *
 * The badge renders only once the cart has been read from localStorage —
 * otherwise the server would render "0" and the client "3", which React
 * reports as a hydration mismatch. `suppressHydrationWarning` would hide the
 * warning without fixing the flash of wrong information.
 */

export function CartButton({ tone = "light" }: { tone?: "light" | "dark" }) {
  const { itemCount, openCart, hydrated } = useCart();

  const base =
    tone === "light"
      ? "text-cream hover:bg-cream/10"
      : "text-forest-800 hover:bg-forest-800/5";

  return (
    <button
      type="button"
      onClick={openCart}
      className={`relative flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-300 ${base}`}
    >
      <span className="sr-only">
        {hydrated && itemCount > 0
          ? `Open cart, ${itemCount} item${itemCount === 1 ? "" : "s"}`
          : "Open cart"}
      </span>

      <svg viewBox="0 0 24 24" className="h-[1.15rem] w-[1.15rem]" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <path d="M4 6h16l-1.6 12H5.6L4 6Z" strokeLinejoin="round" />
        <path d="M8.5 6a3.5 3.5 0 0 1 7 0" strokeLinecap="round" />
      </svg>

      {hydrated && itemCount > 0 ? (
        <span
          aria-hidden="true"
          className="absolute -right-0.5 -top-0.5 flex h-[1.15rem] min-w-[1.15rem] items-center justify-center rounded-full bg-gold-400 px-1 text-[0.65rem] font-bold text-forest-900"
        >
          {itemCount > 99 ? "99+" : itemCount}
        </span>
      ) : null}
    </button>
  );
}
