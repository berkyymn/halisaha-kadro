import type { PosterMetrics } from "@/types";

/**
 * Poster her cihazda aynı iç boyutta yerleşir ve ekrana yalnızca ölçeklenerek
 * sığdırılır: kart boyutu, yazı tabanları ve isim etiketleri ekrana göre
 * değişmez, indirilen poster telefonda da bilgisayarda da birebir aynı çıkar.
 */
export const POSTER_LOGICAL_SIZE: Record<"versus" | "single", PosterMetrics> = {
  versus: { width: 1200, height: 750 },
  single: { width: 640, height: 800 },
};

/** Ekrandaki poster / iç boyut oranı (sürüklenen kart kopyası bu ölçekte çizilir). */
let currentScale = 1;

export function setPosterScale(scale: number): void {
  if (scale > 0) currentScale = scale;
}

export function getPosterScale(): number {
  return currentScale;
}
