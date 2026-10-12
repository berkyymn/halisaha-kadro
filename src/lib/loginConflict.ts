import { hasPlayerPhoto } from "@/lib/playerPhotos";
import { hasUsableUploadLogo } from "@/lib/teamLogoCloud";
import { isCustomizedPlayer } from "@/lib/playerPool";
import { createId } from "@/lib/id";

export { isCustomizedPlayer };
import type { PitchPlayer, Player, TeamConfig, TeamLogo } from "@/types";
import { normalizeTeamLogo } from "@/lib/logoUtils";
import { normalizeJersey } from "@/lib/jerseyOptions";
import { normalizeMatchInfo as normalizePosterMatchInfo } from "@/lib/posterSnapshot";
import type { PosterSnapshot } from "@/lib/posterSnapshot";

export type ConflictSummary = {
  playerCount: number;
  photoCount: number;
  benchCount: number;
  homeTeamName: string;
  awayTeamName: string;
  venue: string;
  lastUpdatedAt?: string;
};

function summarizeTeamPlayers(
  snapshot: PosterSnapshot,
  team: "home" | "away"
): {
  playerCount: number;
  photoCount: number;
} {
  const teamConfig = team === "home" ? snapshot.homeTeam : snapshot.awayTeam;
  let playerCount = 0;
  let photoCount = 0;
  for (const id of teamConfig.playerIds) {
    if (!id) continue;
    playerCount += 1;
    const player = snapshot.savedPlayers[id];
    if (player && hasPlayerPhoto(player)) {
      photoCount += 1;
    }
  }
  return { playerCount, photoCount };
}

export function buildConflictSummary(
  snapshot: PosterSnapshot
): ConflictSummary {
  const home = summarizeTeamPlayers(snapshot, "home");
  const away = summarizeTeamPlayers(snapshot, "away");
  return {
    playerCount: home.playerCount + away.playerCount,
    photoCount: home.photoCount + away.photoCount,
    benchCount: snapshot.benchPlayerIds.length,
    homeTeamName: snapshot.homeTeam.name || snapshot.homeTeam.shortName,
    awayTeamName: snapshot.awayTeam.name || snapshot.awayTeam.shortName,
    venue: snapshot.matchInfo.venue || "",
    lastUpdatedAt: snapshot.localUpdatedAt,
  };
}

/** Medya kimliği: Storage yolu varsa o, yoksa gömülü verinin boyutu ya da adres. */
function mediaRef(storagePath: string | undefined, url: string | undefined): string | null {
  if (storagePath) return `path:${storagePath}`;
  if (!url) return null;
  return url.startsWith("data:") ? `inline:${url.length}` : `url:${url.split("?")[0]}`;
}

function canonicalPlayer(player: Player | undefined) {
  if (!player) return null;
  return {
    name: player.name?.trim() ?? "",
    number: player.number ?? 0,
    crop: player.photoCrop ?? null,
    cutout: mediaRef(player.cutoutStoragePath, player.cutoutUrl),
    source: mediaRef(player.photoSourceStoragePath, player.photoSource),
  };
}

function canonicalTeam(team: TeamConfig) {
  const { imageUrl, storagePath, ...logo } = normalizeTeamLogo(team.logo, team.shortName);
  return {
    name: team.name ?? "",
    shortName: team.shortName ?? "",
    atmosphereColor: team.atmosphereColor ?? "",
    captainId: team.captainId ?? null,
    playerIds: team.playerIds,
    jersey: normalizeJersey(team.jersey),
    logo: { ...logo, image: mediaRef(storagePath, imageUrl) },
  };
}

const roundPos = (positions: PitchPlayer[] | undefined) =>
  (positions ?? []).map((p) => ({
    ...p,
    x: p.x === undefined ? undefined : Math.round(p.x * 10) / 10,
    y: p.y === undefined ? undefined : Math.round(p.y * 10) / 10,
  }));

/**
 * Posterin içeriği (zaman damgası ve kullanılmayan alanlar hariç). İki kopya
 * "eşit" sayılırsa senkron buluttakini alır; bu yüzden içerikteki her alan
 * burada olmalı — eksik alan, o alandaki yerel değişikliğin kaybolması demek.
 */
function canonicalContent(snapshot: PosterSnapshot) {
  const referenced = [
    ...snapshot.homeTeam.playerIds,
    ...snapshot.awayTeam.playerIds,
    ...snapshot.benchPlayerIds,
  ].filter((id): id is string => Boolean(id));
  const players = [...new Set(referenced)]
    .sort()
    .map((id) => [id, canonicalPlayer(snapshot.savedPlayers[id])]);
  return {
    teamMode: snapshot.teamMode,
    squadSize: snapshot.squadSize,
    teamLogoDisplaySize: snapshot.teamLogoDisplaySize,
    posterTheme: snapshot.posterTheme,
    homeFormationId: snapshot.homeFormationId,
    awayFormationId: snapshot.awayFormationId,
    matchInfo: normalizePosterMatchInfo(snapshot.matchInfo),
    homeTeam: canonicalTeam(snapshot.homeTeam),
    awayTeam: canonicalTeam(snapshot.awayTeam),
    benchPlayerIds: snapshot.benchPlayerIds,
    formatOverflow: snapshot.formatOverflow ?? null,
    pitchPlayers: roundPos(snapshot.pitchPlayers),
    singlePitchPlayers: roundPos(snapshot.singlePitchPlayers),
    players,
  };
}

export function areSnapshotsEquivalent(
  a: PosterSnapshot,
  b: PosterSnapshot
): boolean {
  return JSON.stringify(canonicalContent(a)) === JSON.stringify(canonicalContent(b));
}

/** Posterde (kadroda ya da yedekte) görünen oyuncu kimlikleri. */
function referencedPlayerIds(snapshot: PosterSnapshot): string[] {
  return [
    ...snapshot.homeTeam.playerIds,
    ...snapshot.awayTeam.playerIds,
    ...snapshot.benchPlayerIds,
  ].filter((id): id is string => Boolean(id));
}

/**
 * Giriş yapınca "bu cihaz mı, bulut mu?" yalnızca bu cihazda gerçekten
 * oyuncu eklenmişse (isim ya da fotoğraf) sorulur. Yalnızca tema, saha adı ya
 * da diziliş değiştirilmişse soru çıkmaz, bulut kadrosu yüklenir.
 */
export function hasMeaningfulLocalChanges(snapshot: PosterSnapshot): boolean {
  // Hiçbir zaman kaydedilmemişse (örn. ilk açılış) değişiklik yoktur.
  if (!snapshot.localUpdatedAt) return false;
  return referencedPlayerIds(snapshot).some((id) => isCustomizedPlayer(snapshot.savedPlayers[id]));
}

const normalizedName = (player: Player | undefined) =>
  (player?.name ?? "").trim().toLocaleLowerCase("tr-TR");

/**
 * "Birleştir": bulut kadrosu temel alınır; bu cihazdaki özelleştirilmiş
 * oyunculardan bulutta karşılığı olmayanlar yedeklere eklenmek üzere döndürülür.
 * - Bulutta aynı isimde oyuncu varsa eklenmez (aynı kişi iki kez görünmesin).
 * - Aynı oyuncu (aynı kimlik) bu cihazda farklı düzenlendiyse yeni kimlikle
 *   eklenir: buluttaki sürüm korunur, bu cihazdaki değişiklik kaybolmaz.
 */
export function collectLocalPlayersForMerge(
  local: PosterSnapshot,
  cloud: PosterSnapshot
): Player[] {
  const cloudIds = referencedPlayerIds(cloud);
  const knownNames = new Set(
    cloudIds.map((id) => normalizedName(cloud.savedPlayers[id])).filter(Boolean)
  );
  const ids = [
    ...local.homeTeam.playerIds.slice(0, local.squadSize),
    ...local.awayTeam.playerIds.slice(0, local.squadSize),
    ...local.benchPlayerIds,
  ];
  const seen = new Set<string>();
  const result: Player[] = [];
  for (const id of ids) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const player = local.savedPlayers[id];
    if (!isCustomizedPlayer(player)) continue;
    const remote = cloud.savedPlayers[id];
    if (remote && JSON.stringify(canonicalPlayer(remote)) === JSON.stringify(canonicalPlayer(player))) continue;
    const name = normalizedName(player);
    if (name && knownNames.has(name)) continue;
    if (name) knownNames.add(name);
    // Bulut Storage yolları bu cihazdaki kopyaya ait değil; yeniden yüklenecek.
    const { cutoutStoragePath, photoSourceStoragePath, ...rest } = player;
    void cutoutStoragePath;
    void photoSourceStoragePath;
    result.push(remote ? { ...rest, id: createId() } : rest);
  }
  return result;
}

const PHOTO_FIELDS = ["photoSource", "cutoutUrl", "avatarUrl", "photoUrl", "photoCrop"] as const;

/**
 * Bulut kopyasına sığmadığı için atlanan medyayı bu cihazdaki kopyadan geri
 * koyar: fotoğrafsız bulut oyuncusuna yerel fotoğraf, yüklenmiş logosu
 * düşürülmüş takıma yerel logo. Yalnızca doküman "atlandı" işareti taşıyorsa
 * çağrılır; bilerek silinen fotoğraf geri gelmez. Değişiklik yoksa `cloud`
 * nesnesinin kendisi döner.
 */
export function restoreOmittedMedia(
  local: PosterSnapshot,
  cloud: PosterSnapshot,
  omitted: { photos: boolean; logos: boolean }
): PosterSnapshot {
  let changed = false;
  let savedPlayers = cloud.savedPlayers;
  if (omitted.photos) {
    savedPlayers = { ...cloud.savedPlayers };
    for (const [id, remote] of Object.entries(cloud.savedPlayers)) {
      const mine = local.savedPlayers[id];
      if (!mine || hasPlayerPhoto(remote) || !hasPlayerPhoto(mine)) continue;
      const restored: Player = { ...remote };
      for (const field of PHOTO_FIELDS) {
        if (mine[field] !== undefined) Object.assign(restored, { [field]: mine[field] });
      }
      savedPlayers[id] = restored;
      changed = true;
    }
  }
  const restoreLogo = (remote: TeamLogo, mine: TeamLogo): TeamLogo => {
    if (!omitted.logos || hasUsableUploadLogo(remote) || !hasUsableUploadLogo(mine)) return remote;
    changed = true;
    return mine;
  };
  const homeLogo = restoreLogo(cloud.homeTeam.logo, local.homeTeam.logo);
  const awayLogo = restoreLogo(cloud.awayTeam.logo, local.awayTeam.logo);
  if (!changed) return cloud;
  return {
    ...cloud,
    savedPlayers,
    homeTeam: { ...cloud.homeTeam, logo: homeLogo },
    awayTeam: { ...cloud.awayTeam, logo: awayLogo },
  };
}
