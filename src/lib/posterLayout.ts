import type { Formation } from "@/types";
import type { PosterMetrics } from "@/types";
import {
  MAX_PLAYER_CARD_SIZE,
  MIN_PLAYER_CARD_SIZE,
} from "@/types";
import { cardPixelSize, getPitchMetrics, maxPlayersInRow } from "@/lib/formationEngine";

export type { PosterMetrics };

export { maxPlayersInRow };

/** Satırda üst üste binmeden sığabilecek üst kart boyutu */
export function computeSafeMaxCardSize(
  metrics: PosterMetrics,
  maxPlayersInRowCount: number
): number {
  if (maxPlayersInRowCount <= 1) return MAX_PLAYER_CARD_SIZE;

  const pitch = getPitchMetrics(metrics);
  const gaps = maxPlayersInRowCount - 1;
  const maxSpanPercent = 78;
  const maxHalfH = (maxSpanPercent / gaps - 2.5) / 2;
  if (maxHalfH <= 0) return MIN_PLAYER_CARD_SIZE;

  const maxCardHeight = (maxHalfH / 50) * pitch.height;
  const fromHeight = Math.floor(maxCardHeight / 1.48);
  const fromWidth = Math.floor((pitch.width * 0.44) / 2.4);

  return Math.max(
    MIN_PLAYER_CARD_SIZE,
    Math.min(fromHeight, fromWidth, MAX_PLAYER_CARD_SIZE)
  );
}

export function getEffectiveCardSize(
  metrics: PosterMetrics,
  maxPlayersInRowCount: number,
  userSize: number
): number {
  const safeMax = computeSafeMaxCardSize(metrics, maxPlayersInRowCount);
  return Math.max(
    MIN_PLAYER_CARD_SIZE,
    Math.min(userSize, safeMax, MAX_PLAYER_CARD_SIZE)
  );
}

export function getTitleFontSize(metrics: PosterMetrics): string {
  const cqw = metrics.width * 0.075;
  const size = Math.max(28, Math.min(72, cqw));
  return `${size}px`;
}

export function maxColumnForFormation(formation?: Formation): number {
  return maxPlayersInRow(formation);
}
