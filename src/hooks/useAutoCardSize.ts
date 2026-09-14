"use client";

import { useAppStore } from "@/store/useAppStore";
import { usePosterMetrics } from "@/hooks/usePosterMetrics";
import { getFormationById } from "@/lib/formations";
import { maxPlayersInRow } from "@/lib/formationEngine";
import { getAutoCardSize } from "@/lib/posterLayout";

/**
 * Shared auto-responsive card size hook used by both pitch cards and bench
 * cards so they stay in sync as the window/poster container resizes.
 */
export function useAutoCardSize() {
  const metrics = usePosterMetrics();
  const teamMode = useAppStore((s) => s.teamMode);
  const homeFormationId = useAppStore((s) => s.homeFormationId);
  const awayFormationId = useAppStore((s) => s.awayFormationId);

  const homeFormation = getFormationById(homeFormationId);
  const awayFormation = getFormationById(awayFormationId);

  const maxInRow =
    teamMode === "single"
      ? maxPlayersInRow(homeFormation)
      : Math.max(
          maxPlayersInRow(homeFormation),
          maxPlayersInRow(awayFormation)
        );

  return getAutoCardSize(metrics, maxInRow, teamMode);
}
