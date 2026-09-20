import type { ImageKey } from "@/data/images";
import { Ornament } from "./Ornament";
import { Photo } from "./Photo";

/**
 * Compact hero for inner pages: a deep-green band with a soft background
 * photo, sitting under the fixed header.
 */

type PageHeroProps = {
  eyebrow: string;
  title: React.ReactNode;
  subtitle?: string;
  image: ImageKey;
  /** The first inner page in a visit is often the LCP — allow opting in. */
  priority?: boolean;
};

export function PageHero({
  eyebrow,
  title,
  subtitle,
  image,
  priority = true,
}: PageHeroProps) {
  return (
    <section className="relative isolate overflow-hidden bg-forest-900 pt-[4.5rem] lg:pt-[5.25rem]">
      {/* Dimmed to 25% under a dark gradient, so it can be requested at a
          much lower quality without any visible difference. */}
      <Photo
        image={image}
        decorative
        fill
        priority={priority}
        quality={45}
        sizes="100vw"
        className="-z-10 object-cover opacity-25"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-b from-forest-950/88 via-forest-950/78 to-forest-900"
      />

      <div className="container-page">
        <div className="flex flex-col items-center py-14 text-center sm:py-20 lg:py-24">
          <p className="eyebrow text-gold-400">{eyebrow}</p>

          <h1 className="mt-5 max-w-[18ch] text-[2.35rem] leading-[1.04] text-ivory min-[375px]:text-[2.7rem] sm:text-[3.4rem] lg:text-[4rem]">
            {title}
          </h1>

          <Ornament tone="light" width="sm" className="mt-6" />

          {subtitle ? (
            <p className="mt-6 max-w-[52ch] text-[1rem] leading-[1.75] text-cream/75 sm:text-[1.05rem]">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
