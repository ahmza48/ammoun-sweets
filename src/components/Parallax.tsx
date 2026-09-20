"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useReducedMotion } from "@/lib/useReducedMotion";

/**
 * Very gentle parallax for large imagery.
 *
 * IMPORTANT: this goes *inside* the picture frame, not around it. It renders
 * an absolutely-positioned layer that is deliberately taller than its parent,
 * so the photo drifts within a frame that never moves. Moving the frame itself
 * would drag it out of alignment with everything positioned against it — the
 * gold corner rules, the overlapping inset photos — which is exactly the kind
 * of detail that makes an effect look like a bug.
 *
 * The parent must be positioned and `overflow-hidden`.
 *
 * Deliberately conservative, because parallax is the easiest premium effect to
 * overdo and the quickest to make a page feel cheap:
 *
 *  - travel is capped at `strength` pixels, well inside the 7% of extra height
 *    this layer carries, so an edge can never be exposed;
 *  - it only runs while on screen, watched with an IntersectionObserver rather
 *    than a scroll listener that fires forever;
 *  - updates happen inside requestAnimationFrame and write to a CSS custom
 *    property, so the browser only recomposites — no layout, no paint;
 *  - it does nothing under `prefers-reduced-motion`, or on coarse pointers
 *    where touch scrolling mostly makes it read as lag.
 */

type ParallaxProps = {
  children: ReactNode;
  /** Maximum travel in pixels across the element's full pass through the viewport. */
  strength?: number;
  className?: string;
};

export function Parallax({ children, strength = 22, className = "" }: ParallaxProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node || reducedMotion) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    let frame = 0;
    let onScreen = false;

    const update = () => {
      frame = 0;
      const rect = node.getBoundingClientRect();
      const viewport = window.innerHeight;
      // -1 when the element is just below the fold, +1 when just above it.
      const progress =
        (rect.top + rect.height / 2 - viewport / 2) / (viewport / 2 + rect.height / 2);
      const offset = Math.max(-1, Math.min(1, progress)) * strength;
      node.style.setProperty("--parallax", `${offset.toFixed(2)}px`);
    };

    const onScroll = () => {
      if (frame || !onScreen) return;
      frame = requestAnimationFrame(update);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        if (onScreen) onScroll();
      },
      { rootMargin: "140px 0px" },
    );

    observer.observe(node);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
      node.style.removeProperty("--parallax");
    };
  }, [reducedMotion, strength]);

  return (
    <div
      ref={ref}
      // 7% of extra height above and below gives the drift somewhere to go.
      className={`absolute -inset-y-[7%] inset-x-0 ${className}`}
      style={{ translate: "0 var(--parallax, 0px)" }}
    >
      {children}
    </div>
  );
}
