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
      player.photoUrl
  );
}

export function pickPlayerPhotoFields(
  player: Partial<Player>
): Partial<PlayerPhotoFields> {
  const fields: Partial<PlayerPhotoFields> = {};
  if (player.photoSource) fields.photoSource = player.photoSource;
  if (player.cutoutUrl) fields.cutoutUrl = player.cutoutUrl;
  if (player.avatarUrl) fields.avatarUrl = player.avatarUrl;
  if (player.photoUrl) fields.photoUrl = player.photoUrl;
  if (player.photoCrop) fields.photoCrop = player.photoCrop;
  return fields;
}

/** Bulutta foto yoksa yerel kopyadan doldur; bulutta varsa bulutu kullan */
export function mergePlayerPreservingLocalPhotos(
  local: Player | undefined,
  remote: Player
): Player {
  if (!local || hasPlayerPhoto(remote)) return remote;
  if (!hasPlayerPhoto(local)) return remote;
  return { ...remote, ...pickPlayerPhotoFields(local) };
}

export function mergeSavedPlayersPreservingLocalPhotos(
  local: Record<string, Player>,
  remote: Record<string, Player>
): Record<string, Player> {
  const ids = new Set([...Object.keys(local), ...Object.keys(remote)]);
  const merged: Record<string, Player> = {};
  for (const id of ids) {
    const remotePlayer = remote[id];
    if (!remotePlayer) {
      if (local[id]) merged[id] = local[id];
      continue;
    }
    merged[id] = mergePlayerPreservingLocalPhotos(local[id], remotePlayer);
  }
  return merged;
}
