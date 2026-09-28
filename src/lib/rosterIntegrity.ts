import type { Player, SquadSize, TeamConfig } from "@/types";
import { createDefaultPlayer } from "@/lib/defaultRoster";
import { isCustomizedPlayer, rebuildActivePlayers } from "@/lib/playerPool";
import { resolveJerseyNumber } from "@/lib/teamJerseyNumbers";

/**
 * Kadro verisinin tutarlılık kuralları tek yerde.
 *
 * Değişmezler (normalizeRoster sonrası her zaman doğru):
 *  1. Her takımın `playerIds` dizisi tam `squadSize` uzunluğunda ve her slot
 *     kayıtlı bir oyuncuyu gösterir (boş slot yer tutucu oyuncuyla dolar).
 *  2. Bir oyuncu aynı anda en fazla bir slotta durur (iki takım dahil).
 *  3. Yedek listesi tekrarsızdır, yalnızca kayıtlı ve sahada olmayan oyuncuları içerir.
 *  4. Kaptan, kendi takımının kadrosunda değilse kaptanlık düşer.
 *  5. `formatOverflow`: format küçülünce yedeğe inen oyuncuların, hangi takımdan
 *     indiklerini hatırlayan yığın. Yalnızca hâlâ yedekte olan oyuncuları içerir.
 *
 * Format değişimi (resizeSquad) özel oyuncuyu asla silmez: küçülürken yedeğe
 * indirir, büyürken aynı takımdaki boş slota geri getirir.
 */

export type TeamSide = "home" | "away";

/** Takım başına yığın: son eklenen, format büyüyünce ilk geri döner. */
export type FormatOverflow = Record<TeamSide, string[]>;

export const EMPTY_FORMAT_OVERFLOW: FormatOverflow = { home: [], away: [] };

export type RosterState = {
  squadSize: SquadSize;
  homeTeam: TeamConfig;
  awayTeam: TeamConfig;
  savedPlayers: Record<string, Player>;
  benchPlayerIds: string[];
  formatOverflow: FormatOverflow;
};

export type NormalizedRoster = RosterState & {
  players: Record<string, Player>;
};

const SIDES: TeamSide[] = ["home", "away"];

function teamKey(side: TeamSide): "homeTeam" | "awayTeam" {
  return side === "home" ? "homeTeam" : "awayTeam";
}

export function parseFormatOverflow(raw: unknown): FormatOverflow {
  const source = (raw && typeof raw === "object" ? raw : {}) as Partial<
    Record<TeamSide, unknown>
  >;
  const pick = (value: unknown) =>
    Array.isArray(value)
      ? value.filter((id): id is string => typeof id === "string" && id.length > 0)
      : [];
  return { home: pick(source.home), away: pick(source.away) };
}

/** Yedekten çıkan (sahaya alınan / silinen) oyuncuları yığından düşürür. */
export function pruneFormatOverflow(
  overflow: FormatOverflow | undefined,
  benchPlayerIds: string[]
): FormatOverflow {
  const bench = new Set(benchPlayerIds);
  return {
    home: (overflow?.home ?? []).filter((id) => bench.has(id)),
    away: (overflow?.away ?? []).filter((id) => bench.has(id)),
  };
}

/** Yer tutucu oyuncu; numara takımda boşsa slot numarası, doluysa ilk boş numara. */
function createPlaceholder(slotIndex: number, usedNumbers: Set<number>): Player {
  const player = createDefaultPlayer(slotIndex);
  player.number = resolveJerseyNumber(player.number, usedNumbers);
  return player;
}

function withLineupName(player: Player, slotIndex: number): Player {
  if (player.name?.trim()) return player;
  return { ...player, name: `Oyuncu ${slotIndex + 1}` };
}

function lineupNumbers(
  ids: string[],
  registry: Record<string, Player>,
  exclude?: string
): Set<number> {
  const numbers = new Set<number>();
  for (const id of ids) {
    if (!id || id === exclude) continue;
    const number = registry[id]?.number;
    if (number != null) numbers.add(number);
  }
  return numbers;
}

/** Kaydedilmiş/uzak/eski veriden gelen kadroyu değişmezlere uydurur. Saf fonksiyon. */
export function normalizeRoster(input: RosterState): NormalizedRoster {
  const { squadSize } = input;
  const registry: Record<string, Player> = { ...input.savedPlayers };
  const onField = new Set<string>();
  const rescuedToBench: string[] = [];
  const teams = {} as Record<TeamSide, TeamConfig>;

  for (const side of SIDES) {
    const team = input[teamKey(side)];
    const rawIds = Array.isArray(team.playerIds) ? team.playerIds : [];
    const ids: string[] = [];

    for (let i = 0; i < squadSize; i++) {
      const id = rawIds[i] ?? "";
      if (id && registry[id] && !onField.has(id)) {
        registry[id] = withLineupName(registry[id], i);
        ids.push(id);
        onField.add(id);
      } else {
        ids.push("");
      }
    }

    // Eski kayıtlarda squadSize'dan uzun kalmış diziler: özel oyuncular kaybolmasın.
    for (const id of rawIds.slice(squadSize)) {
      if (id && registry[id] && !onField.has(id) && isCustomizedPlayer(registry[id])) {
        rescuedToBench.push(id);
      }
    }

    for (let i = 0; i < squadSize; i++) {
      if (ids[i]) continue;
      const placeholder = createPlaceholder(i, lineupNumbers(ids, registry));
      registry[placeholder.id] = placeholder;
      ids[i] = placeholder.id;
      onField.add(placeholder.id);
    }

    // Takım içinde forma numarası tekrar etmez: sonraki slottaki bir yukarı kayar.
    const teamNumbers = new Set<number>();
    ids.forEach((id, slot) => {
      const player = registry[id];
      const number = resolveJerseyNumber(player.number ?? slot + 1, teamNumbers);
      if (number !== player.number) registry[id] = { ...player, number };
      teamNumbers.add(number);
    });

    teams[side] = {
      ...team,
      playerIds: ids,
      captainId:
        team.captainId && ids.includes(team.captainId) ? team.captainId : undefined,
    };
  }

  const benchSeen = new Set<string>();
  const benchPlayerIds: string[] = [];
  for (const id of [...input.benchPlayerIds, ...rescuedToBench]) {
    if (!id || benchSeen.has(id) || onField.has(id) || !registry[id]) continue;
    benchSeen.add(id);
    benchPlayerIds.push(id);
  }

  const overflowSeen = new Set<string>();
  const formatOverflow = {} as FormatOverflow;
  for (const side of SIDES) {
    formatOverflow[side] = (input.formatOverflow?.[side] ?? []).filter((id) => {
      if (overflowSeen.has(id) || !benchSeen.has(id)) return false;
      overflowSeen.add(id);
      return true;
    });
  }

  return {
    squadSize,
    homeTeam: teams.home,
    awayTeam: teams.away,
    savedPlayers: registry,
    benchPlayerIds,
    formatOverflow,
    players: rebuildActivePlayers(
      registry,
      benchPlayerIds,
      teams.home,
      teams.away,
      squadSize
    ),
  };
}

/**
 * 6v6 / 7v7 / 8v8 geçişi.
 * - Küçülürken: kesilen slotlardaki özel oyuncular yedeğe iner ve takımlarının
 *   `formatOverflow` yığınına eklenir. Yer tutucular ("Oyuncu 7") silinir.
 * - Büyürken: yeni slotlar önce o takımın yığınından (hâlâ yedekteyse) geri
 *   gelir, kalan slotlar yer tutucuyla dolar.
 * Aynı boyut için null döner.
 */
export function resizeSquad(
  input: RosterState & { players?: Record<string, Player> },
  nextSize: SquadSize
): NormalizedRoster | null {
  if (input.squadSize === nextSize) return null;

  // Önce mevcut veri temizlenir; böylece aşağıdaki mantık değişmezlere güvenebilir.
  const current = normalizeRoster({
    ...input,
    savedPlayers: { ...input.savedPlayers, ...(input.players ?? {}) },
  });
  const registry = { ...current.savedPlayers };
  let bench = [...current.benchPlayerIds];
  const overflow: FormatOverflow = {
    home: [...current.formatOverflow.home],
    away: [...current.formatOverflow.away],
  };
  const teams = {} as Record<TeamSide, TeamConfig>;

  for (const side of SIDES) {
    const team = current[teamKey(side)];
    let ids = [...team.playerIds];
    let captainId = team.captainId;

    if (nextSize < current.squadSize) {
      const removed = ids.slice(nextSize);
      ids = ids.slice(0, nextSize);
      // Son slot yığının en üstünde olsun: büyürken ilk o geri dönsün.
      for (const id of [...removed].reverse()) {
        if (id === captainId) captainId = undefined;
        if (isCustomizedPlayer(registry[id])) {
          bench.push(id);
          overflow[side].push(id);
        } else {
          delete registry[id];
        }
      }
    } else {
      for (let slot = ids.length; slot < nextSize; slot++) {
        let restoredId = "";
        while (overflow[side].length > 0 && !restoredId) {
          const candidate = overflow[side].pop()!;
          if (bench.includes(candidate) && registry[candidate]) {
            restoredId = candidate;
          }
        }

        const used = lineupNumbers(ids, registry);
        if (restoredId) {
          bench = bench.filter((id) => id !== restoredId);
          const player = registry[restoredId];
          const number = resolveJerseyNumber(player.number, used);
          if (number !== player.number) {
            registry[restoredId] = { ...player, number };
          }
          ids.push(restoredId);
        } else {
          const placeholder = createPlaceholder(slot, used);
          registry[placeholder.id] = placeholder;
          ids.push(placeholder.id);
        }
      }
    }

    teams[side] = { ...team, playerIds: ids, captainId };
  }

  return normalizeRoster({
    squadSize: nextSize,
    homeTeam: teams.home,
    awayTeam: teams.away,
    savedPlayers: registry,
    benchPlayerIds: bench,
    formatOverflow: overflow,
  });
}
