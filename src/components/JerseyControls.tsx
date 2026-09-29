"use client";

import type { JerseyConfig } from "@/types";
import { trackEvent } from "@/lib/analytics";
import { JERSEY_STYLE_OPTIONS, JERSEY_TEXT_COLORS } from "@/lib/jerseyOptions";
import { JerseyIcon } from "./JerseyIcon";

const LABEL = "text-[10px] font-bold uppercase tracking-wider text-zinc-500";

/** Forma tarzı, renkleri ve numara rengi. Tarzlar yazı yerine forma önizlemesiyle seçilir. */
export function JerseyControls({
  jersey,
  onChange,
}: {
  jersey: JerseyConfig;
  onChange: (jersey: JerseyConfig) => void;
}) {
  const update = (patch: Partial<JerseyConfig>) => {
    trackEvent("jersey_changed");
    onChange({ ...jersey, ...patch });
  };

  const needsSecondary = jersey.style !== "solid";

  return (
    <div className="space-y-4">
      <div>
        <p className={`${LABEL} mb-2`}>Desen</p>
        <div className="grid grid-cols-3 gap-1.5">
          {JERSEY_STYLE_OPTIONS.map((option) => {
            const selected = jersey.style === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => update({ style: option.id })}
                aria-pressed={selected}
                className={`flex flex-col items-center gap-1 rounded-lg border px-1 py-2 transition-colors ${
                  selected
                    ? "border-green-500 bg-green-950/40"
                    : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600"
                }`}
              >
                <JerseyIcon jersey={{ ...jersey, style: option.id }} size={34} />
                <span className={`text-[10px] font-semibold ${selected ? "text-green-400" : "text-zinc-400"}`}>
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className={`${LABEL} mb-2`}>Renkler</p>
        <div className="flex gap-2">
          <ColorField
            label={needsSecondary ? "Renk 1" : "Forma rengi"}
            value={jersey.primaryColor}
            onChange={(primaryColor) => update({ primaryColor })}
          />
          {needsSecondary && (
            <ColorField
              label="Renk 2"
              value={jersey.secondaryColor}
              onChange={(secondaryColor) => update({ secondaryColor })}
            />
          )}
        </div>
      </div>

      <div>
        <p className={`${LABEL} mb-2`}>Numara rengi</p>
        <div className="flex flex-wrap gap-1.5">
          {JERSEY_TEXT_COLORS.map(({ label, color }) => {
            const selected = jersey.numberColor.toLowerCase() === color.toLowerCase();
            return (
              <button
                key={color}
                type="button"
                title={label}
                aria-label={label}
                aria-pressed={selected}
                onClick={() => update({ numberColor: color })}
                className={`h-7 w-7 rounded-md border transition-all ${
                  selected
                    ? "border-green-500 ring-2 ring-green-500/50 scale-105"
                    : "border-zinc-600 hover:border-zinc-400"
                }`}
                style={{ backgroundColor: color }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex-1 min-w-0">
      <span className="text-[11px] text-zinc-400">{label}</span>
      <span className="mt-1 flex items-center gap-2 h-9 rounded-lg border border-zinc-700 bg-zinc-800 px-1.5">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-6 w-8 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
        />
        <span className="text-[11px] font-mono uppercase text-zinc-400">{value}</span>
      </span>
    </label>
  );
}
