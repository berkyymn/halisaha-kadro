import type { TeamMode } from "@/lib/posterSnapshot";

/** Çıktı genişliği ekrandaki poster boyutundan bağımsız sabit tutulur. */
export const EXPORT_WIDTH = { versus: 2400, single: 1600 } as const;
// JPEG %92: posterde saydamlık yok; gözle kayıp yok, ~1 MB (PNG ~5 MB).
// WhatsApp'ta daha hızlı gider ve ikinci kez sert sıkıştırılmaz.
const EXPORT_JPEG_QUALITY = 0.92;

export const POSTER_FILENAME = "halisaha-kadro.jpg";

/** Posteri yüksek çözünürlüklü JPEG olarak çizer. Düzenleme ipuçları çıktıya girmez. */
export async function renderPosterJpeg(teamMode: TeamMode): Promise<Blob> {
  const el = document.getElementById("match-poster");
  if (!el) throw new Error("Poster bulunamadı");
  const { toJpeg } = await import("html-to-image");
  const pixelRatio = Math.max(2, EXPORT_WIDTH[teamMode] / Math.max(1, el.offsetWidth));
  const dataUrl = await toJpeg(el, {
    pixelRatio,
    cacheBust: true,
    quality: EXPORT_JPEG_QUALITY,
    backgroundColor: "#09090b",
    // Düzenleme ipuçları (Düzenle, Başlık ekle) çıktıya girmez.
    filter: (node) => !(node instanceof HTMLElement && node.dataset.exportIgnore === "true"),
  });
  return (await fetch(dataUrl)).blob();
}

/** Pano yalnızca PNG kabul eder (Chrome/Safari): JPEG'i PNG'ye çevirir. */
export async function jpegToPng(jpeg: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(jpeg);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("PNG oluşturulamadı"))), "image/png")
  );
}

export function downloadBlob(blob: Blob, filename = POSTER_FILENAME): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function canCopyImage(): boolean {
  return typeof ClipboardItem !== "undefined" && Boolean(navigator.clipboard?.write);
}

/**
 * Görseli panoya kopyalar. ClipboardItem'a promise verilir: tıklama anındaki
 * kullanıcı izni, görsel hazırlanırken düşmez (Safari bunu zorunlu tutar).
 */
export async function copyImageToClipboard(png: Promise<Blob>): Promise<void> {
  await navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
}

export function canShareFile(file: File): boolean {
  return typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });
}
