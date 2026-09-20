import { ButtonLink } from "./Button";
import { Ornament } from "./Ornament";
import { Parallax } from "./Parallax";
import { Photo } from "./Photo";
import { Reveal } from "./Reveal";

/**
 * "Made for Sharing" — the brand block on the home page.
 *
 * Every claim here is about the product and the experience. No founding year,
 * no family history, no sourcing claims: none of that is verified.
 */

export function StorySection() {
  return (
    <section className="relative overflow-hidden bg-ivory py-16 sm:py-20 lg:py-24">
      <div className="container-page">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* — Images ———————————————————————————————————————— */}
          <Reveal anim="rise" className="relative">
            {/* The frame stays put; only the photo inside it drifts. */}
            <div className="arch-top relative aspect-[4/3.4] overflow-hidden shadow-[0_28px_60px_-34px_rgba(18,59,42,0.6)] sm:aspect-[4/3]">
              <Parallax strength={20}>
                <Photo
                  image="craft-pistachio"
                  fill
                  sizes="(min-width: 1024px) 46vw, 92vw"
                  className="object-cover"
                />
              </Parallax>
            </div>

            {/* Overlapping inset, hidden on the smallest screens */}
            <div className="absolute -bottom-8 -right-2 hidden w-[42%] max-w-[13rem] overflow-hidden rounded-[var(--radius-card)] border-4 border-ivory shadow-[0_20px_44px_-22px_rgba(18,59,42,0.55)] min-[480px]:block lg:-right-6">
              <div className="relative aspect-[3/4]">
                <Photo
                  image="sharing-tray"
                  fill
                  sizes="13rem"
                  className="object-cover"
                />
              </div>
            </div>

            {/*
              Offset arch frame, the same treatment as the hero. A square
              corner rule was tried here first and read as a stray line,
              because the arch curves away from it.

              No negative z-index: this Reveal only forms a stacking context
              while it is animating, so a `-z-10` child would drop behind the
              section background once the animation finished. The frame sits
              entirely outside the photo, so painting it last is harmless.
            */}
            <div
              aria-hidden="true"
              className="arch-top pointer-events-none absolute -inset-2 border border-gold-500/35 sm:-inset-3"
            />
          </Reveal>

          {/* — Copy —————————————————————————————————————————— */}
          <Reveal anim="right" delay={80} className="mt-10 lg:mt-0">
            <p className="eyebrow text-gold-700">Our Story</p>

            <h2 className="mt-5 text-[2rem] leading-[1.06] text-forest-800 sm:text-[2.6rem] lg:text-[3rem]">
              Made for
              <span className="block font-normal italic text-forest-700">
                Sharing.
              </span>
            </h2>

            <Ornament width="sm" className="mt-6" />

            <div className="mt-7 space-y-5 text-[1rem] leading-[1.8] text-ink-soft">
              <p>
                At Ammoun Sweets, the experience is about more than dessert.
                From flaky pastries and pistachio-rich favourites to creamy
                ashta sweets and celebration platters, every selection is made
                to bring people together.
              </p>
              <p>
                Our counter is built around the sweets people actually ask for
                — knafeh, baklava, halawet el jeben, mafroukeh — prepared in
                the traditional Middle Eastern way, with the generous
                presentation a table full of guests deserves.
              </p>
              <p>
                We are a local Bass Hill shop on the Hume Highway. Come in, see
                what is on the trays that day, and take home as much or as
                little as you like.
              </p>
            </div>

            <div className="mt-9 flex flex-col gap-3 min-[420px]:flex-row min-[420px]:flex-wrap">
              <ButtonLink href="/our-story" variant="ghost" size="lg">
                More About Us
              </ButtonLink>
              <ButtonLink href="/catering" variant="ghost" size="lg">
                Catering &amp; Events
              </ButtonLink>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
