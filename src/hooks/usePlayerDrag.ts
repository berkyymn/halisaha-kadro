"use client";

import { useCallback, useRef, useState } from "react";

const DRAG_THRESHOLD = 6;

interface UsePlayerDragOptions {
  onStart?: () => void;
  onMove: (clientX: number, clientY: number) => void;
  onEnd: (clientX: number, clientY: number, moved: boolean) => void;
}

export function usePlayerDrag({ onStart, onMove, onEnd }: UsePlayerDragOptions) {
  const [dragging, setDragging] = useState(false);
  const [dragClientPos, setDragClientPos] = useState({ x: 0, y: 0 });
  const [dragClientOffset, setDragClientOffset] = useState({ x: 0, y: 0 });

  const pointerDown = useRef(false);
  const moved = useRef(false);
  const pointerStart = useRef({ x: 0, y: 0 });

  const handlePointerDown = useCallback(
    (
      e: React.PointerEvent,
      getOffset?: (rect: DOMRect) => { x: number; y: number }
    ) => {
      if (e.button !== 0) return;
      pointerDown.current = true;
      moved.current = false;
      pointerStart.current = { x: e.clientX, y: e.clientY };
      e.preventDefault();

      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture(e.pointerId);

      const rect = target.getBoundingClientRect();
      const offset = getOffset
        ? getOffset(rect)
        : { x: e.clientX - rect.left, y: e.clientY - rect.top };
      setDragClientOffset(offset);
      setDragClientPos({ x: e.clientX, y: e.clientY });
    },
    []
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!pointerDown.current) return;

      const dx = e.clientX - pointerStart.current.x;
      const dy = e.clientY - pointerStart.current.y;

      if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
        if (!moved.current) {
          moved.current = true;
          setDragging(true);
          onStart?.();
        }
      }

      if (!moved.current) return;

      setDragClientPos({ x: e.clientX, y: e.clientY });
      onMove(e.clientX, e.clientY);
    },
    [onStart, onMove]
  );

  const finish = useCallback(
    (e: React.PointerEvent) => {
      if (!pointerDown.current) return;
      const didMove = moved.current;
      pointerDown.current = false;
      moved.current = false;
      setDragging(false);

      const target = e.currentTarget as HTMLElement;
      try {
        target.releasePointerCapture(e.pointerId);
      } catch {
        // Capture zaten bırakılmış olabilir.
      }

      onEnd(e.clientX, e.clientY, didMove);
    },
    [onEnd]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => finish(e),
    [finish]
  );
  const handlePointerCancel = useCallback(
    (e: React.PointerEvent) => finish(e),
    [finish]
  );

  return {
    dragging,
    dragClientPos,
    dragClientOffset,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
  };
}
