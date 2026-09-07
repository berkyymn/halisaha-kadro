"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
  UserRound,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import type { Player } from "@/types";

const PlayerEditModal = dynamic(
  () => import("./PlayerEditModal").then((module) => module.PlayerEditModal),
  { ssr: false }
);

const DRAG_THRESHOLD = 6;

type PitchTarget = { team: "home" | "away"; slotIndex: number };

function findPitchTarget(clientX: number, clientY: number): PitchTarget | null {
  const elements = document.elementsFromPoint(clientX, clientY);
  for (const el of elements) {
    const card = (el as HTMLElement).closest?.('[data-player-card="true"]') as
      | HTMLElement
      | null;
    if (card) {
      const team = card.dataset.team as "home" | "away" | undefined;
      const slotIndex = card.dataset.slotIndex;
      if (team && slotIndex !== undefined) {
        return { team, slotIndex: Number(slotIndex) };
      }
    }
  }
  return null;
}

function BenchCardContent({ player }: { player: Player }) {
  const photo = player.cutoutUrl || player.photoSource || player.photoUrl;
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center shrink-0 overflow-hidden">
        {photo ? (
          <img src={photo} alt="" className="w-full h-full object-cover" />
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
    </div>
  );
}

function BenchPlayerCard({
  player,
  dragging,
  onEdit,
  onDelete,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: {
  player: Player;
  dragging: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerCancel: (e: React.PointerEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      data-bench-player-id={player.id}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      className={`rounded-lg border border-zinc-700/80 bg-zinc-800/50 hover:border-zinc-600 p-2 transition-colors select-none ${
        dragging ? "opacity-0" : ""
      }`}
      style={{ touchAction: "none" }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <BenchCardContent player={player} />
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onEdit}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700/80 shrink-0"
          title="Düzenle"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onDelete}
          className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-950/40 shrink-0"
          title="Yedekten sil"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export function BenchPanel() {
  const [collapsed, setCollapsed] = useState(false);
  const [editingBenchId, setEditingBenchId] = useState<string | null>(null);

  const [draggingBenchId, setDraggingBenchId] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const pointerStart = useRef({ x: 0, y: 0 });
  const moved = useRef(false);

  const benchPlayerIds = useAppStore((s) => s.benchPlayerIds);
  const players = useAppStore((s) => s.players);
  const savedPlayers = useAppStore((s) => s.savedPlayers);
  const homeTeam = useAppStore((s) => s.homeTeam);
  const addPlayerToBench = useAppStore((s) => s.addPlayerToBench);
  const updateBenchPlayer = useAppStore((s) => s.updateBenchPlayer);
  const removeFromBench = useAppStore((s) => s.removeFromBench);
  const assignBenchToSlot = useAppStore((s) => s.assignBenchToSlot);
  const setActiveSwapTarget = useAppStore((s) => s.setActiveSwapTarget);

  const benchEntries = benchPlayerIds.map((benchId) => ({
    benchId,
    player: players[benchId] ?? savedPlayers[benchId],
  }));

  const editingPlayer = editingBenchId
    ? players[editingBenchId] ?? savedPlayers[editingBenchId]
    : undefined;

  const editingBenchIndex = editingBenchId
    ? benchPlayerIds.indexOf(editingBenchId)
    : -1;

  const draggingPlayer = draggingBenchId
    ? players[draggingBenchId] ?? savedPlayers[draggingBenchId]
    : undefined;

  const handleDelete = (playerId: string, playerName: string) => {
    const label = playerName.trim() || "Bu yedek";
    if (!window.confirm(`${label} yedek havuzundan silinsin mi?`)) return;
    removeFromBench(playerId);
    if (editingBenchId === playerId) setEditingBenchId(null);
  };

  const handlePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    benchId: string
  ) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    pointerStart.current = { x: e.clientX, y: e.clientY };
    moved.current = false;
    setDragPos({ x: e.clientX, y: e.clientY });
    setDraggingBenchId(benchId);
    card.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingBenchId) return;
    const dx = e.clientX - pointerStart.current.x;
    const dy = e.clientY - pointerStart.current.y;
    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
      moved.current = true;
    }
    if (!moved.current) return;

    setDragPos({ x: e.clientX, y: e.clientY });
    const target = findPitchTarget(e.clientX, e.clientY);
    setActiveSwapTarget(target);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const benchId = draggingBenchId;
    if (!benchId) return;

    e.currentTarget.releasePointerCapture(e.pointerId);

    if (!moved.current) {
      setEditingBenchId(benchId);
    } else {
      const target = findPitchTarget(e.clientX, e.clientY);
      if (target) {
        assignBenchToSlot(target.team, target.slotIndex, benchId);
      }
      setActiveSwapTarget(null);
    }

    setDraggingBenchId(null);
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingBenchId) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setActiveSwapTarget(null);
    setDraggingBenchId(null);
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
      <aside
        data-bench-drop="true"
        className="shrink-0 w-56 sm:w-64 border-l border-zinc-800 bg-zinc-900/95 flex flex-col min-h-0"
      >
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

        <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
          {benchEntries.length === 0 ? (
            <p className="text-[11px] text-zinc-500 text-center py-6 px-2">
              Henüz yedek yok. Geçen haftanın kadrosunu koruyup buraya oyuncu
              ekleyebilirsin.
            </p>
          ) : (
            benchEntries.map(({ benchId, player }) => (
              <BenchPlayerCard
                key={benchId}
                player={
                  player ?? {
                    id: benchId,
                    name: "İsimsiz yedek",
                    number: 0,
                  }
                }
                dragging={draggingBenchId === benchId}
                onEdit={() => setEditingBenchId(benchId)}
                onDelete={() =>
                  handleDelete(benchId, player?.name ?? "Bu yedek")
                }
                onPointerDown={(e) => handlePointerDown(e, benchId)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerCancel}
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

      {draggingPlayer &&
        createPortal(
          <div
            className="fixed z-[60] pointer-events-none"
            style={{
              left: dragPos.x - dragOffset.x,
              top: dragPos.y - dragOffset.y,
              width: 220,
            }}
          >
            <div className="rounded-lg border border-green-500/70 bg-zinc-800/95 p-2 shadow-2xl scale-[1.02]">
              <BenchCardContent player={draggingPlayer} />
            </div>
          </div>,
          document.body
        )}

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
