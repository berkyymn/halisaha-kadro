import { defaultAwayTeam, defaultHomeTeam } from "@/lib/defaults";
import { EMPTY_FORMAT_OVERFLOW, type RosterState } from "@/lib/rosterIntegrity";
import type { Player, SquadSize, TeamConfig } from "@/types";

/** Okunabilir id'li oyuncu: p("h1", "Ali", 1) */
export function p(id: string, name: string, number: number, extra: Partial<Player> = {}): Player {
  return { id, name, number, ...extra };
}

/** Takım kadrosu: numaralar 1..n, isimler "Oyuncu N" (yer tutucu) */
export function placeholderLineup(prefix: string, size: number): Player[] {
  return Array.from({ length: size }, (_, i) => p(`${prefix}${i + 1}`, `Oyuncu ${i + 1}`, i + 1));
}

export function rosterState(options: {
  squadSize?: SquadSize;
  home?: Player[];
  away?: Player[];
  bench?: Player[];
  homeTeam?: Partial<TeamConfig>;
  awayTeam?: Partial<TeamConfig>;
  formatOverflow?: RosterState["formatOverflow"];
} = {}): RosterState {
  const squadSize = options.squadSize ?? 7;
  const home = options.home ?? placeholderLineup("h", squadSize);
  const away = options.away ?? placeholderLineup("a", squadSize);
  const bench = options.bench ?? [];
  const savedPlayers: Record<string, Player> = {};
  for (const player of [...home, ...away, ...bench]) savedPlayers[player.id] = player;
  return {
    squadSize,
    homeTeam: { ...defaultHomeTeam, ...options.homeTeam, playerIds: home.map((x) => x.id) },
    awayTeam: { ...defaultAwayTeam, ...options.awayTeam, playerIds: away.map((x) => x.id) },
    savedPlayers,
    benchPlayerIds: bench.map((x) => x.id),
    formatOverflow: options.formatOverflow ?? EMPTY_FORMAT_OVERFLOW,
  };
}

export function names(state: RosterState, side: "home" | "away"): string[] {
  const team = side === "home" ? state.homeTeam : state.awayTeam;
  return team.playerIds.map((id) => state.savedPlayers[id]?.name ?? "∅");
}

export function numbers(state: RosterState, side: "home" | "away"): number[] {
  const team = side === "home" ? state.homeTeam : state.awayTeam;
  return team.playerIds.map((id) => state.savedPlayers[id]?.number ?? -1);
}
