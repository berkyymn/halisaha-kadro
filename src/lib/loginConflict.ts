import { hasPlayerPhoto } from "@/lib/playerPhotos";
import { DEFAULT_AWAY_SHORT_NAME, DEFAULT_HOME_SHORT_NAME } from "@/lib/defaults";
import { DEFAULT_POSTER_THEME } from "@/lib/posterThemes";
import { getDefaultFormationId } from "@/lib/formations";
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

function normalizePlayerIdentity(
  snapshot: PosterSnapshot,
  team: "home" | "away"
) {
  const teamConfig = team === "home" ? snapshot.homeTeam : snapshot.awayTeam;
  return teamConfig.playerIds
    .filter((id): id is string => Boolean(id))
    .map((id) => {
      const player = snapshot.savedPlayers[id];
      return {
        name: player?.name?.trim() || "",
        number: player?.number ?? 0,
        hasPhoto: player ? hasPlayerPhoto(player) : false,
      };
    });
}

function normalizeTeam(snapshot: PosterSnapshot, team: "home" | "away") {
  const config = team === "home" ? snapshot.homeTeam : snapshot.awayTeam;
  return {
    name: config.name,
    shortName: config.shortName,
    atmosphereColor: config.atmosphereColor,
    jersey: {
      primaryColor: config.jersey.primaryColor,
      secondaryColor: config.jersey.secondaryColor,
      style: config.jersey.style,
      numberColor: config.jersey.numberColor,
    },
    logo: {
      mode: config.logo.mode,
      presetId: config.logo.presetId,
      initials: config.logo.initials,
      teamName: config.logo.teamName,
      primaryColor: config.logo.primaryColor,
      secondaryColor: config.logo.secondaryColor,
      accentColor: config.logo.accentColor,
      icon: config.logo.icon,
      showInitials: config.logo.showInitials,
      showTeamName: config.logo.showTeamName,
      showIcon: config.logo.showIcon,
    },
    players: normalizePlayerIdentity(snapshot, team),
  };
}

function normalizeMatchInfo(snapshot: PosterSnapshot) {
  return {
    titleLine1: snapshot.matchInfo.titleLine1,
    titleLine2: snapshot.matchInfo.titleLine2,
    titleSubtitle: snapshot.matchInfo.titleSubtitle,
    venue: snapshot.matchInfo.venue,
    time: snapshot.matchInfo.time,
    date: snapshot.matchInfo.date,
    titleStyleId: snapshot.matchInfo.titleStyleId,
    titleEffectId: snapshot.matchInfo.titleEffectId,
    titleFontSize: snapshot.matchInfo.titleFontSize,
    titleLetterSpacing: snapshot.matchInfo.titleLetterSpacing,
    titleShadow: snapshot.matchInfo.titleShadow,
    titleRotation: snapshot.matchInfo.titleRotation,
    titleMaxWidth: snapshot.matchInfo.titleMaxWidth,
  };
}

function normalizeSnapshot(snapshot: PosterSnapshot) {
  const defaultHomeFormation = getDefaultFormationId(snapshot.squadSize);
  return {
    teamMode: snapshot.teamMode,
    squadSize: snapshot.squadSize,
    playerCardSize: snapshot.playerCardSize,
    teamLogoDisplaySize: snapshot.teamLogoDisplaySize,
    posterTheme: snapshot.posterTheme,
    homeFormationId: snapshot.homeFormationId,
    awayFormationId: snapshot.awayFormationId,
    defaultHomeFormation,
    home: normalizeTeam(snapshot, "home"),
    away: normalizeTeam(snapshot, "away"),
    matchInfo: normalizeMatchInfo(snapshot),
    benchCount: snapshot.benchPlayerIds.length,
  };
}

export function areSnapshotsEquivalent(
  a: PosterSnapshot,
  b: PosterSnapshot
): boolean {
  return (
    JSON.stringify(normalizeSnapshot(a)) ===
    JSON.stringify(normalizeSnapshot(b))
  );
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
    if (hasPlayerPhoto(player)) return true;
    const defaultName = `Oyuncu ${player.number}`;
    if (player.name?.trim() && player.name.trim() !== defaultName) {
      return true;
    }
  }

  return false;
}
