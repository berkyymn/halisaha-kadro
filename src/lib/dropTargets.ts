export type PitchSlotTarget = { team: "home" | "away"; slotIndex: number };

export type BenchDropTarget =
  | { type: "bench-card"; benchPlayerId: string }
  | { type: "bench-area" };

function pointInRect(
  x: number,
  y: number,
  rect: DOMRect
): boolean {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

function rectCenterDistance(
  x: number,
  y: number,
  rect: DOMRect
): number {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  return Math.hypot(x - cx, y - cy);
}

/**
 * Find the pitch slot card located under the given pointer position.
 * Uses geometry (getBoundingClientRect) instead of DOM hit-testing APIs
 * like elementsFromPoint, so it is not affected by z-order surprises or
 * pointer-events values of overlay/portaled elements.
 *
 * If the pointer is inside more than one card, the one whose centre is
 * closest to the pointer wins.
 */
export function findPitchSlotTarget(
  clientX: number,
  clientY: number,
  options?: { exclude?: { team: "home" | "away"; slotIndex: number } }
): PitchSlotTarget | null {
  const cards = Array.from(
    document.querySelectorAll<HTMLElement>('[data-player-card="true"]')
  );

  let best: (PitchSlotTarget & { distance: number }) | null = null;

  for (const card of cards) {
    const team = card.dataset.team as "home" | "away" | undefined;
    const slotIndexRaw = card.dataset.slotIndex;
    if (!team || slotIndexRaw === undefined) continue;

    const slotIndex = Number(slotIndexRaw);
    if (Number.isNaN(slotIndex)) continue;

    if (
      options?.exclude &&
      options.exclude.team === team &&
      options.exclude.slotIndex === slotIndex
    ) {
      continue;
    }

    const rect = card.getBoundingClientRect();
    if (!pointInRect(clientX, clientY, rect)) continue;

    const distance = rectCenterDistance(clientX, clientY, rect);
    if (!best || distance < best.distance) {
      best = { team, slotIndex, distance };
    }
  }

  return best ? { team: best.team, slotIndex: best.slotIndex } : null;
}

/**
 * Find the bench drop target under the given pointer position.
 * Prefers individual bench cards; if none is hit, falls back to the bench
 * panel area.
 */
export function findBenchDropTarget(
  clientX: number,
  clientY: number,
  options?: { excludeBenchPlayerId?: string }
): BenchDropTarget | null {
  const benchCards = Array.from(
    document.querySelectorAll<HTMLElement>("[data-bench-player-id]")
  );

  let best: { benchPlayerId: string; distance: number } | null = null;

  for (const card of benchCards) {
    const benchPlayerId = card.dataset.benchPlayerId;
    if (!benchPlayerId) continue;
    if (benchPlayerId === options?.excludeBenchPlayerId) continue;

    const rect = card.getBoundingClientRect();
    if (!pointInRect(clientX, clientY, rect)) continue;

    const distance = rectCenterDistance(clientX, clientY, rect);
    if (!best || distance < best.distance) {
      best = { benchPlayerId, distance };
    }
  }

  if (best) {
    return { type: "bench-card", benchPlayerId: best.benchPlayerId };
  }

  const benchArea = document.querySelector<HTMLElement>("[data-bench-drop=\"true\"]");
  if (benchArea && pointInRect(clientX, clientY, benchArea.getBoundingClientRect())) {
    return { type: "bench-area" };
  }

  return null;
}
