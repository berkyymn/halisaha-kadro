"use client";

import { Shuffle } from "lucide-react";
import { applyLogoPreset, LOGO_PRESETS } from "@/lib/logoPresets";
import type {
  LogoBackgroundStyle,
  LogoBorderStyle,
  LogoIcon,
  LogoShape,
  TeamLogo,
} from "@/types";
import { LOGO_ICON_OPTIONS } from "./logo/LogoIcon";

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

export function LogoDesignerCustomPanel({
  logo,
  shortName,
  onLogoChange,
  onRandomize,
}: {
  logo: TeamLogo;
  shortName: string;
  onLogoChange: (logo: TeamLogo) => void;
  onRandomize: () => void;
}) {
  const updateLogo = (patch: Partial<TeamLogo>) =>
    onLogoChange({
      ...logo,
      mode: "generated",
      presetId: undefined,
      imageUrl: undefined,
      ...patch,
    });

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onRandomize}
        className="w-full flex items-center justify-center gap-1.5 h-9 rounded-lg bg-zinc-800 text-[11px] font-semibold text-zinc-300 hover:bg-zinc-700"
      >
        <Shuffle className="w-3.5 h-3.5" />
        Rastgele logo
      </button>

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
  );
}
