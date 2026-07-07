import {
  isFirebaseStorageConfigured,
  playerCutoutStoragePath,
  playerSourceStoragePath,
  resolveStorageDownloadUrl,
  teamLogoStoragePath,
  uploadDataUrlToStorage,
} from "@/lib/firebase/storage";
import type { Player, TeamLogo } from "@/types";

const uploadCache = new Map<string, string>();

function cacheKey(path: string, dataUrl: string): string {
  return `${path}:${dataUrl.length}:${dataUrl.slice(0, 48)}`;
}

async function uploadIfDataUrl(
  path: string,
  dataUrl: string | undefined
): Promise<string | undefined> {
  if (!dataUrl?.startsWith("data:")) return undefined;
  const key = cacheKey(path, dataUrl);
  const cached = uploadCache.get(key);
  if (cached) return cached;

  const storagePath = await uploadDataUrlToStorage(path, dataUrl);
  uploadCache.set(key, storagePath);
  return storagePath;
}

export async function uploadPlayerMediaForCloud(
  userId: string,
  players: Record<string, Player>
): Promise<Record<string, Player>> {
  if (!isFirebaseStorageConfigured()) return players;

  const next: Record<string, Player> = {};
  for (const [id, player] of Object.entries(players)) {
    let cutoutStoragePath = player.cutoutStoragePath;
    let photoSourceStoragePath = player.photoSourceStoragePath;

    if (player.cutoutUrl?.startsWith("data:")) {
      cutoutStoragePath = await uploadIfDataUrl(
        playerCutoutStoragePath(userId, id),
        player.cutoutUrl
      );
    }
    if (player.photoSource?.startsWith("data:")) {
      photoSourceStoragePath = await uploadIfDataUrl(
        playerSourceStoragePath(userId, id),
        player.photoSource
      );
    }

    next[id] = {
      ...player,
      ...(cutoutStoragePath ? { cutoutStoragePath } : {}),
      ...(photoSourceStoragePath ? { photoSourceStoragePath } : {}),
    };
  }
  return next;
}

export async function uploadLogoMediaForCloud(
  userId: string,
  side: "home" | "away",
  logo: TeamLogo
): Promise<TeamLogo> {
  if (!isFirebaseStorageConfigured()) return logo;
  if (logo.mode !== "upload" || !logo.imageUrl?.startsWith("data:")) {
    return logo;
  }

  const storagePath = await uploadIfDataUrl(
    teamLogoStoragePath(userId, side),
    logo.imageUrl
  );
  if (!storagePath) return logo;

  return {
    ...logo,
    storagePath,
    imageUrl: undefined,
  };
}

export async function hydratePlayerPhotosFromStorage(
  players: Record<string, Player>
): Promise<Record<string, Player>> {
  if (!isFirebaseStorageConfigured()) return players;

  const next: Record<string, Player> = { ...players };
  await Promise.all(
    Object.entries(players).map(async ([id, player]) => {
      if (player.cutoutUrl || !player.cutoutStoragePath) return;
      try {
        const cutoutUrl = await resolveStorageDownloadUrl(player.cutoutStoragePath);
        next[id] = { ...player, cutoutUrl };
      } catch (error) {
        console.warn("Storage cutout hydrate failed:", id, error);
      }
    })
  );
  return next;
}

export async function hydrateLogoFromStorage(logo: TeamLogo): Promise<TeamLogo> {
  if (!isFirebaseStorageConfigured()) return logo;
  if (logo.imageUrl || !logo.storagePath) return logo;
  try {
    const imageUrl = await resolveStorageDownloadUrl(logo.storagePath);
    return { ...logo, imageUrl };
  } catch (error) {
    console.warn("Storage logo hydrate failed:", error);
    return logo;
  }
}

export function clearMediaUploadCache() {
  uploadCache.clear();
}
