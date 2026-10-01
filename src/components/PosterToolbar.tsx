"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, UserRound, UsersRound } from "lucide-react";
import { getFormationsForSize } from "@/lib/formations";
import { useAppStore } from "@/store/useAppStore";
import { POSTER_THEME_LIST, normalizePosterTheme } from "@/lib/posterThemes";
import type { Formation, SquadSize } from "@/types";
import { teamAccent } from "@/lib/teamColors";

const LABEL = "text-[10px] font-bold uppercase tracking-wider text-zinc-500";

export function PosterToolbar() {
  const teamMode = useAppStore((s) => s.teamMode);
  const setTeamMode = useAppStore((s) => s.setTeamMode);
  const squadSize = useAppStore((s) => s.squadSize);
  const setSquadSize = useAppStore((s) => s.setSquadSize);
  const homeFormationId = useAppStore((s) => s.homeFormationId);
  const awayFormationId = useAppStore((s) => s.awayFormationId);
  const setHomeFormation = useAppStore((s) => s.setHomeFormation);
  const setAwayFormation = useAppStore((s) => s.setAwayFormation);
  const homeTeam = useAppStore((s) => s.homeTeam);
  const awayTeam = useAppStore((s) => s.awayTeam);
  const posterTheme = normalizePosterTheme(useAppStore((s) => s.posterTheme));
  const setPosterTheme = useAppStore((s) => s.setPosterTheme);

  const formations = getFormationsForSize(squadSize);

  return (
    <div className="shrink-0 border-b border-zinc-800 bg-zinc-900/90 px-4 py-2">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <Group label="Kadro">
          <Segmented
            value={teamMode}
            onChange={setTeamMode}
            options={[
              { id: "single", label: "Tek takım", icon: <UserRound className="w-3.5 h-3.5" />, title: "Tek takım kadrosu oluştur" },
              { id: "versus", label: "İki takım", icon: <UsersRound className="w-3.5 h-3.5" />, title: "İki takım karşılaşma kadrosu oluştur" },
            ]}
          />
        </Group>

        <Group label="Format">
          <Segmented
            value={squadSize}
            onChange={(size: SquadSize) => setSquadSize(size)}
            options={([6, 7, 8] as SquadSize[]).map((size) => ({
              id: size,
              label: `${size}v${size}`,
              title: `${size} kişilik kadro`,
            }))}
          />
        </Group>

        <Group label="Diziliş">
          <FormationPicker
            teamName={homeTeam.shortName}
            color={teamAccent(homeTeam.jersey)}
            formations={formations}
            value={homeFormationId}
            onChange={setHomeFormation}
          />
          {teamMode === "versus" && (
            <FormationPicker
              teamName={awayTeam.shortName}
              color={teamAccent(awayTeam.jersey)}
              formations={formations}
              value={awayFormationId}
              onChange={setAwayFormation}
              mirrored
            />
          )}
        </Group>

        <div className="flex-1" />

        <Group label="Tema">
          <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Poster teması">
            {POSTER_THEME_LIST.map((theme) => {
              const selected = posterTheme === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={theme.label}
                  title={theme.label}
                  onClick={() => setPosterTheme(theme.id)}
                  className={`relative h-9 w-[60px] overflow-hidden rounded-md border transition-all ${
                    selected
                      ? "border-green-500 ring-2 ring-green-500/40"
                      : "border-zinc-700 opacity-70 hover:opacity-100 hover:border-zinc-500"
                  }`}
                >
                  <img
                    src={theme.thumbSrc}
                    alt=""
                    draggable={false}
                    className="h-full w-full object-cover pointer-events-none"
                  />
                </button>
              );
            })}
          </div>
        </Group>
      </div>
    </div>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className={LABEL}>{label}</span>
      {children}
    </div>
  );
}

/** Pencerelerdeki sekmelerle aynı dil: koyu zemin üzerinde seçili parça. */
function Segmented<T extends string | number>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { id: T; label: string; icon?: ReactNode; title?: string }[];
}) {
  return (
    <div className="flex gap-0.5 rounded-lg border border-zinc-800 bg-zinc-950 p-0.5" role="radiogroup">
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <button
            key={String(option.id)}
            type="button"
            role="radio"
            aria-checked={selected}
            title={option.title}
            onClick={() => onChange(option.id)}
            className={`inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[11px] font-semibold transition-colors ${
              selected ? "bg-zinc-700 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** Formasyonun küçük saha şeması: kaleci solda, hatlar sağa doğru. */
function FormationDiagram({
  formation,
  color,
  mirrored = false,
}: {
  formation: Formation;
  color: string;
  mirrored?: boolean;
}) {
  const rows = formation.rows;
  return (
    <svg viewBox="0 0 60 40" className="h-9 w-14" aria-hidden>
      <rect x="1" y="1" width="58" height="38" rx="3" fill="#14532d" stroke="#3f6212" strokeWidth="1" />
      <line x1={mirrored ? 1 : 59} y1="1" x2={mirrored ? 1 : 59} y2="39" stroke="#4d7c0f" strokeWidth="1" />
      {rows.flatMap((row, rowIndex) => {
        const depth = 7 + (rowIndex / Math.max(1, rows.length - 1)) * 44;
        const x = mirrored ? 60 - depth : depth;
        return Array.from({ length: row.count }, (_, i) => {
          const y = row.count === 1 ? 20 : 7 + (i / (row.count - 1)) * 26;
          return (
            <circle
              key={`${rowIndex}-${i}`}
              cx={x}
              cy={y}
              r="3"
              fill={rowIndex === 0 ? "#e4e4e7" : color}
              stroke="rgba(0,0,0,0.6)"
              strokeWidth="0.8"
            />
          );
        });
      })}
    </svg>
  );
}

function FormationPicker({
  teamName,
  color,
  formations,
  value,
  onChange,
  mirrored = false,
}: {
  teamName: string;
  color: string;
  formations: Formation[];
  value: string;
  onChange: (id: string) => void;
  mirrored?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = formations.find((f) => f.id === value) ?? formations[0];

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        title={`${teamName} dizilişi`}
        className={`inline-flex h-8 items-center gap-2 rounded-lg border px-2 text-[11px] transition-colors ${
          open ? "border-zinc-500 bg-zinc-800" : "border-zinc-700 bg-zinc-800/60 hover:border-zinc-500"
        }`}
      >
        <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-black/40" style={{ backgroundColor: color }} />
        <span className="max-w-[7rem] truncate font-semibold uppercase text-zinc-300">{teamName}</span>
        <span className="font-bold text-white tabular-nums">{current?.name}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={`${teamName} dizilişi`}
          className="absolute left-0 top-full z-[80] mt-1.5 grid w-[248px] grid-cols-3 gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 p-2 shadow-2xl"
        >
          {formations.map((formation) => {
            const selected = formation.id === value;
            return (
              <button
                key={formation.id}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(formation.id);
                  setOpen(false);
                }}
                className={`flex flex-col items-center gap-1 rounded-lg border px-1 py-1.5 transition-colors ${
                  selected
                    ? "border-green-500 bg-green-950/40"
                    : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-600"
                }`}
              >
                <FormationDiagram formation={formation} color={color} mirrored={mirrored} />
                <span className={`text-[11px] font-bold tabular-nums ${selected ? "text-green-400" : "text-zinc-300"}`}>
                  {formation.name}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
