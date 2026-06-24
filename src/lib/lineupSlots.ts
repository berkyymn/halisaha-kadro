import type { Player, SquadSize } from "@/types";

export type LineupSlotOption = {
  slotIndex: number;
  jerseyNumber: number;
  playerName?: string;
  isEmpty: boolean;
};

export function buildLineupSlotOptions(
  playerIds: string[],
  squadSize: SquadSize,
  players: Record<string, Player>,
  savedPlayers: Record<string, Player>
): LineupSlotOption[] {
  return Array.from({ length: squadSize }, (_, slotIndex) => {
    const id = playerIds[slotIndex] ?? "";
    const player = id ? (players[id] ?? savedPlayers[id]) : undefined;
    const isEmpty = !id || !player;

    return {
      slotIndex,
      jerseyNumber: player?.number ?? slotIndex + 1,
      playerName: player?.name?.trim() || undefined,
      isEmpty,
    };
  });
}
