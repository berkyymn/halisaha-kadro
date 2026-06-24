import type { Player, SquadSize, TeamConfig } from "@/types";

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
  const registry = { ...savedPlayers };
  const ids = new Set([
    ...benchPlayerIds,
    ...collectLineupPlayerIds(homeTeam, awayTeam, squadSize),
  ]);
  for (const id of ids) {
    if (players[id]) registry[id] = players[id];
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
