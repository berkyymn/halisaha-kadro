"use client";

import { useEffect, useMemo, useRef } from "react";
import { getFormationById } from "@/lib/formations";
import {
  computeFormationLayout,
  getFormationSlotCount,
  maxPlayersInRow,
} from "@/lib/formationEngine";
import { getEffectiveCardSize } from "@/lib/posterLayout";
import { usePosterMetrics } from "@/hooks/usePosterMetrics";
import { useAppStore } from "@/store/useAppStore";
import { PlayerOnPitch } from "./PlayerOnPitch";

/** Görsel saha arka planda; bu katman yalnızca oyuncu konumlandırması için */
export function PitchPlayerLayer({
  onEditPlayer,
}: {
  onEditPlayer: (team: "home" | "away", slotIndex: number) => void;
}) {
  const pitchRef = useRef<HTMLDivElement>(null);
  const homeFormationId = useAppStore((s) => s.homeFormationId);
  const awayFormationId = useAppStore((s) => s.awayFormationId);
  const homePlayerIds = useAppStore((s) => s.homeTeam.playerIds);
  const awayPlayerIds = useAppStore((s) => s.awayTeam.playerIds);
  const applyFormations = useAppStore((s) => s.applyFormations);
  const playerCardSize = useAppStore((s) => s.playerCardSize);
  const metrics = usePosterMetrics();
  const homeFormation = getFormationById(homeFormationId);
  const awayFormation = getFormationById(awayFormationId);

  const maxInRow = Math.max(
    maxPlayersInRow(homeFormation),
    maxPlayersInRow(awayFormation)
  );
  const effectiveCardSize = getEffectiveCardSize(
    metrics,
    maxInRow,
    playerCardSize
  );

  const homeLayout = useMemo(
    () =>
      homeFormation
        ? computeFormationLayout(
            homeFormation,
            "home",
            metrics,
            effectiveCardSize
          )
        : [],
    [homeFormation, metrics, effectiveCardSize]
  );

  const awayLayout = useMemo(
    () =>
      awayFormation
        ? computeFormationLayout(
            awayFormation,
            "away",
            metrics,
            effectiveCardSize
          )
        : [],
    [awayFormation, metrics, effectiveCardSize]
  );

  useEffect(() => {
    applyFormations();
  }, [applyFormations, homePlayerIds, awayPlayerIds]);

  const homeSlotCount = homeFormation
    ? getFormationSlotCount(homeFormation)
    : 0;
  const awaySlotCount = awayFormation
    ? getFormationSlotCount(awayFormation)
    : 0;

  return (
    <div ref={pitchRef} className="relative h-full w-full">
      {Array.from({ length: homeSlotCount }, (_, i) => (
        <PlayerOnPitch
          key={`home-${i}`}
          team="home"
          slotIndex={i}
          pitchRef={pitchRef}
          cardSize={effectiveCardSize}
          layoutSlot={homeLayout[i]}
          onEdit={onEditPlayer}
        />
      ))}
      {Array.from({ length: awaySlotCount }, (_, i) => (
        <PlayerOnPitch
          key={`away-${i}`}
          team="away"
          slotIndex={i}
          pitchRef={pitchRef}
          cardSize={effectiveCardSize}
          layoutSlot={awayLayout[i]}
          onEdit={onEditPlayer}
        />
      ))}
    </div>
  );
}
