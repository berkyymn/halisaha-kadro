import type { PhotoCrop } from "@/types";

export type { PhotoCrop };

/** Kırpma editörünün iç daire çapı (px) — panX/panY bu ölçüye göre saklanır */
export const PHOTO_CROP_VIEWPORT_REF = 94;

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
