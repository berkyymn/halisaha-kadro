"use client";

import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useModalBackdrop } from "@/hooks/useModalBackdrop";

type ModalShellProps = {
  open: boolean;
  onClose: () => void;
  busy?: boolean;
  zIndexClass?: string;
  panelClassName?: string;
  children: ReactNode;
};

export function ModalShell({
  open,
  onClose,
  busy = false,
  zIndexClass = "z-[100]",
  panelClassName = "bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-md max-h-[92vh] shadow-2xl overflow-hidden flex flex-col",
  children,
}: ModalShellProps) {
  const { backdropProps, panelProps } = useModalBackdrop({
    open,
    onClose,
    busy,
  });

  if (!open) return null;

  // Sayfanın en üstüne çizilir: poster gibi ölçeklenen bir katmanın içinden
  // açılsa da pencere küçülmez ve ekrana sabit kalır.
  return createPortal(
    <div
      className={`fixed inset-0 ${zIndexClass} flex items-center justify-center bg-black/80 p-4`}
      {...backdropProps}
    >
      <div className={panelClassName} {...panelProps}>
        {children}
      </div>
    </div>,
    document.body
  );
}
