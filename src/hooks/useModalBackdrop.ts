"use client";

import { useCallback, useEffect, useRef } from "react";

type ModalBackdropOptions = {
  open: boolean;
  onClose: () => void;
  /** Block backdrop dismiss (e.g. file picker open, long-running task). */
  busy?: boolean;
};

export function useModalBackdrop({
  open,
  onClose,
  busy = false,
}: ModalBackdropOptions) {
  const backdropPress = useRef(false);
  const pickingFileRef = useRef(false);

  useEffect(() => {
    if (!open) {
      pickingFileRef.current = false;
      return;
    }
    const clearPickingFile = () => {
      window.setTimeout(() => {
        pickingFileRef.current = false;
      }, 400);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) {
        onClose();
      }
    };
    window.addEventListener("focus", clearPickingFile);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("focus", clearPickingFile);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, busy, onClose]);

  const openFilePicker = useCallback((input: HTMLInputElement | null) => {
    pickingFileRef.current = true;
    backdropPress.current = false;
    input?.click();
  }, []);

  const clearPickingFile = useCallback(() => {
    pickingFileRef.current = false;
  }, []);

  const markFilePickerOpening = useCallback(() => {
    pickingFileRef.current = true;
    backdropPress.current = false;
  }, []);

  const backdropProps = {
    onPointerDown: (e: React.PointerEvent) => {
      backdropPress.current = e.target === e.currentTarget;
    },
    onPointerUp: (e: React.PointerEvent) => {
      if (busy || pickingFileRef.current) {
        backdropPress.current = false;
        return;
      }
      if (backdropPress.current && e.target === e.currentTarget) {
        onClose();
      }
      backdropPress.current = false;
    },
    onPointerCancel: () => {
      backdropPress.current = false;
    },
  };

  const panelProps = {
    onClick: (e: React.MouseEvent) => e.stopPropagation(),
    onPointerDown: (e: React.PointerEvent) => e.stopPropagation(),
    onPointerUp: (e: React.PointerEvent) => e.stopPropagation(),
  };

  return {
    backdropProps,
    panelProps,
    openFilePicker,
    clearPickingFile,
    markFilePickerOpening,
  };
}
