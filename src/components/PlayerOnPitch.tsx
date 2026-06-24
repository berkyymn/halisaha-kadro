"use client";

import { useRef, useState } from "react";
import type { ResolvedFormationSlot } from "@/lib/formationEngine";
import { useAppStore } from "@/store/useAppStore";
import { PlayerAvatar } from "./PlayerAvatar";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

const DRAG_THRESHOLD = 6;

export function PlayerOnPitch({
  team,
  slotIndex,
  pitchRef,
  cardSize,
  layoutSlot,
  onEdit,
}: {
  team: "home" | "away";
  slotIndex: number;
  pitchRef: React.RefObject<HTMLDivElement | null>;
  cardSize: number;
  layoutSlot?: ResolvedFormationSlot;
  onEdit: (team: "home" | "away", slotIndex: number) => void;
}) {
  const pitchPlayers = useAppStore((s) => s.pitchPlayers);
  const players = useAppStore((s) => s.players);
  const homeJersey = useAppStore((s) => s.homeTeam.jersey);
  const awayJersey = useAppStore((s) => s.awayTeam.jersey);
  const homeCaptainId = useAppStore((s) => s.homeTeam.captainId);
  const awayCaptainId = useAppStore((s) => s.awayTeam.captainId);
  const homePlayerIds = useAppStore((s) => s.homeTeam.playerIds);
  const awayPlayerIds = useAppStore((s) => s.awayTeam.playerIds);
  const movePitchPlayer = useAppStore((s) => s.movePitchPlayer);
  const photoScalePercent = useAppStore((s) => s.photoScalePercent);

  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const pointerStart = useRef({ x: 0, y: 0 });
  const moved = useRef(false);

  const pitchPlayer = pitchPlayers.find(
    (p) => p.team === team && p.slotIndex === slotIndex
  );
  const playerIds = team === "home" ? homePlayerIds : awayPlayerIds;
  const slotPlayerId = playerIds[slotIndex] ?? "";
  const resolvedPlayerId = pitchPlayer?.playerId || slotPlayerId;
  const player = resolvedPlayerId ? players[resolvedPlayerId] : undefined;
  const jersey = team === "home" ? homeJersey : awayJersey;

  if (!layoutSlot) return null;

  const isGoalkeeper = layoutSlot.isGoalkeeper;
  const formationX = layoutSlot.x;
  const formationY = layoutSlot.y;

  const hasCustomPosition =
    !isGoalkeeper &&
    pitchPlayer?.x != null &&
    pitchPlayer?.y != null;

  const x = isGoalkeeper ? formationX : (pitchPlayer?.x ?? formationX);
  const y = isGoalkeeper ? formationY : (pitchPlayer?.y ?? formationY);
  const number = player?.number ?? slotIndex + 1;
  const displayName = player?.name?.trim() || `Oyuncu ${slotIndex + 1}`;
  const captainId = team === "home" ? homeCaptainId : awayCaptainId;
  const playerId = resolvedPlayerId;
  const isCaptain = Boolean(playerId && captainId && playerId === captainId);

  const updatePosition = (clientX: number, clientY: number) => {
    if (isGoalkeeper) return;
    const pitch = pitchRef.current;
    if (!pitch) return;
    const rect = pitch.getBoundingClientRect();
    let newX =
      ((clientX - rect.left) / rect.width) * 100 - dragOffset.current.x;
    let newY =
      ((clientY - rect.top) / rect.height) * 100 - dragOffset.current.y;
    if (team === "home") newX = clamp(newX, 4, 45);
    else newX = clamp(newX, 55, 96);
    newY = clamp(newY, 6, 94);
    movePitchPlayer(team, slotIndex, newX, newY);
  };

  const handleClick = () => onEdit(team, slotIndex);

  return (
    <div
      className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center select-none ${
        dragging
          ? "z-40 cursor-grabbing"
          : isGoalkeeper
            ? "z-[25] cursor-pointer"
            : hasCustomPosition
              ? "z-30 cursor-grab"
              : "z-20 cursor-grab"
      }`}
      style={{ left: `${x}%`, top: `${y}%` }}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        if (isGoalkeeper) return;
        e.preventDefault();
        moved.current = false;
        pointerStart.current = { x: e.clientX, y: e.clientY };
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        setDragging(true);
        const pitch = pitchRef.current;
        if (!pitch) return;
        const rect = pitch.getBoundingClientRect();
        const pointerX = ((e.clientX - rect.left) / rect.width) * 100;
        const pointerY = ((e.clientY - rect.top) / rect.height) * 100;
        dragOffset.current = { x: pointerX - x, y: pointerY - y };
      }}
      onPointerMove={(e) => {
        if (isGoalkeeper || !dragging) return;
        const dx = e.clientX - pointerStart.current.x;
        const dy = e.clientY - pointerStart.current.y;
        if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
          moved.current = true;
        }
        if (moved.current) updatePosition(e.clientX, e.clientY);
      }}
      onPointerUp={(e) => {
        if (isGoalkeeper) return;
        setDragging(false);
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        if (!moved.current) handleClick();
      }}
      onPointerCancel={(e) => {
        if (isGoalkeeper) return;
        setDragging(false);
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      }}
      onClick={isGoalkeeper ? handleClick : undefined}
    >
      <div
        className={`transition-transform duration-150 ${
          dragging ? "scale-[1.06] z-40" : isGoalkeeper ? "" : "hover:scale-[1.03]"
        }`}
        style={
          dragging
            ? {
                filter: `drop-shadow(0 14px 22px rgba(0,0,0,0.7))`,
              }
            : undefined
        }
      >
        <PlayerAvatar
          player={player}
          jersey={jersey}
          number={number}
          name={displayName}
          size={cardSize}
          photoScale={photoScalePercent}
          isCaptain={isCaptain}
          showName
          variant={team === "home" ? "light" : "dark"}
        />
      </div>
    </div>
  );
}
