"use client";

import { useState } from "react";
import { Palette, RotateCcw, Shirt, X } from "lucide-react";
import type { JerseyConfig, TeamLogo } from "@/types";
import { useModalBackdrop } from "@/hooks/useModalBackdrop";
import { LogoDesignerCustomPanel } from "./LogoDesignerCustomPanel";
import { LogoDesignerPresetPanel } from "./LogoDesignerPresetPanel";
import { TeamBrandingPreview } from "./TeamBrandingPreview";
import { JerseyControls } from "./JerseyControls";
import { MAX_LOGO_DISPLAY_SIZE, MIN_LOGO_DISPLAY_SIZE } from "@/types";
import { useAppStore } from "@/store/useAppStore";
import {
  applyLogoImagePreset,
  DEFAULT_AWAY_PRESET_ID,
  DEFAULT_HOME_PRESET_ID,
  LOGO_IMAGE_PRESETS,
  type LogoImagePreset,
} from "@/lib/logoImagePresets";
import { fileToDataUrl } from "@/lib/fileToDataUrl";
import { defaultAwayLogo, defaultHomeLogo } from "@/lib/defaults";
import { randomizeTeamLogo } from "@/lib/logoRandomize";

type DesignerPanel = "logo" | "custom" | "jersey";

export function LogoDesignerModal({
  open,
  onClose,
  logo,
  jersey,
  shortName,
  teamLabel,
  teamSide,
  onLogoChange,
  onJerseyChange,
  onTeamNameChange,
}: {
  open: boolean;
  onClose: () => void;
  logo: TeamLogo;
  jersey: JerseyConfig;
  shortName: string;
  teamLabel: string;
  teamSide: "home" | "away";
  onLogoChange: (logo: TeamLogo) => void;
  onJerseyChange: (jersey: JerseyConfig) => void;
  onTeamNameChange: (shortName: string) => void;
}) {
  const [panel, setPanel] = useState<DesignerPanel>(
    logo.mode === "generated" ? "custom" : "logo"
  );
  const [uploadError, setUploadError] = useState<string | null>(null);
  const teamLogoDisplaySize = useAppStore((s) => s.teamLogoDisplaySize);
  const setTeamLogoDisplaySize = useAppStore((s) => s.setTeamLogoDisplaySize);

  const { backdropProps, panelProps, markFilePickerOpening, clearPickingFile } =
    useModalBackdrop({
      open,
      onClose,
    });

  const handlePresetSelect = (preset: LogoImagePreset) => {
    onLogoChange(applyLogoImagePreset(preset, logo, shortName));
    onJerseyChange({ ...preset.jersey });
    setPanel("logo");
  };

  const handleUpload = async (file: File) => {
    setUploadError(null);
    try {
      const imageUrl = await fileToDataUrl(file);
      onLogoChange({ ...logo, mode: "upload", presetId: undefined, imageUrl });
      setPanel("logo");
    } catch {
      setUploadError("Logo yüklenemedi. Daha küçük bir görsel deneyin.");
    }
  };

  const handleReset = () => {
    const base = teamSide === "home" ? defaultHomeLogo : defaultAwayLogo;
    const presetId =
      teamSide === "home" ? DEFAULT_HOME_PRESET_ID : DEFAULT_AWAY_PRESET_ID;
    const preset = LOGO_IMAGE_PRESETS.find((p) => p.id === presetId);
    onLogoChange({
      ...base,
      initials: shortName.slice(0, 2).toUpperCase() || base.initials,
      teamName: shortName,
    });
    if (preset) onJerseyChange({ ...preset.jersey });
    setPanel("logo");
  };

  const startCustomDesign = () => {
    setPanel("custom");
    if (logo.mode !== "generated") {
      onLogoChange({
        ...logo,
        mode: "generated",
        presetId: undefined,
        imageUrl: undefined,
      });
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
      {...backdropProps}
    >
      <div
        className="relative z-10 w-full max-w-lg max-h-[94vh] overflow-hidden rounded-xl bg-zinc-900 border border-zinc-700 shadow-2xl flex flex-col"
        {...panelProps}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
          <div>
            <h2 className="text-sm font-bold text-white">Takım Görünümü</h2>
            <p className="text-[10px] text-zinc-500">{teamLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="shrink-0 px-4 pt-3 pb-2 border-b border-zinc-800/80 bg-zinc-900/95">
          <TeamBrandingPreview
            logo={logo}
            jersey={jersey}
            shortName={shortName}
          />

          <div className="mt-3 flex gap-2 items-center">
            <input
              value={shortName}
              onChange={(e) => onTeamNameChange(e.target.value.toUpperCase())}
              placeholder={teamSide === "home" ? "TAKIM A" : "TAKIM B"}
              className="flex-1 min-w-0 h-9 bg-zinc-800 border border-zinc-600 rounded-lg px-2.5 text-sm text-white font-bold uppercase tracking-wide focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500/30"
            />
            <button
              type="button"
              onClick={handleReset}
              title="Logoyu sıfırla"
              className="shrink-0 p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-2.5">
            <div className="flex items-center justify-between mb-1 px-0.5">
              <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                Logo boyutu (poster)
              </span>
              <span className="text-[9px] font-bold text-green-400 tabular-nums">
                {teamLogoDisplaySize}px
              </span>
            </div>
            <input
              type="range"
              min={MIN_LOGO_DISPLAY_SIZE}
              max={MAX_LOGO_DISPLAY_SIZE}
              step={1}
              value={teamLogoDisplaySize}
              onChange={(e) => setTeamLogoDisplaySize(Number(e.target.value))}
              className="w-full accent-green-600 h-1"
            />
          </div>
        </div>

        <div className="shrink-0 px-4 py-2 border-b border-zinc-800 bg-zinc-900">
          <div className="flex gap-1 p-1 rounded-lg bg-zinc-950 border border-zinc-800">
            <button
              type="button"
              onClick={() => setPanel("logo")}
              className={`flex-1 h-8 rounded-md text-[11px] font-semibold transition-colors ${
                panel === "logo"
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Hazır logo
            </button>
            <button
              type="button"
              onClick={startCustomDesign}
              className={`flex-1 h-8 rounded-md text-[11px] font-semibold transition-colors flex items-center justify-center gap-1 ${
                panel === "custom"
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Palette className="w-3.5 h-3.5 shrink-0" />
              Kendin tasarla
            </button>
            <button
              type="button"
              onClick={() => setPanel("jersey")}
              className={`flex-1 h-8 rounded-md text-[11px] font-semibold transition-colors flex items-center justify-center gap-1 ${
                panel === "jersey"
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Shirt className="w-3.5 h-3.5 shrink-0" />
              Forma
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
          {uploadError && (
            <p className="mb-2 text-[11px] text-red-400">{uploadError}</p>
          )}
          {panel === "logo" && (
            <LogoDesignerPresetPanel
              logo={logo}
              onSelectPreset={handlePresetSelect}
              onFilePickerOpen={markFilePickerOpening}
              onFilePickerClose={clearPickingFile}
              onUpload={handleUpload}
            />
          )}
          {panel === "custom" && (
            <LogoDesignerCustomPanel
              logo={logo}
              shortName={shortName}
              onLogoChange={onLogoChange}
              onRandomize={() =>
                onLogoChange(randomizeTeamLogo(logo, shortName))
              }
            />
          )}
          {panel === "jersey" && (
            <section className="rounded-lg border border-zinc-700 bg-zinc-800/30 p-3">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-white mb-2">
                Forma rengi ve deseni
              </h3>
              <p className="text-[10px] text-zinc-500 mb-3 leading-relaxed">
                Forma ayarları logodan bağımsızdır. Üstteki önizleme anında
                güncellenir.
              </p>
              <JerseyControls jersey={jersey} onChange={onJerseyChange} />
            </section>
          )}
        </div>

        <div className="px-4 py-3 border-t border-zinc-800 shrink-0 flex justify-end bg-zinc-900">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-green-600 text-xs font-semibold text-white hover:bg-green-500"
          >
            Tamam
          </button>
        </div>
      </div>
    </div>
  );
}
