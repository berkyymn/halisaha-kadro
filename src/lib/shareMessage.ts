import { SITE_URL } from "@/lib/siteUrl";

/** Varsayılan saha adı: kullanıcı değiştirmediyse mesajda saha yazılmaz. */
const DEFAULT_VENUE = "HALI SAHA";

type ShareInfo = { date?: string; time?: string; venue?: string };

/** Mesajdaki site adresi: "https://" olmadan, sohbette kısa ve tıklanabilir. */
export function shareSiteLabel(siteUrl: string = SITE_URL): string {
  return siteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

/**
 * Posterle birlikte giden kısa mesaj; her paylaşımda siteye geri bağlantı taşır.
 * Örnek: "⚽ Maç kadromuz hazır! 14/10 22:00 · ALİBEYKÖY. Kadronu sen de kur: halisahakadro.com"
 */
export function buildShareMessage(info: ShareInfo, siteUrl: string = SITE_URL): string {
  const day = (info.date ?? "").trim().match(/^(\d{2})\/(\d{2})\/\d{4}$/);
  const when = [day ? `${day[1]}/${day[2]}` : "", (info.time ?? "").trim()].filter(Boolean).join(" ");
  const venue = (info.venue ?? "").trim();
  const showVenue = venue !== "" && venue.toLocaleUpperCase("tr-TR") !== DEFAULT_VENUE;
  const details = [when, showVenue ? venue : ""].filter(Boolean).join(" · ");
  return `⚽ Maç kadromuz hazır!${details ? ` ${details}.` : ""} Kadronu sen de kur: ${shareSiteLabel(siteUrl)}`;
}

/** X gönderi kutusunu hazır metinle açar. */
export function xShareUrl(message: string): string {
  return `https://x.com/intent/post?text=${encodeURIComponent(message)}`;
}

const TR_ASCII: Record<string, string> = { ç: "c", ğ: "g", ı: "i", i: "i", ö: "o", ş: "s", ü: "u" };

function slug(text: string): string {
  return text
    .toLocaleLowerCase("tr-TR")
    .replace(/[çğıiöşü]/g, (c) => TR_ASCII[c] ?? c)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30)
    .replace(/-+$/g, "");
}

/** İndirilen / paylaşılan dosyanın adı: kadro-<takım>[-vs-<rakip>]-<gg-aa-yyyy>.jpg */
export function posterFileName(teams: string[], date?: string): string {
  const parts = ["kadro", ...teams.map(slug).filter(Boolean)];
  if (parts.length === 3) parts.splice(2, 0, "vs");
  const d = (date ?? "").trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (d) parts.push(`${d[1]}-${d[2]}-${d[3]}`);
  return `${parts.join("-")}.jpg`;
}
