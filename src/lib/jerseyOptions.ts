import type { JerseyConfig, JerseyStyle } from "@/types";

export const JERSEY_STYLE_OPTIONS: { id: JerseyStyle; label: string }[] = [
  { id: "solid", label: "Tek renk" },
  { id: "split", label: "Parçalı" },
  { id: "vertical_stripes", label: "Dikey çizgi" },
  { id: "wide_vertical_stripes", label: "Geniş dikey" },
  { id: "horizontal_stripes", label: "Yatay çizgi" },
];

export const JERSEY_TEXT_COLORS = [
  { label: "Beyaz", color: "#ffffff" },
  { label: "Siyah", color: "#111827" },
  { label: "Mavi", color: "#2563eb" },
  { label: "Lacivert", color: "#1e3a8a" },
  { label: "Kırmızı", color: "#dc2626" },
  { label: "Sarı", color: "#facc15" },
  { label: "Turuncu", color: "#ea580c" },
  { label: "Yeşil", color: "#16a34a" },
] as const;

const VALID_JERSEY_STYLES: JerseyStyle[] = [
  "solid",
  "split",
  "vertical_stripes",
  "wide_vertical_stripes",
  "horizontal_stripes",
  "sash",
];

export function normalizeJerseyStyle(style?: JerseyStyle | string): JerseyStyle {
  if (style && VALID_JERSEY_STYLES.includes(style as JerseyStyle)) {
    return style as JerseyStyle;
  }
  return "split";
}

export function normalizeJersey(jersey: Partial<JerseyConfig>): JerseyConfig {
  return {
    style: normalizeJerseyStyle(jersey.style),
    primaryColor: jersey.primaryColor ?? "#374151",
    secondaryColor: jersey.secondaryColor ?? "#111827",
    numberColor: jersey.numberColor ?? "#ffffff",
  };
}
