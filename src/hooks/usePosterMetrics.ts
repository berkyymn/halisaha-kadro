"use client";

import { useAppStore } from "@/store/useAppStore";
import { POSTER_LOGICAL_SIZE } from "@/lib/posterScale";
import type { PosterMetrics } from "@/types";

/** Posterin sabit iç boyutu (ekran boyutundan bağımsız; bkz. lib/posterScale). */
export function usePosterMetrics(): PosterMetrics {
  const teamMode = useAppStore((s) => s.teamMode);
  return POSTER_LOGICAL_SIZE[teamMode];
}
