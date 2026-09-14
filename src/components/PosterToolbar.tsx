"use client";

import { getFormationsForSize } from "@/lib/formations";
import { useAppStore } from "@/store/useAppStore";
import { POSTER_THEME_LIST, normalizePosterTheme } from "@/lib/posterThemes";
import type { SquadSize } from "@/types";
import { UserRound, UsersRound } from "lucide-react";

export function PosterToolbar() {
  const teamMode = useAppStore((s) => s.teamMode);
  const setTeamMode = useAppStore((s) => s.setTeamMode);
  const squadSize = useAppStore((s) => s.squadSize);
  const setSquadSize = useAppStore((s) => s.setSquadSize);
  const homeFormationId = useAppStore((s) => s.homeFormationId);
  const awayFormationId = useAppStore((s) => s.awayFormationId);
  const setHomeFormation = useAppStore((s) => s.setHomeFormation);
  const setAwayFormation = useAppStore((s) => s.setAwayFormation);
  const posterTheme = normalizePosterTheme(useAppStore((s) => s.posterTheme));
  const setPosterTheme = useAppStore((s) => s.setPosterTheme);

  const formations = getFormationsForSize(squadSize);

  return (
    <div className="shrink-0 border-b border-zinc-800 bg-zinc-900/90 px-4 py-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px]">
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-500 font-semibold uppercase tracking-wide shrink-0">
            Kadro
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              aria-pressed={teamMode === "single"}
              onClick={() => setTeamMode("single")}
              className={`inline-flex items-center gap-1 h-7 px-2 rounded font-semibold transition-colors ${
                teamMode === "single"
                  ? "bg-green-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
              }`}
              title="Tek takım kadrosu oluştur"
            >
              <UserRound className="w-3.5 h-3.5" />
              Tek takım
            </button>
            <button
              type="button"
              aria-pressed={teamMode === "versus"}
              onClick={() => setTeamMode("versus")}
              className={`inline-flex items-center gap-1 h-7 px-2 rounded font-semibold transition-colors ${
                teamMode === "versus"
                  ? "bg-green-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
              }`}
              title="İki takım karşılaşma kadrosu oluştur"
            >
              <UsersRound className="w-3.5 h-3.5" />
              İki takım
            </button>
          </div>
        </div>

        <div className="hidden sm:block h-5 w-px bg-zinc-800 shrink-0" />

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

        {teamMode === "versus" && (
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
        )}

      </div>
    </div>
  );
}
