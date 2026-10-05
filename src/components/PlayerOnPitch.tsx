"use client";

import { memo, useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getPosterScale } from "@/lib/posterScale";
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
import { findHiddenAwaySlot, isCustomizedPlayer } from "@/lib/playerPool";
import { useAppStore } from "@/store/useAppStore";
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
  movementPolicy,
}: PlayerOnPitchProps) {
  const [dragPos, setDragPos] = useState({ x: positionX, y: positionY });
  const dragOffset = useRef({ x: 0, y: 0 });
  const pendingSwapTarget = useRef<{ team: "home" | "away"; slotIndex: number } | null>(null);

  const effectiveX = isDragging ? dragPos.x : positionX;
  const effectiveY = isDragging ? dragPos.y : positionY;

  const slotRules: SlotRules = getSlotRules(movementPolicy, isGoalkeeper);
  const canSendToBench = slotRules.canDropToBench && isCustomizedPlayer(player);

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
      // Mobilde yedek çekmecesi sahanın üstüne açılır: işaretçi çekmecedeyse
      // alttaki saha kartıyla takas önerme (masaüstünde ikisi hiç çakışmaz).
      const swapTarget = benchTarget ? null : computeSwapTarget(clientX, clientY);
      pendingSwapTarget.current = swapTarget;

      let target: DropTarget | null = null;
      if (benchTarget?.type === "bench-area" && !canSendToBench) {
        // Yer tutucu yedeğe gönderilemez; "ÇIKAN" işareti gösterme.
      } else if (benchTarget) {
        target =
          benchTarget.type === "bench-card"
            ? { type: "bench-card", playerId: benchTarget.benchPlayerId }
            : { type: "bench-area" };
      } else if (swapTarget) {
        target = { type: "pitch", ...swapTarget };
      }

      setDragIntent(buildDragIntent({ x: pointerX, y: pointerY }, target));
    },
    onCancel: () => {
      pendingSwapTarget.current = null;
      setDragIntent({ kind: "idle" });
    },
    onEnd: (clientX, clientY, moved) => {
      const swapTarget = pendingSwapTarget.current;
      pendingSwapTarget.current = null;

      if (!moved) {
        handleClick();
        setDragIntent({ kind: "idle" });
        return;
      }

      const benchTarget = findBenchDropTarget(clientX, clientY);
      if (swapTarget && !benchTarget) {
        swapPlayers(team, slotIndex, swapTarget.team, swapTarget.slotIndex);
        setDragIntent({ kind: "idle" });
        return;
      }

      if (benchTarget) {
        if (benchTarget.type === "bench-card") {
          const hiddenAwaySlot = findHiddenAwaySlot(
            useAppStore.getState(),
            benchTarget.benchPlayerId
          );
          if (hiddenAwaySlot >= 0) {
            swapPlayers(team, slotIndex, "away", hiddenAwaySlot);
          } else {
            assignBenchToSlot(team, slotIndex, benchTarget.benchPlayerId);
          }
        } else if (canSendToBench) {
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
      // Kart merkezi pointer'ı takip etsin; bırakılan yer tam olarak
      // pointer'ın olduğu nokta olur. Eski relative offset kaldırıldı.
      dragOffset.current = { x: 0, y: 0 };
      handlePointerDown(e, (rect) => ({
        x: rect.width / 2,
        y: rect.height / 2,
      }));
    },
    [handlePointerDown, effectiveX, effectiveY]
  );

  if (!layoutSlot) return null;

  const card = (
    <div
      data-player-card="true"
      data-team={team}
      data-slot-index={slotIndex}
      role="button"
      tabIndex={0}
      aria-label={`${number ? `${number} ` : ""}${displayName} oyuncu kartı`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center select-none outline-none focus-visible:ring-2 focus-visible:ring-green-400 focus-visible:rounded-xl ${
        isDragging ? "cursor-grabbing" : `cursor-${slotRules.cursor}`
      }`}
      style={{
        // Aşağıdaki kart üstte: üst sıradaki kartın gölgesi alttaki fotoğrafa değil
        // zemine düşer. Sürüklenen kart her şeyin üstünde.
        zIndex: isDragging ? 60 : 20 + Math.round(effectiveY / 4),
        left: `${effectiveX}%`,
        top: `${effectiveY}%`,
        width: cardSize,
        height: Math.round(cardSize * 1.48),
        opacity: dragging ? 0 : undefined,
        willChange: dragging ? "transform, left, top" : undefined,
        // Dokunmatikte parmakla sürükleme sayfa kaydırma/yakınlaştırma sanılmasın.
        touchAction: "none",
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
            // Poster ekrana ölçekli sığdırılıyor; kopya da sahadaki kart boyutunda görünsün.
            transform: `scale(${getPosterScale()})`,
            transformOrigin: "0 0",
          }}
        >
          <PlayerDragPreview
            player={player}
            jersey={jersey}
            number={number}
            name={displayName}
            size={cardSize}
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
