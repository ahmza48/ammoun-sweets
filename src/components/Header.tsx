"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { business } from "@/data/business";
import { mainNav } from "@/data/navigation";
import { ButtonLink } from "./Button";
import { Logo } from "./Logo";
import { Ornament } from "./Ornament";

/**
 * Site header.
 *
 * Over the home page hero it starts transparent and fades to solid deep green
 * once you scroll past ~80px. On every other page it is solid from the start,
 * because those pages begin with a light band.
 *
 * The mobile panel is a focus-trapped dialog: Escape closes it, background
 * scroll is locked, and focus returns to the toggle on close.
 */

export function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  /**
   * Stores the route the panel was opened on rather than a plain boolean, so
   * navigating away closes it as a matter of derived state — no effect, and no
   * frame where the new page renders with the old menu still over it.
   */
  const [openForPath, setOpenForPath] = useState<string | null>(null);
  const open = openForPath === pathname;

  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const isHome = pathname === "/";
  const solid = scrolled || !isHome || open;

  const setOpen = (next: boolean) => setOpenForPath(next ? pathname : null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock background scroll while the panel is open.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Escape to close, and keep Tab inside the panel.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        // setOpenForPath is the stable setter, so the effect keeps [open] as
        // its only dependency.
        setOpenForPath(null);
        toggleRef.current?.focus();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])',
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
    panelRef.current?.querySelector<HTMLElement>("a[href]")?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <header
      className={[
        "fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,border-color] duration-500 ease-[var(--ease-soft)]",
        solid
          ? "border-b border-gold-400/20 bg-forest-900/97 backdrop-blur-md shadow-[0_8px_30px_-18px_rgba(8,32,20,0.9)]"
          : "border-b border-transparent bg-gradient-to-b from-forest-950/65 to-transparent",
      ].join(" ")}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-gold-400 focus:px-4 focus:py-2 focus:text-xs focus:font-semibold focus:uppercase focus:tracking-widest focus:text-forest-900"
      >
        Skip to content
      </a>

      <div className="container-page">
        <div className="flex h-[4.5rem] items-center justify-between gap-4 lg:h-[5.25rem]">
          <Logo tone="light" />

          {/* — Desktop navigation ————————————————————————————— */}
          <nav aria-label="Main" className="hidden lg:block">
            <ul className="flex items-center gap-7 xl:gap-9">
              {mainNav.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      data-active={active}
                      aria-current={active ? "page" : undefined}
                      className={[
                        "link-underline font-sans text-[0.72rem] font-semibold uppercase tracking-[0.17em] transition-colors duration-300",
                        active ? "text-gold-300" : "text-cream/85 hover:text-gold-200",
                      ].join(" ")}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="hidden lg:flex lg:items-center lg:gap-3">
            <ButtonLink href={business.links.order} variant="gold" size="md" external>
              Order Online
            </ButtonLink>
          </div>

          {/* — Mobile toggle ————————————————————————————————— */}
          <button
            ref={toggleRef}
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-cream transition-colors duration-300 hover:bg-cream/10 lg:hidden"
          >
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
            <span aria-hidden="true" className="relative block h-4 w-6">
              <span
                className={[
                  "absolute left-0 h-px w-full bg-current transition-all duration-300 ease-[var(--ease-soft)]",
                  open ? "top-1/2 rotate-45" : "top-0",
                ].join(" ")}
              />
              <span
                className={[
                  "absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-current transition-opacity duration-200",
                  open ? "opacity-0" : "opacity-100",
                ].join(" ")}
              />
              <span
                className={[
                  "absolute left-0 h-px w-full bg-current transition-all duration-300 ease-[var(--ease-soft)]",
                  open ? "top-1/2 -rotate-45" : "top-full",
                ].join(" ")}
              />
            </span>
          </button>
        </div>
      </div>

      {/* — Mobile panel ——————————————————————————————————————— */}
      <div
        id="mobile-menu"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        hidden={!open}
        className="border-t border-gold-400/20 bg-forest-900 lg:hidden"
      >
        <div className="container-page max-h-[calc(100dvh-4.5rem)] overflow-y-auto pb-8 pt-6">
          <nav aria-label="Mobile">
            <ul className="flex flex-col">
              {mainNav.map((item, index) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                return (
                  <li key={item.href} className="border-b border-gold-400/12">
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={[
                        "flex items-baseline gap-4 py-4 font-display text-[1.6rem] transition-colors duration-300",
                        active ? "text-gold-300" : "text-cream hover:text-gold-200",
                      ].join(" ")}
                    >
                      <span className="eyebrow text-gold-400/60">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <Ornament tone="light" width="full" className="my-7" />

          <div className="flex flex-col gap-3">
            <ButtonLink href={business.links.order} variant="gold" size="lg" external>
              Order Online
            </ButtonLink>
            <ButtonLink href={`tel:${business.phone}`} variant="outline" size="lg">
              Call {business.displayPhone}
            </ButtonLink>
          </div>
        </div>
      </div>
    </header>
  );
}
