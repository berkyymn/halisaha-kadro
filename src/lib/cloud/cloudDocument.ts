import {
  applyBrandingToSnapshot,
  parseBrandingSnapshot,
} from "@/lib/brandingSnapshot";
import { parsePosterSnapshot, type PosterSnapshot } from "@/lib/posterSnapshot";
import { slimTeamLogoForCloud } from "@/lib/teamLogoCloud";
import type { Player, TeamConfig } from "@/types";

/**
 * Bulut doküman sözleşmesi (posters/{uid}):
 *   data        tam poster (takımlar logo/forma dahil); medya Storage yolu olarak
 *   updatedAt   yazım zamanı (ISO)
 *   revision    her yazımda +1 (transaction; stale yazım reddedilir)
 *   photosOmitted / logosOmitted  boyut sınırı yüzünden atlanan medya
 *
 * Eski sürüm (≤ 2026-09) ayrıca `branding` + `brandingUpdatedAt` taşır ve
 * data takımlarında logo/forma yoktur. Okurken birleştirilir; ilk yazımda
 * eski alanlar silinir.
 */
export const POSTER_COLLECTION = "posters";
export const LEGACY_FIELDS = ["branding", "brandingUpdatedAt"] as const;

export type ParsedCloudDocument = {
  snapshot: PosterSnapshot;
  revision: number;
  updatedAt: string;
  photosOmitted: boolean;
  logosOmitted: boolean;
  /** Eski biçim: bir sonraki yazımda dönüştürülmeli */
  legacy: boolean;
};

function readRevision(raw: Record<string, unknown>): number {
  return typeof raw.revision === "number" && Number.isInteger(raw.revision) ? raw.revision : 0;
}

/** Firestore'dan gelen ham dokümanı tek parça snapshot'a çevirir. Bozuksa null. */
export function parseCloudDocument(raw: Record<string, unknown> | undefined): ParsedCloudDocument | null {
  if (!raw) return null;
  const parsed = parsePosterSnapshot(raw.data);
  if (!parsed) return null;

  const legacy = raw.branding !== undefined || raw.brandingUpdatedAt !== undefined;
  const branding = legacy ? parseBrandingSnapshot(raw.branding) : null;
  // Eski dokümanlarda takım logo/forması yalnızca branding'dedir.
  const snapshot = branding ? applyBrandingToSnapshot(parsed, branding) : parsed;

  return {
    snapshot,
    revision: readRevision(raw),
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : "",
    photosOmitted: Boolean(raw.photosOmitted),
    logosOmitted: Boolean(raw.logosOmitted),
    legacy,
  };
}

/** Bulutta çift/geçici medya alanlarını çıkarır: Storage yolu varsa yalnızca yol kalır. */
export function slimPlayerForCloud(player: Player): Player {
  const {
    avatarUrl,
    photoUrl,
    photoSource,
    cutoutUrl,
    cutoutStoragePath,
    photoSourceStoragePath,
    ...rest
  } = player;
  void avatarUrl;
  void photoUrl;
  const out: Player = { ...rest };
  if (cutoutStoragePath) out.cutoutStoragePath = cutoutStoragePath;
  else if (cutoutUrl?.startsWith("data:")) out.cutoutUrl = cutoutUrl;
  if (photoSourceStoragePath) out.photoSourceStoragePath = photoSourceStoragePath;
  // Cutout varken kaynak fotoğraf inline taşınmaz (yalnızca Storage'daysa tutulur).
  else if (!out.cutoutStoragePath && !out.cutoutUrl && photoSource?.startsWith("data:")) {
    out.photoSource = photoSource;
  }
  return out;
}

export function slimTeamForCloud(team: TeamConfig): TeamConfig {
  return { ...team, logo: slimTeamLogoForCloud(team.logo) };
}

/** Buluta yazılacak hâl: indirme URL'leri ve çift medya yok. */
export function slimSnapshotForCloud(snapshot: PosterSnapshot): PosterSnapshot {
  const savedPlayers: Record<string, Player> = {};
  for (const [id, player] of Object.entries(snapshot.savedPlayers)) {
    savedPlayers[id] = slimPlayerForCloud(player);
  }
  return {
    ...snapshot,
    savedPlayers,
    homeTeam: slimTeamForCloud(snapshot.homeTeam),
    awayTeam: slimTeamForCloud(snapshot.awayTeam),
  };
}

/** Snapshot'ın referans verdiği Storage yolları (sahipsiz dosya temizliği için). */
export function storagePathsOf(snapshot: PosterSnapshot | null): Set<string> {
  const paths = new Set<string>();
  if (!snapshot) return paths;
  for (const player of Object.values(snapshot.savedPlayers)) {
    if (player.cutoutStoragePath) paths.add(player.cutoutStoragePath);
    if (player.photoSourceStoragePath) paths.add(player.photoSourceStoragePath);
  }
  for (const logo of [snapshot.homeTeam.logo, snapshot.awayTeam.logo]) {
    if (logo?.storagePath) paths.add(logo.storagePath);
  }
  return paths;
}

/** Önceki bulut hâlinde olup yenisinde olmayan Storage yolları. */
export function orphanedStoragePaths(previous: PosterSnapshot | null, next: PosterSnapshot): string[] {
  const keep = storagePathsOf(next);
  return [...storagePathsOf(previous)].filter((path) => !keep.has(path));
}

/** Firestore undefined kabul etmez. */
export function stripUndefined<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => stripUndefined(item)) as T;
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
    if (v !== undefined) out[key] = stripUndefined(v);
  }
  return out as T;
}
