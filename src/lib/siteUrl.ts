const FALLBACK_SITE_URL = "https://hali-saha-kadro-97082.web.app";

function normalizeSiteUrl(raw: string): string {
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withProtocol.replace(/\/+$/, "");
}

/** Canonical, OG, robots ve sitemap için tek kaynak. Domain alınınca env güncellenir. */
export const SITE_URL = normalizeSiteUrl(
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || FALLBACK_SITE_URL
);
