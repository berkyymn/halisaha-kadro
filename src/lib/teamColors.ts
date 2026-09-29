import type { JerseyConfig } from "@/types";

const CHROME = "#9ca3af";

/** Göreli parlaklık (0 siyah … 1 beyaz) */
export function luminance(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 0.5;
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Takım vurgu rengi: forma rengi; çok koyuysa ikinci renk, o da koyuysa krom. */
export function teamAccent(jersey: Pick<JerseyConfig, "primaryColor" | "secondaryColor">): string {
  for (const color of [jersey.primaryColor, jersey.secondaryColor]) {
    if (color && luminance(color) > 0.06) return color;
  }
  return CHROME;
}
