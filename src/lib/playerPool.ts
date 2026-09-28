import type { Player, SquadSize, TeamConfig } from "@/types";
import { hasPlayerPhoto } from "@/lib/playerPhotos";

const DEFAULT_PLAYER_NAME = /^(Oyuncu|Yedek) \d+$/;

/** Varsayılan yer tutucu değil, kullanıcının emek verdiği oyuncu mu? (isim veya fotoğraf) */
export function isCustomizedPlayer(player: Player | undefined): boolean {
  if (!player) return false;
  if (hasPlayerPhoto(player)) return true;
  const name = player.name?.trim() ?? "";
  return name.length > 0 && !DEFAULT_PLAYER_NAME.test(name);
}

export function collectLineupPlayerIds(
  homeTeam: TeamConfig,
  awayTeam: TeamConfig,
  squadSize: SquadSize
): Set<string> {
  const ids = new Set<string>();
  for (const id of homeTeam.playerIds.slice(0, squadSize)) {
    if (id) ids.add(id);
  }
  for (const id of awayTeam.playerIds.slice(0, squadSize)) {
    if (id) ids.add(id);
  }
  return ids;
}

export function buildPersistedPlayerRegistry(
  players: Record<string, Player>,
  savedPlayers: Record<string, Player>,
  benchPlayerIds: string[],
  homeTeam: TeamConfig,
  awayTeam: TeamConfig,
  squadSize: SquadSize
): Record<string, Player> {
  const registry: Record<string, Player> = {};
  const ids = new Set([
    ...benchPlayerIds,
    ...collectLineupPlayerIds(homeTeam, awayTeam, squadSize),
  ]);
  for (const id of ids) {
    if (players[id]) registry[id] = players[id];
    else if (savedPlayers[id]) registry[id] = savedPlayers[id];
  }
  return registry;
}

export function rebuildActivePlayers(
  savedPlayers: Record<string, Player>,
  benchPlayerIds: string[],
  homeTeam: TeamConfig,
  awayTeam: TeamConfig,
  squadSize: SquadSize
): Record<string, Player> {
  const ids = new Set([
    ...benchPlayerIds,
    ...collectLineupPlayerIds(homeTeam, awayTeam, squadSize),
  ]);
  const players: Record<string, Player> = {};
  for (const id of ids) {
    if (savedPlayers[id]) players[id] = savedPlayers[id];
  }
  return players;
}

export function sanitizeBenchIds(
  benchPlayerIds: string[],
  homeTeam: TeamConfig,
  awayTeam: TeamConfig,
  squadSize: SquadSize
): string[] {
  const onField = collectLineupPlayerIds(homeTeam, awayTeam, squadSize);
  return benchPlayerIds.filter((id) => id && !onField.has(id));
}

/**
 * Tek takım modunda rakip takım posterde görünmez; oyuncuları yedekler
 * panelinde ayrı grupta listelenir. Oyuncu bu gruptaysa rakip slot index'i.
 */
export function findHiddenAwaySlot(
  state: {
    teamMode: "single" | "versus";
    awayTeam: TeamConfig;
    squadSize: SquadSize;
  },
  playerId: string
): number {
  if (state.teamMode !== "single" || !playerId) return -1;
  return state.awayTeam.playerIds.slice(0, state.squadSize).indexOf(playerId);
}
