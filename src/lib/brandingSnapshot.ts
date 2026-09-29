import { normalizeTeamLogo } from "@/lib/logoUtils";
import { normalizeJersey } from "@/lib/jerseyOptions";
import type { PosterSnapshot } from "@/lib/posterSnapshot";
import type { PosterSnapshotSource } from "@/lib/posterSnapshot";
import type { JerseyConfig, TeamConfig, TeamLogo } from "@/types";
import { DEFAULT_LOGO_DISPLAY_SIZE } from "@/types";

export type SlimTeamConfig = Pick<
  TeamConfig,
  "name" | "shortName" | "playerIds" | "captainId"
>;

/** Bulutta yalnızca kadro kimliği; logo/forma branding alanında */
export function slimTeamConfigForCloud(team: TeamConfig): SlimTeamConfig {
  return {
    name: team.name,
    shortName: team.shortName,
    playerIds: team.playerIds,
    captainId: team.captainId,
  };
}

export type TeamBrandingSide = {
  logo: TeamLogo;
  jersey: JerseyConfig;
  atmosphereColor: string;
};

export type TeamBrandingSnapshot = {
  home: TeamBrandingSide;
  away: TeamBrandingSide;
  teamLogoDisplaySize: number;
  revision: number;
};

function brandingSideFromTeam(team: TeamConfig): TeamBrandingSide {
  return {
    logo: normalizeTeamLogo(team.logo, team.shortName),
    jersey: normalizeJersey(team.jersey),
    atmosphereColor: team.atmosphereColor,
  };
}

export function buildBrandingSnapshot(
  source: PosterSnapshotSource,
  revision = 0
): TeamBrandingSnapshot {
  return {
    home: brandingSideFromTeam(source.homeTeam),
    away: brandingSideFromTeam(source.awayTeam),
    teamLogoDisplaySize: source.teamLogoDisplaySize || DEFAULT_LOGO_DISPLAY_SIZE,
    revision,
  };
}

export function applyBrandingToTeamConfig(
  team: TeamConfig,
  side: TeamBrandingSide
): TeamConfig {
  return {
    ...team,
    jersey: normalizeJersey(side.jersey),
    atmosphereColor: side.atmosphereColor,
    logo: normalizeTeamLogo(side.logo, team.shortName),
  };
}

export function applyBrandingToSnapshot(
  snapshot: PosterSnapshot,
  branding: TeamBrandingSnapshot
): PosterSnapshot {
  return {
    ...snapshot,
    homeTeam: applyBrandingToTeamConfig(snapshot.homeTeam, branding.home),
    awayTeam: applyBrandingToTeamConfig(snapshot.awayTeam, branding.away),
    teamLogoDisplaySize: branding.teamLogoDisplaySize,
  };
}

export function parseBrandingSnapshot(raw: unknown): TeamBrandingSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Partial<TeamBrandingSnapshot>;
  if (!data.home || !data.away) return null;
  return {
    home: {
      logo: normalizeTeamLogo(data.home.logo, ""),
      jersey: normalizeJersey(data.home.jersey),
      atmosphereColor: data.home.atmosphereColor ?? "#1e3a8a",
    },
    away: {
      logo: normalizeTeamLogo(data.away.logo, ""),
      jersey: normalizeJersey(data.away.jersey),
      atmosphereColor: data.away.atmosphereColor ?? "#dc2626",
    },
    teamLogoDisplaySize: data.teamLogoDisplaySize ?? DEFAULT_LOGO_DISPLAY_SIZE,
    revision: typeof data.revision === "number" ? data.revision : 0,
  };
}
