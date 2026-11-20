/** DD/MM/YYYY ↔ YYYY-MM-DD */
export function displayDateToIso(display: string): string {
  const m = display.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return "";
  const [, d, mo, y] = m;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

export function isoDateToDisplay(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  const [, y, mo, d] = m;
  return `${d}/${mo}/${y}`;
}

export function todayDisplayDate(): string {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, "0");
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${d}/${m}/${now.getFullYear()}`;
}

export const DEFAULT_MATCH_TIME = "21:00";

/** Serbest metinden gelen saati `SS:DD` formatına çevirir; geçersizse varsayılan. */
export function normalizeMatchTime(value: string | undefined): string {
  const m = (value ?? "").trim().match(/^(\d{1,2})[:.](\d{2})$/);
  if (!m) return DEFAULT_MATCH_TIME;
  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  if (hours > 23 || minutes > 59) return DEFAULT_MATCH_TIME;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** Saat listesi: 00 … 23. */
export const MATCH_HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0"));

/** Dakika yalnızca çeyrekler: her dakikayı seçtirmek gereksiz. */
export const MATCH_MINUTE_OPTIONS = ["00", "15", "30", "45"] as const;

/**
 * Dakika listesi. Eskiden kaydedilmiş çeyrek olmayan dakika (ör. 20:10)
 * kaybolmasın diye listede kendi yerine eklenir.
 */
export function matchMinuteOptions(currentMinute?: string): string[] {
  const options: string[] = [...MATCH_MINUTE_OPTIONS];
  if (currentMinute && /^\d{2}$/.test(currentMinute) && !options.includes(currentMinute)) {
    options.push(currentMinute);
    options.sort();
  }
  return options;
}
