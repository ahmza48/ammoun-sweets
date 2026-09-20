"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  gallery,
  galleryCategories,
  type GalleryCategoryId,
} from "@/data/gallery";
import { img } from "@/data/images";

/**
 * Filterable masonry gallery with a keyboard-accessible lightbox.
 *
 * Masonry is done with CSS columns so it degrades gracefully and needs no
 * measurement pass. The lightbox is a modal dialog: Escape closes, arrow keys
 * move between photos, focus is trapped and restored on close.
 */

export function GalleryGrid() {
  const [filter, setFilter] = useState<GalleryCategoryId>("all");
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const items = useMemo(
    () => (filter === "all" ? gallery : gallery.filter((g) => g.category === filter)),
    [filter],
  );

  const close = useCallback(() => {
    setOpenIndex(null);
    triggerRef.current?.focus();
  }, []);

  const step = useCallback(
    (delta: number) =>
      setOpenIndex((current) =>
        current === null ? current : (current + delta + items.length) % items.length,
      ),
    [items.length],
  );

  useEffect(() => {
    if (openIndex === null) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
      if (event.key === "Tab") {
        // Only the close and nav buttons are focusable — keep Tab inside.
        event.preventDefault();
        closeRef.current?.focus();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    closeRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openIndex, close, step]);

  const active = openIndex === null ? null : items[openIndex];
  const activePhoto = active ? img(active.image) : null;

  return (
    <>
      {/* — Filters ————————————————————————————————————————— */}
      <div
        role="tablist"
        aria-label="Filter gallery"
        className="flex flex-wrap items-center justify-center gap-2 sm:gap-3"
      >
        {galleryCategories.map((category) => {
          const selected = filter === category.id;
          return (
            <button
              key={category.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setFilter(category.id)}
              className={[
                "eyebrow rounded-full border px-4 py-2.5 transition-all duration-300 ease-[var(--ease-soft)]",
                selected
                  ? "border-gold-400 bg-gold-400 text-forest-900"
                  : "border-forest-800/20 text-forest-800 hover:border-gold-500/60 hover:bg-forest-800/5",
              ].join(" ")}
            >
              {category.label}
            </button>
          );
        })}
      </div>

      {/* — Masonry ————————————————————————————————————————— */}
      <div className="mt-10 columns-1 gap-4 min-[480px]:columns-2 lg:columns-3 lg:gap-5">
        {items.map((item, index) => {
          const photo = img(item.image);
          return (
            <button
              key={`${item.image}-${filter}`}
              type="button"
              onClick={(event) => {
                triggerRef.current = event.currentTarget;
                setOpenIndex(index);
              }}
              className="group mb-4 block w-full break-inside-avoid overflow-hidden rounded-[var(--radius-card)] border border-sand-dark/60 bg-ivory text-left transition-all duration-500 ease-[var(--ease-soft)] hover:-translate-y-1 hover:border-gold-400/50 hover:shadow-[0_22px_46px_-26px_rgba(18,59,42,0.45)] lg:mb-5"
            >
              <span className="relative block overflow-hidden">
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  width={photo.width}
                  height={photo.height}
                  placeholder="blur"
                  blurDataURL={photo.blurDataURL}
                  loading={index < 3 ? "eager" : "lazy"}
                  sizes="(min-width: 1024px) 30vw, (min-width: 480px) 45vw, 92vw"
                  className="h-auto w-full transition-transform duration-[900ms] ease-[var(--ease-soft)] group-hover:scale-[1.05]"
                />
                <span
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-forest-950 from-10% via-forest-950/55 via-45% to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                />
                <span
                  data-scrim=""
                  className="absolute inset-x-0 bottom-0 translate-y-2 p-5 opacity-0 transition-all duration-500 ease-[var(--ease-soft)] group-hover:translate-y-0 group-hover:opacity-100"
                >
                  <span className="block font-display text-[1.1rem] text-ivory">
                    {item.caption}
                  </span>
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {items.length === 0 ? (
        <p className="mt-10 text-center text-ink-soft">
          Nothing in this category yet.
        </p>
      ) : null}

      {/* — Lightbox ———————————————————————————————————————— */}
      {active && activePhoto ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={active.caption}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-forest-950/94 p-4 backdrop-blur-sm sm:p-8"
          onClick={close}
        >
          <div
            className="relative max-h-full w-full max-w-4xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative overflow-hidden rounded-[var(--radius-lg-card)] border border-gold-400/25">
              <Image
                src={activePhoto.src}
                alt={activePhoto.alt}
                width={activePhoto.width}
                height={activePhoto.height}
                placeholder="blur"
                blurDataURL={activePhoto.blurDataURL}
                sizes="(min-width: 1024px) 56rem, 92vw"
                className="max-h-[72dvh] w-full object-contain"
              />
            </div>

            <div className="mt-4 flex items-center justify-between gap-4">
              <p className="font-display text-[1.2rem] text-gold-200">
                {active.caption}
              </p>
              <p className="eyebrow text-cream/45">
                {openIndex! + 1} / {items.length}
              </p>
            </div>

            <button
              ref={closeRef}
              type="button"
              onClick={close}
              className="absolute -top-2 right-0 flex h-11 w-11 -translate-y-full items-center justify-center rounded-full border border-gold-400/35 text-gold-200 transition-colors duration-300 hover:bg-gold-400/12 sm:-top-4"
            >
              <span className="sr-only">Close gallery</span>
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                <path d="M4 4l12 12M16 4L4 16" strokeLinecap="round" />
              </svg>
            </button>

            <NavButton side="left" onClick={() => step(-1)} />
            <NavButton side="right" onClick={() => step(1)} />
          </div>
        </div>
      ) : null}
    </>
  );
}

function NavButton({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "absolute top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-gold-400/30 bg-forest-950/70 text-gold-200 transition-colors duration-300 hover:bg-gold-400/15 sm:flex",
        side === "left" ? "-left-6 lg:-left-16" : "-right-6 lg:-right-16",
      ].join(" ")}
    >
      <span className="sr-only">{side === "left" ? "Previous photo" : "Next photo"}</span>
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
        <path
          d={side === "left" ? "M12 4l-6 6 6 6" : "M8 4l6 6-6 6"}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
