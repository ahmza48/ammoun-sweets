"use client";

import { useEffect, useState } from "react";
import { menu } from "@/data/menu";

/**
 * Sticky category rail on the menu page.
 *
 * Highlights the section currently in view. These are ordinary anchor links,
 * so the page still works with JS off — the highlight is the only thing that
 * needs scripting.
 */

export function MenuCategoryNav() {
  const [activeId, setActiveId] = useState(menu[0]?.id ?? "");

  useEffect(() => {
    const sections = menu
      .map((category) => document.getElementById(category.id))
      .filter((node): node is HTMLElement => node !== null);

    if (sections.length === 0 || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActiveId(visible.target.id);
      },
      // Focus the "active" band on the upper third of the viewport.
      { rootMargin: "-24% 0px -58% 0px", threshold: 0 },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      aria-label="Menu categories"
      className="sticky top-[4.5rem] z-40 border-b border-sand-dark/70 bg-cream/95 backdrop-blur-md lg:top-[5.25rem]"
    >
      <div className="container-page">
        {/*
          A snap rail on phones, where five long category names can't fit, and
          a plain centred wrap from md up so nothing is silently clipped.
        */}
        <ul className="swipe-rail items-center gap-2 py-3 md:flex-wrap md:justify-center md:gap-1.5 md:overflow-visible">
          {menu.map((category) => {
            const active = activeId === category.id;
            return (
              <li key={category.id} className="shrink-0">
                <a
                  href={`#${category.id}`}
                  aria-current={active ? "location" : undefined}
                  className={[
                    "eyebrow inline-block whitespace-nowrap rounded-full border px-4 py-2.5 transition-all duration-300 ease-[var(--ease-soft)]",
                    active
                      ? "border-gold-400 bg-gold-400 text-forest-900"
                      : "border-transparent text-forest-800/70 hover:border-gold-500/45 hover:bg-forest-800/5 hover:text-forest-800",
                  ].join(" ")}
                >
                  {category.name}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
