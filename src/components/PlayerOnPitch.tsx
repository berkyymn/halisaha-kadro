"use client";

import { memo, useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ResolvedFormationSlot } from "@/lib/formationEngine";
import type { JerseyConfig, PitchPlayer, Player } from "@/types";
import type { PitchMovementPolicy, SlotRules } from "@/lib/pitchInteraction";
import { getSlotRules } from "@/lib/pitchInteraction";
import type { DragIntent, DropTarget } from "@/lib/dragIntent";
import {
  isSwapSourceClone,
  isSubOutClone,
} from "@/lib/dragIntent";
import { usePlayerDrag } from "@/hooks/usePlayerDrag";
import { findBenchDropTarget } from "@/lib/dropTargets";
import { PlayerAvatar } from "./PlayerAvatar";
import { PlayerDropOverlay } from "./PlayerDropOverlay";
import { PlayerDragPreview } from "./PlayerDragPreview";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

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
  isDragging: boolean;
  isSwapTarget: boolean;
  isSubTarget: boolean;
  dragIntent: DragIntent;
  allSlotPositions: SlotPosition[];
  movePitchPlayer: (team: "home" | "away", slotIndex: number, x: number, y: number) => void;
  setDragIntent: (intent: DragIntent) => void;
  swapPlayers: (team1: "home" | "away", slotIndex1: number, team2: "home" | "away", slotIndex2: number) => void;
  assignBenchToSlot: (team: "home" | "away", slotIndex: number, benchPlayerId: string) => void;
  moveSlotToBench: (team: "home" | "away", slotIndex: number) => void;
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
  isDragging,
  isSwapTarget,
  isSubTarget,
  dragIntent,
  allSlotPositions,
  movePitchPlayer,
  setDragIntent,
  swapPlayers,
  assignBenchToSlot,
  moveSlotToBench,
  photoScalePercent,
  movementPolicy,
}: PlayerOnPitchProps) {
  const [dragPos, setDragPos] = useState({ x: positionX, y: positionY });
  const dragOffset = useRef({ x: 0, y: 0 });
  const pendingSwapTarget = useRef<{ team: "home" | "away"; slotIndex: number } | null>(null);

  const effectiveX = isDragging ? dragPos.x : positionX;
  const effectiveY = isDragging ? dragPos.y : positionY;

  const slotRules: SlotRules = getSlotRules(movementPolicy, isGoalkeeper);

  const handleClick = useCallback(() => {
    onEdit(team, slotIndex);
  }, [onEdit, team, slotIndex]);

  const slotRef = { team, slotIndex };
  const showSwapOnClone = isSwapSourceClone(dragIntent, slotRef);
  const showSubOutOnClone = isSubOutClone(dragIntent, slotRef);

  const buildDragIntent = useCallback(
    (
      pointer: { x: number; y: number },
      target: DropTarget | null
    ): DragIntent => ({
      kind: "active",
      source: { type: "pitch", team, slotIndex },
      pointer,
      target,
    }),
    [team, slotIndex]
  );

  const computeSwapTarget = useCallback(
    (clientX: number, clientY: number): { team: "home" | "away"; slotIndex: number } | null => {
      const pitch = pitchRef.current;
      if (!pitch) return null;
      const rect = pitch.getBoundingClientRect();
      let closest: { team: "home" | "away"; slotIndex: number } | null = null;
      let minDistance = Infinity;
      const thresholdPx = cardSize * 0.7;

      for (const slot of allSlotPositions) {
        if (slot.team === team && slot.slotIndex === slotIndex) continue;
        if (!movementPolicy.allowedSwapTeams.includes(slot.team)) continue;

        const slotCenterX = rect.left + (slot.x / 100) * rect.width;
        const slotCenterY = rect.top + (slot.y / 100) * rect.height;
        const distance = Math.hypot(clientX - slotCenterX, clientY - slotCenterY);

        if (distance < thresholdPx && distance < minDistance) {
          minDistance = distance;
          closest = { team: slot.team, slotIndex: slot.slotIndex };
        }
      }
      return closest;
    },
    [pitchRef, cardSize, allSlotPositions, team, slotIndex, movementPolicy.allowedSwapTeams]
  );

  const { dragging, dragClientPos, dragClientOffset, handlePointerDown, handlePointerMove, handlePointerUp, handlePointerCancel } = usePlayerDrag({
    onStart: () => {
      setDragIntent(buildDragIntent({ x: effectiveX, y: effectiveY }, null));
    },
    onMove: (clientX, clientY) => {
      const pitch = pitchRef.current;
      if (!pitch) return;
      const rect = pitch.getBoundingClientRect();

      let pointerX = effectiveX;
      let pointerY = effectiveY;

      if (slotRules.canMoveOnPitch) {
        let newX = ((clientX - rect.left) / rect.width) * 100 - dragOffset.current.x;
        let newY = ((clientY - rect.top) / rect.height) * 100 - dragOffset.current.y;
        newX = clamp(newX, movementPolicy.dragXMin, movementPolicy.dragXMax);
        newY = clamp(newY, movementPolicy.dragYMin, movementPolicy.dragYMax);
        setDragPos({ x: newX, y: newY });
        pointerX = newX;
        pointerY = newY;
      }

      const benchTarget = findBenchDropTarget(clientX, clientY);
      const swapTarget = computeSwapTarget(clientX, clientY);
      pendingSwapTarget.current = swapTarget;

      let target: DropTarget | null = null;
      if (benchTarget) {
        target =
          benchTarget.type === "bench-card"
            ? { type: "bench-card", playerId: benchTarget.benchPlayerId }
            : { type: "bench-area" };
      } else if (swapTarget) {
        target = { type: "pitch", ...swapTarget };
      }

      setDragIntent(buildDragIntent({ x: pointerX, y: pointerY }, target));
    },
    onEnd: (clientX, clientY, moved) => {
      const swapTarget = pendingSwapTarget.current;
      pendingSwapTarget.current = null;

      if (!moved) {
        handleClick();
        setDragIntent({ kind: "idle" });
        return;
      }

      if (swapTarget) {
        swapPlayers(team, slotIndex, swapTarget.team, swapTarget.slotIndex);
        setDragIntent({ kind: "idle" });
        return;
      }

      const benchTarget = findBenchDropTarget(clientX, clientY);
      if (benchTarget) {
        if (benchTarget.type === "bench-card") {
          assignBenchToSlot(team, slotIndex, benchTarget.benchPlayerId);
        } else if (slotRules.canDropToBench) {
          moveSlotToBench(team, slotIndex);
        }
        setDragIntent({ kind: "idle" });
        return;
      }

      const pitch = pitchRef.current;
      if (pitch && slotRules.canMoveOnPitch) {
        const rect = pitch.getBoundingClientRect();
        const finalX = ((clientX - rect.left) / rect.width) * 100 - dragOffset.current.x;
        const finalY = ((clientY - rect.top) / rect.height) * 100 - dragOffset.current.y;

        if (
          finalX >= movementPolicy.dropXMin &&
          finalX <= movementPolicy.dropXMax &&
          finalY >= movementPolicy.dropYMin &&
          finalY <= movementPolicy.dropYMax
        ) {
          movePitchPlayer(team, slotIndex, finalX, finalY);
        }
      }
      setDragIntent({ kind: "idle" });
    },
  });

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      setDragPos({ x: effectiveX, y: effectiveY });
      const pitch = pitchRef.current;
      if (pitch) {
        const rect = pitch.getBoundingClientRect();
        const pointerX = ((e.clientX - rect.left) / rect.width) * 100;
        const pointerY = ((e.clientY - rect.top) / rect.height) * 100;
        dragOffset.current = { x: pointerX - effectiveX, y: pointerY - effectiveY };
      }
      handlePointerDown(e, (rect) => ({
        x: rect.width / 2,
        y: rect.height / 2,
      }));
    },
    [handlePointerDown, pitchRef, effectiveX, effectiveY]
  );

  if (!layoutSlot) return null;

  const card = (
    <div
      data-player-card="true"
      data-team={team}
      data-slot-index={slotIndex}
      className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center select-none ${
        isDragging
          ? "z-50 cursor-grabbing"
          : isGoalkeeper
            ? "z-[25]"
            : hasCustomPosition
              ? "z-30"
              : "z-20"
      } ${isDragging ? "cursor-grabbing" : `cursor-${slotRules.cursor}`}`}
      style={{
        left: `${effectiveX}%`,
        top: `${effectiveY}%`,
        width: cardSize,
        height: Math.round(cardSize * 1.48),
        opacity: dragging ? 0 : undefined,
        willChange: dragging ? "transform, left, top" : undefined,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      <div
        className={`relative transition-transform duration-150 ${
          dragging ? "scale-[1.06] z-40" : slotRules.hoverScale ? "hover:scale-[1.03]" : ""
        }`}
        style={
          dragging
            ? { filter: `drop-shadow(0 14px 22px rgba(0,0,0,0.7))` }
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

        {isSubTarget && <PlayerDropOverlay variant="sub-out" />}
        {isSwapTarget && <PlayerDropOverlay variant="swap" />}
      </div>
    </div>
  );

  const cloneOverlay = showSwapOnClone
    ? "swap"
    : showSubOutOnClone
      ? "sub-out"
      : null;

  if (!dragging) return card;

  return (
    <>
      {card}
      {createPortal(
        <div
          className="fixed z-[60] pointer-events-none"
          style={{
            left: dragClientPos.x - dragClientOffset.x,
            top: dragClientPos.y - dragClientOffset.y,
            width: cardSize,
            opacity: 0.9,
          }}
        >
          <PlayerDragPreview
            player={player}
            jersey={jersey}
            number={number}
            name={displayName}
            size={cardSize}
            photoScale={photoScalePercent}
            isCaptain={isCaptain}
            showName
            variant={team === "home" ? "light" : "dark"}
            overlay={cloneOverlay}
          />
        </div>,
        document.body
      )}
    </>
  );
});
