"use client";

import { useState, type KeyboardEvent, type ReactNode } from "react";
import { RotateCcw, X } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { ModalShell } from "@/components/ModalShell";
import { PosterTitle } from "@/components/PosterTitle";
import { trackEvent } from "@/lib/analytics";
import { getPosterThemeBackgroundSrc, normalizePosterTheme } from "@/lib/posterThemes";
import {
  DEFAULT_TITLE_LINE1,
  DEFAULT_TITLE_STYLE,
  TITLE_EFFECT_PRESETS,
  TITLE_FONT_SIZE_RANGE,
  TITLE_LINE_MAX_LENGTH,
  TITLE_STYLE_PRESETS,
  TITLE_SUBTITLE_MAX_LENGTH,
  buildPosterTitleStyles,
  defaultTitleStyleForTheme,
  titleLines,
} from "@/lib/posterTitleStyles";
import type { MatchInfo } from "@/types";

const LABEL = "text-[10px] font-bold uppercase tracking-wider text-zinc-500";
const INPUT =
  "mt-1 w-full h-9 bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 text-sm text-white focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500/30";

export function PosterTitleModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      zIndexClass="z-[120]"
      panelClassName="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-3xl max-h-[94vh] shadow-2xl overflow-hidden flex flex-col"
    >
      {/* Her açılışta taslak güncel başlıktan yeniden başlar */}
      {open && <PosterTitleEditor onClose={onClose} />}
    </ModalShell>
  );
}

function PosterTitleEditor({ onClose }: { onClose: () => void }) {
  const matchInfo = useAppStore((s) => s.matchInfo);
  const setMatchInfo = useAppStore((s) => s.setMatchInfo);
  const posterTheme = normalizePosterTheme(useAppStore((s) => s.posterTheme));
  const themeStyleId = defaultTitleStyleForTheme(posterTheme);

  const [draft, setDraft] = useState<MatchInfo>(matchInfo);
  const patch = (partial: Partial<MatchInfo>) => setDraft((d) => ({ ...d, ...partial }));

  const handleSave = () => {
    trackEvent("title_edited");
    setMatchInfo({
      titleLine1: (draft.titleLine1 ?? "").trim() || DEFAULT_TITLE_LINE1,
      titleLine2: (draft.titleLine2 ?? "").trim(),
      titleSubtitle: (draft.titleSubtitle ?? "").trim(),
      titleStyleId: draft.titleStyleId,
      titleEffectId: draft.titleEffectId,
      titleFontSize: draft.titleFontSize,
      titleLetterSpacing: draft.titleLetterSpacing,
      titleShadow: draft.titleShadow,
    });
    onClose();
  };

  const saveOnEnter = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
        <div>
          <h3 className="text-sm font-bold text-white">Başlık</h3>
          <p className="text-[10px] text-zinc-500">Posterin üstündeki maç başlığı</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
          aria-label="Kapat"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="shrink-0 px-4 pt-3 pb-3 border-b border-zinc-800">
        <TitlePreview info={draft} backgroundSrc={getPosterThemeBackgroundSrc(posterTheme)} />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 md:divide-x divide-zinc-800">
          <section className="p-4 space-y-3">
            <p className={LABEL}>Metin</p>
            <TextField
              label="Üst satır"
              value={draft.titleLine1}
              max={TITLE_LINE_MAX_LENGTH}
              placeholder={DEFAULT_TITLE_LINE1}
              uppercase
              onChange={(v) => patch({ titleLine1: v })}
              onKeyDown={saveOnEnter}
            />
            <TextField
              label="Alt satır"
              hint="Boş bırakırsan tek satır"
              value={draft.titleLine2}
              max={TITLE_LINE_MAX_LENGTH}
              uppercase
              onChange={(v) => patch({ titleLine2: v })}
              onKeyDown={saveOnEnter}
            />
            <TextField
              label="Alt başlık"
              hint="İsteğe bağlı"
              value={draft.titleSubtitle ?? ""}
              max={TITLE_SUBTITLE_MAX_LENGTH}
              placeholder="Cuma akşamı maçı"
              onChange={(v) => patch({ titleSubtitle: v })}
              onKeyDown={saveOnEnter}
            />
          </section>

          <section className="p-4 space-y-3.5">
            <div>
              <p className={`${LABEL} mb-2`}>Efekt</p>
              <div className="grid grid-cols-3 gap-1.5">
                {TITLE_EFFECT_PRESETS.map((preset) => (
                  <EffectTile
                    key={preset.id}
                    label={preset.label}
                    info={{ ...draft, titleEffectId: preset.id }}
                    selected={draft.titleEffectId === preset.id}
                    onSelect={() => {
                      trackEvent("title_effect_changed", { effect_id: preset.id });
                      patch({ titleEffectId: preset.id });
                    }}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className={`${LABEL} mb-2`}>Renk</p>
              <div className="grid grid-cols-4 gap-1.5">
                {TITLE_STYLE_PRESETS.map((preset) => {
                  const selected = draft.titleStyleId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        trackEvent("title_style_changed", { style_id: preset.id });
                        patch({ titleStyleId: preset.id });
                      }}
                      aria-pressed={selected}
                      className={`relative h-12 rounded-lg border flex flex-col items-center justify-center gap-1 transition-colors ${
                        selected
                          ? "border-green-500 bg-green-950/40"
                          : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600"
                      }`}
                    >
                      <span className="inline-flex -space-x-1">
                        {preset.swatch.map((color) => (
                          <span
                            key={color}
                            className="w-3.5 h-3.5 rounded-full border border-zinc-900"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </span>
                      <span className="text-[10px] font-semibold text-zinc-200">{preset.label}</span>
                      {preset.id === themeStyleId && (
                        <span className="absolute -top-1.5 right-1 rounded bg-zinc-700 px-1 text-[8px] font-bold uppercase text-zinc-200">
                          Tema
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
        <section className="px-4 py-3 border-t border-zinc-800">
          <p className={`${LABEL} mb-2`}>İnce ayar</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-5 gap-y-2.5">
            <SliderRow
              label="Boyut"
              min={TITLE_FONT_SIZE_RANGE.min}
              max={TITLE_FONT_SIZE_RANGE.max}
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
          </div>
        </section>
      </div>

      <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-t border-zinc-800">
        <button
          type="button"
          onClick={() =>
            setDraft((d) => ({
              ...d,
              ...DEFAULT_TITLE_STYLE,
              titleSubtitle: d.titleSubtitle,
              titleStyleId: themeStyleId,
            }))
          }
          className="inline-flex items-center gap-1.5 h-9 px-2.5 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800"
          title="Efekt, renk ve ayarları varsayılana döndür (yazılar korunur)"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Varsayılan stil
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={onClose}
          className="h-9 px-4 rounded-lg bg-zinc-800 text-xs font-semibold text-zinc-200 hover:bg-zinc-700"
        >
          Vazgeç
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="h-9 px-5 rounded-lg bg-green-600 text-xs font-semibold text-white hover:bg-green-500"
        >
          Kaydet
        </button>
      </div>
    </>
  );
}

/**
 * Posterin üst kısmının birebir kopyası: aynı arka plan, aynı konum, aynı
 * `cqw` ölçeği. Kutunun kendisi 16:10 posterdir; yalnızca üst şeridi görünür.
 */
function TitlePreview({ info, backgroundSrc }: { info: MatchInfo; backgroundSrc: string }) {
  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950" style={{ aspectRatio: "16 / 4" }}>
      <div className="absolute inset-x-0 top-0 [container-type:inline-size]" style={{ aspectRatio: "16 / 10" }}>
        <img src={backgroundSrc} alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
        <div className="absolute inset-x-0 flex justify-center" style={{ top: "5%" }}>
          <div className="px-[0.6em] py-[0.25em]">
            <PosterTitle info={info} />
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-zinc-950/80 to-transparent" />
    </div>
  );
}

function EffectTile({
  label,
  info,
  selected,
  onSelect,
}: {
  label: string;
  info: MatchInfo;
  selected: boolean;
  onSelect: () => void;
}) {
  const styles = buildPosterTitleStyles(info);
  const { line1, line2 } = titleLines(info);
  const word = (line2 || line1).split(/\s+/)[0].slice(0, 8);
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`h-14 rounded-lg border flex flex-col items-center justify-center gap-0.5 overflow-hidden transition-colors ${
        selected ? "border-green-500 bg-green-950/40" : "border-zinc-700 bg-zinc-950 hover:border-zinc-600"
      }`}
    >
      <span
        className="uppercase leading-none whitespace-nowrap"
        style={{ ...(line2 ? styles.line2 : styles.line1), fontFamily: "var(--font-display)", fontSize: 17 }}
      >
        {word}
      </span>
      <span className={`text-[9px] font-semibold ${selected ? "text-green-400" : "text-zinc-500"}`}>{label}</span>
    </button>
  );
}

function TextField({
  label,
  hint,
  value,
  max,
  placeholder,
  uppercase = false,
  onChange,
  onKeyDown,
}: {
  label: string;
  hint?: string;
  value: string;
  max: number;
  placeholder?: string;
  uppercase?: boolean;
  onChange: (value: string) => void;
  onKeyDown: (e: KeyboardEvent) => void;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-semibold text-zinc-300">
          {label}
          {hint && <span className="ml-1.5 font-normal text-zinc-500">· {hint}</span>}
        </span>
        <span className="text-[10px] tabular-nums text-zinc-500">
          {value.length}/{max}
        </span>
      </span>
      <input
        value={value}
        maxLength={max}
        placeholder={placeholder}
        onChange={(e) => onChange(uppercase ? e.target.value.toLocaleUpperCase("tr-TR") : e.target.value)}
        onKeyDown={onKeyDown}
        className={`${INPUT} ${uppercase ? "font-bold uppercase" : ""}`}
      />
    </label>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  display: string;
  onChange: (v: number) => void;
}): ReactNode {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-zinc-400">{label}</span>
        <span className="text-[10px] font-bold text-green-400 tabular-nums">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-green-600 h-1"
      />
    </div>
  );
}
