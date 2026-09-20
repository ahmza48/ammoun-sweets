import Image from "next/image";
import { business } from "@/data/business";
import { img } from "@/data/images";
import { ButtonLink } from "./Button";
import { GoogleRating } from "./GoogleRating";
import { Ornament } from "./Ornament";

/**
 * Home hero.
 *
 * Deep-green full-bleed panel with one large arched product photo. The photo
 * is `priority` + `fetchPriority="high"` because it is the LCP element; the
 * blur placeholder and explicit sizes keep it from shifting the layout.
 */

export function Hero() {
  const hero = img("hero-pistachio-baklava");

  return (
    <section className="relative isolate overflow-hidden bg-forest-900 pt-[4.5rem] lg:pt-[5.25rem]">
      {/* Warm radial glow so the flat green doesn't read as a solid block */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(120%_85%_at_78%_18%,rgba(201,164,92,0.20),transparent_58%),radial-gradient(90%_70%_at_8%_88%,rgba(44,106,73,0.42),transparent_62%)]"
      />

      <div className="container-page">
        <div className="grid items-center gap-7 py-8 sm:gap-10 sm:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.02fr)] lg:gap-14 lg:py-20 xl:gap-20">
          {/* — Copy ————————————————————————————————————————— */}
          <div className="max-w-xl">
            <p className="eyebrow flex flex-wrap items-center gap-x-2.5 gap-y-1 text-gold-400">
              <span>Authentic Lebanese Sweets</span>
              <span aria-hidden="true" className="h-1 w-1 rounded-full bg-gold-400/70" />
              <span>Bass Hill</span>
            </p>

            <h1 className="mt-6 text-[2.5rem] leading-[1.02] text-ivory min-[375px]:text-[2.85rem] sm:text-[3.6rem] lg:text-[4.1rem] xl:text-[4.6rem]">
              A Taste of Tradition,
              <span className="mt-1 block font-normal italic text-gold-300">
                Made to Be Shared.
              </span>
            </h1>

            <Ornament tone="light" width="sm" className="mt-5 sm:mt-7" />

            <p className="mt-5 max-w-[46ch] text-[1.02rem] leading-[1.75] text-cream/80 sm:mt-7 sm:text-[1.08rem]">
              Handcrafted Lebanese sweets, creamy ashta favourites,
              pistachio-filled pastries and beautifully prepared platters —
              on the Hume Highway at Bass Hill.
            </p>

            <div className="mt-7 flex flex-col gap-3 min-[375px]:flex-row min-[375px]:flex-wrap sm:mt-9">
              <ButtonLink href="/menu" variant="gold" size="lg">
                Explore Our Sweets
              </ButtonLink>
              <ButtonLink
                href={business.links.directions}
                variant="outline"
                size="lg"
                external
              >
                Get Directions
              </ButtonLink>
            </div>

            <GoogleRating tone="light" className="mt-7 sm:mt-9" />
          </div>

          {/* — Image ———————————————————————————————————————— */}
          <div className="relative">
            {/* Gold hairline frame, offset behind the photo */}
            <div
              aria-hidden="true"
              className="arch-top absolute -inset-2 -z-10 border border-gold-400/25 sm:-inset-3"
            />

            <div className="arch-top relative aspect-[4/5] overflow-hidden shadow-[0_30px_70px_-30px_rgba(8,32,20,0.85)] sm:aspect-[5/5] lg:aspect-[4/4.6]">
              <Image
                src={hero.src}
                alt={hero.alt}
                fill
                priority
                fetchPriority="high"
                placeholder="blur"
                blurDataURL={hero.blurDataURL}
                sizes="(min-width: 1024px) 48vw, (min-width: 640px) 80vw, 92vw"
                className="object-cover"
              />
              {/* Slight bottom scrim so the frame edge stays visible */}
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-forest-950/35 via-transparent to-transparent"
              />
            </div>

            {/* Floating "made fresh" chip — small, gold hairline, not a badge blob */}
            <div className="absolute -bottom-4 left-4 flex items-center gap-2.5 rounded-full border border-gold-400/35 bg-forest-950/85 px-4 py-2.5 backdrop-blur-sm sm:-bottom-5 sm:left-8">
              <svg
                viewBox="0 0 12 12"
                className="h-2.5 w-2.5 text-gold-400"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M6 0c.5 3.2 2.3 5 5.5 6C8.3 7 6.5 8.8 6 12c-.5-3.2-2.3-5-5.5-6C3.7 5 5.5 3.2 6 0Z" />
              </svg>
              <span className="eyebrow text-gold-200">Fresh every day</span>
            </div>
          </div>
        </div>
      </div>

      {/* Transition into the cream section below */}
      <div
        aria-hidden="true"
        className="h-10 w-full bg-gradient-to-b from-transparent to-cream sm:h-14"
      />
    </section>
  );
}
