import type { PhotoCrop } from "@/types";

export type { PhotoCrop };

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Yuvarlak kırpım + takım renkli halka → poster için hazır avatar */
export async function renderPlayerAvatar(
  imageSrc: string,
  crop: PhotoCrop,
  options: {
    faceSize?: number;
    ringWidth?: number;
    primaryColor: string;
    secondaryColor: string;
  }
): Promise<string> {
  const faceSize = options.faceSize ?? 256;
  const ringWidth = options.ringWidth ?? 10;
  const total = faceSize + ringWidth * 2;

  const img = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = total;
  canvas.height = total;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  const cx = total / 2;
  const cy = total / 2;
  const innerR = faceSize / 2;

  // Takım renkli halka (yarı yarıya)
  ctx.beginPath();
  ctx.arc(cx, cy, innerR + ringWidth / 2, 0, Math.PI * 2);
  ctx.lineWidth = ringWidth;
  ctx.strokeStyle = options.primaryColor;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, innerR + ringWidth / 2, -Math.PI / 2, Math.PI / 2);
  ctx.lineWidth = ringWidth;
  ctx.strokeStyle = options.secondaryColor;
  ctx.stroke();

  // Fotoğraf — daire içi
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.clip();

  const cover = Math.max(faceSize / img.width, faceSize / img.height);
  const scale = cover * crop.scale;
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, cx - w / 2 + crop.panX, cy - h / 2 + crop.panY, w, h);
  ctx.restore();

  return canvas.toDataURL("image/png");
}
