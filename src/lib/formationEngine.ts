import type { Formation, FormationRowRole, PosterMetrics } from "@/types";
import { GK_X, mirrorSlotX, OUTFIELD_X_MAX, OUTFIELD_X_MIN } from "@/lib/formations";

export interface ResolvedFormationSlot {
  x: number;
  y: number;
  label: string;
  rowIndex: number;
  indexInRow: number;
  isGoalkeeper: boolean;
}

const CARD_ASPECT = 1.48;
const ROW_GAP = 2.5;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function getPitchMetrics(poster: PosterMetrics): PosterMetrics {
  return {
    width: poster.width * 0.86,
    height: poster.height * 0.63,
  };
}

export function cardPixelSize(cardSizePx: number) {
  return { width: cardSizePx, height: Math.round(cardSizePx * CARD_ASPECT) };
}

function cardHalfExtents(
  cardSizePx: number,
  pitch: PosterMetrics
): { halfW: number; halfH: number } {
  const { width, height } = cardPixelSize(cardSizePx);
  return {
    halfW: (width / pitch.width) * 50,
    halfH: (height / pitch.height) * 50,
  };
}

/** Saha hatlarını kart genişliğine göre derinliğe yay */
function resolveRowDepths(
  formation: Formation,
  halfW: number
): Map<number, number> {
  const rowXs = new Map<number, number>();
  const minSep = halfW * 2 + ROW_GAP;

  const outfield = formation.rows
    .map((row, rowIndex) => ({ row, rowIndex }))
    .filter(({ row }) => row.role !== "GK");

  formation.rows.forEach((row, rowIndex) => {
    if (row.role === "GK") rowXs.set(rowIndex, GK_X);
  });

  const n = outfield.length;
  if (n === 0) return rowXs;

  const startX = Math.max(OUTFIELD_X_MIN, GK_X + minSep);
  const endX = OUTFIELD_X_MAX;

  outfield.forEach(({ rowIndex }, idx) => {
    let x =
      n === 1 ? endX : startX + (idx / (n - 1)) * (endX - startX);

    if (idx > 0) {
      const prevIndex = outfield[idx - 1].rowIndex;
      x = Math.max(x, (rowXs.get(prevIndex) ?? startX) + minSep);
    }

    rowXs.set(rowIndex, Math.min(x, OUTFIELD_X_MAX));
  });

  return rowXs;
}

function rowYLimits(role: FormationRowRole): {
  min: number;
  max: number;
} {
  switch (role) {
    case "ATT":
      return { min: 18, max: 82 };
    case "DEF":
      return { min: 15, max: 85 };
    default:
      return { min: 14, max: 86 };
  }
}

function layoutRowY(
  count: number,
  halfH: number,
  role: FormationRowRole
): number[] {
  if (count <= 1) return [50];

  const { min, max } = rowYLimits(role);
  const minGap = halfH * 2 + 2.5;
  const span = (count - 1) * minGap;
  const start = 50 - span / 2;

  return Array.from({ length: count }, (_, i) =>
    clamp(start + (i / (count - 1)) * span, min, max)
  );
}

interface LayoutSlot {
  x: number;
  y: number;
  rowIndex: number;
  role: FormationRowRole;
  locked: boolean;
}

/** Farklı hatlardaki çapraz bindirmeleri ayır (1-2-3 orta saha + forvet) */
function separateCrossRowOverlaps(
  slots: LayoutSlot[],
  halfW: number,
  halfH: number
) {
  const pad = 1.2;

  for (let pass = 0; pass < 10; pass++) {
    let moved = false;

    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        const a = slots[i];
        const b = slots[j];
        if (a.rowIndex === b.rowIndex) continue;

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const overlapX = halfW * 2 + pad - Math.abs(dx);
        const overlapY = halfH * 2 + pad - Math.abs(dy);
        if (overlapX <= 0 || overlapY <= 0) continue;

        const pushY =
          ((overlapY + 0.4) / 2) *
          (dy === 0 ? (j % 2 ? 1 : -1) : Math.sign(dy));

        if (!a.locked) {
          a.y -= pushY * 0.65;
          moved = true;
        }
        if (!b.locked) {
          b.y += pushY * 0.65;
          moved = true;
        }
      }
    }

    for (const slot of slots) {
      if (slot.locked) continue;
      const { min, max } = rowYLimits(slot.role);
      slot.y = clamp(slot.y, min, max);
    }

    if (!moved) break;
  }
}

export function computeFormationLayout(
  formation: Formation,
  side: "home" | "away",
  posterMetrics: PosterMetrics,
  cardSizePx: number
): ResolvedFormationSlot[] {
  const pitch = getPitchMetrics(posterMetrics);
  const { halfW, halfH } = cardHalfExtents(cardSizePx, pitch);

  const rowXs = resolveRowDepths(formation, halfW);
  const rowYs = new Map<number, number[]>();
  formation.rows.forEach((row, rowIndex) => {
    rowYs.set(rowIndex, layoutRowY(row.count, halfH, row.role));
  });

  const mutable: LayoutSlot[] = [];
  const rowIndexInRow = new Map<number, number>();
  const resolvedMeta: Omit<ResolvedFormationSlot, "x" | "y">[] = [];

  formation.slots.forEach((slot) => {
    const indexInRow = rowIndexInRow.get(slot.rowIndex) ?? 0;
    rowIndexInRow.set(slot.rowIndex, indexInRow + 1);

    const row = formation.rows[slot.rowIndex];
    const homeX = slot.isGoalkeeper
      ? GK_X
      : (rowXs.get(slot.rowIndex) ?? slot.x);
    const ys = rowYs.get(slot.rowIndex) ?? [50];
    const y = slot.isGoalkeeper ? 50 : (ys[indexInRow] ?? 50);

    mutable.push({
      x: homeX,
      y,
      rowIndex: slot.rowIndex,
      role: row?.role ?? "MID",
      locked: slot.isGoalkeeper,
    });

    resolvedMeta.push({
      label: slot.label,
      rowIndex: slot.rowIndex,
      indexInRow,
      isGoalkeeper: slot.isGoalkeeper,
    });
  });

  separateCrossRowOverlaps(mutable, halfW, halfH);

  return mutable.map((pos, i) => ({
    ...resolvedMeta[i],
    x: side === "away" ? mirrorSlotX(pos.x) : pos.x,
    y: pos.y,
  }));
}

const SINGLE_GK_Y = 86;
const SINGLE_OUTFIELD_Y_MIN = 18;
const SINGLE_OUTFIELD_Y_MAX = 72;
const SINGLE_X_MIN = 8;
const SINGLE_X_MAX = 92;

export function getSinglePitchMetrics(poster: PosterMetrics): PosterMetrics {
  return {
    width: poster.width * 0.9,
    height: poster.height * 0.61,
  };
}

function resolveSingleRowDepths(
  formation: Formation,
  halfH: number
): Map<number, number> {
  const rowYs = new Map<number, number>();
  const minSep = halfH * 2 + ROW_GAP;

  const outfield = formation.rows
    .map((row, rowIndex) => ({ row, rowIndex }))
    .filter(({ row }) => row.role !== "GK");

  formation.rows.forEach((row, rowIndex) => {
    if (row.role === "GK") rowYs.set(rowIndex, SINGLE_GK_Y);
  });

  const n = outfield.length;
  if (n === 0) return rowYs;

  const startY = Math.min(SINGLE_OUTFIELD_Y_MAX, SINGLE_GK_Y - minSep);
  const endY = SINGLE_OUTFIELD_Y_MIN;
  const step = n === 1 ? 0 : Math.max(minSep, (startY - endY) / (n - 1));

  outfield.forEach(({ rowIndex }, idx) => {
    let y = startY - idx * step;
    if (idx > 0) {
      const prevIndex = outfield[idx - 1].rowIndex;
      y = Math.min(y, (rowYs.get(prevIndex) ?? startY) - minSep);
    }
    rowYs.set(rowIndex, Math.max(y, endY));
  });

  return rowYs;
}

function layoutSingleRowX(count: number, halfW: number): number[] {
  if (count <= 1) return [50];

  const minGap = halfW * 2 + ROW_GAP;
  const span = (count - 1) * minGap;
  const start = 50 - span / 2;

  return Array.from({ length: count }, (_, i) =>
    clamp(start + (i / (count - 1)) * span, SINGLE_X_MIN, SINGLE_X_MAX)
  );
}

/** Tek takım posterinde formasyonu dikey saha eksenine göre yerleştirir.
 *  Kaleci altta ortada; defans, orta saha ve forvet yukarı doğru sıralanır. */
export function computeSingleFormationLayout(
  formation: Formation,
  posterMetrics: PosterMetrics,
  cardSizePx: number
): ResolvedFormationSlot[] {
  const pitch = getSinglePitchMetrics(posterMetrics);
  const { halfW, halfH } = cardHalfExtents(cardSizePx, pitch);

  const rowYs = resolveSingleRowDepths(formation, halfH);
  const rowXs = new Map<number, number[]>();
  formation.rows.forEach((row, rowIndex) => {
    rowXs.set(rowIndex, layoutSingleRowX(row.count, halfW));
  });

  const mutable: LayoutSlot[] = [];
  const rowIndexInRow = new Map<number, number>();
  const resolvedMeta: Omit<ResolvedFormationSlot, "x" | "y">[] = [];

  formation.slots.forEach((slot) => {
    const indexInRow = rowIndexInRow.get(slot.rowIndex) ?? 0;
    rowIndexInRow.set(slot.rowIndex, indexInRow + 1);

    const row = formation.rows[slot.rowIndex];
    const x = slot.isGoalkeeper
      ? 50
      : (rowXs.get(slot.rowIndex)?.[indexInRow] ?? 50);
    const y = slot.isGoalkeeper
      ? SINGLE_GK_Y
      : (rowYs.get(slot.rowIndex) ?? 50);

    mutable.push({
      x,
      y,
      rowIndex: slot.rowIndex,
      role: row?.role ?? "MID",
      locked: slot.isGoalkeeper,
    });

    resolvedMeta.push({
      label: slot.label,
      rowIndex: slot.rowIndex,
      indexInRow,
      isGoalkeeper: slot.isGoalkeeper,
    });
  });

  separateCrossRowOverlaps(mutable, halfW, halfH);

  return mutable.map((pos, i) => ({
    ...resolvedMeta[i],
    x: pos.x,
    y: pos.y,
  }));
}

export function getFormationSlotCount(formation: Formation): number {
  return formation.slots.length;
}

export function maxPlayersInRow(formation?: Formation): number {
  if (!formation?.rows?.length) return 2;
  return Math.max(...formation.rows.map((row) => row.count));
}
