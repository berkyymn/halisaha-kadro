import type { CSSProperties } from "react";
import type { PhotoCrop } from "@/types";
import { loadImage, PHOTO_CROP_VIEWPORT_REF } from "@/lib/photoCrop";
import { useAppStore } from "@/store/useAppStore";

export type CompressOptions = {
  maxEdge?: number;
  quality?: number;
  /** cutout = şeffaflık korunur (webp) */
  kind?: "photo" | "cutout";
};

const DEFAULT_PHOTO_MAX = 400;
const DEFAULT_CUTOUT_MAX = 400;

export function getPhotoImgClassName(isCutout: boolean): string {
  return `pointer-events-none h-full w-full object-contain ${
    isCutout ? "object-top scale-110" : "object-center"
  }`;
}

/** PlayerAvatar ve kırpma editörü aynı görüntüleme kurallarını kullanır */
export function getPhotoDisplayStyle(
  crop?: PhotoCrop,
  isCutout?: boolean,
  viewportPx = PHOTO_CROP_VIEWPORT_REF
): CSSProperties {
  const base: CSSProperties = isCutout
    ? { objectPosition: "center 6%" }
    : { objectPosition: "center center" };
  if (!crop) return base;
  const panScale = viewportPx / PHOTO_CROP_VIEWPORT_REF;
  const panX = (crop.panX * panScale) / crop.scale;
  const panY = (crop.panY * panScale) / crop.scale;
  return {
    ...base,
    transform: `scale(${crop.scale}) translate(${panX}px, ${panY}px)`,
    transformOrigin: "center center",
  };
}

export async function compressDataUrl(
  dataUrl: string,
  options: CompressOptions = {}
): Promise<string> {
  if (!dataUrl.startsWith("data:image")) return dataUrl;

  const kind = options.kind ?? (dataUrl.includes("png") ? "cutout" : "photo");
  const maxEdge =
    options.maxEdge ?? (kind === "cutout" ? DEFAULT_CUTOUT_MAX : DEFAULT_PHOTO_MAX);
  const quality = options.quality ?? 0.85;
  const mime = kind === "cutout" ? "image/webp" : "image/jpeg";

  const img = await loadImage(dataUrl);
  const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
  if (scale >= 1 && dataUrl.length < 20000) {
    return dataUrl;
  }

  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;

  if (mime === "image/jpeg") {
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, w, h);
  }

  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL(mime, quality);
}

export async function compressPlayerPhotos(
  player: {
    photoSource?: string;
    cutoutUrl?: string;
    avatarUrl?: string;
    photoUrl?: string;
  },
  tier?: {
    photoMax?: number;
    cutoutMax?: number;
    photoQuality?: number;
    cutoutQuality?: number;
  }
): Promise<{
  photoSource?: string;
  cutoutUrl?: string;
  avatarUrl?: string;
  photoUrl?: string;
  didCompress: boolean;
}> {
  let didCompress = false;
  const next = { ...player };
  const photoOpts = {
    kind: "photo" as const,
    maxEdge: tier?.photoMax,
    quality: tier?.photoQuality,
  };
  const cutoutOpts = {
    kind: "cutout" as const,
    maxEdge: tier?.cutoutMax,
    quality: tier?.cutoutQuality,
  };

  if (next.photoSource?.startsWith("data:")) {
    const compressed = await compressDataUrl(next.photoSource, photoOpts);
    didCompress = didCompress || compressed !== next.photoSource;
    next.photoSource = compressed;
  }
  if (next.cutoutUrl?.startsWith("data:")) {
    const compressed = await compressDataUrl(next.cutoutUrl, cutoutOpts);
    didCompress = didCompress || compressed !== next.cutoutUrl;
    next.cutoutUrl = compressed;
  }
  if (next.avatarUrl?.startsWith("data:")) {
    const compressed = await compressDataUrl(next.avatarUrl, photoOpts);
    didCompress = didCompress || compressed !== next.avatarUrl;
    next.avatarUrl = compressed;
  }
  if (next.photoUrl?.startsWith("data:")) {
    const compressed = await compressDataUrl(next.photoUrl, photoOpts);
    didCompress = didCompress || compressed !== next.photoUrl;
    next.photoUrl = compressed;
  }

  return {
    photoSource: next.photoSource,
    cutoutUrl: next.cutoutUrl,
    avatarUrl: next.avatarUrl,
    photoUrl: next.photoUrl,
    didCompress,
  };
}

export async function compressAllSavedPlayers(): Promise<void> {
  const store = useAppStore.getState();
  const savedPlayers = { ...store.savedPlayers };
  const players = { ...store.players };
  let anyChanged = false;

  for (const [id, player] of Object.entries(savedPlayers)) {
    if (player.didCompress) continue;
    const result = await compressPlayerPhotos(player);
    if (result.didCompress) {
      anyChanged = true;
      const updated = {
        ...player,
        photoSource: result.photoSource,
        cutoutUrl: result.cutoutUrl,
        avatarUrl: result.avatarUrl,
        photoUrl: result.photoUrl,
        didCompress: true,
      };
      savedPlayers[id] = updated;
      if (players[id]) {
        players[id] = updated;
      }
    } else {
      savedPlayers[id] = { ...player, didCompress: true };
      if (players[id]) {
        players[id] = { ...players[id], didCompress: true };
      }
      anyChanged = true;
    }
  }

  if (anyChanged) {
    useAppStore.getState().applyCompressedPlayers(players, savedPlayers);
  }
}
