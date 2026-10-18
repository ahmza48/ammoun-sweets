import { business } from "@/data/business";
import type { CategoryView, ProductView } from "@/server/services/catalog";
import { cheapestVariant, isPurchasable } from "@/server/services/catalog";

/**
 * LOCAL BUSINESS STRUCTURED DATA
 *
 * Schema type is `Bakery`, a subtype of FoodEstablishment, which is the
 * closest correct fit for a sweets and pastry shop.
 *
 * Deliberately NOT included:
 *  - `aggregateRating`. Google's guidelines require self-serving ratings to
 *    be genuinely collected and shown on the page; re-publishing a Google
 *    rating as your own structured data is a manual-action risk. The rating
 *    is displayed visually and attributed to Google instead.
 *  - `priceRange` beyond a coarse band, `servesCuisine` claims we can't
 *    verify, and any award/certification properties.
 *
 * `openingHoursSpecification` reads straight from `business.hours` — once the
 * owner confirms the real hours, this updates with them.
 */

export function LocalBusinessJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Bakery",
    "@id": `${business.siteUrl}/#business`,
    name: business.name,
    description: business.shortDescription,
    url: business.siteUrl,
    telephone: business.internationalPhone,
    image: `${business.siteUrl}/images/hero-pistachio-baklava.jpg`,
    priceRange: "$$",
    currenciesAccepted: "AUD",
    address: {
      "@type": "PostalAddress",
      streetAddress: `${business.address.shop}, ${business.address.street}`,
      addressLocality: business.address.suburb,
      addressRegion: business.address.state,
      postalCode: business.address.postcode,
      addressCountry: business.address.countryCode,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: business.geo.latitude,
      longitude: business.geo.longitude,
    },
    hasMap: business.links.googleMaps,
    openingHoursSpecification: business.hours.days
      .filter((day) => day.open && day.close)
      .map((day) => ({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: `https://schema.org/${day.day}`,
        opens: day.open,
        closes: day.close,
      })),
    sameAs: [business.links.instagram, business.links.facebook],
    hasMenu: `${business.siteUrl}/menu`,
    areaServed: {
      "@type": "City",
      name: "Sydney",
    },
  };

  return <Script id="ld-business" data={data} />;
}

/**
 * Menu structured data, generated from the live database rows the page just
 * rendered — so the prices in the markup can never drift from the prices on
 * screen, which is exactly the mismatch that gets rich results suppressed.
 */
export function MenuJsonLd({ menu }: { menu: CategoryView[] }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Menu",
    "@id": `${business.siteUrl}/menu#menu`,
    name: `${business.name} Menu`,
    inLanguage: "en-AU",
    hasMenuSection: menu.map((category) => ({
      "@type": "MenuSection",
      name: category.name,
      description: category.description ?? undefined,
      hasMenuItem: category.products.map((product) => ({
        "@type": "MenuItem",
        name: product.name,
        description: product.shortDescription ?? product.description ?? undefined,
        url: `${business.siteUrl}/menu/${product.slug}`,
        offers: product.variants
          .filter((v) => v.active && v.price > 0)
          .map((variant) => ({
            "@type": "Offer",
            name: variant.name,
            price: (variant.price / 100).toFixed(2),
            priceCurrency: "AUD",
            availability: isPurchasable(product)
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
          })),
      })),
    })),
  };

  return <Script id="ld-menu" data={data} />;
}

/**
 * Product structured data for a single product page.
 *
 * `offers` reflects real variant prices and real availability. No rating and
 * no review markup: we have no first-party reviews to cite, and inventing
 * them is both against Google's guidelines and dishonest.
 */
export function ProductJsonLd({ product }: { product: ProductView }) {
  const cheapest = cheapestVariant(product.variants);
  const sellable = product.variants.filter((v) => v.active && v.price > 0);
  if (!cheapest || sellable.length === 0) return null;

  const availability = isPurchasable(product)
    ? "https://schema.org/InStock"
    : "https://schema.org/OutOfStock";

  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${business.siteUrl}/menu/${product.slug}#product`,
    name: product.name,
    description: product.shortDescription ?? product.description ?? undefined,
    category: product.categoryName ?? undefined,
    image: product.image ? `${business.siteUrl}/images/${product.image}.jpg` : undefined,
    brand: { "@type": "Brand", name: business.name },
    offers:
      sellable.length === 1
        ? {
            "@type": "Offer",
            price: (sellable[0].price / 100).toFixed(2),
            priceCurrency: "AUD",
            availability,
            url: `${business.siteUrl}/menu/${product.slug}`,
          }
        : {
            "@type": "AggregateOffer",
            priceCurrency: "AUD",
            lowPrice: (Math.min(...sellable.map((v) => v.price)) / 100).toFixed(2),
            highPrice: (Math.max(...sellable.map((v) => v.price)) / 100).toFixed(2),
            offerCount: sellable.length,
            availability,
            url: `${business.siteUrl}/menu/${product.slug}`,
          },
  };

  return <Script id="ld-product" data={data} />;
}

export function BreadcrumbJsonLd({
  items,
}: {
  items: { name: string; path: string }[];
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${business.siteUrl}${item.path}`,
    })),
  };

  return <Script id="ld-breadcrumb" data={data} />;
}

function Script({ id, data }: { id: string; data: unknown }) {
  return (
    <script
      id={id}
      type="application/ld+json"
      // Values come from our own typed data files, never user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
