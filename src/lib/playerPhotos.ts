import type { Player } from "@/types";

export type PlayerPhotoFields = Pick<
  Player,
  "photoSource" | "cutoutUrl" | "avatarUrl" | "photoUrl" | "photoCrop"
>;

export function hasPlayerPhoto(
  player: Partial<Player> | undefined
): boolean {
  if (!player) return false;
  return Boolean(
    player.cutoutUrl ||
      player.photoSource ||
      player.avatarUrl ||
      player.photoUrl ||
      player.cutoutStoragePath ||
      player.photoSourceStoragePath
  );
}

