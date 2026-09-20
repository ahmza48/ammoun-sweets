import type { MetadataRoute } from "next";
import { business } from "@/data/business";

/**
 * DEMO: crawling is disallowed so the preview build can't be indexed and
 * outrank or confuse the real business listing.
 * Before launch, swap `disallow` for `allow: "/"`.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", disallow: "/" }],
    sitemap: `${business.siteUrl}/sitemap.xml`,
  };
}
