"use client";

import type { Player, JerseyConfig } from "@/types";
import { PlayerAvatar } from "./PlayerAvatar";
import { PlayerDropOverlay } from "./PlayerDropOverlay";

type DragOverlayVariant = "swap" | "sub-out" | "sub-in";

interface PlayerDragPreviewProps {
  player: Player | undefined;
  jersey: JerseyConfig;
  size: number;
  variant: "light" | "dark";
  overlay?: DragOverlayVariant | null;
  number?: number;
  name?: string;
  photoScale?: number;
  isCaptain?: boolean;
  showName?: boolean;
}

/**
 * Shared drag-preview content used inside portal overlays for both
 * pitch and bench cards. Keeps PlayerAvatar + PlayerDropOverlay rendering
 * in one place so future visual changes don't have to be duplicated.
 */
export function PlayerDragPreview({
  player,
  jersey,
  size,
  variant,
  overlay,
  number = player?.number ?? 0,
  name = player?.name || "İsimsiz",
  photoScale = 100,
  isCaptain = false,
  showName = true,
}: PlayerDragPreviewProps) {
  if (!player) return null;
  return (
    <div className="relative">
      <PlayerAvatar
        player={player}
        jersey={jersey}
        number={number}
        name={name}
        size={size}
        photoScale={photoScale}
        isCaptain={isCaptain}
        showName={showName}
        variant={variant}
      />
      {overlay && <PlayerDropOverlay variant={overlay} />}
    </div>
  );
}
