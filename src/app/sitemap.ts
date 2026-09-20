import type { MetadataRoute } from "next";
import { business } from "@/data/business";
import { mainNav } from "@/data/navigation";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return mainNav.map((item) => ({
    url: `${business.siteUrl}${item.href === "/" ? "" : item.href}`,
    lastModified: now,
    changeFrequency: item.href === "/" ? "weekly" : "monthly",
    priority: item.href === "/" ? 1 : item.href === "/menu" ? 0.9 : 0.7,
  }));
}
