// Tek, merkezi sürükleme niyeti modeli.
// Hem `PlayerOnPitch` hem `BenchPanel` bu modeli okur/yazar.

export type PitchSlotRef = {
  type: "pitch";
  team: "home" | "away";
  slotIndex: number;
};

export type BenchCardRef = {
  type: "bench-card";
  playerId: string;
};

export type BenchAreaRef = {
  type: "bench-area";
};

export type DragSource = PitchSlotRef | { type: "bench"; playerId: string };

export type DropTarget = PitchSlotRef | BenchCardRef | BenchAreaRef;

export type DragIntent =
  | { kind: "idle" }
  | {
      kind: "active";
      source: DragSource;
      pointer: { x: number; y: number };
      target: DropTarget | null;
    };

export function isSamePitchSlot(
  a: PitchSlotRef,
  b: { team: "home" | "away"; slotIndex: number }
): boolean {
  return a.team === b.team && a.slotIndex === b.slotIndex;
}

export function isPitchSource(
  source: DragSource
): source is PitchSlotRef {
  return source.type === "pitch";
}

export function isBenchSource(
  source: DragSource
): source is { type: "bench"; playerId: string } {
  return source.type === "bench";
}

export function isPitchDropTarget(
  target: DropTarget | null
): target is PitchSlotRef {
  return target?.type === "pitch";
}

export function isBenchCardDropTarget(
  target: DropTarget | null
): target is BenchCardRef {
  return target?.type === "bench-card";
}

export function isBenchAreaDropTarget(
  target: DropTarget | null
): target is BenchAreaRef {
  return target?.type === "bench-area";
}

/** Sürüklenen kart bir saha kartı mı? */
export function isDraggingPitchSlot(
  intent: DragIntent,
  slot: { team: "home" | "away"; slotIndex: number }
): boolean {
  return intent.kind === "active" && isPitchSource(intent.source) && isSamePitchSlot(intent.source, slot);
}

/** Bu slot swap hedefi mi? (saha→saha) */
export function isSwapTarget(
  intent: DragIntent,
  slot: { team: "home" | "away"; slotIndex: number }
): boolean {
  if (intent.kind !== "active") return false;
  if (!isPitchSource(intent.source)) return false;
  if (!isPitchDropTarget(intent.target)) return false;
  if (isSamePitchSlot(intent.source, slot)) return false;
  return isSamePitchSlot(intent.target, slot);
}

/** Bu slot bench→saha değişiminin hedefi mi? (giren yedek, çıkan slot) */
export function isSubTarget(
  intent: DragIntent,
  slot: { team: "home" | "away"; slotIndex: number }
): boolean {
  if (intent.kind !== "active") return false;
  if (isPitchSource(intent.source)) return false;
  if (!isPitchDropTarget(intent.target)) return false;
  return isSamePitchSlot(intent.target, slot);
}

/** Bu slot saha→yedek değişiminin kaynağı mı? */
export function isBenchDropSource(
  intent: DragIntent,
  slot: { team: "home" | "away"; slotIndex: number }
): boolean {
  if (intent.kind !== "active") return false;
  if (!isPitchSource(intent.source)) return false;
  if (intent.target == null) return false;
  if (isPitchDropTarget(intent.target)) return false;
  return isSamePitchSlot(intent.source, slot);
}

/** Sürüklenen saha kartı swap kaynağıysa klonunda swap overlay göster */
export function isSwapSourceClone(
  intent: DragIntent,
  slot: { team: "home" | "away"; slotIndex: number }
): boolean {
  return (
    intent.kind === "active" &&
    isPitchSource(intent.source) &&
    isPitchDropTarget(intent.target) &&
    isSamePitchSlot(intent.source, slot)
  );
}

/** Sürüklenen saha kartı yedeğe gidiyorsa klonunda sub-out overlay göster */
export function isSubOutClone(
  intent: DragIntent,
  slot: { team: "home" | "away"; slotIndex: number }
): boolean {
  return isBenchDropSource(intent, slot);
}

/** Yedek kart saha→yedek değişiminde hedef mi? */
export function isIncomingBenchSub(
  intent: DragIntent,
  playerId: string
): boolean {
  if (intent.kind !== "active") return false;
  if (!isPitchSource(intent.source)) return false;
  if (!isBenchCardDropTarget(intent.target)) return false;
  return intent.target.playerId === playerId;
}

/** Yedek havuzu sürüklenen yedek için hedef slot gösteriyor mu? (yedek klonunda sub-in) */
export function isBenchCloneSubIn(
  intent: DragIntent
): boolean {
  return (
    intent.kind === "active" &&
    !isPitchSource(intent.source) &&
    isPitchDropTarget(intent.target)
  );
}

/** Yedekler paneli boş alan hedef mi? */
export function isBenchAreaTarget(intent: DragIntent): boolean {
  return (
    intent.kind === "active" &&
    isPitchSource(intent.source) &&
    isBenchAreaDropTarget(intent.target)
  );
}
