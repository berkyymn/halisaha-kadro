"use client";

import { ImagePlus } from "lucide-react";
import { LOGO_IMAGE_PRESETS, type LogoImagePreset } from "@/lib/logoImagePresets";
import type { TeamLogo } from "@/types";
import { Toggle } from "./Toggle";

const LABEL = "text-[10px] font-bold uppercase tracking-wider text-zinc-500";

const CARD =
  "relative h-24 rounded-xl border p-2 flex items-center justify-center transition-all";
const cardState = (selected: boolean) =>
  selected
    ? "border-green-500 ring-2 ring-green-500/30 bg-zinc-800"
    : "border-zinc-700 bg-zinc-900 hover:border-zinc-500";

export function LogoDesignerPresetPanel({
  logo,
  uploadedLogo,
  applyPresetJersey,
  onApplyPresetJerseyChange,
  onSelectPreset,
  onSelectUploaded,
  onFilePickerOpen,
  onFilePickerClose,
  onUpload,
  uploadError,
}: {
  logo: TeamLogo;
  /** Bu oturumda yüklenen (ya da kayıtlı) görsel; başka seçime geçince de geri seçilebilir */
  uploadedLogo: TeamLogo | null;
  applyPresetJersey: boolean;
  onApplyPresetJerseyChange: (value: boolean) => void;
  onSelectPreset: (preset: LogoImagePreset) => void;
  onSelectUploaded: () => void;
  onFilePickerOpen: () => void;
  onFilePickerClose: () => void;
  onUpload: (file: File) => void | Promise<void>;
  uploadError: string | null;
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className={`${LABEL} mb-2`}>Hazır logolar</p>
        <div className="grid grid-cols-3 gap-2">
          {LOGO_IMAGE_PRESETS.map((preset) => {
            const selected = logo.mode === "preset" && logo.presetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                aria-label={preset.label}
                aria-pressed={selected}
                title={preset.label}
                onClick={() => onSelectPreset(preset)}
                className={`${CARD} ${cardState(selected)}`}
              >
                <img
                  src={preset.imageSrc}
                  alt=""
                  draggable={false}
                  className="h-full w-full object-contain pointer-events-none"
                />
              </button>
            );
          })}
        </div>
        <div className="mt-3">
          <Toggle
            label="Hazır logonun forma renklerini de uygula"
            checked={applyPresetJersey}
            onChange={onApplyPresetJerseyChange}
          />
        </div>
      </div>

      <div>
        <p className={`${LABEL} mb-2`}>Kendi logon</p>
        <div className="grid grid-cols-3 gap-2">
          {uploadedLogo?.imageUrl && (
            <button
              type="button"
              aria-pressed={logo.mode === "upload"}
              onClick={onSelectUploaded}
              title="Yüklediğin logo"
              className={`${CARD} ${cardState(logo.mode === "upload")}`}
            >
              <img
                src={uploadedLogo.imageUrl}
                alt="Yüklediğin logo"
                draggable={false}
                className="h-full w-full object-contain pointer-events-none"
              />
            </button>
          )}
          <label
            className={`${CARD} cursor-pointer flex-col gap-1 border-dashed border-zinc-600 bg-zinc-900/40 text-zinc-400 hover:border-green-500/60 hover:text-white`}
            onMouseDown={onFilePickerOpen}
          >
            <ImagePlus className="w-5 h-5" />
            <span className="text-[11px] font-semibold">
              {uploadedLogo?.imageUrl ? "Başka görsel yükle" : "Görsel yükle"}
            </span>
            <span className="text-[9px] text-zinc-500">PNG · JPG · WebP</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                onFilePickerClose();
                if (file) void onUpload(file);
                e.target.value = "";
              }}
            />
          </label>
        </div>
        {uploadError ? (
          <p className="mt-2 text-[11px] text-red-400" role="alert">
            {uploadError}
          </p>
        ) : (
          <p className="mt-2 text-[10px] text-zinc-500 leading-relaxed">
            Arka planı şeffaf PNG logolar posterde en iyi görünür.
          </p>
        )}
      </div>
    </div>
  );
}
