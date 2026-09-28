import {
  deleteField,
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/app";
import { deleteStorageObject, isFirebaseStorageConfigured } from "@/lib/firebase/storage";
import { compressPlayerPhotos } from "@/lib/imageCompress";
import {
  hydrateLogoFromStorage,
  hydratePlayerPhotosFromStorage,
  uploadLogoMediaForCloud,
  uploadPlayerMediaForCloud,
} from "@/lib/mediaSync";
import { hasPlayerPhoto } from "@/lib/playerPhotos";
import type { PosterSnapshot } from "@/lib/posterSnapshot";
import { fallbackLogoAfterUploadStrip, isUploadLogoWithImage } from "@/lib/teamLogoCloud";
import { reportError } from "@/lib/errorReporting";
import type { Player, TeamLogo } from "@/types";
import {
  LEGACY_FIELDS,
  POSTER_COLLECTION,
  orphanedStoragePaths,
  parseCloudDocument,
  slimSnapshotForCloud,
  stripUndefined,
  type ParsedCloudDocument,
} from "@/lib/cloud/cloudDocument";

/**
 * Firestore/Storage ile konuşan TEK modül. Senkron mantığı (ne zaman, hangi
 * veri) burada değil, syncController'dadır.
 */

export type FetchPosterResult =
  | { status: "missing" }
  | { status: "corrupt" }
  | { status: "ok"; doc: ParsedCloudDocument };

export type SavePosterResult = {
  revision: number;
  updatedAt: string;
  /** Buluta yazılan hâl (Storage yollarıyla) */
  cloudSnapshot: PosterSnapshot;
  /** Boyut sınırı yüzünden medya atlandıysa kullanıcıya gösterilecek not */
  warning: string | null;
};

export type RemoteChange = { revision: number; updatedAt: string };

/** Firestore tek doküman ~1 MiB — güvenli pay bırak */
const MAX_CLOUD_BYTES = 900_000;

const COMPRESS_TIERS = [
  { photoMax: 300, cutoutMax: 300, photoQuality: 0.8, cutoutQuality: 0.8 },
  { photoMax: 200, cutoutMax: 200, photoQuality: 0.75, cutoutQuality: 0.75 },
  { photoMax: 140, cutoutMax: 140, photoQuality: 0.7, cutoutQuality: 0.7 },
];

function posterRef(uid: string) {
  return doc(getFirebaseDb(), POSTER_COLLECTION, uid);
}

export async function fetchPoster(uid: string): Promise<FetchPosterResult> {
  const snap = await getDoc(posterRef(uid));
  if (!snap.exists()) return { status: "missing" };
  const parsed = parseCloudDocument(snap.data());
  if (!parsed) return { status: "corrupt" };

  const [savedPlayers, homeLogo, awayLogo] = await Promise.all([
    hydratePlayerPhotosFromStorage(parsed.snapshot.savedPlayers),
    hydrateLogoFromStorage(parsed.snapshot.homeTeam.logo),
    hydrateLogoFromStorage(parsed.snapshot.awayTeam.logo),
  ]);
  return {
    status: "ok",
    doc: {
      ...parsed,
      snapshot: {
        ...parsed.snapshot,
        savedPlayers,
        homeTeam: { ...parsed.snapshot.homeTeam, logo: homeLogo },
        awayTeam: { ...parsed.snapshot.awayTeam, logo: awayLogo },
      },
    },
  };
}

export function subscribePoster(
  uid: string,
  onChange: (change: RemoteChange) => void,
  onError: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    posterRef(uid),
    (snapshot) => {
      // Kendi yazımımızın yerel yankısı (hasPendingWrites) sunucu onayı değildir.
      if (!snapshot.exists() || snapshot.metadata.hasPendingWrites) return;
      const raw = snapshot.data();
      onChange({
        revision: typeof raw.revision === "number" ? raw.revision : 0,
        updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : "",
      });
    },
    onError
  );
}

// ─── Yazım ────────────────────────────────────────────────────────────────

type PreparedPayload = {
  snapshot: PosterSnapshot;
  photosOmitted: number;
  logosOmitted: number;
};

function countPhotos(players: Record<string, Player>): number {
  return Object.values(players).filter((player) => hasPlayerPhoto(player)).length;
}

function countInlineLogos(snapshot: PosterSnapshot): number {
  return [snapshot.homeTeam.logo, snapshot.awayTeam.logo].filter(isUploadLogoWithImage).length;
}

function sizeOf(snapshot: PosterSnapshot): number {
  return JSON.stringify(snapshot).length;
}

function stripPhotos(players: Record<string, Player>, onlyIds?: Set<string>): Record<string, Player> {
  const next: Record<string, Player> = {};
  for (const [id, player] of Object.entries(players)) {
    if (onlyIds && !onlyIds.has(id)) {
      next[id] = player;
      continue;
    }
    // Storage yolları kalır; yalnızca inline (data URL) medya atılır.
    const { photoSource, cutoutUrl, ...rest } = player;
    void photoSource;
    void cutoutUrl;
    next[id] = rest;
  }
  return next;
}

function stripInlineLogo(logo: TeamLogo, shortName: string): TeamLogo {
  return isUploadLogoWithImage(logo) ? fallbackLogoAfterUploadStrip(logo, shortName) : logo;
}

let preparedCache: { key: string; prepared: PreparedPayload } | null = null;

/**
 * Medyayı Storage'a yükler, bulut biçimine inceltir; Firestore 1 MiB sınırını
 * aşarsa önce sıkıştırır, gerekirse yedek → tüm inline fotoğrafları ve inline
 * logoları atar.
 */
async function preparePayload(uid: string, snapshot: PosterSnapshot): Promise<PreparedPayload> {
  const key = `${uid}:${JSON.stringify(snapshot)}`;
  if (preparedCache?.key === key) return preparedCache.prepared;

  const [savedPlayers, homeLogo, awayLogo] = await Promise.all([
    uploadPlayerMediaForCloud(uid, snapshot.savedPlayers),
    uploadLogoMediaForCloud(uid, "home", snapshot.homeTeam.logo),
    uploadLogoMediaForCloud(uid, "away", snapshot.awayTeam.logo),
  ]);
  let next = slimSnapshotForCloud({
    ...snapshot,
    savedPlayers,
    homeTeam: { ...snapshot.homeTeam, logo: homeLogo },
    awayTeam: { ...snapshot.awayTeam, logo: awayLogo },
  });
  const photosBefore = countPhotos(next.savedPlayers);
  const logosBefore = countInlineLogos(next);

  const finish = (payload: PosterSnapshot): PreparedPayload => {
    const prepared = {
      snapshot: payload,
      photosOmitted: Math.max(0, photosBefore - countPhotos(payload.savedPlayers)),
      logosOmitted: Math.max(0, logosBefore - countInlineLogos(payload)),
    };
    preparedCache = { key, prepared };
    return prepared;
  };

  if (sizeOf(next) <= MAX_CLOUD_BYTES) return finish(next);

  for (const tier of COMPRESS_TIERS) {
    const players: Record<string, Player> = {};
    for (const [id, player] of Object.entries(next.savedPlayers)) {
      const { didCompress, ...photos } = await compressPlayerPhotos(player, tier);
      void didCompress;
      players[id] = { ...player, ...photos };
    }
    next = { ...next, savedPlayers: players };
    if (sizeOf(next) <= MAX_CLOUD_BYTES) return finish(next);
  }

  next = { ...next, savedPlayers: stripPhotos(next.savedPlayers, new Set(next.benchPlayerIds)) };
  if (sizeOf(next) <= MAX_CLOUD_BYTES) return finish(next);

  next = { ...next, savedPlayers: stripPhotos(next.savedPlayers) };
  if (sizeOf(next) > MAX_CLOUD_BYTES) {
    next = {
      ...next,
      homeTeam: { ...next.homeTeam, logo: stripInlineLogo(next.homeTeam.logo, next.homeTeam.shortName) },
      awayTeam: { ...next.awayTeam, logo: stripInlineLogo(next.awayTeam.logo, next.awayTeam.shortName) },
    };
  }
  return finish(next);
}

function describeOmissions(prepared: PreparedPayload): string | null {
  const parts: string[] = [];
  if (prepared.photosOmitted > 0) {
    parts.push(`${prepared.photosOmitted} oyuncu fotoğrafı boyut sınırı nedeniyle buluta kaydedilemedi`);
  }
  if (prepared.logosOmitted > 0) {
    parts.push(`${prepared.logosOmitted} logo boyut sınırı nedeniyle buluta kaydedilemedi`);
  }
  return parts.length ? `Kadro kaydedildi; ${parts.join("; ")}.` : null;
}

class RevisionConflictError extends Error {
  code = "failed-precondition";
  constructor(expected: number, actual: number) {
    super(`Poster revision conflict: expected ${expected}, got ${actual}`);
  }
}

/**
 * Posteri yazar. expectedRevision verilirse buluttaki revision tutmadığında
 * yazmaz (failed-precondition). null: bilinçli üzerine yazma (ör. "Bu cihazı kullan").
 */
export async function savePoster(
  uid: string,
  snapshot: PosterSnapshot,
  expectedRevision: number | null
): Promise<SavePosterResult> {
  const prepared = await preparePayload(uid, snapshot);
  const ref = posterRef(uid);
  const updatedAt = new Date().toISOString();

  const revision = await runTransaction(getFirebaseDb(), async (tx) => {
    const current = await tx.get(ref);
    const currentRevision = current.exists() ? Number(current.data().revision ?? 0) : 0;
    if (expectedRevision !== null && currentRevision !== expectedRevision) {
      throw new RevisionConflictError(expectedRevision, currentRevision);
    }
    const nextRevision = currentRevision + 1;
    const payload = stripUndefined({
      data: prepared.snapshot,
      updatedAt,
      revision: nextRevision,
      photosOmitted: prepared.photosOmitted > 0,
      logosOmitted: prepared.logosOmitted > 0,
    });
    if (current.exists()) {
      // update: her üst alan bütün olarak değişir; eski biçimin alanları silinir.
      const legacyCleanup = Object.fromEntries(LEGACY_FIELDS.map((field) => [field, deleteField()]));
      tx.update(ref, { ...payload, ...legacyCleanup });
    } else {
      tx.set(ref, payload);
    }
    return nextRevision;
  });

  return { revision, updatedAt, cloudSnapshot: prepared.snapshot, warning: describeOmissions(prepared) };
}

/** Önceki bulut hâlinde olup yenisinde referans verilmeyen Storage dosyalarını siler. */
export async function deleteOrphanedMedia(previous: PosterSnapshot | null, next: PosterSnapshot): Promise<void> {
  if (!isFirebaseStorageConfigured()) return;
  await Promise.all(
    orphanedStoragePaths(previous, next).map(async (path) => {
      try {
        await deleteStorageObject(path);
      } catch (error) {
        reportError(error, "cloud-media", { level: "warning", extra: { op: "cleanup" } });
      }
    })
  );
}

export function resetRepositoryCaches(): void {
  preparedCache = null;
}
