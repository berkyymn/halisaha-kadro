"use client";

import type { JerseyConfig, JerseyStyle } from "@/types";
import {
  JERSEY_STYLE_OPTIONS,
  JERSEY_TEXT_COLORS,
} from "@/lib/jerseyOptions";
import { JerseyIcon } from "./JerseyIcon";

function OptionGrid<T extends string>({
  options,
  value,
  onChange,
  columns = 3,
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
                ? "bg-white text-zinc-900 ring-2 ring-green-500"
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

export function JerseyControls({
  jersey,
  onChange,
  compact = false,
}: {
  jersey: JerseyConfig;
  onChange: (jersey: JerseyConfig) => void;
  compact?: boolean;
}) {
  const update = (patch: Partial<JerseyConfig>) =>
    onChange({ ...jersey, ...patch });

  const needsSecondary =
    jersey.style !== "solid";

  return (
    <div className={compact ? "space-y-2.5" : "space-y-4"}>
      {!compact && (
        <div className="flex items-center gap-3">
          <JerseyIcon jersey={jersey} number={10} size={52} numberAlign="right" />
          <p className="text-[10px] text-zinc-500 leading-relaxed">
            Forma ayarları logodan bağımsızdır. Hazır logo seçince renkler otomatik
            gelir; sonrasında istediğin gibi değiştirebilirsin.
          </p>
        </div>
      )}

      {compact && (
        <div className="flex items-center gap-2.5 pb-0.5">
          <JerseyIcon jersey={jersey} number={10} size={40} numberAlign="right" />
          <p className="text-[9px] text-zinc-500 leading-snug">
            Logo seçince renkler otomatik gelir, buradan değiştirebilirsin.
          </p>
        </div>
      )}

      <div>
        <p className="text-[10px] text-zinc-500 mb-1">Forma tarzı</p>
        <OptionGrid
          options={JERSEY_STYLE_OPTIONS}
          value={jersey.style}
          onChange={(v: JerseyStyle) => update({ style: v })}
          columns={2}
        />
      </div>

      <div className="flex gap-2">
        <label className="flex-1">
          <span className="text-[10px] text-zinc-500">
            {needsSecondary ? "Renk 1" : "Forma rengi"}
          </span>
          <input
            type="color"
            value={jersey.primaryColor}
            onChange={(e) => update({ primaryColor: e.target.value })}
            className="mt-0.5 w-full h-8 rounded cursor-pointer bg-transparent border border-zinc-700"
          />
        </label>
        {needsSecondary && (
          <label className="flex-1">
            <span className="text-[10px] text-zinc-500">Renk 2</span>
            <input
              type="color"
              value={jersey.secondaryColor}
              onChange={(e) => update({ secondaryColor: e.target.value })}
              className="mt-0.5 w-full h-8 rounded cursor-pointer bg-transparent border border-zinc-700"
            />
          </label>
        )}
      </div>

      <div>
        <span className="text-[10px] text-zinc-500">Yazı rengi</span>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {JERSEY_TEXT_COLORS.map(({ label, color }) => {
            const selected =
              jersey.numberColor.toLowerCase() === color.toLowerCase();
            return (
              <button
                key={color}
                type="button"
                title={label}
                aria-label={label}
                onClick={() => update({ numberColor: color })}
                className={`h-6 w-6 rounded-md border transition-all ${
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
