"use client";

import NextImage from "next/image";
import { useCallback, useState } from "react";
import { img, type ImageKey } from "@/data/images";

/**
 * The single image component for the whole site.
 *
 * Wrapping next/image here means loading behaviour is tuned in one place
 * rather than across sixteen call sites, and every photo gets the same
 * "develops into focus" reveal:
 *
 *   1. The 16px blur placeholder paints immediately as the element's
 *      background, so there is never an empty box.
 *   2. The real photo arrives slightly scaled up and still blurred, so it
 *      matches the placeholder it is covering — no visible swap.
 *   3. It settles to sharp and 1:1 over ~700ms.
 *
 * Because the placeholder and the photo look the same at the moment of
 * hand-off, the transition reads as the image coming into focus rather than
 * popping in. `prefers-reduced-motion` drops it to a plain cut (globals.css).
 *
 * `quality` matters more than it looks: images used as dimmed backgrounds are
 * requested at a much lower quality, which is invisible at 25–30% opacity but
 * cuts their transfer size by roughly half.
 */

export type PhotoProps = {
  /** Key into the image registry — carries src, dimensions, alt and blur. */
  image: ImageKey;
  /** Overrides the registry's alt text where the context needs something else. */
  alt?: string;
  /** Required: an honest `sizes` is what stops oversized downloads. */
  sizes: string;
  /** Fill a positioned parent instead of using intrinsic dimensions. */
  fill?: boolean;
  /** Above the fold — preloads and skips lazy loading. */
  priority?: boolean;
  /** Force eager loading without the preload hint that `priority` adds. */
  eager?: boolean;
  /** 75 by default; use 45 for dimmed background imagery. */
  quality?: number;
  /** Purely decorative: empty alt and hidden from assistive tech. */
  decorative?: boolean;
  className?: string;
};

export function Photo({
  image,
  alt,
  sizes,
  fill = false,
  priority = false,
  eager = false,
  quality,
  decorative = false,
  className = "",
}: PhotoProps) {
  const photo = img(image);
  const [loaded, setLoaded] = useState(false);

  /**
   * Load detection has to be bulletproof here: an image that never reports
   * back stays blurred forever, which is far worse than having no effect.
   *
   * React's `onLoad` alone isn't enough — an image served from cache can
   * finish before React attaches the handler, and that window is exactly when
   * a returning visitor loads the page. So this ref checks `complete` at
   * attach time and otherwise listens on the DOM node directly. `error` marks
   * it loaded too, so a photo that fails to fetch shows its alt text rather
   * than a permanently blurred box.
   */
  const ref = useCallback((node: HTMLImageElement | null) => {
    if (!node) return;

    const markLoaded = () => setLoaded(true);

    if (node.complete && node.naturalWidth > 0) {
      markLoaded();
      return;
    }

    node.addEventListener("load", markLoaded);
    node.addEventListener("error", markLoaded);
    return () => {
      node.removeEventListener("load", markLoaded);
      node.removeEventListener("error", markLoaded);
    };
  }, []);

  return (
    <NextImage
      ref={ref}
      src={photo.src}
      alt={decorative ? "" : (alt ?? photo.alt)}
      aria-hidden={decorative || undefined}
      {...(fill
        ? { fill: true as const }
        : { width: photo.width, height: photo.height })}
      sizes={sizes}
      quality={quality}
      priority={priority}
      loading={priority || eager ? "eager" : "lazy"}
      placeholder="blur"
      blurDataURL={photo.blurDataURL}
      data-photo=""
      data-loaded={loaded ? "true" : "false"}
      className={className}
    />
  );
}
