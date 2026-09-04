"use client";

import { memo, useCallback, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import type { ResolvedFormationSlot } from "@/lib/formationEngine";
import type { JerseyConfig, PitchPlayer, Player } from "@/types";
import type { PitchMovementPolicy } from "@/lib/pitchInteraction";
import { PlayerAvatar } from "./PlayerAvatar";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

const DRAG_THRESHOLD = 6;

export interface SlotPosition {
  team: "home" | "away";
  slotIndex: number;
  x: number;
  y: number;
}

interface PlayerOnPitchProps {
  team: "home" | "away";
  slotIndex: number;
  pitchRef: React.RefObject<HTMLDivElement | null>;
  cardSize: number;
  layoutSlot: ResolvedFormationSlot | undefined;
  onEdit: (team: "home" | "away", slotIndex: number) => void;
  player: Player | undefined;
  jersey: JerseyConfig;
  isCaptain: boolean;
  number: number;
  displayName: string;
  hasCustomPosition: boolean;
  positionX: number;
  positionY: number;
  isGoalkeeper: boolean;
  pitchPlayer: PitchPlayer | undefined;
  isSwapTarget: boolean;
  isDraggedWithTarget: boolean;
  allSlotPositions: SlotPosition[];
  movePitchPlayer: (team: "home" | "away", slotIndex: number, x: number, y: number) => void;
  setActiveDrag: (drag: { team: "home" | "away"; slotIndex: number; x: number; y: number } | null) => void;
  setActiveSwapTarget: (target: { team: "home" | "away"; slotIndex: number } | null) => void;
  swapPlayers: (team1: "home" | "away", slotIndex1: number, team2: "home" | "away", slotIndex2: number) => void;
  photoScalePercent: number;
  movementPolicy: PitchMovementPolicy;
}

export const PlayerOnPitch = memo(function PlayerOnPitch({
  team,
  slotIndex,
  pitchRef,
  cardSize,
  layoutSlot,
  onEdit,
  player,
  jersey,
  isCaptain,
  number,
  displayName,
  hasCustomPosition,
  positionX,
  positionY,
  isGoalkeeper,
  isSwapTarget,
  isDraggedWithTarget,
  allSlotPositions,
  movePitchPlayer,
  setActiveDrag,
  setActiveSwapTarget,
  swapPlayers,
  photoScalePercent,
  movementPolicy,
}: PlayerOnPitchProps) {
  const [dragging, setDragging] = useState(false);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const dragOffset = useRef({ x: 0, y: 0 });
  const pointerStart = useRef({ x: 0, y: 0 });
  const startPosition = useRef({ x: 0, y: 0, hasCustom: false });
  const moved = useRef(false);
  const goalkeeperMoved = useRef(false);
  const pendingSwapTarget = useRef<{ team: "home" | "away"; slotIndex: number } | null>(null);

  const effectiveX = dragging ? dragPos.x : positionX;
  const effectiveY = dragging ? dragPos.y : positionY;

  const handleClick = useCallback(() => {
    if (isGoalkeeper && goalkeeperMoved.current) {
      goalkeeperMoved.current = false;
      return;
    }
    onEdit(team, slotIndex);
  }, [onEdit, team, slotIndex, isGoalkeeper]);

  const shouldShowSwapIndicator = isSwapTarget || isDraggedWithTarget;

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    pointerStart.current = { x: e.clientX, y: e.clientY };
    if (isGoalkeeper) {
      goalkeeperMoved.current = false;
      return;
    }
    e.preventDefault();
    moved.current = false;
    startPosition.current = { x: effectiveX, y: effectiveY, hasCustom: hasCustomPosition };
    setDragPos({ x: effectiveX, y: effectiveY });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(true);
    const pitch = pitchRef.current;
    if (!pitch) return;
    const rect = pitch.getBoundingClientRect();
    const pointerX = ((e.clientX - rect.left) / rect.width) * 100;
    const pointerY = ((e.clientY - rect.top) / rect.height) * 100;
    dragOffset.current = { x: pointerX - effectiveX, y: pointerY - effectiveY };
    setActiveDrag({ team, slotIndex, x: effectiveX, y: effectiveY });
  }, [pitchRef, team, slotIndex, effectiveX, effectiveY, hasCustomPosition, isGoalkeeper, setActiveDrag]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (isGoalkeeper) {
      if (
        Math.abs(e.clientX - pointerStart.current.x) > DRAG_THRESHOLD ||
        Math.abs(e.clientY - pointerStart.current.y) > DRAG_THRESHOLD
      ) {
        goalkeeperMoved.current = true;
      }
      return;
    }
    if (!dragging) return;
    const dx = e.clientX - pointerStart.current.x;
    const dy = e.clientY - pointerStart.current.y;
    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
      moved.current = true;
    }
    if (!moved.current) return;

    const pitch = pitchRef.current;
    if (!pitch) return;

    const rect = pitch.getBoundingClientRect();
    let newX = ((e.clientX - rect.left) / rect.width) * 100 - dragOffset.current.x;
    let newY = ((e.clientY - rect.top) / rect.height) * 100 - dragOffset.current.y;

    newX = clamp(newX, movementPolicy.dragXMin, movementPolicy.dragXMax);
    newY = clamp(newY, movementPolicy.dragYMin, movementPolicy.dragYMax);

    setDragPos({ x: newX, y: newY });
    setActiveDrag({ team, slotIndex, x: newX, y: newY });

    let closestTarget: { team: "home" | "away"; slotIndex: number } | null = null;
    let minDistance = Infinity;
    const thresholdPx = cardSize * 0.70;

      for (const slot of allSlotPositions) {
        if (slot.team === team && slot.slotIndex === slotIndex) continue;
        if (!movementPolicy.allowedSwapTeams.includes(slot.team)) continue;

      const slotCenterX = rect.left + (slot.x / 100) * rect.width;
      const slotCenterY = rect.top + (slot.y / 100) * rect.height;

      const distance = Math.hypot(e.clientX - slotCenterX, e.clientY - slotCenterY);

      if (distance < thresholdPx && distance < minDistance) {
        minDistance = distance;
        closestTarget = { team: slot.team, slotIndex: slot.slotIndex };
      }
    }

    pendingSwapTarget.current = closestTarget;
    setActiveSwapTarget(closestTarget);
  }, [
    pitchRef,
    dragging,
    cardSize,
    allSlotPositions,
    team,
    slotIndex,
    movementPolicy.dragXMin,
    movementPolicy.dragXMax,
    movementPolicy.dragYMin,
    movementPolicy.dragYMax,
    movementPolicy.allowedSwapTeams,
    isGoalkeeper,
    setActiveDrag,
    setActiveSwapTarget,
  ]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragging) {
      if (isGoalkeeper && goalkeeperMoved.current) {
        setTimeout(() => {
          goalkeeperMoved.current = false;
        }, 0);
      }
      return;
    }
    const swapTarget = pendingSwapTarget.current;
    pendingSwapTarget.current = null;

    setDragging(false);
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    setActiveDrag(null);
    setActiveSwapTarget(null);

    if (!moved.current) {
      handleClick();
      return;
    }

    if (swapTarget) {
      swapPlayers(team, slotIndex, swapTarget.team, swapTarget.slotIndex);
      return;
    }

    const pitch = pitchRef.current;
    if (pitch) {
      const rect = pitch.getBoundingClientRect();
      const finalX = ((e.clientX - rect.left) / rect.width) * 100 - dragOffset.current.x;
      const finalY = ((e.clientY - rect.top) / rect.height) * 100 - dragOffset.current.y;

      if (!movementPolicy.canMoveGoalkeeper && isGoalkeeper) {
        return;
      }

      if (
        finalX < movementPolicy.dropXMin ||
        finalX > movementPolicy.dropXMax ||
        finalY < movementPolicy.dropYMin ||
        finalY > movementPolicy.dropYMax
      ) {
        return;
      }

      movePitchPlayer(team, slotIndex, finalX, finalY);
    }
  }, [pitchRef, team, slotIndex, dragging, isGoalkeeper, movementPolicy, swapPlayers, movePitchPlayer, setActiveDrag, setActiveSwapTarget, handleClick]);

  const handlePointerCancel = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    pendingSwapTarget.current = null;
    setDragging(false);
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    setActiveDrag(null);
    setActiveSwapTarget(null);
  }, [dragging, setActiveDrag, setActiveSwapTarget]);

  if (!layoutSlot) return null;

  return (
    <div
      data-player-card="true"
      data-team={team}
      data-slot-index={slotIndex}
      className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center select-none ${
        dragging
          ? "z-50 cursor-grabbing"
          : isGoalkeeper
            ? "z-[25] cursor-pointer"
            : hasCustomPosition
              ? "z-30 cursor-grab"
              : "z-20 cursor-grab"
      }`}
      style={{
        left: `${effectiveX}%`,
        top: `${effectiveY}%`,
        willChange: dragging ? "transform, left, top" : undefined,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onClick={isGoalkeeper ? handleClick : undefined}
    >
      <div
        className={`relative transition-transform duration-150 ${
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

        {shouldShowSwapIndicator && (
          <div className="absolute inset-0 rounded-[18%] overflow-hidden bg-green-500/30 border-2 border-green-400 flex flex-col items-center justify-center animate-pulse z-30 shadow-[0_0_15px_rgba(34,197,94,0.6)]">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-green-600 shadow-md transform rotate-180 transition-transform duration-300">
              <RefreshCw className="w-5 h-5 animate-spin-slow" />
            </div>
            <span className="mt-1.5 text-[9px] font-black tracking-wider text-white bg-green-600 px-1.5 py-0.5 rounded shadow">
              DEĞİŞTİR
            </span>
          </div>
        )}
      </div>
    </div>
  );
});
