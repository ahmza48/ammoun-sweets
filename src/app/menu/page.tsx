import type { Metadata } from "next";
import Link from "next/link";
import { BreadcrumbJsonLd, MenuJsonLd } from "@/components/JsonLd";
import { ButtonLink } from "@/components/Button";
import { MenuCategoryNav } from "@/components/MenuCategoryNav";
import { Ornament } from "@/components/Ornament";
import { PageHero } from "@/components/PageHero";
import { Photo } from "@/components/Photo";
import { Reveal } from "@/components/Reveal";
import { ShopProductCard } from "@/components/shop/ShopProductCard";
import { business } from "@/data/business";
import { isImageKey } from "@/data/images";
import { getMenu } from "@/server/services/catalog";
import { tryGetStoreSettings } from "@/server/services/settings";

export const metadata: Metadata = {
  title: "Menu — Lebanese Sweets, Baklava & Knafeh",
  description:
    "Browse and order the Ammoun Sweets menu: ashta favourites, baklava and pistachio sweets, knafeh, namoura, maamoul and traditional Lebanese pastries in Bass Hill, NSW.",
  alternates: { canonical: "/menu" },
};

/**
 * The shop.
 *
 * Products, categories, prices and availability now come from the database,
 * but the layout is the approved one: sticky category rail, alternating
 * category intros, gold ornaments. The only visual additions are the price
 * being per-variant ("from $26") and the sold-out state.
 *
 * Dynamic rather than static because stock and prices change during the day —
 * a cached menu that shows a sold-out item as available costs the shop a
 * phone call.
 */
export const dynamic = "force-dynamic";

export default async function MenuPage() {
  const [menu, settings] = await Promise.all([getMenu(), tryGetStoreSettings()]);
  const categoriesWithProducts = menu.filter((c) => c.products.length > 0);

  if (categoriesWithProducts.length === 0) {
    return (
      <>
        <PageHero
          eyebrow="What We Make"
          title="Our Menu"
          subtitle="Our online menu is being updated."
          image="display-counter"
        />
        <section className="bg-cream py-20">
          <div className="container-narrow text-center">
            <Ornament width="sm" className="mx-auto" />
            <p className="mt-6 text-[1rem] leading-[1.75] text-ink-soft">
              We&rsquo;re just updating the menu. Please call the shop on{" "}
              <a
                href={`tel:${business.phone}`}
                className="font-semibold text-forest-800 underline underline-offset-4"
              >
                {business.displayPhone}
              </a>{" "}
              and we&rsquo;ll let you know what&rsquo;s on the counter today.
            </p>
          </div>
        </section>
      </>
    );
  }

  const navCategories = categoriesWithProducts.map((c) => ({ id: c.slug, name: c.name }));

  return (
    <>
      <PageHero
        eyebrow="Order Online"
        title={
          <>
            Our Menu of
            <span className="block font-normal italic text-gold-300">Lebanese Sweets</span>
          </>
        }
        subtitle="Choose your size, add to the cart, and collect from the shop. Everything is made the traditional way."
        image="display-counter"
      />

      <MenuCategoryNav categories={navCategories} />

      {settings?.orderingPaused ? (
        <div className="bg-gold-400/15 py-4">
          <div className="container-page">
            <p className="text-center text-[0.92rem] text-forest-800">
              {settings.orderingPausedMessage ??
                "Online ordering is paused at the moment — please call the shop."}
            </p>
          </div>
        </div>
      ) : null}

      <div className="texture-paper bg-cream">
        {categoriesWithProducts.map((category, categoryIndex) => {
          const flip = categoryIndex % 2 === 1;

          return (
            <section
              key={category.id}
              id={category.slug}
              aria-labelledby={`${category.slug}-heading`}
              className="scroll-mt-32 border-b border-sand-dark/60 py-14 last:border-b-0 sm:py-18 lg:py-20"
            >
              <div className="container-page">
                <div
                  className={`grid gap-9 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-12 ${
                    flip ? "lg:[&>*:first-child]:order-2" : ""
                  }`}
                >
                  <Reveal className="lg:sticky lg:top-32 lg:self-start">
                    <p className="eyebrow text-gold-700">
                      {String(categoryIndex + 1).padStart(2, "0")} &middot;{" "}
                      {category.products.length} item
                      {category.products.length === 1 ? "" : "s"}
                    </p>

                    <h2
                      id={`${category.slug}-heading`}
                      className="mt-4 text-[1.9rem] leading-[1.08] text-forest-800 sm:text-[2.35rem]"
                    >
                      {category.name}
                    </h2>

                    <Ornament width="sm" className="mt-5" />

                    {category.description ? (
                      <p className="mt-5 max-w-[38ch] text-[0.97rem] leading-[1.7] text-ink-soft">
                        {category.description}
                      </p>
                    ) : null}

                    {isImageKey(category.image) ? (
                      <div className="arch-top relative mt-8 hidden aspect-[4/3] overflow-hidden shadow-[0_22px_50px_-30px_rgba(18,59,42,0.5)] lg:block">
                        <Photo
                          image={category.image}
                          fill
                          eager={categoryIndex === 0}
                          sizes="32vw"
                          className="object-cover"
                        />
                      </div>
                    ) : null}
                  </Reveal>

                  <div className="grid gap-5 sm:grid-cols-2">
                    {category.products.map((product, index) => (
                      <Reveal
                        key={product.id}
                        anim="rise"
                        delay={Math.min(index * 60, 240)}
                        className="h-full"
                      >
                        <ShopProductCard
                          product={product}
                          categoryLabel={category.name}
                          priority={categoryIndex === 0 && index < 2}
                        />
                      </Reveal>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <section className="bg-sand/45 py-12">
        <div className="container-narrow text-center">
          <Ornament width="sm" className="mx-auto" />
          <p className="mt-6 text-[0.9rem] leading-[1.75] text-ink-soft">
            Prices include GST where applicable. Platter sizes and seasonal items can be
            arranged in store.
          </p>
          <p className="mt-4 text-[0.9rem] leading-[1.75] text-ink-soft">
            Looking for something you can&rsquo;t see here, or a larger quantity? Call us on{" "}
            <a
              href={`tel:${business.phone}`}
              className="font-semibold text-forest-800 underline underline-offset-4 transition-colors hover:text-forest-700"
            >
              {business.displayPhone}
            </a>{" "}
            or{" "}
            <Link
              href="/catering#enquiry"
              className="font-semibold text-forest-800 underline underline-offset-4 transition-colors hover:text-forest-700"
            >
              send an enquiry
            </Link>
            .
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/catering#enquiry" variant="ghost" size="lg">
              Enquire About a Large Order
            </ButtonLink>
          </div>
        </div>
      </section>

      <MenuJsonLd menu={categoriesWithProducts} />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", path: "/" },
          { name: "Menu", path: "/menu" },
        ]}
      />
    </>
  );
}
