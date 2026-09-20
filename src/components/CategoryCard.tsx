import Image from "next/image";
import Link from "next/link";
import { img, type ImageKey } from "@/data/images";

/**
 * Tall arched card used for the occasions grid and the menu category index.
 * Image-led: the copy sits on a scrim at the bottom so the photo carries it.
 */

type CategoryCardProps = {
  title: string;
  description: string;
  image: ImageKey;
  href: string;
  /** Small gold label above the title, e.g. an item count. */
  meta?: string;
  className?: string;
};

export function CategoryCard({
  title,
  description,
  image,
  href,
  meta,
  className = "",
}: CategoryCardProps) {
  const photo = img(image);

  return (
    <Link
      href={href}
      className={`group relative block overflow-hidden rounded-[var(--radius-lg-card)] transition-transform duration-500 ease-[var(--ease-soft)] hover:-translate-y-1 ${className}`}
    >
      <div className="relative aspect-[3/4] w-full sm:aspect-[4/5]">
        <Image
          src={photo.src}
          alt={photo.alt}
          fill
          placeholder="blur"
          blurDataURL={photo.blurDataURL}
          sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 85vw"
          className="object-cover transition-transform duration-[900ms] ease-[var(--ease-soft)] group-hover:scale-[1.07]"
        />

        {/*
          Readability scrim. The copy sits in the bottom ~40% of the card, so
          the gradient is close to opaque there — white text stays past AA even
          over the brightest photo in the set.
        */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-forest-950 from-25% via-forest-950/80 via-55% to-transparent"
        />

        {/* Gold hairline that draws in on hover */}
        <div
          aria-hidden="true"
          className="absolute inset-3 rounded-[12px] border border-gold-300/0 transition-colors duration-500 group-hover:border-gold-300/45"
        />
      </div>

      {/*
        `data-scrim` marks this copy as sitting on a photo + gradient rather
        than on a CSS background, so automated contrast checks know not to
        resolve its background to the section colour behind the card.
      */}
      <div data-scrim="" className="absolute inset-x-0 bottom-0 p-6 sm:p-7">
        {meta ? <p className="eyebrow text-gold-400">{meta}</p> : null}
        <h3 className="mt-2 text-[1.5rem] leading-tight text-ivory sm:text-[1.65rem]">
          {title}
        </h3>
        <p className="mt-2.5 max-w-[32ch] text-[0.88rem] leading-[1.6] text-cream/80">
          {description}
        </p>

        <span className="eyebrow mt-4 inline-flex items-center gap-1.5 text-gold-300">
          Explore
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
    </Link>
  );
}
