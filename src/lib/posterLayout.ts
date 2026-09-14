import type { Formation } from "@/types";
import type { PosterMetrics } from "@/types";
import type { TeamMode } from "@/lib/posterSnapshot";
import {
  MAX_PLAYER_CARD_SIZE,
  MIN_PLAYER_CARD_SIZE,
} from "@/types";
import { getPitchMetrics, maxPlayersInRow } from "@/lib/formationEngine";

export type { PosterMetrics };

export { maxPlayersInRow };

const CARD_ASPECT = 1.48;

// Auto-responsive card sizing. The vertical cap is the most important guard
// for single-team (portrait) mode where rows are stacked densely.
const CARD_HEIGHT_RATIO = 0.2;
const CARD_WIDTH_RATIO = 0.14;
const CARD_MAX_HEIGHT_RATIO = 0.18;

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

/**
 * Auto-responsive pitch card size. Derives the card size from the pitch
 * container rather than a user-controlled slider, so cards scale naturally
 * across 13"-27" screens. It is still capped by the safe max to avoid
 * overlapping dense formations and by a vertical height cap so stacked rows
 * in single-team mode do not overlap.
 *
 * `mode` allows versus mode to use a slightly larger default while keeping
 * single-team (portrait) cards compact.
 */
export function getAutoCardSize(
  metrics: PosterMetrics,
  maxPlayersInRowCount: number,
  mode?: TeamMode
): number {
  const isSingle = mode === "single";
  const heightRatio = isSingle ? CARD_HEIGHT_RATIO : 0.26;
  const widthRatio = isSingle ? CARD_WIDTH_RATIO : 0.18;
  const maxHeightRatio = isSingle ? CARD_MAX_HEIGHT_RATIO : 0.24;

  const pitch = getPitchMetrics(metrics);
  const safeHorizontal = computeSafeMaxCardSize(metrics, maxPlayersInRowCount);

  const targetFromHeight = Math.floor(
    (pitch.height * heightRatio) / CARD_ASPECT
  );
  const targetFromWidth = Math.floor(pitch.width * widthRatio);
  const verticalCap = Math.floor(
    (pitch.height * maxHeightRatio) / CARD_ASPECT
  );

  return Math.max(
    MIN_PLAYER_CARD_SIZE,
    Math.min(
      targetFromHeight,
      targetFromWidth,
      verticalCap,
      safeHorizontal,
      MAX_PLAYER_CARD_SIZE
    )
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
