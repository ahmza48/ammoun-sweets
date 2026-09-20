"use client";

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";

/**
 * Reveals its children the first time they scroll into view.
 *
 * The motion itself lives in globals.css keyed off `data-anim`, so a staggered
 * group shares one transition and stays in step. This component only decides
 * *when* to flip `data-revealed`.
 *
 * It fires once and then disconnects — content that re-animates every time you
 * scroll past gets irritating quickly on a page this image-heavy.
 */

export type RevealAnimation = "up" | "fade" | "left" | "right" | "rise";

type RevealProps = {
  children: ReactNode;
  /** Entrance style. `rise` adds a slight scale and suits imagery. */
  anim?: RevealAnimation;
  /** Stagger within a group, in milliseconds. */
  delay?: number;
  as?: ElementType;
  className?: string;
};

export function Reveal({
  children,
  anim = "up",
  delay = 0,
  as: Tag = "div",
  className = "",
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // No IntersectionObserver (very old browser): show the content straight
    // away. Written to the DOM rather than to state so we don't schedule a
    // second render just to undo the initial hidden style.
    if (typeof IntersectionObserver === "undefined") {
      node.dataset.revealed = "true";
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        /**
         * `isIntersecting` alone isn't enough. IntersectionObserver delivers
         * its callbacks asynchronously and coalesces them, so a fast flick of
         * the scroll wheel — or any programmatic jump — can take an element
         * from below the fold to above it between two deliveries. The observer
         * then only ever sees "not intersecting", and that content stays at
         * opacity 0 forever.
         *
         * Treating "already scrolled past" as revealed closes that hole: if
         * the element's top edge is above the viewport, the visitor has been
         * there and it must be visible.
         */
        if (entry.isIntersecting || entry.boundingClientRect.top < 0) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      data-reveal=""
      data-anim={anim}
      data-revealed={revealed ? "true" : "false"}
      style={delay ? ({ "--reveal-delay": `${delay}ms` } as React.CSSProperties) : undefined}
      className={className}
    >
      {children}
    </Tag>
  );
}
