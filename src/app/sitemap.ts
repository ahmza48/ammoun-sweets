import type { MetadataRoute } from "next";
import { business } from "@/data/business";
import { mainNav } from "@/data/navigation";
import { getActiveCategories, getAllProductSlugs } from "@/server/services/catalog";

/**
 * Sitemap.
 *
 * Static pages come from the navigation, product and category URLs from the
 * database — so a product added in the admin panel is discoverable without a
 * developer touching anything.
 *
 * Checkout, order and admin routes are deliberately absent; they are also
 * `noindex` at the page level.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = mainNav.map((item) => ({
    url: `${business.siteUrl}${item.href === "/" ? "" : item.href}`,
    lastModified: now,
    changeFrequency: item.href === "/" ? "weekly" : "monthly",
    priority: item.href === "/" ? 1 : item.href === "/menu" ? 0.9 : 0.7,
  }));

  try {
    const [products, categories] = await Promise.all([
      getAllProductSlugs(),
      getActiveCategories(),
    ]);

    const productPages: MetadataRoute.Sitemap = products.map((product) => ({
      url: `${business.siteUrl}/menu/${product.slug}`,
      lastModified: product.updatedAt,
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    // Categories are anchors on the menu page rather than routes of their own.
    const categoryPages: MetadataRoute.Sitemap = categories.map((category) => ({
      url: `${business.siteUrl}/menu#${category.slug}`,
      lastModified: category.updatedAt,
      changeFrequency: "monthly",
      priority: 0.6,
    }));

    return [...staticPages, ...productPages, ...categoryPages];
  } catch {
    // A sitemap must never be the reason a deploy fails — fall back to the
    // static routes if the database isn't reachable at build time.
    return staticPages;
  }
}
