"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useModalBackdrop } from "@/hooks/useModalBackdrop";
import { getPosterThemeConfig, normalizePosterTheme } from "@/lib/posterThemes";
import {
  DEFAULT_TITLE_STYLE,
  TITLE_EFFECT_PRESETS,
  TITLE_STYLE_PRESETS,
  buildPosterTitleStyles,
  defaultTitleStyleForTheme,
} from "@/lib/posterTitleStyles";
import type { MatchInfo, PosterTitleEffectId } from "@/types";

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  display: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-zinc-500">{label}</span>
        <span className="text-[10px] font-bold text-green-400 tabular-nums">
          {display}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step ?? 1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-green-600 h-1"
      />
    </div>
  );
}

function ColorSwatch({ colors }: { colors: [string, string] }) {
  return (
    <span className="inline-flex items-center gap-0.5 shrink-0">
      {colors.map((color) => (
        <span
          key={color}
          className="w-3 h-3 rounded-full border border-white/20"
          style={{ backgroundColor: color }}
        />
      ))}
    </span>
  );
}

export function PosterTitleModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return <PosterTitleModalBody onClose={onClose} />;
}

function PosterTitleModalBody({ onClose }: { onClose: () => void }) {
  const matchInfo = useAppStore((s) => s.matchInfo);
  const setMatchInfo = useAppStore((s) => s.setMatchInfo);
  const posterTheme = normalizePosterTheme(useAppStore((s) => s.posterTheme));
  const themeConfig = getPosterThemeConfig(posterTheme);
  const { backdropProps, panelProps } = useModalBackdrop({
    open: true,
    onClose,
  });

  const [draft, setDraft] = useState<MatchInfo>(matchInfo);

  const patch = (partial: Partial<MatchInfo>) =>
    setDraft((d) => ({ ...d, ...partial }));

  const preview = buildPosterTitleStyles(draft);
  const themeStyleId = defaultTitleStyleForTheme(posterTheme);
  const paletteMismatch = draft.titleStyleId !== themeStyleId;

  const handleSave = () => {
    setMatchInfo({
      titleLine1: (draft.titleLine1 ?? "").trim() || "DERBİ",
      titleLine2: (draft.titleLine2 ?? "").trim() || "GECESİ",
      titleSubtitle: draft.titleSubtitle ?? "",
      titleStyleId: draft.titleStyleId,
      titleEffectId: draft.titleEffectId,
      titleFontSize: draft.titleFontSize,
      titleLetterSpacing: draft.titleLetterSpacing,
      titleShadow: draft.titleShadow,
      titleRotation: draft.titleRotation,
      titleMaxWidth: draft.titleMaxWidth,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4"
      {...backdropProps}
    >
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md max-h-[92vh] overflow-hidden flex flex-col shadow-2xl"
        {...panelProps}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 shrink-0">
          <h3 className="text-sm font-semibold text-white">Başlık Düzenle</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="shrink-0 px-5 pt-4 pb-3 border-b border-zinc-800">
          <div
            className="rounded-xl bg-zinc-950 border border-zinc-800 p-4 flex justify-center overflow-hidden"
            style={{ minHeight: 100 }}
          >
            <div
              className="text-center uppercase select-none"
              style={{
                fontFamily: "var(--font-display)",
                maxWidth: `${draft.titleMaxWidth}%`,
                transform: `rotate(${draft.titleRotation}deg)`,
              }}
            >
              <div
                className="flex flex-col items-center justify-center leading-none"
                style={{
                  fontSize: `clamp(1.4rem, ${4 * (draft.titleFontSize / 100)}cqw, 2.4rem)`,
                }}
              >
                <span style={preview.line1}>
                  {(draft.titleLine1 ?? "").trim() || "DERBİ"}
                </span>
                <span style={preview.line2}>
                  {(draft.titleLine2 ?? "").trim() || "GECESİ"}
                </span>
              </div>
              {(draft.titleSubtitle ?? "").trim() && (
                <p className="mt-1 uppercase" style={preview.subtitle}>
                  {draft.titleSubtitle}
                </p>
              )}
            </div>
          </div>
          <p className="mt-2 text-center text-[10px] text-zinc-500">
            Arka plan:{" "}
            <span className="text-zinc-400">{themeConfig.label}</span>
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0">
          <div className="space-y-2">
            <label className="block">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                Başlık 1
              </span>
              <input
                value={draft.titleLine1}
                onChange={(e) =>
                  patch({ titleLine1: e.target.value.toUpperCase() })
                }
                className="mt-1 w-full h-10 bg-zinc-800 border border-zinc-700 rounded-lg px-3 text-sm text-white font-bold uppercase"
              />
            </label>
            <label className="block">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                Başlık 2
              </span>
              <input
                value={draft.titleLine2}
                onChange={(e) =>
                  patch({ titleLine2: e.target.value.toUpperCase() })
                }
                className="mt-1 w-full h-10 bg-zinc-800 border border-zinc-700 rounded-lg px-3 text-sm text-white font-bold uppercase"
              />
            </label>
            <label className="block">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                Alt başlık
              </span>
              <input
                value={draft.titleSubtitle ?? ""}
                onChange={(e) => patch({ titleSubtitle: e.target.value })}
                placeholder="Cuma Akşamı Maçı"
                className="mt-1 w-full h-10 bg-zinc-800 border border-zinc-700 rounded-lg px-3 text-sm text-white"
              />
            </label>
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Renk paleti
              </p>
              {paletteMismatch && (
                <button
                  type="button"
                  onClick={() => patch({ titleStyleId: themeStyleId })}
                  className="text-[10px] font-semibold text-green-500 hover:text-green-400 whitespace-nowrap"
                >
                  Poster temasına uy
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {TITLE_STYLE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => patch({ titleStyleId: preset.id })}
                  className={`rounded-lg px-2 py-2 text-left border transition-colors ${
                    draft.titleStyleId === preset.id
                      ? "border-green-500 bg-green-950/40"
                      : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <ColorSwatch colors={preset.swatch} />
                    <span className="text-[11px] font-bold text-white">
                      {preset.label}
                    </span>
                  </span>
                  <span className="block text-[9px] text-zinc-500 mt-0.5 pl-[18px]">
                    {preset.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
              Efekt
            </p>
            <div className="flex flex-wrap gap-1.5">
              {TITLE_EFFECT_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() =>
                    patch({ titleEffectId: preset.id as PosterTitleEffectId })
                  }
                  className={`h-8 px-2.5 rounded-md text-[10px] font-semibold transition-colors ${
                    draft.titleEffectId === preset.id
                      ? "bg-green-600 text-white"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 pt-1 border-t border-zinc-800">
            <SliderRow
              label="Font boyutu"
              min={70}
              max={130}
              value={draft.titleFontSize}
              display={`${draft.titleFontSize}%`}
              onChange={(v) => patch({ titleFontSize: v })}
            />
            <SliderRow
              label="Harf aralığı"
              min={0}
              max={100}
              value={draft.titleLetterSpacing}
              display={`${draft.titleLetterSpacing}`}
              onChange={(v) => patch({ titleLetterSpacing: v })}
            />
            <SliderRow
              label="Gölge"
              min={0}
              max={100}
              value={draft.titleShadow}
              display={`${draft.titleShadow}%`}
              onChange={(v) => patch({ titleShadow: v })}
            />
            <SliderRow
              label="Döndürme"
              min={-5}
              max={5}
              step={0.5}
              value={draft.titleRotation}
              display={`${draft.titleRotation}°`}
              onChange={(v) => patch({ titleRotation: v })}
            />
            <SliderRow
              label="Max genişlik"
              min={60}
              max={100}
              value={draft.titleMaxWidth}
              display={`${draft.titleMaxWidth}%`}
              onChange={(v) => patch({ titleMaxWidth: v })}
            />
          </div>
        </div>

        <div className="shrink-0 flex gap-2 px-5 py-3 border-t border-zinc-800">
          <button
            type="button"
            onClick={() => setDraft({ ...matchInfo, ...DEFAULT_TITLE_STYLE })}
            className="h-10 px-3 rounded-xl bg-zinc-800 text-xs font-semibold text-zinc-300 hover:bg-zinc-700"
          >
            Sıfırla
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 h-10 rounded-xl bg-green-600 text-sm font-semibold text-white hover:bg-green-500"
          >
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}
