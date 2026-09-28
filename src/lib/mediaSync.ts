import { reportError } from "@/lib/errorReporting";
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

/** Tam içerik hash'i: aynı uzunluk/başlığa sahip farklı görseller çakışmasın */
function hashString(value: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < value.length; i++) {
    const ch = value.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `${(h2 >>> 0).toString(36)}${(h1 >>> 0).toString(36)}`;
}

function cacheKey(path: string, dataUrl: string): string {
  return `${path}:${dataUrl.length}:${hashString(dataUrl)}`;
}

async function uploadIfDataUrl(
  path: string,
  dataUrl: string | undefined
): Promise<string | undefined> {
  if (!dataUrl?.startsWith("data:")) return undefined;
  const cached = _uploadCache.get(path, dataUrl);
  if (cached) return cached;

  try {
    const storagePath = await uploadDataUrlToStorage(path, dataUrl);
    _uploadCache.set(path, dataUrl, storagePath);
    return storagePath;
  } catch (error) {
    // Storage is optional; a failed media upload must not block poster data.
    console.warn("Storage media upload failed:", path, error);
    reportError(error, "cloud-media", { level: "warning", extra: { op: "upload" } });
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
        reportError(error, "cloud-media", { level: "warning", extra: { op: "hydrate-player" } });
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
    reportError(error, "cloud-media", { level: "warning", extra: { op: "hydrate-logo" } });
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
    if (logo?.storagePath) paths.add(logo.storagePath);
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
        reportError(error, "cloud-media", { level: "warning", extra: { op: "cleanup" } });
      }
    })
  );
}
