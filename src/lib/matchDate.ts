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

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Bugünün tarihi YYYY-MM-DD (yerel saat) */
export function todayIsoDate(now = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Maç tarihi bugünden önce mi? (geçersiz tarih geçmiş sayılmaz) */
export function isPastMatchDate(display: string, now = new Date()): boolean {
  const iso = displayDateToIso(display);
  return iso !== "" && iso < todayIsoDate(now);
}

export function isTodayMatchDate(display: string, now = new Date()): boolean {
  return displayDateToIso(display) === todayIsoDate(now);
}

/** Şu anki saatten sonraki ilk çeyrek saat (ör. 18:07 → 18:15); gün bitiyorsa 23:45. */
export function nextQuarterHour(now = new Date()): string {
  const minutes = now.getHours() * 60 + now.getMinutes();
  const rounded = Math.min(23 * 60 + 45, Math.ceil((minutes + 1) / 15) * 15);
  return `${pad(Math.floor(rounded / 60))}:${pad(rounded % 60)}`;
}

/** Maç bugünse geçmiş bir saat seçilemez: geçmişteyse bir sonraki çeyrek saate çekilir. */
export function clampMatchTimeForDate(date: string, time: string, now = new Date()): string {
  const normalized = normalizeMatchTime(time);
  if (!isTodayMatchDate(date, now)) return normalized;
  const current = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  return normalized > current ? normalized : nextQuarterHour(now);
}
