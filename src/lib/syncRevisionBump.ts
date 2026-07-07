import type { Player, TeamConfig } from "@/types";
import {
  DEFAULT_SYNC_REVISIONS,
  type SyncRevisions,
} from "@/lib/syncRevisions";

const LAYOUT_KEYS = new Set([
  "mode",
  "matchInfo",
  "homeFormationId",
  "awayFormationId",
  "pitchPlayers",
  "playerCardSize",
  "photoScalePercent",
  "posterTheme",
]);

const ROSTER_KEYS = new Set([
  "players",
  "savedPlayers",
  "benchPlayerIds",
  "squadSize",
]);

const PHOTO_FIELDS: (keyof Player)[] = [
  "cutoutUrl",
  "photoSource",
  "photoCrop",
  "avatarUrl",
  "photoUrl",
  "cutoutStoragePath",
  "photoSourceStoragePath",
];

function teamBrandingChanged(
  prev: TeamConfig,
  next: Partial<TeamConfig>
): boolean {
  return (
    next.logo !== undefined ||
    next.jersey !== undefined ||
    next.atmosphereColor !== undefined
  );
}

function teamRosterChanged(
  prev: TeamConfig,
  next: Partial<TeamConfig>
): boolean {
  return (
    next.playerIds !== undefined ||
    next.captainId !== undefined ||
    next.name !== undefined ||
    next.shortName !== undefined
  );
}

function playerRegistryMediaChanged(
  prev: Record<string, Player>,
  next: Record<string, Player>
): boolean {
  for (const id of new Set([...Object.keys(prev), ...Object.keys(next)])) {
    const before = prev[id];
    const after = next[id];
    if (!before || !after) {
      if (after && PHOTO_FIELDS.some((field) => after[field] !== undefined)) {
        return true;
      }
      continue;
    }
    if (PHOTO_FIELDS.some((field) => before[field] !== after[field])) {
      return true;
    }
  }
  return false;
}

export function bumpSyncRevisions(
  prev: SyncRevisions,
  prevState: {
    homeTeam: TeamConfig;
    awayTeam: TeamConfig;
    players: Record<string, Player>;
    savedPlayers: Record<string, Player>;
  },
  next: Record<string, unknown>
): SyncRevisions {
  const revisions = { ...prev };
  let branding = false;
  let roster = false;
  let layout = false;
  let media = false;

  for (const key of Object.keys(next)) {
    if (key === "homeTeam" && next.homeTeam) {
      const patch = next.homeTeam as Partial<TeamConfig>;
      if (teamBrandingChanged(prevState.homeTeam, patch)) branding = true;
      if (teamRosterChanged(prevState.homeTeam, patch)) roster = true;
    } else if (key === "awayTeam" && next.awayTeam) {
      const patch = next.awayTeam as Partial<TeamConfig>;
      if (teamBrandingChanged(prevState.awayTeam, patch)) branding = true;
      if (teamRosterChanged(prevState.awayTeam, patch)) roster = true;
    } else if (key === "teamLogoDisplaySize") {
      branding = true;
    } else if (ROSTER_KEYS.has(key)) {
      roster = true;
    } else if (LAYOUT_KEYS.has(key)) {
      layout = true;
    }
  }

  if (next.players || next.savedPlayers) {
    const nextPlayers = (next.players as Record<string, Player> | undefined) ?? prevState.players;
    const nextSaved =
      (next.savedPlayers as Record<string, Player> | undefined) ??
      prevState.savedPlayers;
    if (
      playerRegistryMediaChanged(prevState.players, nextPlayers) ||
      playerRegistryMediaChanged(prevState.savedPlayers, nextSaved)
    ) {
      media = true;
    }
  }

  if (branding) revisions.branding += 1;
  if (roster) revisions.roster += 1;
  if (layout) revisions.layout += 1;
  if (media) revisions.media += 1;

  return revisions;
}

export { DEFAULT_SYNC_REVISIONS };
