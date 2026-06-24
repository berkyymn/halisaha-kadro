"use client";

import { useState } from "react";
import { ImagePlus, Palette, RotateCcw, Shuffle } from "lucide-react";
import { fileToDataUrl } from "@/lib/fileToDataUrl";
import { applyLogoPreset, LOGO_PRESETS } from "@/lib/logoPresets";
import {
  applyLogoImagePreset,
  DEFAULT_AWAY_PRESET_ID,
  DEFAULT_HOME_PRESET_ID,
  LOGO_IMAGE_PRESETS,
  type LogoImagePreset,
} from "@/lib/logoImagePresets";
import { randomizeTeamLogo } from "@/lib/logoRandomize";
import { defaultAwayLogo, defaultHomeLogo } from "@/lib/defaults";
import type {
  JerseyConfig,
  LogoBackgroundStyle,
  LogoBorderStyle,
  LogoIcon,
  LogoShape,
  TeamLogo,
} from "@/types";
import { MAX_LOGO_DISPLAY_SIZE, MIN_LOGO_DISPLAY_SIZE } from "@/types";
import { useAppStore } from "@/store/useAppStore";
import { LOGO_ICON_OPTIONS } from "./logo/LogoIcon";
import { JerseyControls } from "./JerseyControls";
import { TeamLogoBadge } from "./TeamLogoBadge";

type DesignerTab = "brand" | "custom";

const SHAPES: { id: LogoShape; label: string }[] = [
  { id: "shield", label: "Kalkan" },
  { id: "roundedShield", label: "Yuvarlak Kalkan" },
  { id: "crest", label: "Arma" },
  { id: "circle", label: "Daire" },
  { id: "hexagon", label: "Altıgen" },
  { id: "pentagon", label: "Beşgen" },
  { id: "diamond", label: "Elmas" },
  { id: "esports", label: "Esports" },
];

const BORDERS: { id: LogoBorderStyle; label: string }[] = [
  { id: "chrome", label: "Krom" },
  { id: "gold", label: "Altın" },
  { id: "double", label: "Çift" },
  { id: "triple", label: "Üçlü" },
  { id: "neon", label: "Neon" },
  { id: "single", label: "Tek" },
];

const BACKGROUNDS: { id: LogoBackgroundStyle; label: string }[] = [
  { id: "verticalStripes", label: "Dikey çizgi" },
  { id: "horizontalStripes", label: "Yatay çizgi" },
  { id: "split", label: "Bölünmüş" },
  { id: "gradient", label: "Gradient" },
  { id: "radial", label: "Radial" },
  { id: "solid", label: "Düz" },
];

function OptionGrid<T extends string>({
  options,
  value,
  onChange,
  columns = 4,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  columns?: number;
}) {
  return (
    <div
      className="grid gap-1.5"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {options.map((opt) => {
        const selected = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`px-1.5 py-2 rounded-md text-[10px] font-semibold leading-tight transition-all ${
              selected
                ? "bg-white text-zinc-900 ring-2 ring-green-500 shadow-lg shadow-green-900/20"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 text-xs text-zinc-300">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 rounded-full transition-colors ${
          checked ? "bg-green-600" : "bg-zinc-700"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
            checked ? "left-4" : "left-0.5"
          }`}
        />
      </button>
    </label>
  );
}

function LogoPresetStrip({
  logo,
  onSelectPreset,
}: {
  logo: TeamLogo;
  onSelectPreset: (preset: LogoImagePreset) => void;
}) {
  return (
    <div className="grid grid-cols-6 gap-1.5">
      {LOGO_IMAGE_PRESETS.map((preset) => {
        const selected = logo.mode === "preset" && logo.presetId === preset.id;
        return (
          <button
            key={preset.id}
            type="button"
            aria-label={preset.label}
            title={preset.label}
            onClick={() => onSelectPreset(preset)}
            className={`h-11 rounded-md overflow-hidden border p-1 transition-all hover:scale-[1.04] ${
              selected
                ? "border-green-500 ring-1 ring-green-500/50 bg-zinc-800"
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

export function LogoDesigner({
  logo,
  jersey,
  shortName,
  teamSide,
  onLogoChange,
  onJerseyChange,
  onTeamNameChange,
  onFilePickerOpen,
  onFilePickerClose,
}: {
  logo: TeamLogo;
  jersey: JerseyConfig;
  shortName: string;
  teamSide: "home" | "away";
  onLogoChange: (logo: TeamLogo) => void;
  onJerseyChange: (jersey: JerseyConfig) => void;
  onTeamNameChange: (shortName: string) => void;
  onFilePickerOpen?: () => void;
  onFilePickerClose?: () => void;
}) {
  const [tab, setTab] = useState<DesignerTab>(
    logo.mode === "generated" ? "custom" : "brand"
  );

  const teamLogoDisplaySize = useAppStore((s) => s.teamLogoDisplaySize);
  const setTeamLogoDisplaySize = useAppStore((s) => s.setTeamLogoDisplaySize);
  const previewLogoSize = Math.min(teamLogoDisplaySize, 72);

  const updateLogo = (patch: Partial<TeamLogo>) =>
    onLogoChange({
      ...logo,
      mode: "generated",
      presetId: undefined,
      imageUrl: undefined,
      ...patch,
    });

  const handlePresetSelect = (preset: LogoImagePreset) => {
    onLogoChange(applyLogoImagePreset(preset, logo, shortName));
    onJerseyChange({ ...preset.jersey });
    setTab("brand");
  };

  const handleUpload = async (file: File) => {
    const imageUrl = await fileToDataUrl(file);
    onLogoChange({ ...logo, mode: "upload", presetId: undefined, imageUrl });
    setTab("brand");
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
    setTab("brand");
  };

  const startCustomDesign = () => {
    setTab("custom");
    if (logo.mode !== "generated") {
      onLogoChange({
        ...logo,
        mode: "generated",
        presetId: undefined,
        imageUrl: undefined,
      });
    }
  };

  return (
    <div className="flex flex-col gap-3 min-h-0">
      <div className="flex gap-1 p-1 rounded-lg bg-zinc-900 border border-zinc-800 shrink-0">
        <button
          type="button"
          onClick={() => setTab("brand")}
          className={`flex-1 h-8 rounded-md text-[11px] font-semibold transition-colors ${
            tab === "brand"
              ? "bg-zinc-700 text-white"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Logo & Forma
        </button>
        <button
          type="button"
          onClick={startCustomDesign}
          className={`flex-1 h-8 rounded-md text-[11px] font-semibold transition-colors flex items-center justify-center gap-1.5 ${
            tab === "custom"
              ? "bg-zinc-700 text-white"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          Kendin tasarla
        </button>
      </div>

      {tab === "brand" ? (
        <div className="space-y-3">
          <div className="flex gap-3 items-center rounded-lg border border-zinc-700 bg-zinc-950/60 p-2.5">
            <div className="shrink-0 flex items-center justify-center w-[76px] h-[76px] rounded-lg bg-zinc-900/80 border border-zinc-800">
              <TeamLogoBadge
                logo={logo}
                shortName={shortName}
                size={previewLogoSize}
              />
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <input
                value={shortName}
                onChange={(e) => onTeamNameChange(e.target.value.toUpperCase())}
                placeholder={teamSide === "home" ? "TAKIM A" : "TAKIM B"}
                className="w-full h-9 bg-zinc-800 border border-zinc-600 rounded-lg px-2.5 text-sm text-white font-bold uppercase tracking-wide focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500/30"
              />
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                    Logo boyutu
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
            <button
              type="button"
              onClick={handleReset}
              title="Sıfırla"
              className="shrink-0 self-start p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Hazır logo
              </p>
              <label
                className="inline-flex items-center gap-1 text-[10px] text-zinc-400 hover:text-white cursor-pointer"
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
                    if (f) handleUpload(f);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            <LogoPresetStrip logo={logo} onSelectPreset={handlePresetSelect} />
            {logo.mode === "upload" && (
              <p className="mt-1 text-[9px] text-zinc-500">Özel görsel aktif</p>
            )}
          </div>

          <section className="rounded-lg border border-zinc-600/80 bg-zinc-800/30 p-3">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-white mb-2.5">
              Forma
            </h3>
            <JerseyControls jersey={jersey} onChange={onJerseyChange} compact />
          </section>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950/60 p-3 min-h-[100px]">
            <TeamLogoBadge
              logo={logo}
              shortName={shortName}
              size={previewLogoSize}
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg bg-zinc-800 text-[10px] font-semibold text-zinc-300 hover:bg-zinc-700"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Sıfırla
            </button>
            <button
              type="button"
              onClick={() => onLogoChange(randomizeTeamLogo(logo, shortName))}
              className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg bg-zinc-800 text-[10px] font-semibold text-zinc-300 hover:bg-zinc-700"
            >
              <Shuffle className="w-3.5 h-3.5" />
              Rastgele
            </button>
          </div>

          <div className="overflow-y-auto space-y-3 pr-1 max-h-[45vh]">
            <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
                Renk şablonları
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {LOGO_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() =>
                      onLogoChange(applyLogoPreset(preset, logo, shortName))
                    }
                    className="px-2 py-1 rounded-md bg-zinc-800 text-[10px] font-semibold text-zinc-400 hover:bg-zinc-700 hover:text-white"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
                Şekil
              </h3>
              <OptionGrid
                options={SHAPES}
                value={logo.shape}
                onChange={(v) => updateLogo({ shape: v })}
              />
            </section>

            <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
                Kenarlık
              </h3>
              <OptionGrid
                options={BORDERS}
                value={logo.borderStyle}
                onChange={(v) => updateLogo({ borderStyle: v })}
                columns={3}
              />
            </section>

            <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
                Arka plan
              </h3>
              <OptionGrid
                options={BACKGROUNDS}
                value={logo.backgroundStyle}
                onChange={(v) => updateLogo({ backgroundStyle: v })}
                columns={2}
              />
            </section>

            <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
                İkon
              </h3>
              <OptionGrid
                options={LOGO_ICON_OPTIONS}
                value={logo.icon}
                onChange={(v: LogoIcon) =>
                  updateLogo({
                    icon: v,
                    showIcon: v !== "none",
                  })
                }
                columns={4}
              />
            </section>

            <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
                Renkler
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    ["Ana renk", "primaryColor"],
                    ["İkincil renk", "secondaryColor"],
                    ["Vurgu", "accentColor"],
                    ["Metin rengi", "textColor"],
                  ] as const
                ).map(([label, key]) => (
                  <label key={key} className="block">
                    <span className="text-[10px] text-zinc-500">{label}</span>
                    <input
                      type="color"
                      value={logo[key]}
                      onChange={(e) => updateLogo({ [key]: e.target.value })}
                      className="mt-1 w-full h-9 rounded cursor-pointer bg-transparent border border-zinc-700"
                    />
                  </label>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
                Metin
              </h3>
              <label className="block mb-3">
                <span className="text-[10px] text-zinc-500">Baş harfler</span>
                <input
                  value={logo.initials}
                  maxLength={3}
                  onChange={(e) =>
                    updateLogo({
                      initials: e.target.value.toUpperCase().slice(0, 3),
                    })
                  }
                  className="mt-1 w-full h-9 bg-zinc-800 border border-zinc-700 rounded-lg px-2 text-sm text-white text-center font-bold"
                />
              </label>
              <div className="space-y-2">
                <Toggle
                  label="Baş harfleri göster"
                  checked={logo.showInitials}
                  onChange={(v) => updateLogo({ showInitials: v })}
                />
                <Toggle
                  label="İkonu göster"
                  checked={logo.showIcon}
                  onChange={(v) => updateLogo({ showIcon: v })}
                />
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
