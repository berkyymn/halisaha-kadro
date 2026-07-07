"use client";

import { useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
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
  const activeSwapTarget = useAppStore((s) => s.activeSwapTarget);
  const setActiveDrag = useAppStore((s) => s.setActiveDrag);
  const setActiveSwapTarget = useAppStore((s) => s.setActiveSwapTarget);
  const swapPlayers = useAppStore((s) => s.swapPlayers);
  const photoScalePercent = useAppStore((s) => s.photoScalePercent);

  const [dragging, setDragging] = useState(false);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const dragOffset = useRef({ x: 0, y: 0 });
  const pointerStart = useRef({ x: 0, y: 0 });
  const startPosition = useRef({ x: 0, y: 0, hasCustom: false });
  const moved = useRef(false);
  const pendingSwapTarget = useRef<{ team: "home" | "away"; slotIndex: number } | null>(
    null
  );

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

  const handleClick = () => onEdit(team, slotIndex);

  const isSwapTarget = activeSwapTarget?.team === team && activeSwapTarget?.slotIndex === slotIndex;
  
  // Bu kart şu an sürükleniyor VE geçerli bir değişim hedefi var
  const isDraggedWithTarget = dragging && activeSwapTarget !== null;

  const shouldShowSwapIndicator = isSwapTarget || isDraggedWithTarget;

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
      style={{ left: `${dragging ? dragPos.x : x}%`, top: `${dragging ? dragPos.y : y}%` }}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        moved.current = false;
        pointerStart.current = { x: e.clientX, y: e.clientY };
        startPosition.current = { x, y, hasCustom: hasCustomPosition };
        setDragPos({ x, y });
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        setDragging(true);
        const pitch = pitchRef.current;
        if (!pitch) return;
        const rect = pitch.getBoundingClientRect();
        const pointerX = ((e.clientX - rect.left) / rect.width) * 100;
        const pointerY = ((e.clientY - rect.top) / rect.height) * 100;
        dragOffset.current = { x: pointerX - x, y: pointerY - y };
        setActiveDrag({ team, slotIndex, x, y });
      }}
      onPointerMove={(e) => {
        if (!dragging) return;
        const dx = e.clientX - pointerStart.current.x;
        const dy = e.clientY - pointerStart.current.y;
        if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
          moved.current = true;
        }
        if (moved.current) {
          const pitch = pitchRef.current;
          if (pitch) {
            const rect = pitch.getBoundingClientRect();
            let newX = ((e.clientX - rect.left) / rect.width) * 100 - dragOffset.current.x;
            let newY = ((e.clientY - rect.top) / rect.height) * 100 - dragOffset.current.y;
            
            newX = clamp(newX, 4, 96);
            newY = clamp(newY, 6, 94);

            setDragPos({ x: newX, y: newY });
            setActiveDrag({ team, slotIndex, x: newX, y: newY });

            // Yakındaki değişilebilir oyuncuları bul (DOM tabanlı mesafe kontrolü)
            const cards = pitch.querySelectorAll("[data-player-card]");
            let closestTarget: { team: "home" | "away"; slotIndex: number } | null = null;
            let minDistance = Infinity;

            cards.forEach((cardEl) => {
              const targetTeam = cardEl.getAttribute("data-team") as "home" | "away";
              const targetSlotIndex = parseInt(cardEl.getAttribute("data-slot-index") ?? "", 10);

              // Kendisiyle eşleşmesin
              if (targetTeam === team && targetSlotIndex === slotIndex) return;

              const cardRect = cardEl.getBoundingClientRect();
              const centerX = cardRect.left + cardRect.width / 2;
              const centerY = cardRect.top + cardRect.height / 2;

              const distance = Math.hypot(e.clientX - centerX, e.clientY - centerY);
              
              // Kart genişliğinin %70'ine kadar yakınlaşınca takas moduna girer
              const threshold = cardRect.width * 0.70;
              if (distance < threshold && distance < minDistance) {
                minDistance = distance;
                closestTarget = { team: targetTeam, slotIndex: targetSlotIndex };
              }
            });

            pendingSwapTarget.current = closestTarget;
            setActiveSwapTarget(closestTarget);
          }
        }
      }}
      onPointerUp={(e) => {
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
        } else {
          // Boşluğa bırakıldı: Yarı saha kontrolü veya Kaleci snap-back kontrolü
          const pitch = pitchRef.current;
          if (pitch) {
            const rect = pitch.getBoundingClientRect();
            const finalX = ((e.clientX - rect.left) / rect.width) * 100 - dragOffset.current.x;
            const finalY = ((e.clientY - rect.top) / rect.height) * 100 - dragOffset.current.y;

            const isOpponentHalf =
              (team === "home" && finalX >= 48) || (team === "away" && finalX <= 52);

            if (isGoalkeeper || isOpponentHalf) {
              // Geri sekme (Snapback) - hiçbir şey yapmamız gerekmiyor çünkü store hiç değişmedi!
              // Sadece görsel olarak eski haline dönecek.
            } else {
              // Kalıcı kaydet
              movePitchPlayer(team, slotIndex, clamp(finalX, 4, 96), clamp(finalY, 6, 94));
            }
          }
        }
      }}
      onPointerCancel={(e) => {
        pendingSwapTarget.current = null;
        setDragging(false);
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        setActiveDrag(null);
        setActiveSwapTarget(null);
      }}
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

        {/* Pulsating Swap Indicator Overlay */}
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
}
