import type { Player, SquadSize, TeamConfig } from "@/types";

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

const MIN_JERSEY = 1;
const MAX_JERSEY = 99;

function wrapJersey(n: number): number {
  const range = MAX_JERSEY - MIN_JERSEY + 1;
  return ((((Math.round(n) - MIN_JERSEY) % range) + range) % range) + MIN_JERSEY;
}

/**
 * `start`tan başlayıp yukarı doğru ilk boş numara; 99'dan sonra 1'e döner.
 * Hepsi doluysa (takımda 99 oyuncu olamaz) `start` döner.
 */
export function nextFreeJerseyNumber(used: Set<number>, start = MIN_JERSEY): number {
  const first = wrapJersey(start);
  for (let step = 0; step < MAX_JERSEY; step++) {
    const candidate = wrapJersey(first + step);
    if (!used.has(candidate)) return candidate;
  }
  return first;
}

/**
 * Takım içi numara kuralı: istenen numara boşsa o, doluysa bir yukarı, bir
 * yukarı... (99 → 1). Numara atanan her yer bu fonksiyondan geçer.
 */
export function resolveJerseyNumber(desired: number, used: Set<number>): number {
  const wanted = wrapJersey(desired);
  return used.has(wanted) ? nextFreeJerseyNumber(used, wanted + 1) : wanted;
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
    incomingNumber = resolveJerseyNumber(incomingNumber, usedByOthers);
    applyUpdate(incomingPlayerId, { ...incoming, number: incomingNumber });
  }

  const lineupNumbers = collectTeamLineupNumbers(team, squadSize, merged);

  if (outgoingPlayerId) {
    const outgoing = merged[outgoingPlayerId];
    if (outgoing && lineupNumbers.has(outgoing.number)) {
      applyUpdate(outgoingPlayerId, {
        ...outgoing,
        number: resolveJerseyNumber(outgoing.number, lineupNumbers),
      });
    }
  }

  return updates;
}
