"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
  UserPlus,
  UserRound,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { AssignToLineupModal } from "./AssignToLineupModal";

const PlayerEditModal = dynamic(
  () =>
    import("./PlayerEditModal").then((module) => module.PlayerEditModal),
  { ssr: false }
);
import { buildLineupSlotOptions } from "@/lib/lineupSlots";
import type { Player } from "@/types";

function BenchPlayerRow({
  player,
  substituteMode,
  onEdit,
  onBringToLineup,
  onDelete,
  onSubstitute,
}: {
  player: Player;
  substituteMode: boolean;
  onEdit: () => void;
  onBringToLineup: () => void;
  onDelete: () => void;
  onSubstitute: () => void;
}) {
  if (substituteMode) {
    return (
      <button
        type="button"
        onClick={onSubstitute}
        className="w-full rounded-lg border border-green-500 bg-green-950/40 ring-1 ring-green-500/50 p-2 text-left transition-colors hover:bg-green-950/60"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center shrink-0 overflow-hidden">
            {player.cutoutUrl || player.photoSource || player.photoUrl ? (
              <img
                src={player.cutoutUrl || player.photoSource || player.photoUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <UserRound className="w-4 h-4 text-zinc-400" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-white truncate">
              {player.name || "İsimsiz"}
            </p>
            <p className="text-[10px] text-green-400">Değiştirmek için seç</p>
          </div>
        </div>
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-700/80 bg-zinc-800/50 hover:border-zinc-600 p-2 transition-colors">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center shrink-0 overflow-hidden">
          {player.cutoutUrl || player.photoSource || player.photoUrl ? (
            <img
              src={player.cutoutUrl || player.photoSource || player.photoUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <UserRound className="w-4 h-4 text-zinc-400" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold text-white truncate">
            {player.name || "İsimsiz"}
          </p>
          <p className="text-[10px] text-zinc-500">#{player.number}</p>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700/80 shrink-0"
          title="Düzenle"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-950/40 shrink-0"
          title="Yedekten sil"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <button
        type="button"
        onClick={onBringToLineup}
        className="mt-2 w-full flex items-center justify-center gap-1.5 h-8 rounded-lg bg-zinc-700/80 hover:bg-green-700 text-[11px] font-semibold text-zinc-100 transition-colors"
      >
        <UserPlus className="w-3.5 h-3.5" />
        Oyuna al
      </button>
    </div>
  );
}

export function BenchPanel({
  substituteTarget,
  onSubstituteComplete,
  onClearSubstituteTarget,
}: {
  substituteTarget: { team: "home" | "away"; slotIndex: number } | null;
  onSubstituteComplete: () => void;
  onClearSubstituteTarget: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [lineupBenchId, setLineupBenchId] = useState<string | null>(null);
  const [editingBenchId, setEditingBenchId] = useState<string | null>(null);

  const squadSize = useAppStore((s) => s.squadSize);
  const benchPlayerIds = useAppStore((s) => s.benchPlayerIds);
  const players = useAppStore((s) => s.players);
  const savedPlayers = useAppStore((s) => s.savedPlayers);
  const homeTeam = useAppStore((s) => s.homeTeam);
  const awayTeam = useAppStore((s) => s.awayTeam);
  const addPlayerToBench = useAppStore((s) => s.addPlayerToBench);
  const assignBenchToSlot = useAppStore((s) => s.assignBenchToSlot);
  const updateBenchPlayer = useAppStore((s) => s.updateBenchPlayer);
  const removeFromBench = useAppStore((s) => s.removeFromBench);

  const benchEntries = benchPlayerIds.map((benchId) => ({
    benchId,
    player: players[benchId] ?? savedPlayers[benchId],
  }));

  const lineupPlayer = lineupBenchId
    ? (players[lineupBenchId] ?? savedPlayers[lineupBenchId])
    : undefined;

  const editingPlayer = editingBenchId
    ? players[editingBenchId] ?? savedPlayers[editingBenchId]
    : undefined;

  const editingBenchIndex = editingBenchId
    ? benchPlayerIds.indexOf(editingBenchId)
    : -1;

  const homeLineupSlots = buildLineupSlotOptions(
    homeTeam.playerIds,
    squadSize,
    players,
    savedPlayers
  );
  const awayLineupSlots = buildLineupSlotOptions(
    awayTeam.playerIds,
    squadSize,
    players,
    savedPlayers
  );

  const handleDelete = (playerId: string, playerName: string) => {
    const label = playerName.trim() || "Bu yedek";
    if (!window.confirm(`${label} yedek havuzundan silinsin mi?`)) return;
    removeFromBench(playerId);
    if (editingBenchId === playerId) setEditingBenchId(null);
    if (lineupBenchId === playerId) setLineupBenchId(null);
  };

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="shrink-0 w-9 border-l border-zinc-800 bg-zinc-900/95 flex flex-col items-center justify-center gap-1 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        title="Yedekleri aç"
      >
        <ChevronLeft className="w-4 h-4" />
        <span
          className="text-[9px] font-bold uppercase tracking-wider"
          style={{ writingMode: "vertical-rl" }}
        >
          Yedekler ({benchEntries.length})
        </span>
      </button>
    );
  }

  return (
    <>
      <aside className="shrink-0 w-56 sm:w-64 border-l border-zinc-800 bg-zinc-900/95 flex flex-col min-h-0">
        <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-zinc-800">
          <div>
            <h2 className="text-xs font-black uppercase tracking-wide text-white">
              Yedekler
            </h2>
            <p className="text-[10px] text-zinc-500">Ortak havuz · kayıtlı</p>
          </div>
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="p-1 text-zinc-500 hover:text-white"
            title="Gizle"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {substituteTarget && (
          <div className="mx-2 mt-2 rounded-lg bg-green-950/50 border border-green-700/60 px-2 py-1.5 text-[10px] text-green-300">
            Değiştirmek için bir yedek seçin
            <button
              type="button"
              onClick={onClearSubstituteTarget}
              className="ml-1 underline text-green-400"
            >
              İptal
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
          {benchEntries.length === 0 ? (
            <p className="text-[11px] text-zinc-500 text-center py-6 px-2">
              Henüz yedek yok. Geçen haftanın kadrosunu koruyup buraya oyuncu
              ekleyebilirsin.
            </p>
          ) : (
            benchEntries.map(({ benchId, player }) => (
              <BenchPlayerRow
                key={benchId}
                player={
                  player ?? {
                    id: benchId,
                    name: "İsimsiz yedek",
                    number: 0,
                  }
                }
                substituteMode={Boolean(substituteTarget)}
                onEdit={() => setEditingBenchId(benchId)}
                onBringToLineup={() => setLineupBenchId(benchId)}
                onDelete={() =>
                  handleDelete(benchId, player?.name ?? "Bu yedek")
                }
                onSubstitute={() => {
                  if (!substituteTarget) return;
                  assignBenchToSlot(
                    substituteTarget.team,
                    substituteTarget.slotIndex,
                    benchId
                  );
                  onSubstituteComplete();
                }}
              />
            ))
          )}
        </div>

        <div className="shrink-0 p-2 border-t border-zinc-800">
          <button
            type="button"
            onClick={() => {
              const id = addPlayerToBench({});
              setEditingBenchId(id);
            }}
            className="w-full flex items-center justify-center gap-1.5 h-9 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200"
          >
            <Plus className="w-3.5 h-3.5" />
            Yeni yedek
          </button>
        </div>
      </aside>

      <AssignToLineupModal
        open={lineupBenchId !== null}
        playerName={lineupPlayer?.name}
        benchJerseyNumber={lineupPlayer?.number}
        homeLabel={homeTeam.shortName}
        awayLabel={awayTeam.shortName}
        homeSlots={homeLineupSlots}
        awaySlots={awayLineupSlots}
        onComplete={(team, slotIndex) => {
          if (lineupBenchId) {
            assignBenchToSlot(team, slotIndex, lineupBenchId);
          }
        }}
        onClose={() => setLineupBenchId(null)}
      />

      {editingBenchId && (
        <PlayerEditModal
          key={editingBenchId}
          open
          onClose={() => setEditingBenchId(null)}
          jersey={homeTeam.jersey}
          player={editingPlayer}
          slotIndex={Math.max(editingBenchIndex, 0)}
          isCaptain={false}
          onToggleCaptain={() => {}}
          showCaptainToggle={false}
          onSave={(data) => updateBenchPlayer(editingBenchId, data)}
          defaultPlayerName={
            editingBenchIndex >= 0 ? `Yedek ${editingBenchIndex + 1}` : undefined
          }
          onRemoveFromBench={() => {
            handleDelete(editingBenchId, editingPlayer?.name ?? "");
          }}
          variant="dark"
        />
      )}
    </>
  );
}
