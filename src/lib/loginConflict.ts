import { hasPlayerPhoto } from "@/lib/playerPhotos";
import { DEFAULT_AWAY_SHORT_NAME, DEFAULT_HOME_SHORT_NAME } from "@/lib/defaults";
import { DEFAULT_POSTER_THEME } from "@/lib/posterThemes";
import { getDefaultFormationId } from "@/lib/formations";
import type { JerseyConfig, TeamLogo } from "@/types";
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

const DEFAULT_JERSEY = {
  primaryColor: "#374151",
  secondaryColor: "#111827",
  style: "solid" as const,
  numberColor: "#ffffff",
};

const DEFAULT_LOGO = {
  mode: "generated" as const,
  presetId: undefined as string | undefined,
  initials: "?",
  teamName: "",
  primaryColor: "#374151",
  secondaryColor: "#111827",
  accentColor: "#e5e7eb",
  icon: "none" as const,
  showInitials: false,
  showTeamName: false,
  showIcon: false,
};

function normalizeTeam(snapshot: PosterSnapshot, team: "home" | "away") {
  const config = team === "home" ? snapshot.homeTeam : snapshot.awayTeam;
  const jersey = (config.jersey ?? {}) as Partial<JerseyConfig>;
  const logo = (config.logo ?? {}) as Partial<TeamLogo>;
  return {
    name: config.name ?? "",
    shortName: config.shortName ?? "",
    atmosphereColor: config.atmosphereColor ?? "#000000",
    jersey: {
      primaryColor: jersey.primaryColor ?? DEFAULT_JERSEY.primaryColor,
      secondaryColor: jersey.secondaryColor ?? DEFAULT_JERSEY.secondaryColor,
      style: jersey.style ?? DEFAULT_JERSEY.style,
      numberColor: jersey.numberColor ?? DEFAULT_JERSEY.numberColor,
    },
    logo: {
      mode: logo.mode ?? DEFAULT_LOGO.mode,
      presetId: logo.presetId ?? DEFAULT_LOGO.presetId,
      initials: logo.initials ?? DEFAULT_LOGO.initials,
      teamName: logo.teamName ?? DEFAULT_LOGO.teamName,
      primaryColor: logo.primaryColor ?? DEFAULT_LOGO.primaryColor,
      secondaryColor: logo.secondaryColor ?? DEFAULT_LOGO.secondaryColor,
      accentColor: logo.accentColor ?? DEFAULT_LOGO.accentColor,
      icon: logo.icon ?? DEFAULT_LOGO.icon,
      showInitials: logo.showInitials ?? DEFAULT_LOGO.showInitials,
      showTeamName: logo.showTeamName ?? DEFAULT_LOGO.showTeamName,
      showIcon: logo.showIcon ?? DEFAULT_LOGO.showIcon,
    },
    players: normalizePlayerIdentity(snapshot, team),
  };
}

function normalizeMatchInfo(snapshot: PosterSnapshot) {
  const matchInfo = snapshot.matchInfo ?? ({} as Partial<PosterSnapshot["matchInfo"]>);
  return {
    titleLine1: matchInfo.titleLine1 ?? "",
    titleLine2: matchInfo.titleLine2 ?? "",
    titleSubtitle: matchInfo.titleSubtitle ?? "",
    venue: matchInfo.venue ?? "",
    time: matchInfo.time ?? "",
    date: matchInfo.date ?? "",
    titleStyleId: matchInfo.titleStyleId ?? "cinematic",
    titleEffectId: matchInfo.titleEffectId ?? "normal",
    titleFontSize: matchInfo.titleFontSize ?? 64,
    titleLetterSpacing: matchInfo.titleLetterSpacing ?? 0,
    titleShadow: matchInfo.titleShadow ?? 0,
    titleRotation: matchInfo.titleRotation ?? 0,
    titleMaxWidth: matchInfo.titleMaxWidth ?? 100,
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
