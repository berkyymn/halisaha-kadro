"use client";

import { getFormationById, getFormationsForSize } from "@/lib/formations";
import {
  computeSafeMaxCardSize,
  getEffectiveCardSize,
} from "@/lib/posterLayout";
import { usePosterMetrics } from "@/hooks/usePosterMetrics";
import { maxPlayersInRow } from "@/lib/formationEngine";
import { useAppStore } from "@/store/useAppStore";
import { POSTER_THEME_LIST, normalizePosterTheme } from "@/lib/posterThemes";
import type { SquadSize } from "@/types";
import {
  MIN_PLAYER_CARD_SIZE,
} from "@/types";

export function PosterToolbar() {
  const squadSize = useAppStore((s) => s.squadSize);
  const setSquadSize = useAppStore((s) => s.setSquadSize);
  const homeFormationId = useAppStore((s) => s.homeFormationId);
  const awayFormationId = useAppStore((s) => s.awayFormationId);
  const setHomeFormation = useAppStore((s) => s.setHomeFormation);
  const setAwayFormation = useAppStore((s) => s.setAwayFormation);
  const playerCardSize = useAppStore((s) => s.playerCardSize);
  const setPlayerCardSize = useAppStore((s) => s.setPlayerCardSize);
  const photoScalePercent = useAppStore((s) => s.photoScalePercent);
  const setPhotoScalePercent = useAppStore((s) => s.setPhotoScalePercent);
  const posterTheme = normalizePosterTheme(useAppStore((s) => s.posterTheme));
  const setPosterTheme = useAppStore((s) => s.setPosterTheme);
  const metrics = usePosterMetrics();

  const formations = getFormationsForSize(squadSize);
  const homeFormation = getFormationById(homeFormationId);
  const awayFormation = getFormationById(awayFormationId);
  const maxInRow = Math.max(
    maxPlayersInRow(homeFormation),
    maxPlayersInRow(awayFormation)
  );
  const sliderMax = computeSafeMaxCardSize(metrics, maxInRow);
  const effectiveCardSize = getEffectiveCardSize(
    metrics,
    maxInRow,
    playerCardSize
  );
  const isCapped = effectiveCardSize < playerCardSize;

  return (
    <div className="shrink-0 border-b border-zinc-800 bg-zinc-900/90 px-4 py-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px]">
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-500 font-semibold uppercase tracking-wide shrink-0">
            Tema
          </span>
          <div className="flex flex-wrap gap-1">
            {POSTER_THEME_LIST.map((theme) => {
              const selected = posterTheme === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  title={theme.label}
                  onClick={() => setPosterTheme(theme.id)}
                  className={`h-7 px-2.5 rounded font-semibold whitespace-nowrap transition-colors ${
                    selected
                      ? "bg-green-600 text-white"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                  }`}
                >
                  {theme.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="hidden sm:block h-5 w-px bg-zinc-800 shrink-0" />

        <div className="flex items-center gap-1.5">
          <span className="text-zinc-500 font-semibold uppercase tracking-wide">
            Format
          </span>
          {([6, 7, 8] as SquadSize[]).map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => setSquadSize(size)}
              className={`h-7 min-w-[2.5rem] px-2 rounded font-bold ${
                squadSize === size
                  ? "bg-green-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              {size}v{size}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-1.5">
          <span className="text-zinc-500 shrink-0">Ev diziliş</span>
          <select
            value={homeFormationId}
            onChange={(e) => setHomeFormation(e.target.value)}
            className="h-7 max-w-[7rem] bg-zinc-800 border border-zinc-700 rounded px-1.5 text-white"
          >
            {formations.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-1.5">
          <span className="text-zinc-500 shrink-0">Dep diziliş</span>
          <select
            value={awayFormationId}
            onChange={(e) => setAwayFormation(e.target.value)}
            className="h-7 max-w-[7rem] bg-zinc-800 border border-zinc-700 rounded px-1.5 text-white"
          >
            {formations.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 min-w-[10rem] flex-1 max-w-[14rem]">
          <span className="text-zinc-500 shrink-0 whitespace-nowrap">
            Oyuncu kartı
          </span>
          <input
            type="range"
            min={MIN_PLAYER_CARD_SIZE}
            max={sliderMax}
            step={1}
            value={Math.min(playerCardSize, sliderMax)}
            onChange={(e) => setPlayerCardSize(Number(e.target.value))}
            className="flex-1 accent-green-600"
          />
          <span
            className="text-green-400 font-bold tabular-nums text-right shrink-0"
            title={
              isCapped
                ? `Seçilen ${playerCardSize}, diziliş için en fazla ${effectiveCardSize}`
                : undefined
            }
          >
            {effectiveCardSize}
            {isCapped ? "*" : ""}
          </span>
        </label>

        <label className="flex items-center gap-2 min-w-[9rem] flex-1 max-w-[12rem]">
          <span className="text-zinc-500 shrink-0 whitespace-nowrap">
            Fotoğraf
          </span>
          <input
            type="range"
            min={60}
            max={120}
            step={1}
            value={photoScalePercent}
            onChange={(e) => setPhotoScalePercent(Number(e.target.value))}
            className="flex-1 accent-green-600"
          />
          <span className="text-green-400 font-bold tabular-nums w-9 text-right">
            {photoScalePercent}%
          </span>
        </label>
      </div>
    </div>
  );
}
