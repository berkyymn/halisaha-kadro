import { doc, getDoc, setDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/app";
import { enqueueFirestoreWrite } from "@/lib/firestoreWriteQueue";
import { compressDataUrl, compressPlayerPhotos } from "@/lib/imageCompress";
import { hasPlayerPhoto } from "@/lib/playerPhotos";
import {
  fallbackLogoAfterUploadStrip,
  isUploadLogoWithImage,
  slimTeamLogoForCloud,
} from "@/lib/teamLogoCloud";
import type { PosterSnapshot } from "@/lib/posterSnapshot";
import { parsePosterSnapshot } from "@/lib/posterSnapshot";
import { fingerprintPosterSnapshot } from "@/lib/snapshotFingerprint";
import type { Player, TeamLogo } from "@/types";

export type CloudPosterDoc = {
  userId: string;
  data: PosterSnapshot;
  updatedAt: string;
  photosOmitted?: boolean;
  logosOmitted?: boolean;
};

export type CloudSaveResult = {
  strippedMedia: boolean;
  photosStored: number;
  photosOmitted: number;
  logosOmitted: number;
};

export type CloudSaveResultWithMeta = CloudSaveResult & {
  updatedAt: string;
};

const COLLECTION = "posters";
/** Firestore tek doküman limiti ~1 MiB — güvenli pay bırak */
const MAX_CLOUD_BYTES = 900_000;

type CompressTier = {
  photoMax: number;
  cutoutMax: number;
  photoQuality: number;
  cutoutQuality: number;
};

const COMPRESS_TIERS: CompressTier[] = [
  { photoMax: 480, cutoutMax: 400, photoQuality: 0.8, cutoutQuality: 0.82 },
  { photoMax: 400, cutoutMax: 360, photoQuality: 0.76, cutoutQuality: 0.78 },
  { photoMax: 320, cutoutMax: 288, photoQuality: 0.72, cutoutQuality: 0.74 },
];

let preparedSnapshotCache: {
  sourceFingerprint: string;
  snapshot: PosterSnapshot;
  result: CloudSaveResult;
} | null = null;

export function clearCloudPrepareCache() {
  preparedSnapshotCache = null;
}

/** Firestore undefined kabul etmez; kayıt öncesi tüm undefined alanları çıkarır */
function stripUndefinedForFirestore<T>(value: T): T {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedForFirestore(item)) as T;
  }
  const result: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
    if (v !== undefined) {
      result[key] = stripUndefinedForFirestore(v);
    }
  }
  return result as T;
}

function estimateSnapshotBytes(snapshot: PosterSnapshot): number {
  return JSON.stringify(snapshot).length;
}

function countPlayerPhotos(players: Record<string, Player>): number {
  return Object.values(players).filter((player) => hasPlayerPhoto(player)).length;
}

/** Bulutta gereksiz / çift medya alanlarını çıkarır */
function slimPlayerForCloud(player: Player): Player {
  const { avatarUrl, photoUrl, photoSource, cutoutUrl, ...rest } = player;
  void avatarUrl;
  void photoUrl;

  if (cutoutUrl) {
    void photoSource;
    return { ...rest, cutoutUrl };
  }
  if (photoSource) {
    return { ...rest, photoSource };
  }
  return rest;
}

function slimSnapshotForCloud(snapshot: PosterSnapshot): PosterSnapshot {
  const savedPlayers: Record<string, Player> = {};
  for (const [id, player] of Object.entries(snapshot.savedPlayers)) {
    savedPlayers[id] = slimPlayerForCloud(player);
  }
  return {
    ...snapshot,
    savedPlayers,
    homeTeam: {
      ...snapshot.homeTeam,
      logo: slimTeamLogoForCloud(snapshot.homeTeam.logo),
    },
    awayTeam: {
      ...snapshot.awayTeam,
      logo: slimTeamLogoForCloud(snapshot.awayTeam.logo),
    },
  };
}

function countUploadLogos(snapshot: PosterSnapshot): number {
  let count = 0;
  if (isUploadLogoWithImage(snapshot.homeTeam.logo)) count += 1;
  if (isUploadLogoWithImage(snapshot.awayTeam.logo)) count += 1;
  return count;
}

function stripPlayerPhotos(
  players: Record<string, Player>,
  onlyIds?: Set<string>
): Record<string, Player> {
  const next: Record<string, Player> = {};
  for (const [id, player] of Object.entries(players)) {
    if (onlyIds && !onlyIds.has(id)) {
      next[id] = player;
      continue;
    }
    const { photoSource, cutoutUrl, avatarUrl, photoUrl, ...rest } = player;
    void photoSource;
    void cutoutUrl;
    void avatarUrl;
    void photoUrl;
    next[id] = rest;
  }
  return next;
}

function stripUploadedLogos(snapshot: PosterSnapshot): PosterSnapshot {
  const stripLogo = (logo: TeamLogo, shortName: string): TeamLogo => {
    if (!isUploadLogoWithImage(logo)) {
      return logo;
    }
    return fallbackLogoAfterUploadStrip(logo, shortName);
  };
  return {
    ...snapshot,
    homeTeam: {
      ...snapshot.homeTeam,
      logo: stripLogo(snapshot.homeTeam.logo, snapshot.homeTeam.shortName),
    },
    awayTeam: {
      ...snapshot.awayTeam,
      logo: stripLogo(snapshot.awayTeam.logo, snapshot.awayTeam.shortName),
    },
  };
}

async function compressTeamLogo(
  logo: TeamLogo,
  tier: CompressTier
): Promise<TeamLogo> {
  if (logo.mode !== "upload" || !logo.imageUrl?.startsWith("data:")) {
    return logo;
  }
  return {
    ...logo,
    imageUrl: await compressDataUrl(logo.imageUrl, {
      kind: "photo",
      maxEdge: 220,
      quality: tier.photoQuality,
    }),
  };
}

async function compressSnapshotMedia(
  snapshot: PosterSnapshot,
  tier: CompressTier
): Promise<PosterSnapshot> {
  const savedPlayers: Record<string, Player> = {};
  for (const [id, player] of Object.entries(snapshot.savedPlayers)) {
    const slim = slimPlayerForCloud(player);
    const photos = await compressPlayerPhotos(slim, {
      photoMax: tier.photoMax,
      cutoutMax: tier.cutoutMax,
      photoQuality: tier.photoQuality,
      cutoutQuality: tier.cutoutQuality,
    });
    savedPlayers[id] = { ...slim, ...photos };
  }

  const [homeLogo, awayLogo] = await Promise.all([
    compressTeamLogo(snapshot.homeTeam.logo, tier),
    compressTeamLogo(snapshot.awayTeam.logo, tier),
  ]);

  return {
    ...snapshot,
    savedPlayers,
    homeTeam: { ...snapshot.homeTeam, logo: homeLogo },
    awayTeam: { ...snapshot.awayTeam, logo: awayLogo },
  };
}

export async function prepareSnapshotForCloud(
  snapshot: PosterSnapshot
): Promise<{ snapshot: PosterSnapshot; result: CloudSaveResult }> {
  const sourceFingerprint = fingerprintPosterSnapshot(snapshot);
  if (preparedSnapshotCache?.sourceFingerprint === sourceFingerprint) {
    return {
      snapshot: preparedSnapshotCache.snapshot,
      result: preparedSnapshotCache.result,
    };
  }

  const photosBefore = countPlayerPhotos(snapshot.savedPlayers);
  const uploadLogosBefore = countUploadLogos(snapshot);
  let next = slimSnapshotForCloud(snapshot);
  let strippedMedia = false;

  const buildResult = (payload: PosterSnapshot): CloudSaveResult => ({
    strippedMedia,
    photosStored: countPlayerPhotos(payload.savedPlayers),
    photosOmitted: Math.max(0, photosBefore - countPlayerPhotos(payload.savedPlayers)),
    logosOmitted: Math.max(0, uploadLogosBefore - countUploadLogos(payload)),
  });

  for (const tier of COMPRESS_TIERS) {
    next = await compressSnapshotMedia(next, tier);
    if (estimateSnapshotBytes(next) <= MAX_CLOUD_BYTES) {
      const result = buildResult(next);
      preparedSnapshotCache = { sourceFingerprint, snapshot: next, result };
      return { snapshot: next, result };
    }
  }

  const benchIds = new Set(snapshot.benchPlayerIds);
  if (benchIds.size > 0) {
    next = {
      ...next,
      savedPlayers: stripPlayerPhotos(next.savedPlayers, benchIds),
    };
    if (estimateSnapshotBytes(next) <= MAX_CLOUD_BYTES) {
      strippedMedia = true;
      const result = buildResult(next);
      preparedSnapshotCache = { sourceFingerprint, snapshot: next, result };
      return { snapshot: next, result };
    }
  }

  next = {
    ...next,
    savedPlayers: stripPlayerPhotos(next.savedPlayers),
  };
  strippedMedia = true;

  if (estimateSnapshotBytes(next) > MAX_CLOUD_BYTES) {
    next = stripUploadedLogos(next);
  }

  const result = buildResult(next);
  preparedSnapshotCache = { sourceFingerprint, snapshot: next, result };
  return { snapshot: next, result };
}

export function mapFirestoreError(error: unknown): string {
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code: string }).code)
      : "";
  const message = error instanceof Error ? error.message : "";

  switch (code) {
    case "permission-denied":
      return "Firestore izni yok. Console'da Firestore oluşturup firestore.rules yayınladın mı?";
    case "unavailable":
      return "Firestore şu an ulaşılamıyor. İnternet bağlantını kontrol et.";
    case "invalid-argument":
      return "Veri çok büyük olabilir (Firestore 1 MB limiti).";
    case "resource-exhausted":
      return "Buluta çok sık kayıt gönderildi. Birkaç saniye bekleyip tekrar deneyin.";
    case "not-found":
      return "Firestore veritabanı bulunamadı. Firebase Console'da Database oluştur.";
    default:
      if (message.toLowerCase().includes("offline")) {
        return "Çevrimdışı görünüyorsun. Bağlantıyı kontrol et.";
      }
      return message || "Buluta kayıt başarısız.";
  }
}

export type FetchUserPosterResult =
  | { status: "missing" }
  | { status: "corrupt" }
  | { status: "ok"; doc: CloudPosterDoc };

export async function fetchUserPoster(
  userId: string
): Promise<FetchUserPosterResult> {
  const ref = doc(getFirebaseDb(), COLLECTION, userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return { status: "missing" };

  const raw = snap.data();
  const parsed = parsePosterSnapshot(raw.data);
  if (!parsed) return { status: "corrupt" };

  return {
    status: "ok",
    doc: {
      userId,
      data: parsed,
      updatedAt: (raw.updatedAt as string) ?? "",
      photosOmitted: Boolean(raw.photosOmitted),
      logosOmitted: Boolean(raw.logosOmitted),
    },
  };
}

export async function saveUserPoster(
  userId: string,
  snapshot: PosterSnapshot
): Promise<CloudSaveResultWithMeta> {
  return enqueueFirestoreWrite(async () => {
    const { snapshot: cloudSnapshot, result } =
      await prepareSnapshotForCloud(snapshot);
    const ref = doc(getFirebaseDb(), COLLECTION, userId);
    const updatedAt = new Date().toISOString();

    await setDoc(
      ref,
      stripUndefinedForFirestore({
        data: cloudSnapshot,
        updatedAt,
        photosOmitted: result.photosOmitted > 0,
        logosOmitted: result.logosOmitted > 0,
      }),
      { merge: true }
    );
    return { ...result, updatedAt };
  });
}

export function mapAuthError(error: unknown): string {
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code: string }).code)
      : "";
  const message = error instanceof Error ? error.message : "";

  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "E-posta veya şifre hatalı.";
    case "auth/email-already-in-use":
      return "Bu e-posta ile zaten kayıt var. Giriş yapmayı deneyin.";
    case "auth/weak-password":
      return "Şifre en az 6 karakter olmalı.";
    case "auth/invalid-email":
      return "Geçerli bir e-posta adresi girin.";
    case "auth/too-many-requests":
      return "Çok fazla deneme. Biraz bekleyip tekrar deneyin.";
    case "auth/popup-closed-by-user":
      return "Google penceresi kapatıldı.";
    case "auth/cancelled-popup-request":
      return "Giriş iptal edildi.";
    default:
      return message || "İşlem başarısız.";
  }
}

export function describeCloudSaveResult(result: CloudSaveResult): string | null {
  const parts: string[] = [];
  if (result.photosOmitted > 0) {
    if (result.photosStored === 0) {
      parts.push("fotoğraflar boyut limiti nedeniyle buluta dahil edilmedi");
    } else {
      parts.push(
        `${result.photosOmitted} oyuncu fotoğrafı boyut limiti nedeniyle buluta kaydedilemedi`
      );
    }
  }
  if (result.logosOmitted > 0) {
    parts.push(
      `${result.logosOmitted} yüklenen takım logosu boyut limiti nedeniyle buluta kaydedilemedi`
    );
  }
  if (parts.length === 0) return null;
  return `Kadro kaydedildi; ${parts.join("; ")}.`;
}
