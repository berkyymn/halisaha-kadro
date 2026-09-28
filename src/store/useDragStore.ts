"use client";

import { create } from "zustand";
import type { DragIntent, DragSource, DropTarget } from "@/lib/dragIntent";

/**
 * Sürükleme sırasındaki geçici durum. Bilerek ana store'dan ayrı ve persist
 * edilmiyor: ana store'daki her set() tüm posteri (fotoğraflar dahil)
 * IndexedDB/localStorage'a yazıyor, pointermove başına bu çok pahalı.
 */
type DragStore = {
  dragIntent: DragIntent;
  setDragIntent: (intent: DragIntent) => void;
};

function sameRef(a: DragSource | DropTarget | null, b: DragSource | DropTarget | null): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Pointer koordinatı hiçbir tüketici tarafından okunmuyor; yalnızca kaynak/hedef değişince render et. */
function isSameIntent(a: DragIntent, b: DragIntent): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "idle" || b.kind === "idle") return true;
  return sameRef(a.source, b.source) && sameRef(a.target, b.target);
}

export const useDragStore = create<DragStore>()((set, get) => ({
  dragIntent: { kind: "idle" },
  setDragIntent: (intent) => {
    if (isSameIntent(get().dragIntent, intent)) return;
    set({ dragIntent: intent });
  },
}));

export function resetDragIntent() {
  useDragStore.getState().setDragIntent({ kind: "idle" });
}
