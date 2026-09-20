import { business } from "@/data/business";
import { menu } from "@/data/menu";

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

/** Menu structured data, generated from the same data file the page renders. */
export function MenuJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Menu",
    "@id": `${business.siteUrl}/menu#menu`,
    name: `${business.name} Menu`,
    inLanguage: "en-AU",
    hasMenuSection: menu.map((category) => ({
      "@type": "MenuSection",
      name: category.name,
      description: category.tagline,
      hasMenuItem: category.items.map((item) => ({
        "@type": "MenuItem",
        name: item.name,
        description: item.description,
        ...(item.price !== null
          ? {
              offers: {
                "@type": "Offer",
                price: item.price,
                priceCurrency: "AUD",
                ...(item.size ? { eligibleQuantity: { "@type": "QuantitativeValue", name: item.size } } : {}),
              },
            }
          : {}),
      })),
    })),
  };

  return <Script id="ld-menu" data={data} />;
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
