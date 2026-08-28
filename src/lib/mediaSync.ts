import {
  isFirebaseStorageConfigured,
  playerCutoutStoragePath,
  playerSourceStoragePath,
  resolveStorageDownloadUrl,
  teamLogoStoragePath,
  uploadDataUrlToStorage,
  deleteStorageObject,
} from "@/lib/firebase/storage";
import type { Player, TeamLogo } from "@/types";
import type { PosterSnapshot } from "@/lib/posterSnapshot";

class _MediaUploadCache {
  private _cache = new Map<string, string>();

  get(path: string, dataUrl: string): string | undefined {
    return this._cache.get(cacheKey(path, dataUrl));
  }

  set(path: string, dataUrl: string, storagePath: string): void {
    this._cache.set(cacheKey(path, dataUrl), storagePath);
  }

  reset(): void {
    this._cache.clear();
  }
}

const _uploadCache = new _MediaUploadCache();

function cacheKey(path: string, dataUrl: string): string {
  return `${path}:${dataUrl.length}:${dataUrl.slice(0, 48)}`;
}

async function uploadIfDataUrl(
  path: string,
  dataUrl: string | undefined
): Promise<string | undefined> {
  if (!dataUrl?.startsWith("data:")) return undefined;
  const cached = _uploadCache.get(path, dataUrl);
  if (cached) return cached;

  console.log("[SYNC-DIAG] uploadIfDataUrl uploading", JSON.stringify({ path }));
  try {
    const storagePath = await uploadDataUrlToStorage(path, dataUrl);
    _uploadCache.set(path, dataUrl, storagePath);
    return storagePath;
  } catch (error) {
    // Storage is optional; a failed media upload must not block poster data.
    console.warn("Storage media upload failed:", path, error);
    return undefined;
  }
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
      ...(cutoutStoragePath
        ? { cutoutStoragePath }
        : player.cutoutUrl?.startsWith("data:")
          ? { cutoutStoragePath: undefined }
          : {}),
      ...(photoSourceStoragePath
        ? { photoSourceStoragePath }
        : player.photoSource?.startsWith("data:")
          ? { photoSourceStoragePath: undefined }
          : {}),
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
  if (!storagePath) return { ...logo, storagePath: undefined };

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
      try {
        const [cutoutUrl, photoSource] = await Promise.all([
          !player.cutoutUrl && player.cutoutStoragePath
            ? resolveStorageDownloadUrl(player.cutoutStoragePath)
            : Promise.resolve(undefined),
          !player.photoSource && player.photoSourceStoragePath
            ? resolveStorageDownloadUrl(player.photoSourceStoragePath)
            : Promise.resolve(undefined),
        ]);
        if (cutoutUrl || photoSource) {
          next[id] = {
            ...player,
            ...(cutoutUrl ? { cutoutUrl } : {}),
            ...(photoSource ? { photoSource } : {}),
          };
        }
      } catch (error) {
        console.warn("Storage player media hydrate failed:", id, error);
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
  _uploadCache.reset();
}

function storagePaths(snapshot: PosterSnapshot): Set<string> {
  const paths = new Set<string>();
  for (const player of Object.values(snapshot.savedPlayers)) {
    if (player.cutoutStoragePath) paths.add(player.cutoutStoragePath);
    if (player.photoSourceStoragePath) paths.add(player.photoSourceStoragePath);
  }
  for (const logo of [snapshot.homeTeam.logo, snapshot.awayTeam.logo]) {
    if (logo.storagePath) paths.add(logo.storagePath);
  }
  return paths;
}

export async function cleanupOrphanedMedia(
  previous: PosterSnapshot | null,
  next: PosterSnapshot
): Promise<void> {
  if (!isFirebaseStorageConfigured() || !previous) return;
  const nextPaths = storagePaths(next);
  const orphaned = [...storagePaths(previous)].filter(
    (path) => !nextPaths.has(path)
  );
  await Promise.all(
    orphaned.map(async (path) => {
      try {
        await deleteStorageObject(path);
      } catch (error) {
        console.warn("Storage orphan cleanup failed:", path, error);
      }
    })
  );
}
