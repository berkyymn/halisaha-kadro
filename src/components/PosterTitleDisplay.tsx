"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { PosterTitle } from "./PosterTitle";
import { PosterTitleModal } from "./PosterTitleModal";

export function PosterTitleDisplay() {
  const [open, setOpen] = useState(false);
  const matchInfo = useAppStore((s) => s.matchInfo);

  return (
    <>
      <div
        className="absolute inset-x-0 z-30 flex justify-center pointer-events-none"
        style={{ top: "5%" }}
      >
        {matchInfo.titleHidden ? (
          // Başlık kapalı: düzenleyicide soluk görünen, JPEG'e girmeyen ekleme düğmesi.
          <button
            type="button"
            onClick={() => setOpen(true)}
            data-export-ignore="true"
            className="pointer-events-auto mt-[1%] inline-flex items-center gap-1 rounded-full border border-dashed border-white/30 bg-black/40 px-3 py-1 text-[11px] font-semibold text-white/80 opacity-60 transition-opacity hover:opacity-100 focus-visible:opacity-100"
            aria-label="Başlık ekle"
          >
            <Plus className="w-3 h-3" />
            Başlık ekle
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="poster-title-hit group relative pointer-events-auto cursor-pointer bg-transparent px-[0.6em] py-[0.25em] text-center outline-none"
            aria-label="Başlığı düzenle"
            title="Başlığı düzenle"
          >
            <PosterTitle info={matchInfo} />
            <span
              data-export-ignore="true"
              className="poster-title-hint pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold normal-case text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
              aria-hidden
            >
              <Pencil className="w-2.5 h-2.5" />
              Düzenle
            </span>
          </button>
        )}
      </div>

      <PosterTitleModal open={open} onClose={() => setOpen(false)} addingTitle={matchInfo.titleHidden} />
    </>
  );
}
