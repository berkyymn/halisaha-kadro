import type { Player, SquadSize, TeamConfig } from "@/types";

export function getPlayerFromRegistry(
  playerId: string,
  registry: Record<string, Player>
): Player | undefined {
  return registry[playerId];
}

/** Forma numaraları used by players currently in a team's lineup. */
export function collectTeamLineupNumbers(
  team: TeamConfig,
  squadSize: SquadSize,
  registry: Record<string, Player>,
  excludePlayerId?: string
): Set<number> {
  const numbers = new Set<number>();
  for (let i = 0; i < squadSize; i++) {
    const id = team.playerIds[i] ?? "";
    if (!id || id === excludePlayerId) continue;
    const player = registry[id];
    if (player?.number != null) numbers.add(player.number);
  }
  return numbers;
}

export function nextFreeJerseyNumber(used: Set<number>, start = 1): number {
  for (let n = start; n <= 99; n++) {
    if (!used.has(n)) return n;
  }
  return 99;
}

/**
 * Same-team swap: incoming keeps their number when possible.
 * If it clashes with another lineup player, incoming gets a free number.
 * Outgoing going to bench cannot keep a number still worn on the field.
 */
export function resolveSameTeamJerseyConflicts({
  team,
  squadSize,
  registry,
  incomingPlayerId,
  outgoingPlayerId,
}: {
  team: TeamConfig;
  squadSize: SquadSize;
  registry: Record<string, Player>;
  incomingPlayerId: string;
  outgoingPlayerId?: string;
}): Record<string, Player> {
  const updates: Record<string, Player> = {};
  const merged = { ...registry };

  const applyUpdate = (id: string, player: Player) => {
    updates[id] = player;
    merged[id] = player;
  };

  const incoming = merged[incomingPlayerId];
  if (!incoming) return updates;

  let incomingNumber = incoming.number;
  const usedByOthers = collectTeamLineupNumbers(
    team,
    squadSize,
    merged,
    incomingPlayerId
  );

  if (usedByOthers.has(incomingNumber)) {
    incomingNumber = nextFreeJerseyNumber(usedByOthers);
    applyUpdate(incomingPlayerId, { ...incoming, number: incomingNumber });
  }

  const lineupNumbers = collectTeamLineupNumbers(team, squadSize, merged);

  if (outgoingPlayerId) {
    const outgoing = merged[outgoingPlayerId];
    if (outgoing && lineupNumbers.has(outgoing.number)) {
      applyUpdate(outgoingPlayerId, {
        ...outgoing,
        number: nextFreeJerseyNumber(lineupNumbers),
      });
    }
  }

  return updates;
}
