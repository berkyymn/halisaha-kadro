import { getAppCheckTokenSafe } from "@/lib/firebase/client";

/**
 * Çerezsiz, anonim günlük sayaç: Firestore `stats/<gg-aa>` (İstanbul günü)
 * dokümanında alanları 1 artırır. Kimlik, IP ya da cihaz bilgisi yazılmaz;
 * yalnızca toplam sayılar tutulur. Bu yüzden çerez onayından bağımsız
 * çalışır ve Google Analytics'in göremediği (çerezi reddeden) kullanımı da sayar.
 *
 * SDK yerine REST: misafirlerde Firestore'un yerel deposu (IndexedDB) açılmaz.
 * Kurallar: firebase/firestore.rules → match /stats/{day}.
 */
export const USAGE_COUNTERS = [
  "sessions",
  "sessions_mobile",
  "posters",
  "posters_mobile",
  "download",
  "whatsapp",
  "instagram",
  "x",
  "copy",
  "system",
  "consent_granted",
  "consent_denied",
] as const;

export type UsageCounter = (typeof USAGE_COUNTERS)[number];

const SESSION_KEY = "halisaha-usage-session";

/** İstanbul saatine göre gün: 2026-10-19 */
export function istanbulDay(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** REST commit gövdesi: alanları atomik olarak 1 artırır (doküman yoksa oluşur). */
export function buildIncrementCommit(projectId: string, day: string, counters: UsageCounter[]) {
  return {
    writes: [
      {
        transform: {
          document: `projects/${projectId}/databases/(default)/documents/stats/${day}`,
          fieldTransforms: [...new Set(counters)].map((fieldPath) => ({
            fieldPath,
            increment: { integerValue: "1" },
          })),
        },
      },
    ],
  };
}

function endpoint(projectId: string): string | null {
  if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true") {
    return `http://127.0.0.1:8080/v1/projects/${projectId}/databases/(default)/documents:commit`;
  }
  // Yalnızca canlı derleme ve canlı alan adı: geliştirme, localhost ve önizleme
  // kanalı (…--kanal.web.app) gerçek istatistiği kirletmesin.
  if (process.env.NODE_ENV !== "production") return null;
  const host = window.location.hostname;
  if (host === "localhost" || host.startsWith("127.") || host.includes("--")) return null;
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:commit`;
}

/** Sayaçları 1 artırır; hata kullanıcıya yansımaz (istatistik kaybı kabul edilebilir). */
export function countUsage(...counters: UsageCounter[]): void {
  if (typeof window === "undefined" || counters.length === 0) return;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!projectId || !apiKey) return;
  const url = endpoint(projectId);
  if (!url) return;
  void (async () => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const appCheck = await getAppCheckTokenSafe();
    if (appCheck) headers["X-Firebase-AppCheck"] = appCheck;
    await fetch(`${url}?key=${apiKey}`, {
      method: "POST",
      headers,
      body: JSON.stringify(buildIncrementCommit(projectId, istanbulDay(), counters)),
      keepalive: true,
    });
  })().catch(() => undefined);
}

/** Sekme başına bir kez: uygulama açılışı. */
export function countSessionOnce(mobile: boolean): void {
  try {
    if (sessionStorage.getItem(SESSION_KEY)) return;
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    return;
  }
  countUsage(...(mobile ? (["sessions", "sessions_mobile"] as const) : (["sessions"] as const)));
}
