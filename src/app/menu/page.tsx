import type { Metadata } from "next";
import Image from "next/image";
import { BreadcrumbJsonLd, MenuJsonLd } from "@/components/JsonLd";
import { ButtonLink } from "@/components/Button";
import { CTASection } from "@/components/CTASection";
import { MenuCategoryNav } from "@/components/MenuCategoryNav";
import { Ornament, OrnamentDots } from "@/components/Ornament";
import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/Reveal";
import { business } from "@/data/business";
import { img } from "@/data/images";
import { formatPrice, menu, priceDisclaimer } from "@/data/menu";

export const metadata: Metadata = {
  title: "Menu — Lebanese Sweets, Baklava & Knafeh",
  description:
    "Browse the Ammoun Sweets menu: ashta favourites, baklava and pistachio sweets, knafeh, namoura, maamoul and traditional Lebanese pastries in Bass Hill, NSW.",
  alternates: { canonical: "/menu" },
};

export default function MenuPage() {
  return (
    <>
      <PageHero
        eyebrow="What We Make"
        title={
          <>
            Our Menu of
            <span className="block font-normal italic text-gold-300">
              Lebanese Sweets
            </span>
          </>
        }
        subtitle="Ashta favourites, layered baklava, pistachio-rich pastries and the traditional sweets our regulars come in for. Sold by the half kilo unless noted."
        image="display-counter"
      />

      <MenuCategoryNav />

      <div className="texture-paper bg-cream">
        {menu.map((category, categoryIndex) => {
          const photo = img(category.image);
          const flip = categoryIndex % 2 === 1;

          return (
            <section
              key={category.id}
              id={category.id}
              aria-labelledby={`${category.id}-heading`}
              className="scroll-mt-32 border-b border-sand-dark/60 py-14 last:border-b-0 sm:py-18 lg:py-20"
            >
              <div className="container-page">
                <div
                  className={`grid gap-9 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-14 ${
                    flip ? "lg:[&>*:first-child]:order-2" : ""
                  }`}
                >
                  {/* — Category intro + photo ——————————————————— */}
                  <Reveal className="lg:sticky lg:top-32 lg:self-start">
                    <p className="eyebrow text-gold-700">
                      {String(categoryIndex + 1).padStart(2, "0")} &middot;{" "}
                      {category.items.length} item
                      {category.items.length === 1 ? "" : "s"}
                    </p>

                    <h2
                      id={`${category.id}-heading`}
                      className="mt-4 text-[1.9rem] leading-[1.08] text-forest-800 sm:text-[2.35rem]"
                    >
                      {category.name}
                    </h2>

                    <Ornament width="sm" className="mt-5" />

                    <p className="mt-5 max-w-[38ch] text-[0.97rem] leading-[1.7] text-ink-soft">
                      {category.tagline}
                    </p>

                    <div className="arch-top relative mt-8 aspect-[4/3] overflow-hidden shadow-[0_22px_50px_-30px_rgba(18,59,42,0.5)]">
                      <Image
                        src={photo.src}
                        alt={photo.alt}
                        fill
                        placeholder="blur"
                        blurDataURL={photo.blurDataURL}
                        loading={categoryIndex === 0 ? "eager" : "lazy"}
                        sizes="(min-width: 1024px) 34vw, 92vw"
                        className="object-cover"
                      />
                    </div>
                  </Reveal>

                  {/* — Items ——————————————————————————————————— */}
                  <div>
                    <ul className="divide-y divide-sand-dark/70 border-y border-sand-dark/70">
                      {category.items.map((item, itemIndex) => {
                        const itemPhoto = img(item.image);
                        return (
                          <li key={item.id} id={item.id} className="scroll-mt-32">
                            <Reveal delay={Math.min(itemIndex * 50, 200)}>
                              <div className="flex gap-4 py-6 sm:gap-6 sm:py-7">
                                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[12px] border border-sand-dark/70 sm:h-28 sm:w-28">
                                  <Image
                                    src={itemPhoto.src}
                                    alt={itemPhoto.alt}
                                    fill
                                    placeholder="blur"
                                    blurDataURL={itemPhoto.blurDataURL}
                                    loading="lazy"
                                    sizes="(min-width: 640px) 7rem, 5rem"
                                    className="object-cover"
                                  />
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                                    <h3 className="text-[1.3rem] leading-tight text-forest-800 sm:text-[1.45rem]">
                                      {item.name}
                                    </h3>
                                    {item.alsoKnownAs ? (
                                      <span
                                        lang={/[؀-ۿ]/.test(item.alsoKnownAs) ? "ar" : undefined}
                                        dir={/[؀-ۿ]/.test(item.alsoKnownAs) ? "rtl" : undefined}
                                        className="text-[0.92rem] text-ink-faint"
                                      >
                                        {item.alsoKnownAs}
                                      </span>
                                    ) : null}
                                  </div>

                                  <p className="mt-2 text-[0.9rem] leading-[1.65] text-ink-soft">
                                    {item.description}
                                  </p>

                                  <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                                    <span className="font-display text-[1.15rem] font-semibold text-forest-800">
                                      {formatPrice(item.price)}
                                    </span>
                                    {item.size ? (
                                      <>
                                        <OrnamentDots className="translate-y-[-0.1em]" />
                                        <span className="text-[0.8rem] uppercase tracking-[0.14em] text-ink-faint">
                                          {item.size}
                                        </span>
                                      </>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            </Reveal>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {/* — Disclaimer ————————————————————————————————————— */}
      <section className="bg-sand/45 py-12">
        <div className="container-narrow text-center">
          <Ornament width="sm" className="mx-auto" />
          <p className="mt-6 text-[0.9rem] leading-[1.75] text-ink-soft">
            {priceDisclaimer}
          </p>
          <p className="mt-4 text-[0.9rem] leading-[1.75] text-ink-soft">
            Looking for something you can&rsquo;t see here, or a larger
            quantity? Call us on{" "}
            <a
              href={`tel:${business.phone}`}
              className="font-semibold text-forest-800 underline underline-offset-4 transition-colors hover:text-forest-700"
            >
              {business.displayPhone}
            </a>{" "}
            and we&rsquo;ll let you know what we can do.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/catering#enquiry" variant="ghost" size="lg">
              Enquire About a Large Order
            </ButtonLink>
          </div>
        </div>
      </section>

      <CTASection />

      <MenuJsonLd />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", path: "/" },
          { name: "Menu", path: "/menu" },
        ]}
      />
    </>
  );
}
