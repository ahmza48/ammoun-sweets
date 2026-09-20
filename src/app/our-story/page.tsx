import type { Metadata } from "next";
import Image from "next/image";
import { BreadcrumbJsonLd } from "@/components/JsonLd";
import { ButtonLink } from "@/components/Button";
import { Ornament } from "@/components/Ornament";
import { PageHero } from "@/components/PageHero";
import { ReviewsSection } from "@/components/ReviewsSection";
import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/SectionHeading";
import { business } from "@/data/business";
import { img } from "@/data/images";

export const metadata: Metadata = {
  title: "Our Story — A Lebanese Sweets Shop in Bass Hill",
  description:
    "Ammoun Sweets is a Lebanese sweets and pastry shop on the Hume Highway in Bass Hill, NSW, making baklava, knafeh, ashta sweets and platters for sharing.",
  alternates: { canonical: "/our-story" },
};

/**
 * NOTE ON COPY: nothing on this page claims a founding year, a family
 * history, an award or an ingredient origin. Everything said here is about
 * the product range and the shop itself, which is what we can verify.
 */

const values = [
  {
    title: "Traditional flavour",
    body: "Knafeh, baklava, halawet el jeben, namoura and maamoul, prepared in the traditional Middle Eastern way rather than reinterpreted.",
    image: "baklava-trays" as const,
  },
  {
    title: "Generous presentation",
    body: "Trays that look like they were meant to be put in the middle of a table, not portioned out one piece at a time.",
    image: "market-spread" as const,
  },
  {
    title: "A local shop",
    body: "We are on the Hume Highway at Bass Hill, serving the families and neighbourhoods around us in south-west Sydney.",
    image: "in-store-counter" as const,
  },
];

export default function OurStoryPage() {
  const lead = img("craft-pistachio");
  const wide = img("in-store-display");

  return (
    <>
      <PageHero
        eyebrow="Our Story"
        title={
          <>
            Made for
            <span className="block font-normal italic text-gold-300">
              Sharing.
            </span>
          </>
        }
        subtitle="At Ammoun Sweets, the experience is about more than dessert — it is about what ends up in the middle of the table."
        image="sharing-tray"
      />

      {/* — Lead ——————————————————————————————————————————— */}
      <section className="bg-ivory py-16 sm:py-20 lg:py-24">
        <div className="container-page">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <Reveal>
              <div className="arch-top relative aspect-[4/3.3] overflow-hidden shadow-[0_28px_60px_-34px_rgba(18,59,42,0.6)]">
                <Image
                  src={lead.src}
                  alt={lead.alt}
                  fill
                  placeholder="blur"
                  blurDataURL={lead.blurDataURL}
                  sizes="(min-width: 1024px) 46vw, 92vw"
                  className="object-cover"
                />
              </div>
            </Reveal>

            <Reveal delay={80}>
              <p className="eyebrow text-gold-700">Who We Are</p>
              <h2 className="mt-5 text-[1.9rem] leading-[1.08] text-forest-800 sm:text-[2.4rem]">
                A Lebanese sweets shop on the Hume Highway
              </h2>
              <Ornament width="sm" className="mt-6" />

              <div className="mt-7 space-y-5 text-[1rem] leading-[1.8] text-ink-soft">
                <p>
                  From flaky pastries and pistachio-rich favourites to creamy
                  ashta sweets and celebration platters, every selection at
                  Ammoun Sweets is made to bring people together.
                </p>
                <p>
                  Lebanese sweets are not really an individual dessert. They
                  arrive on a tray, get put down in the middle of a room, and
                  disappear over the course of an afternoon. That is the way we
                  think about what we sell: not single servings, but something
                  you bring home for everyone.
                </p>
                <p>
                  Our counter changes through the day as trays come out. The
                  best way to see what we do is simply to walk in and look.
                </p>
              </div>

              <div className="mt-9 flex flex-col gap-3 min-[420px]:flex-row min-[420px]:flex-wrap">
                <ButtonLink href="/menu" variant="ghost" size="lg">
                  See the Menu
                </ButtonLink>
                <ButtonLink href="/visit" variant="ghost" size="lg">
                  Visit the Shop
                </ButtonLink>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* — What matters ————————————————————————————————— */}
      <section className="texture-paper bg-cream py-16 sm:py-20 lg:py-24">
        <div className="container-page">
          <SectionHeading
            eyebrow="What Matters to Us"
            title="Three things we get right"
            subtitle="Not a mission statement — just what we think makes a sweets shop worth driving to."
          />

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {values.map((value, index) => {
              const photo = img(value.image);
              return (
                <Reveal key={value.title} delay={index * 70}>
                  <article className="h-full overflow-hidden rounded-[var(--radius-lg-card)] border border-sand-dark/70 bg-ivory">
                    <div className="relative aspect-[4/3]">
                      <Image
                        src={photo.src}
                        alt={photo.alt}
                        fill
                        placeholder="blur"
                        blurDataURL={photo.blurDataURL}
                        loading="lazy"
                        sizes="(min-width: 768px) 32vw, 92vw"
                        className="object-cover"
                      />
                    </div>
                    <div className="p-6 sm:p-7">
                      <h3 className="text-[1.35rem] leading-tight text-forest-800">
                        {value.title}
                      </h3>
                      <Ornament width="sm" className="mt-4" />
                      <p className="mt-4 text-[0.92rem] leading-[1.7] text-ink-soft">
                        {value.body}
                      </p>
                    </div>
                  </article>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* — Wide image band ——————————————————————————————— */}
      <section className="relative">
        <div className="relative h-[16rem] w-full sm:h-[22rem] lg:h-[28rem]">
          <Image
            src={wide.src}
            alt={wide.alt}
            fill
            placeholder="blur"
            blurDataURL={wide.blurDataURL}
            loading="lazy"
            sizes="100vw"
            className="object-cover"
          />
          {/*
            The photo behind this band is a bright shop display, so the scrim
            has to stay close to opaque for the full height of the quote — not
            just at the very bottom edge.
          */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-forest-950 from-30% via-forest-950/70 via-60% to-forest-950/20"
          />
          <div
            data-scrim=""
            className="container-page absolute inset-x-0 bottom-0 pb-8 sm:pb-12"
          >
            <p className="max-w-[30ch] font-display text-[1.6rem] italic leading-[1.3] text-gold-200 sm:text-[2.1rem]">
              &ldquo;The taste will take you back to Lebanon.&rdquo;
            </p>
            <p className="eyebrow mt-4 text-cream/65">
              {business.name} &middot; Bass Hill
            </p>
          </div>
        </div>
      </section>

      <ReviewsSection />

      <BreadcrumbJsonLd
        items={[
          { name: "Home", path: "/" },
          { name: "Our Story", path: "/our-story" },
        ]}
      />
    </>
  );
}
