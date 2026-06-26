"use client";

import { ImagePlus } from "lucide-react";
import {
  LOGO_IMAGE_PRESETS,
  type LogoImagePreset,
} from "@/lib/logoImagePresets";
import type { TeamLogo } from "@/types";

function LogoPresetStrip({
  logo,
  onSelectPreset,
}: {
  logo: TeamLogo;
  onSelectPreset: (preset: LogoImagePreset) => void;
}) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
      {LOGO_IMAGE_PRESETS.map((preset) => {
        const selected = logo.mode === "preset" && logo.presetId === preset.id;
        return (
          <button
            key={preset.id}
            type="button"
            aria-label={preset.label}
            title={preset.label}
            onClick={() => onSelectPreset(preset)}
            className={`h-14 rounded-lg overflow-hidden border p-1.5 transition-all hover:scale-[1.03] ${
              selected
                ? "border-green-500 ring-2 ring-green-500/40 bg-zinc-800"
                : "border-zinc-700 hover:border-zinc-500 bg-zinc-900"
            }`}
          >
            <img
              src={preset.imageSrc}
              alt=""
              draggable={false}
              className="w-full h-full object-contain pointer-events-none"
            />
          </button>
        );
      })}
    </div>
  );
}

export function LogoDesignerPresetPanel({
  logo,
  onSelectPreset,
  onFilePickerOpen,
  onFilePickerClose,
  onUpload,
}: {
  logo: TeamLogo;
  onSelectPreset: (preset: LogoImagePreset) => void;
  onFilePickerOpen?: () => void;
  onFilePickerClose?: () => void;
  onUpload: (file: File) => void | Promise<void>;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          Hazır logo seç
        </p>
        <label
          className="inline-flex items-center gap-1 text-[10px] text-zinc-400 hover:text-white cursor-pointer shrink-0"
          onMouseDown={() => onFilePickerOpen?.()}
        >
          <ImagePlus className="w-3 h-3" />
          Görsel yükle
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              onFilePickerClose?.();
              if (f) void onUpload(f);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      <LogoPresetStrip logo={logo} onSelectPreset={onSelectPreset} />
      {logo.mode === "upload" && (
        <p className="text-[10px] text-zinc-500">Özel görsel aktif</p>
      )}
      <p className="text-[10px] text-zinc-600 leading-relaxed">
        Hazır logo seçince forma renkleri öneri olarak gelir; Forma sekmesinden
        değiştirebilirsin.
      </p>
    </div>
  );
}
