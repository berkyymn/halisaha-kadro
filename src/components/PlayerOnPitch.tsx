"use client";

import { memo, useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ResolvedFormationSlot } from "@/lib/formationEngine";
import type { JerseyConfig, PitchPlayer, Player } from "@/types";
import type { PitchMovementPolicy } from "@/lib/pitchInteraction";
import { useAppStore } from "@/store/useAppStore";
import { PlayerAvatar } from "./PlayerAvatar";
import { PlayerDropOverlay } from "./PlayerDropOverlay";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

const DRAG_THRESHOLD = 6;

type BenchDropTarget =
  | { type: "bench-card"; benchPlayerId: string }
  | { type: "bench-area" };

function findBenchDropTarget(
  clientX: number,
  clientY: number
): BenchDropTarget | null {
  const elements = document.elementsFromPoint(clientX, clientY);
  for (const el of elements) {
    const htmlEl = el as HTMLElement;
    // Sürüklenen saha kartının kendisi veya başka bir saha kartı değil, yedek alan arıyoruz.
    if (htmlEl.closest?.('[data-player-card="true"]')) continue;
    const benchCard = htmlEl.closest?.("[data-bench-player-id]") as HTMLElement | null;
    if (benchCard?.dataset.benchPlayerId) {
      return { type: "bench-card", benchPlayerId: benchCard.dataset.benchPlayerId };
    }
    if (htmlEl.closest?.("[data-bench-drop=\"true\"]")) {
      return { type: "bench-area" };
    }
  }
  return null;
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
  isSwapTarget: boolean;
  isSubTarget: boolean;
  isDraggedWithTarget: boolean;
  allSlotPositions: SlotPosition[];
  movePitchPlayer: (team: "home" | "away", slotIndex: number, x: number, y: number) => void;
  setActiveDrag: (drag: { team: "home" | "away"; slotIndex: number; x: number; y: number } | null) => void;
  setActiveSwapTarget: (target: { team: "home" | "away"; slotIndex: number } | null) => void;
  swapPlayers: (team1: "home" | "away", slotIndex1: number, team2: "home" | "away", slotIndex2: number) => void;
  assignBenchToSlot: (team: "home" | "away", slotIndex: number, benchPlayerId: string) => void;
  moveSlotToBench: (team: "home" | "away", slotIndex: number) => void;
  setActiveBenchSwapTarget: (playerId: string | null) => void;
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
  isSubTarget,
  isDraggedWithTarget,
  allSlotPositions,
  movePitchPlayer,
  setActiveDrag,
  setActiveSwapTarget,
  swapPlayers,
  assignBenchToSlot,
  moveSlotToBench,
  setActiveBenchSwapTarget,
  photoScalePercent,
  movementPolicy,
}: PlayerOnPitchProps) {
  const [dragging, setDragging] = useState(false);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [dragClientPos, setDragClientPos] = useState({ x: 0, y: 0 });
  const [dragClientOffset, setDragClientOffset] = useState({ x: 0, y: 0 });
  const activeBenchDropSource = useAppStore((s) => s.activeBenchDropSource);
  const setActiveBenchDropSource = useAppStore((s) => s.setActiveBenchDropSource);
  const dragOffset = useRef({ x: 0, y: 0 });
  const pointerStart = useRef({ x: 0, y: 0 });
  const startPosition = useRef({ x: 0, y: 0, hasCustom: false });
  const pointerDown = useRef(false);
  const moved = useRef(false);
  const pendingSwapTarget = useRef<{ team: "home" | "away"; slotIndex: number } | null>(null);

  const effectiveX = dragging ? dragPos.x : positionX;
  const effectiveY = dragging ? dragPos.y : positionY;

  const handleClick = useCallback(() => {
    onEdit(team, slotIndex);
  }, [onEdit, team, slotIndex]);

  const showSwapOnClone = isDraggedWithTarget;
  const isBenchDropSource =
    activeBenchDropSource?.team === team &&
    activeBenchDropSource?.slotIndex === slotIndex;
  const showSubOutOnClone = isBenchDropSource;

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    pointerDown.current = true;
    pointerStart.current = { x: e.clientX, y: e.clientY };
    e.preventDefault();
    moved.current = false;
    startPosition.current = { x: effectiveX, y: effectiveY, hasCustom: hasCustomPosition };
    setDragPos({ x: effectiveX, y: effectiveY });
    const cardRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    // Sürüklenen klon imlecin tam ortasında görünsün, hedef tespiti daha kolay olsun.
    setDragClientOffset({
      x: cardRect.width / 2,
      y: cardRect.height / 2,
    });
    setDragClientPos({ x: e.clientX, y: e.clientY });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    // Sürüklemeyi hemen başlatmıyoruz; eşik aşılınca başlıyor.
    // Böylece sadece tıklama (edit) yapıldığında kart titremiyor.
    const pitch = pitchRef.current;
    if (!pitch) return;
    const rect = pitch.getBoundingClientRect();
    const pointerX = ((e.clientX - rect.left) / rect.width) * 100;
    const pointerY = ((e.clientY - rect.top) / rect.height) * 100;
    dragOffset.current = { x: pointerX - effectiveX, y: pointerY - effectiveY };
  }, [pitchRef, effectiveX, effectiveY, hasCustomPosition]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!pointerDown.current) return;
    const dx = e.clientX - pointerStart.current.x;
    const dy = e.clientY - pointerStart.current.y;
    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
      moved.current = true;
    }
    if (!moved.current) return;

    const pitch = pitchRef.current;
    if (!pitch) return;
    const rect = pitch.getBoundingClientRect();

    if (!dragging) {
      // Eşik aşıldı, sürüklemeyi resmen başlat.
      setDragging(true);
      setActiveDrag({ team, slotIndex, x: effectiveX, y: effectiveY });
    }

    if (!isGoalkeeper) {
      let newX = ((e.clientX - rect.left) / rect.width) * 100 - dragOffset.current.x;
      let newY = ((e.clientY - rect.top) / rect.height) * 100 - dragOffset.current.y;

      newX = clamp(newX, movementPolicy.dragXMin, movementPolicy.dragXMax);
      newY = clamp(newY, movementPolicy.dragYMin, movementPolicy.dragYMax);

      setDragPos({ x: newX, y: newY });
      setActiveDrag({ team, slotIndex, x: newX, y: newY });
    }

    setDragClientPos({ x: e.clientX, y: e.clientY });

    const benchTarget = findBenchDropTarget(e.clientX, e.clientY);
    setActiveBenchSwapTarget(
      benchTarget?.type === "bench-card" ? benchTarget.benchPlayerId : null
    );
    setActiveBenchDropSource(benchTarget ? { team, slotIndex } : null);

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
    effectiveX,
    effectiveY,
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
    setActiveBenchSwapTarget,
    setActiveBenchDropSource,
  ]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const swapTarget = pendingSwapTarget.current;
    pendingSwapTarget.current = null;

    const endDrag = () => {
      pointerDown.current = false;
      moved.current = false;
      setDragging(false);
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      setActiveDrag(null);
      setActiveSwapTarget(null);
      setActiveBenchSwapTarget(null);
      setActiveBenchDropSource(null);
    };

    if (!dragging) {
      // Sürükleme başlamadıysa bu bir tıklamadır.
      pointerDown.current = false;
      moved.current = false;
      handleClick();
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      return;
    }

    if (!moved.current) {
      handleClick();
      endDrag();
      return;
    }

    if (swapTarget) {
      swapPlayers(team, slotIndex, swapTarget.team, swapTarget.slotIndex);
      endDrag();
      return;
    }

    const benchTarget = findBenchDropTarget(e.clientX, e.clientY);
    if (benchTarget) {
      if (benchTarget.type === "bench-card") {
        assignBenchToSlot(team, slotIndex, benchTarget.benchPlayerId);
      } else if (!isGoalkeeper) {
        moveSlotToBench(team, slotIndex);
      }
      endDrag();
      return;
    }

    const pitch = pitchRef.current;
    if (pitch && !isGoalkeeper) {
      const rect = pitch.getBoundingClientRect();
      const finalX = ((e.clientX - rect.left) / rect.width) * 100 - dragOffset.current.x;
      const finalY = ((e.clientY - rect.top) / rect.height) * 100 - dragOffset.current.y;

      if (
        finalX < movementPolicy.dropXMin ||
        finalX > movementPolicy.dropXMax ||
        finalY < movementPolicy.dropYMin ||
        finalY > movementPolicy.dropYMax
      ) {
        endDrag();
        return;
      }

      movePitchPlayer(team, slotIndex, finalX, finalY);
    }
    endDrag();
  }, [pitchRef, team, slotIndex, dragging, isGoalkeeper, movementPolicy, swapPlayers, assignBenchToSlot, moveSlotToBench, setActiveBenchSwapTarget, setActiveBenchDropSource, movePitchPlayer, setActiveDrag, setActiveSwapTarget, handleClick]);

  const handlePointerCancel = useCallback((e: React.PointerEvent) => {
    pointerDown.current = false;
    moved.current = false;
    if (!dragging) return;
    pendingSwapTarget.current = null;
    setDragging(false);
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    setActiveDrag(null);
    setActiveSwapTarget(null);
    setActiveBenchSwapTarget(null);
    setActiveBenchDropSource(null);
  }, [dragging, setActiveDrag, setActiveSwapTarget, setActiveBenchSwapTarget, setActiveBenchDropSource]);

  if (!layoutSlot) return null;

  const card = (
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
        width: cardSize,
        height: Math.round(cardSize * 1.48),
        opacity: dragging ? 0 : undefined,
        willChange: dragging ? "transform, left, top" : undefined,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
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

        {isSubTarget && <PlayerDropOverlay variant="sub-out" />}
        {isSwapTarget && <PlayerDropOverlay variant="swap" />}
      </div>
    </div>
  );

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
          <div className="relative">
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
            {showSwapOnClone && <PlayerDropOverlay variant="swap" />}
            {showSubOutOnClone && <PlayerDropOverlay variant="sub-out" />}
          </div>
        </div>,
        document.body
      )}
    </>
  );
});
