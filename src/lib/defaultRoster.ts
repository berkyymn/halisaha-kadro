import type { Player, SquadSize } from "@/types";

export function createDefaultPlayer(slotIndex: number): Player {
  const id = crypto.randomUUID();
  return {
    id,
    name: `Oyuncu ${slotIndex + 1}`,
    number: slotIndex + 1,
  };
}

function withDefaultLineupName(player: Player, slotIndex: number): Player {
  if (player.name?.trim()) return player;
  return {
    ...player,
    name: `Oyuncu ${slotIndex + 1}`,
    number: player.number ?? slotIndex + 1,
  };
}

export function buildDefaultRoster(squadSize: SquadSize): {
  players: Record<string, Player>;
  homePlayerIds: string[];
  awayPlayerIds: string[];
} {
  const players: Record<string, Player> = {};
  const homePlayerIds: string[] = [];
  const awayPlayerIds: string[] = [];

  for (let i = 0; i < squadSize; i++) {
    const homePlayer = createDefaultPlayer(i);
    const awayPlayer = createDefaultPlayer(i);
    players[homePlayer.id] = homePlayer;
    players[awayPlayer.id] = awayPlayer;
    homePlayerIds.push(homePlayer.id);
    awayPlayerIds.push(awayPlayer.id);
  }

  return { players, homePlayerIds, awayPlayerIds };
}

export function fillEmptyRosterSlots(
  squadSize: SquadSize,
  playerIds: string[],
  players: Record<string, Player>
): { playerIds: string[]; players: Record<string, Player> } {
  const ids = [...playerIds];
  while (ids.length < squadSize) ids.push("");
  const nextPlayers = { ...players };

  for (let i = 0; i < squadSize; i++) {
    const existingId = ids[i];
    if (existingId && nextPlayers[existingId]) {
      nextPlayers[existingId] = withDefaultLineupName(nextPlayers[existingId], i);
      continue;
    }

    const player = createDefaultPlayer(i);
    ids[i] = player.id;
    nextPlayers[player.id] = player;
  }

  return {
    playerIds: ids.slice(0, squadSize),
    players: nextPlayers,
  };
}
