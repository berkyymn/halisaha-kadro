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
