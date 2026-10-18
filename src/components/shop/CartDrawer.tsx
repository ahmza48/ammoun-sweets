"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useCart } from "./CartProvider";
import { Photo } from "@/components/Photo";
import { formatMoney } from "@/lib/money";
import { formatWeight } from "@/lib/weight";
import { isImageKey } from "@/data/images";

/**
 * Slide-over cart.
 *
 * A drawer rather than a floating widget: the brief is explicit that intrusive
 * floating cart UI must not cover the page, and a panel that can be dismissed
 * keeps the menu readable underneath.
 *
 * Accessibility: it is a real modal dialog — Escape closes, background scroll
 * locks, focus moves in on open and returns to whatever opened it, and Tab is
 * trapped inside. Cart changes are announced through a polite live region so
 * screen-reader users hear "added to cart" rather than nothing at all.
 */

export function CartDrawer() {
  const {
    lines,
    isOpen,
    closeCart,
    setQuantity,
    removeItem,
    estimatedSubtotal,
    estimatedWeightGrams,
    unweighedLines,
    lastAction,
  } = useCart();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeCart();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    closeRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      restoreFocusRef.current?.focus?.();
    };
  }, [isOpen, closeCart]);

  return (
    <>
      {/* Live region lives outside the dialog so it is announced either way. */}
      <div aria-live="polite" className="sr-only">
        {lastAction}
      </div>

      {isOpen ? (
        <div
          className="fixed inset-0 z-[70] flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="Your cart"
        >
          {/*
            A plain div, not a button: the dialog already has a labelled close
            control and an Escape handler, so the backdrop is a mouse
            convenience only. Making it a second element named "Close cart"
            gave assistive tech — and any query by accessible name — two
            identical controls to choose between.
          */}
          <div
            aria-hidden="true"
            onClick={closeCart}
            className="backdrop-enter absolute inset-0 h-full w-full cursor-default bg-forest-950/70 backdrop-blur-[2px]"
          />

          <div
            ref={panelRef}
            className="drawer-enter relative flex h-full w-full max-w-md flex-col border-l border-gold-400/25 bg-cream shadow-[0_0_60px_-10px_rgba(8,32,20,0.6)]"
          >
            <header className="flex items-center justify-between gap-4 border-b border-sand-dark bg-forest-900 px-5 py-4">
              <h2 className="font-display text-[1.4rem] text-ivory">Your Order</h2>
              <button
                ref={closeRef}
                type="button"
                onClick={closeCart}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-gold-400/35 text-gold-200 transition-colors duration-300 hover:bg-gold-400/12"
              >
                <span className="sr-only">Close cart</span>
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                  <path d="M4 4l12 12M16 4L4 16" strokeLinecap="round" />
                </svg>
              </button>
            </header>

            {lines.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
                <svg viewBox="0 0 48 48" className="h-12 w-12 text-gold-500/50" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
                  <path d="M10 14h28l-3 22H13L10 14Z" strokeLinejoin="round" />
                  <path d="M18 14a6 6 0 0 1 12 0" strokeLinecap="round" />
                </svg>
                <div>
                  <p className="font-display text-[1.35rem] text-forest-800">Your cart is empty</p>
                  <p className="mt-2 text-[0.9rem] leading-relaxed text-ink-soft">
                    Have a look through the menu and add a few things.
                  </p>
                </div>
                <Link
                  href="/menu"
                  onClick={closeCart}
                  className="eyebrow rounded-full border border-forest-800/25 px-5 py-3 text-forest-800 transition-colors duration-300 hover:bg-forest-800/5"
                >
                  Browse the Menu
                </Link>
              </div>
            ) : (
              <>
                <ul className="flex-1 divide-y divide-sand-dark overflow-y-auto px-5">
                  {lines.map((line) => (
                    <li key={line.variantId} className="flex gap-4 py-4">
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[12px] border border-sand-dark bg-sand">
                        {line.image && isImageKey(line.image) ? (
                          <Photo image={line.image} fill sizes="5rem" className="object-cover" />
                        ) : null}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="font-display text-[1.1rem] leading-tight text-forest-800">
                          {line.productName}
                        </p>
                        <p className="mt-0.5 text-[0.8rem] text-ink-faint">{line.variantName}</p>

                        <div className="mt-3 flex items-center justify-between gap-3">
                          <QuantityStepper
                            value={line.quantity}
                            max={line.maxQuantity}
                            label={`${line.productName}, ${line.variantName}`}
                            onChange={(q) => setQuantity(line.variantId, q)}
                          />
                          <p className="font-display text-[1.05rem] font-semibold text-forest-800">
                            {formatMoney(line.unitPrice * line.quantity)}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(line.variantId)}
                        className="self-start rounded-full p-1.5 text-ink-faint transition-colors duration-300 hover:bg-forest-800/5 hover:text-forest-800"
                      >
                        <span className="sr-only">Remove {line.productName}</span>
                        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                          <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>

                <footer className="border-t border-sand-dark bg-ivory px-5 py-5">
                  {/*
                    Weight sits above the money because it is what a customer
                    ordering sweets by the half kilo is actually judging: "is
                    two kilos enough for the family?" is the question, not the
                    dollar figure.
                  */}
                  {estimatedWeightGrams > 0 ? (
                    <div className="flex items-baseline justify-between pb-2">
                      <span className="text-[0.9rem] text-ink-soft">
                        {unweighedLines > 0 ? "Weight (weighed items)" : "Total weight"}
                      </span>
                      <span className="text-[0.95rem] font-semibold text-forest-800">
                        {formatWeight(estimatedWeightGrams)}
                      </span>
                    </div>
                  ) : null}

                  <div className="flex items-baseline justify-between">
                    <span className="text-[0.9rem] text-ink-soft">Subtotal</span>
                    <span className="font-display text-[1.35rem] font-semibold text-forest-800">
                      {formatMoney(estimatedSubtotal)}
                    </span>
                  </div>
                  <p className="mt-1 text-[0.75rem] text-ink-faint">
                    {unweighedLines > 0
                      ? "Some items are sold by the piece, so they're not in the weight. Delivery and any discounts are worked out at checkout."
                      : "Delivery and any discounts are worked out at checkout."}
                  </p>

                  <Link
                    href="/checkout"
                    onClick={closeCart}
                    className="mt-4 flex w-full items-center justify-center rounded-full bg-gold-400 px-6 py-3.5 text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-forest-900 transition-all duration-300 hover:-translate-y-px hover:bg-gold-300"
                  >
                    Go to Checkout
                  </Link>
                  {/*
                    A link to the menu, not a bare "close". "Keep Browsing"
                    promises somewhere to browse, and from a product page
                    closing the drawer left the customer exactly where they
                    already were.
                  */}
                  <Link
                    href="/menu"
                    onClick={closeCart}
                    className="mt-2.5 block w-full rounded-full px-6 py-2.5 text-center text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-forest-800/70 transition-colors duration-300 hover:text-forest-800"
                  >
                    Keep Browsing
                  </Link>
                </footer>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

export function QuantityStepper({
  value,
  max,
  label,
  onChange,
  size = "sm",
}: {
  value: number;
  max: number | null;
  label: string;
  onChange: (quantity: number) => void;
  size?: "sm" | "md";
}) {
  const ceiling = max ?? 99;
  const buttonSize = size === "md" ? "h-10 w-10" : "h-8 w-8";

  return (
    <div className="inline-flex items-center rounded-full border border-sand-dark bg-ivory">
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        className={`${buttonSize} flex items-center justify-center rounded-full text-forest-800 transition-colors duration-200 hover:bg-forest-800/5`}
      >
        <span className="sr-only">Decrease quantity of {label}</span>
        <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M3 8h10" strokeLinecap="round" />
        </svg>
      </button>

      <span
        aria-live="polite"
        className={`min-w-7 text-center font-display font-semibold text-forest-800 ${size === "md" ? "text-[1.05rem]" : "text-[0.95rem]"}`}
      >
        {value}
      </span>

      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={value >= ceiling}
        className={`${buttonSize} flex items-center justify-center rounded-full text-forest-800 transition-colors duration-200 hover:bg-forest-800/5 disabled:cursor-not-allowed disabled:opacity-35`}
      >
        <span className="sr-only">Increase quantity of {label}</span>
        <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M8 3v10M3 8h10" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
