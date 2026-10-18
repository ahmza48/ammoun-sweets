import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BreadcrumbJsonLd, ProductJsonLd } from "@/components/JsonLd";
import { Ornament } from "@/components/Ornament";
import { Photo } from "@/components/Photo";
import { Reveal } from "@/components/Reveal";
import { AddToCart } from "@/components/shop/AddToCart";
import { ShopProductCard } from "@/components/shop/ShopProductCard";
import { business } from "@/data/business";
import { isImageKey } from "@/data/images";
import {
  getProductBySlug,
  getRelatedProducts,
  isPurchasable,
} from "@/server/services/catalog";
import { tryGetStoreSettings } from "@/server/services/settings";

/**
 * Product detail page at /menu/<slug>.
 *
 * Dynamic, because price and availability change through the day. A product
 * that is temporarily sold out keeps its page and its URL — it renders with
 * the purchase controls disabled and `OutOfStock` in the structured data,
 * rather than 404ing, which would throw away its search ranking every time
 * the shop runs out of knafeh.
 */
export const dynamic = "force-dynamic";

type PageProps = {
  // Next 16: route params arrive as a Promise.
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return { title: "Product not found" };
  }

  const description =
    product.seoDescription ??
    product.shortDescription ??
    product.description ??
    `${product.name} from Ammoun Sweets in Bass Hill, NSW.`;

  return {
    title: product.seoTitle ?? `${product.name} — Lebanese Sweets`,
    description,
    alternates: { canonical: `/menu/${product.slug}` },
    openGraph: {
      title: product.name,
      description,
      url: `/menu/${product.slug}`,
      type: "website",
      images: isImageKey(product.image)
        ? [{ url: `/images/${product.image}.jpg` }]
        : undefined,
    },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) notFound();

  const [related, settings] = await Promise.all([
    getRelatedProducts(product),
    tryGetStoreSettings(),
  ]);

  const sellableVariants = product.variants
    .filter((v) => v.active && v.price > 0)
    .map((v) => ({
      id: v.id,
      name: v.name,
      price: v.price,
      minQuantity: v.minQuantity,
      maxQuantity: v.maxQuantity,
      inventoryTracked: v.inventoryTracked,
      stockQuantity: v.stockQuantity,
      weightGrams: v.weightGrams,
    }));

  const orderingOpen = !settings?.orderingPaused;
  const purchasable = isPurchasable(product) && orderingOpen;
  const isArabic = /[؀-ۿ]/.test(product.alsoKnownAs ?? "");

  return (
    <>
      <div className="bg-forest-900 pt-[4.5rem] lg:pt-[5.25rem]" />

      <section className="bg-ivory py-10 sm:py-14 lg:py-16">
        <div className="container-page">
          <nav aria-label="Breadcrumb" className="mb-8">
            <ol className="flex flex-wrap items-center gap-2 text-[0.78rem] text-ink-soft">
              <li>
                <Link href="/menu" className="transition-colors hover:text-forest-800">
                  Menu
                </Link>
              </li>
              {product.categoryName ? (
                <>
                  <li aria-hidden="true" className="text-ink-faint">
                    /
                  </li>
                  <li>
                    <Link
                      href={`/menu#${product.categorySlug}`}
                      className="transition-colors hover:text-forest-800"
                    >
                      {product.categoryName}
                    </Link>
                  </li>
                </>
              ) : null}
              <li aria-hidden="true" className="text-ink-faint">
                /
              </li>
              <li className="font-medium text-forest-800">{product.name}</li>
            </ol>
          </nav>

          <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
            {/* — Image ——————————————————————————————————————— */}
            <Reveal anim="rise">
              <div className="arch-top relative aspect-[4/3.6] overflow-hidden shadow-[0_28px_60px_-34px_rgba(18,59,42,0.55)] sm:aspect-[4/3.2]">
                {isImageKey(product.image) ? (
                  <Photo
                    image={product.image}
                    fill
                    priority
                    sizes="(min-width: 1024px) 46vw, 92vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-sand" />
                )}

                {!isPurchasable(product) ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-forest-950/55">
                    <span className="eyebrow rounded-full border border-gold-400/50 bg-forest-950/85 px-5 py-2.5 text-gold-200">
                      Sold out today
                    </span>
                  </div>
                ) : null}
              </div>
            </Reveal>

            {/* — Details ————————————————————————————————————— */}
            <Reveal anim="right" delay={70}>
              {product.categoryName ? (
                <p className="eyebrow text-gold-700">{product.categoryName}</p>
              ) : null}

              <h1 className="mt-3 text-[2rem] leading-[1.06] text-forest-800 sm:text-[2.6rem]">
                {product.name}
              </h1>

              {product.alsoKnownAs ? (
                <p
                  lang={isArabic ? "ar" : undefined}
                  dir={isArabic ? "rtl" : undefined}
                  className="mt-2 text-[1.1rem] text-ink-faint"
                >
                  {product.alsoKnownAs}
                </p>
              ) : null}

              <Ornament width="sm" className="mt-5" />

              {product.description ? (
                <p className="mt-6 max-w-[48ch] text-[1rem] leading-[1.8] text-ink-soft">
                  {product.description}
                </p>
              ) : null}

              <div className="mt-8">
                {sellableVariants.length > 0 ? (
                  <AddToCart
                    productId={product.id}
                    productName={product.name}
                    productSlug={product.slug}
                    image={product.image}
                    variants={sellableVariants}
                    purchasable={purchasable}
                  />
                ) : (
                  <div className="rounded-[12px] border border-sand-dark bg-sand/50 px-5 py-4">
                    <p className="text-[0.95rem] leading-relaxed text-ink-soft">
                      This one isn&rsquo;t available to order online yet. Call us on{" "}
                      <a
                        href={`tel:${business.phone}`}
                        className="font-semibold text-forest-800 underline underline-offset-4"
                      >
                        {business.displayPhone}
                      </a>{" "}
                      and we&rsquo;ll sort it out.
                    </p>
                  </div>
                )}
              </div>

              {!orderingOpen ? (
                <p className="mt-4 rounded-[12px] border border-gold-500/40 bg-gold-400/12 px-4 py-3 text-[0.88rem] leading-relaxed text-forest-800">
                  {settings?.orderingPausedMessage ??
                    "Online ordering is paused at the moment — please call the shop."}
                </p>
              ) : null}

              {/* Allergens: the shop's own words, never our classification. */}
              {product.allergenInfo || product.dietaryInfo ? (
                <div className="mt-8 rounded-[12px] border border-sand-dark bg-cream px-5 py-4">
                  <h2 className="eyebrow text-gold-700">Allergens &amp; dietary</h2>
                  {product.dietaryInfo ? (
                    <p className="mt-2.5 text-[0.88rem] leading-[1.7] text-ink-soft">
                      {product.dietaryInfo}
                    </p>
                  ) : null}
                  {product.allergenInfo ? (
                    <p className="mt-2 text-[0.88rem] leading-[1.7] text-ink-soft">
                      {product.allergenInfo}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <p className="mt-6 text-[0.8rem] leading-relaxed text-ink-faint">
                Our sweets are made in a kitchen that handles nuts, dairy, gluten and
                sesame. Please contact us about allergies before ordering.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {related.length > 0 ? (
        <section className="texture-paper bg-cream py-14 sm:py-18">
          <div className="container-page">
            <h2 className="text-center font-display text-[1.7rem] text-forest-800 sm:text-[2.1rem]">
              You might also like
            </h2>
            <Ornament width="sm" className="mx-auto mt-4" />

            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item, index) => (
                <Reveal key={item.id} anim="rise" delay={index * 60} className="h-full">
                  <ShopProductCard product={item} categoryLabel={item.categoryName} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <ProductJsonLd product={product} />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", path: "/" },
          { name: "Menu", path: "/menu" },
          { name: product.name, path: `/menu/${product.slug}` },
        ]}
      />
    </>
  );
}
