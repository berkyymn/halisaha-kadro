import { hasPlayerPhoto } from "@/lib/playerPhotos";
import { hasUsableUploadLogo } from "@/lib/teamLogoCloud";
import { isCustomizedPlayer } from "@/lib/playerPool";

export { isCustomizedPlayer };
import { DEFAULT_AWAY_SHORT_NAME, DEFAULT_HOME_SHORT_NAME } from "@/lib/defaults";
import { DEFAULT_POSTER_THEME } from "@/lib/posterThemes";
import { getDefaultFormationId } from "@/lib/formations";
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

export function hasMeaningfulLocalChanges(snapshot: PosterSnapshot): boolean {
  // Hiçbir zaman kaydedilmemişse (örn. ilk açılış) değişiklik yoktur.
  if (!snapshot.localUpdatedAt) return false;

  if (snapshot.benchPlayerIds.length > 0) return true;

  const homeDefault = snapshot.homeTeam.shortName === DEFAULT_HOME_SHORT_NAME;
  const awayDefault = snapshot.awayTeam.shortName === DEFAULT_AWAY_SHORT_NAME;
  if (!homeDefault || !awayDefault) return true;

  if (snapshot.matchInfo.venue !== "HALI SAHA") return true;
  if (
    snapshot.matchInfo.titleLine1 !== "DERBİ" ||
    snapshot.matchInfo.titleLine2 !== "GECESİ"
  ) {
    return true;
  }

  if (snapshot.squadSize !== 7) return true;
  if (snapshot.playerCardSize !== 100) return true;
  if (snapshot.posterTheme !== DEFAULT_POSTER_THEME) return true;

  const defaultHomeFormation = getDefaultFormationId(snapshot.squadSize);
  if (
    snapshot.homeFormationId !== defaultHomeFormation ||
    snapshot.awayFormationId !== defaultHomeFormation
  ) {
    return true;
  }

  for (const player of Object.values(snapshot.savedPlayers)) {
    if (isCustomizedPlayer(player)) return true;
  }

  return false;
}

/**
 * "Birleştir": bulut kadrosu temel alınır; bu cihazdaki özelleştirilmiş
 * oyunculardan bulutta olmayanlar yedeklere eklenmek üzere döndürülür.
 */
export function collectLocalPlayersForMerge(
  local: PosterSnapshot,
  cloud: PosterSnapshot
): Player[] {
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
    if (cloud.savedPlayers[id]) continue;
    const player = local.savedPlayers[id];
    if (!isCustomizedPlayer(player)) continue;
    // Bulut Storage yolları bu cihazdaki kopyaya ait değil; yeniden yüklenecek.
    const { cutoutStoragePath, photoSourceStoragePath, ...rest } = player;
    void cutoutStoragePath;
    void photoSourceStoragePath;
    result.push(rest);
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
