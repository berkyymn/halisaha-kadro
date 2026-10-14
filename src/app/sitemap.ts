import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/siteUrl";
import { FORMAT_GUIDES } from "@/lib/formationGuide";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/hali-saha-kadro-kur`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/hali-saha-dizilisleri`, changeFrequency: "monthly", priority: 0.8 },
    ...FORMAT_GUIDES.map((g) => ({
      url: `${SITE_URL}/hali-saha-dizilisleri/${g.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    { url: `${SITE_URL}/gizlilik`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
