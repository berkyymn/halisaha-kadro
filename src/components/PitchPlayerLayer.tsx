"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { getFormationById } from "@/lib/formations";
import {
  computeFormationLayout,
  computeSingleFormationLayout,
  getFormationSlotCount,
  maxPlayersInRow,
} from "@/lib/formationEngine";
import { getEffectiveCardSize } from "@/lib/posterLayout";
import { usePosterMetrics } from "@/hooks/usePosterMetrics";
import { useAppStore } from "@/store/useAppStore";
import { PlayerOnPitch, type SlotPosition } from "./PlayerOnPitch";
import { getPitchMovementPolicy } from "@/lib/pitchInteraction";

export function PitchPlayerLayer({
  onEditPlayer,
}: {
  onEditPlayer: (team: "home" | "away", slotIndex: number) => void;
}) {
  const pitchRef = useRef<HTMLDivElement>(null);
  const homeFormationId = useAppStore((s) => s.homeFormationId);
  const teamMode = useAppStore((s) => s.teamMode);
  const awayFormationId = useAppStore((s) => s.awayFormationId);
  const homePlayerIds = useAppStore((s) => s.homeTeam.playerIds);
  const awayPlayerIds = useAppStore((s) => s.awayTeam.playerIds);
  const homeCaptainId = useAppStore((s) => s.homeTeam.captainId);
  const awayCaptainId = useAppStore((s) => s.awayTeam.captainId);
  const homeJersey = useAppStore((s) => s.homeTeam.jersey);
  const awayJersey = useAppStore((s) => s.awayTeam.jersey);
  const players = useAppStore((s) => s.players);
  const pitchPlayers = useAppStore((s) => s.pitchPlayers);
  const singlePitchPlayers = useAppStore((s) => s.singlePitchPlayers);
  const playerCardSize = useAppStore((s) => s.playerCardSize);
  const photoScalePercent = useAppStore((s) => s.photoScalePercent);
  const activeDrag = useAppStore((s) => s.activeDrag);
  const activeSwapTarget = useAppStore((s) => s.activeSwapTarget);
  const activeSubTarget = useAppStore((s) => s.activeSubTarget);
  const applyFormations = useAppStore((s) => s.applyFormations);

  const movePitchPlayer = useAppStore((s) => s.movePitchPlayer);
  const setActiveDrag = useAppStore((s) => s.setActiveDrag);
  const setActiveSwapTarget = useAppStore((s) => s.setActiveSwapTarget);
  const setActiveBenchSwapTarget = useAppStore(
    (s) => s.setActiveBenchSwapTarget
  );
  const swapPlayers = useAppStore((s) => s.swapPlayers);
  const assignBenchToSlot = useAppStore((s) => s.assignBenchToSlot);
  const moveSlotToBench = useAppStore((s) => s.moveSlotToBench);

  const metrics = usePosterMetrics();
  const homeFormation = getFormationById(homeFormationId);
  const awayFormation = getFormationById(awayFormationId);

  const maxInRow = teamMode === "single"
    ? maxPlayersInRow(homeFormation)
    : Math.max(maxPlayersInRow(homeFormation), maxPlayersInRow(awayFormation));
  const effectiveCardSize = getEffectiveCardSize(
    metrics,
    maxInRow,
    playerCardSize
  );

  const homeLayout = useMemo(
    () =>
      homeFormation
        ? teamMode === "single"
          ? computeSingleFormationLayout(homeFormation, metrics, effectiveCardSize)
          : computeFormationLayout(homeFormation, "home", metrics, effectiveCardSize)
        : [],
    [homeFormation, metrics, effectiveCardSize, teamMode]
  );

  const awayLayout = useMemo(
    () =>
      awayFormation
        ? computeFormationLayout(awayFormation, "away", metrics, effectiveCardSize)
        : [],
    [awayFormation, metrics, effectiveCardSize]
  );

  const allSlotPositions = useMemo<SlotPosition[]>(() => {
    const positions: SlotPosition[] = [];

    homeLayout.forEach((slot, i) => {
       const activePositions = teamMode === "single" ? singlePitchPlayers : pitchPlayers;
       const pp = activePositions.find((p) => p.team === "home" && p.slotIndex === i);
       positions.push({
         team: "home",
         slotIndex: i,
         x: pp?.x ?? slot.x,
         y: pp?.y ?? slot.y,
       });
    });

     if (teamMode === "single") return positions;

     awayLayout.forEach((slot, i) => {
       const pp = pitchPlayers.find((p) => p.team === "away" && p.slotIndex === i);
      positions.push({
        team: "away",
        slotIndex: i,
        x: pp?.x ?? slot.x,
        y: pp?.y ?? slot.y,
      });
    });

    return positions;
  }, [homeLayout, awayLayout, pitchPlayers, singlePitchPlayers, teamMode]);

  useEffect(() => {
    applyFormations();
  }, [applyFormations, homePlayerIds, awayPlayerIds]);

  const homeSlotCount = homeFormation ? getFormationSlotCount(homeFormation) : 0;
  const awaySlotCount = awayFormation ? getFormationSlotCount(awayFormation) : 0;

  const renderCard = useCallback(
    (team: "home" | "away", i: number, layoutSlot: (typeof homeLayout)[number] | undefined) => {
      const playerIds = team === "home" ? homePlayerIds : awayPlayerIds;
      const slotPlayerId = playerIds[i] ?? "";
       const activePositions = teamMode === "single" ? singlePitchPlayers : pitchPlayers;
       const pp = activePositions.find((p) => p.team === team && p.slotIndex === i);
       const resolvedPlayerId = slotPlayerId;
      const player = resolvedPlayerId ? players[resolvedPlayerId] : undefined;
      const jersey = team === "home" ? homeJersey : awayJersey;
      const captainId = team === "home" ? homeCaptainId : awayCaptainId;
      const isCaptain = Boolean(resolvedPlayerId && captainId === resolvedPlayerId);
      const num = player?.number ?? i + 1;
      const dName = player?.name?.trim() || `Oyuncu ${i + 1}`;
      const isGk = layoutSlot?.isGoalkeeper ?? false;
      const hasCustom = !isGk && pp?.x != null && pp?.y != null;
       const rawX = pp?.x ?? layoutSlot?.x ?? 50;
       const posX = isGk
         ? teamMode === "single" ? rawX : (layoutSlot?.x ?? 50)
         : rawX;
       const posY = isGk
         ? teamMode === "single" ? (pp?.y ?? layoutSlot?.y ?? 50) : (layoutSlot?.y ?? 50)
         : (pp?.y ?? layoutSlot?.y ?? 50);

      const isDraggingThisCard = activeDrag?.team === team && activeDrag?.slotIndex === i;
      const isSubTarget =
        activeSubTarget?.team === team && activeSubTarget?.slotIndex === i;

      return (
        <PlayerOnPitch
          key={`${team}-${i}`}
          pitchRef={pitchRef}
          team={team}
          slotIndex={i}
          cardSize={effectiveCardSize}
          layoutSlot={layoutSlot}
          onEdit={onEditPlayer}
          player={player}
          jersey={jersey}
          isCaptain={isCaptain}
          number={num}
          displayName={dName}
          hasCustomPosition={hasCustom}
          positionX={posX}
          positionY={posY}
          isGoalkeeper={isGk}
          pitchPlayer={pp}
          isSwapTarget={
            !isDraggingThisCard &&
            activeSwapTarget?.team === team &&
            activeSwapTarget?.slotIndex === i
          }
          isSubTarget={isSubTarget}
          isDraggedWithTarget={isDraggingThisCard && activeSwapTarget !== null}
          allSlotPositions={allSlotPositions}
           movePitchPlayer={movePitchPlayer}
           setActiveDrag={setActiveDrag}
           setActiveSwapTarget={setActiveSwapTarget}
           setActiveBenchSwapTarget={setActiveBenchSwapTarget}
           swapPlayers={swapPlayers}
           assignBenchToSlot={assignBenchToSlot}
           moveSlotToBench={moveSlotToBench}
            photoScalePercent={photoScalePercent}
            movementPolicy={getPitchMovementPolicy(teamMode, team)}
        />
      );
    },
    [
      homePlayerIds,
      awayPlayerIds,
      players,
       pitchPlayers,
       singlePitchPlayers,
      homeJersey,
      awayJersey,
      homeCaptainId,
      awayCaptainId,
      effectiveCardSize,
      onEditPlayer,
      activeDrag,
      activeSwapTarget,
      activeSubTarget,
      allSlotPositions,
      movePitchPlayer,
      setActiveDrag,
      setActiveSwapTarget,
      setActiveBenchSwapTarget,
      swapPlayers,
      assignBenchToSlot,
      moveSlotToBench,
       photoScalePercent,
       teamMode,
    ]
  );

  return (
    <div ref={pitchRef} className="relative h-full w-full">
      {Array.from({ length: homeSlotCount }, (_, i) => (
        renderCard("home", i, homeLayout[i])
      ))}
      {teamMode === "versus" &&
        Array.from({ length: awaySlotCount }, (_, i) => (
          renderCard("away", i, awayLayout[i])
        ))}
    </div>
  );
}
