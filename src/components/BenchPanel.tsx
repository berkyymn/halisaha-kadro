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
  UsersRound,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useDragStore } from "@/store/useDragStore";
import { useAutoCardSize } from "@/hooks/useAutoCardSize";
import { usePlayerDrag } from "@/hooks/usePlayerDrag";
import { PlayerAvatar } from "./PlayerAvatar";
import { ModalShell } from "./ModalShell";
import { PlayerDropOverlay } from "./PlayerDropOverlay";
import { PlayerDragPreview } from "./PlayerDragPreview";
import type { JerseyConfig, Player } from "@/types";
import { NEUTRAL_BENCH_JERSEY } from "@/lib/jerseyOptions";
import { MAX_BENCH_PLAYERS } from "@/lib/limits";
import { findPitchSlotTarget } from "@/lib/dropTargets";
import { findHiddenAwaySlot, isCustomizedPlayer } from "@/lib/playerPool";
import {
  isIncomingBenchSub,
  isBenchAreaTarget,
  isBenchCloneSubIn,
} from "@/lib/dragIntent";

/** Panel genişliği (w-60 / w-72) içinde iki sütuna sığan yedek kartı boyutu */
const BENCH_CARD_SIZE = 96;

const PlayerEditModal = dynamic(
  () => import("./PlayerEditModal").then((module) => module.PlayerEditModal),
  { ssr: false }
);

function BenchPlayerCard({
  player,
  jersey = NEUTRAL_BENCH_JERSEY,
  dragging,
  isIncomingSub,
  cardSize,
  onEdit,
  onDelete,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: {
  player: Player;
  jersey?: JerseyConfig;
  dragging: boolean;
  isIncomingSub: boolean;
  cardSize: number;
  onEdit: () => void;
  onDelete?: () => void;
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
      title="Sahaya sürükle ya da düzenlemek için tıkla"
      className={`group relative flex justify-center rounded-xl border bg-zinc-800/40 px-1 pt-2.5 pb-2 cursor-grab active:cursor-grabbing transition-colors select-none ${
        dragging ? "opacity-0 border-zinc-800/60" : "border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/70"
      }`}
      style={{ touchAction: "none" }}
    >
      <div className="absolute top-1 right-1 z-10 flex flex-col gap-0.5 opacity-40 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onEdit}
          className="p-1 rounded-md bg-zinc-900/70 text-zinc-300 hover:text-white hover:bg-zinc-700"
          title="Düzenle"
          aria-label={`${player.name || "Yedek"} düzenle`}
        >
          <Pencil className="w-3 h-3" />
        </button>
        {onDelete && (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onDelete}
            className="p-1 rounded-md bg-zinc-900/70 text-zinc-400 hover:text-red-400 hover:bg-red-950/60"
            title="Yedekten sil"
            aria-label={`${player.name || "Yedek"} sil`}
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>

      <PlayerAvatar
        player={player}
        jersey={jersey}
        number={player.number}
        name={player.name || "İsimsiz"}
        size={cardSize}
        isCaptain={false}
        showName
        variant="dark"
      />

      {isIncomingSub && <PlayerDropOverlay variant="sub-in" />}
    </div>
  );
}

export function BenchPanel() {
  const [collapsed, setCollapsed] = useState(false);
  const [editingBenchId, setEditingBenchId] = useState<string | null>(null);

  const [draggingBenchId, setDraggingBenchId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragCardSize, setDragCardSize] = useState({ width: 0, height: 0 });
  const currentBenchId = useRef<string | null>(null);

  const benchPlayerIds = useAppStore((s) => s.benchPlayerIds);
  const players = useAppStore((s) => s.players);
  const savedPlayers = useAppStore((s) => s.savedPlayers);
  const teamMode = useAppStore((s) => s.teamMode);
  const awayTeam = useAppStore((s) => s.awayTeam);
  const squadSize = useAppStore((s) => s.squadSize);
  const swapPlayers = useAppStore((s) => s.swapPlayers);
  const setSlotPlayer = useAppStore((s) => s.setSlotPlayer);
  const [editingAwaySlot, setEditingAwaySlot] = useState<number | null>(null);
  // Yeni yedek yalnızca "Kaydet"te oluşturulur; vazgeçince boş kart kalmaz.
  const [creatingBench, setCreatingBench] = useState(false);
  const dragIntent = useDragStore((s) => s.dragIntent);
  const addPlayerToBench = useAppStore((s) => s.addPlayerToBench);
  const updateBenchPlayer = useAppStore((s) => s.updateBenchPlayer);
  const removeFromBench = useAppStore((s) => s.removeFromBench);
  const assignBenchToSlot = useAppStore((s) => s.assignBenchToSlot);
  const setDragIntent = useDragStore((s) => s.setDragIntent);

  const benchCardSize = useAutoCardSize();
  // Panel kartı moddan bağımsız, iki sütuna rahat sığan sabit boyut (tek takımda
  // saha kartları küçüldüğünde yedekler de küçülmesin). Sürükleme önizlemesi saha boyutunda.
  const listCardSize = BENCH_CARD_SIZE;

  const benchFull = benchPlayerIds.length >= MAX_BENCH_PLAYERS;

  const benchEntries = benchPlayerIds.map((benchId) => ({
    benchId,
    player: players[benchId] ?? savedPlayers[benchId],
  }));

  // Tek takım modunda gizli kalan rakip takımın özelleştirilmiş oyuncuları.
  const hiddenAwayEntries =
    teamMode === "single"
      ? awayTeam.playerIds
          .slice(0, squadSize)
          .map((id, slotIndex) => ({
            slotIndex,
            player: id ? players[id] ?? savedPlayers[id] : undefined,
          }))
          .filter(
            (entry): entry is { slotIndex: number; player: Player } =>
              isCustomizedPlayer(entry.player)
          )
      : [];

  const editingAwayPlayer =
    editingAwaySlot !== null
      ? (() => {
          const id = awayTeam.playerIds[editingAwaySlot];
          return id ? players[id] ?? savedPlayers[id] : undefined;
        })()
      : undefined;

  const editingPlayer = editingBenchId
    ? players[editingBenchId] ?? savedPlayers[editingBenchId]
    : undefined;

  const editingBenchIndex = editingBenchId
    ? benchPlayerIds.indexOf(editingBenchId)
    : -1;

  const draggingPlayer = draggingBenchId
    ? players[draggingBenchId] ?? savedPlayers[draggingBenchId]
    : undefined;
  const draggingIsHiddenAway = hiddenAwayEntries.some(
    (entry) => entry.player.id === draggingBenchId
  );

  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    label: string;
  } | null>(null);

  const handleDelete = (playerId: string, playerName: string) => {
    setPendingDelete({ id: playerId, label: playerName.trim() || "Bu yedek" });
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    removeFromBench(pendingDelete.id);
    if (editingBenchId === pendingDelete.id) setEditingBenchId(null);
    setPendingDelete(null);
  };

  const { dragClientPos, handlePointerDown, handlePointerMove, handlePointerUp, handlePointerCancel } = usePlayerDrag({
    onStart: () => {
      const benchId = currentBenchId.current;
      if (benchId) setDraggingBenchId(benchId);
    },
    onMove: (clientX, clientY) => {
      const benchId = currentBenchId.current;
      if (!benchId) return;
      const target = findPitchSlotTarget(clientX, clientY);
      setDragIntent({
        kind: "active",
        source: { type: "bench", playerId: benchId },
        pointer: { x: clientX, y: clientY },
        target: target ? { type: "pitch", ...target } : null,
      });
    },
    onEnd: (clientX, clientY, moved) => {
      const benchId = currentBenchId.current;
      currentBenchId.current = null;
      setDraggingBenchId(null);
      if (!benchId) {
        setDragIntent({ kind: "idle" });
        return;
      }
      const target = findPitchSlotTarget(clientX, clientY);
      const hiddenAwaySlot = findHiddenAwaySlot(
        useAppStore.getState(),
        benchId
      );
      if (target) {
        if (hiddenAwaySlot >= 0) {
          swapPlayers("away", hiddenAwaySlot, target.team, target.slotIndex);
        } else {
          assignBenchToSlot(target.team, target.slotIndex, benchId);
        }
      } else if (!moved) {
        if (hiddenAwaySlot >= 0) setEditingAwaySlot(hiddenAwaySlot);
        else setEditingBenchId(benchId);
      }
      setDragIntent({ kind: "idle" });
    },
  });

  const handleBenchPointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    benchId: string
  ) => {
    if (e.button !== 0) return;
    currentBenchId.current = benchId;
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    setDragOffset({
      x: rect.width / 2,
      y: rect.height / 2,
    });
    setDragCardSize({ width: rect.width, height: rect.height });
    handlePointerDown(e, (r) => ({ x: r.width / 2, y: r.height / 2 }));
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
        className={`shrink-0 w-60 sm:w-72 border-l border-zinc-800 bg-zinc-900/95 flex flex-col min-h-0 transition-colors ${
          isBenchAreaTarget(dragIntent)
            ? "ring-2 ring-inset ring-green-500/40 bg-zinc-800/90"
            : ""
        }`}
      >
        <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-zinc-800">
          <div>
            <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-white">
              Yedekler
              <span className="rounded-md bg-zinc-800 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-zinc-400">
                {benchEntries.length}/{MAX_BENCH_PLAYERS}
              </span>
            </h2>
            <p className="text-[10px] text-zinc-500">Sahaya sürükle · her maçta kayıtlı</p>
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

        <div className="flex-1 overflow-y-auto p-2 min-h-0">
          {benchEntries.length === 0 ? (
            <div className="mt-4 flex flex-col items-center gap-2 rounded-xl border border-dashed border-zinc-700 px-4 py-6 text-center">
              <UsersRound className="h-6 w-6 text-zinc-600" aria-hidden />
              <p className="text-[11px] font-semibold text-zinc-300">Henüz yedek yok</p>
              <p className="text-[10px] leading-relaxed text-zinc-500">
                Sahadaki bir oyuncuyu buraya sürükle ya da aşağıdan yeni oyuncu ekle.
                Yedekler her maçta kayıtlı kalır.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {benchEntries.map(({ benchId, player }) => (
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
                  isIncomingSub={isIncomingBenchSub(dragIntent, benchId)}
                  cardSize={listCardSize}
                  onEdit={() => setEditingBenchId(benchId)}
                  onDelete={() =>
                    handleDelete(benchId, player?.name ?? "Bu yedek")
                  }
                  onPointerDown={(e) => handleBenchPointerDown(e, benchId)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerCancel}
                />
              ))}
            </div>
          )}

          {hiddenAwayEntries.length > 0 && (
            <section className="pt-3 mt-3 border-t border-zinc-800 space-y-2">
              <div className="px-1">
                <h3 className="text-[11px] font-black uppercase tracking-wide text-zinc-300">
                  {awayTeam.shortName} kadrosu
                </h3>
                <p className="text-[10px] text-zinc-500 leading-snug">
                  Tek takım modunda posterde görünmez. Sürükleyip sahadaki bir
                  oyuncuyla yer değiştirebilirsin.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {hiddenAwayEntries.map(({ slotIndex, player }) => (
                  <BenchPlayerCard
                    key={`away-${player.id}`}
                    player={player}
                    jersey={awayTeam.jersey}
                    dragging={draggingBenchId === player.id}
                    isIncomingSub={isIncomingBenchSub(dragIntent, player.id)}
                    cardSize={listCardSize}
                    onEdit={() => setEditingAwaySlot(slotIndex)}
                    onPointerDown={(e) => handleBenchPointerDown(e, player.id)}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerCancel}
                  />
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="shrink-0 p-2 border-t border-zinc-800">
          {benchFull && (
            <p className="mb-1.5 text-center text-[10px] text-zinc-500">
              Yedek havuzu dolu ({MAX_BENCH_PLAYERS} oyuncu). Yeni eklemek için
              birini sil.
            </p>
          )}
          <button
            type="button"
            onClick={() => setCreatingBench(true)}
            disabled={benchFull}
            className="w-full flex items-center justify-center gap-1.5 h-9 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:hover:bg-zinc-800 text-xs font-semibold text-zinc-200"
          >
            <Plus className="w-3.5 h-3.5" />
            Yeni oyuncu
          </button>
        </div>
      </aside>

      {draggingPlayer &&
        createPortal(
          <div
            className="fixed z-[60] pointer-events-none flex items-center justify-center"
            style={{
              left: dragClientPos.x - dragOffset.x,
              top: dragClientPos.y - dragOffset.y,
              width: dragCardSize.width,
              height: dragCardSize.height,
              opacity: 0.9,
            }}
          >
            <PlayerDragPreview
              player={draggingPlayer}
              jersey={draggingIsHiddenAway ? awayTeam.jersey : NEUTRAL_BENCH_JERSEY}
              size={benchCardSize}
              variant="dark"
              overlay={isBenchCloneSubIn(dragIntent) ? "sub-in" : null}
            />
          </div>,
          document.body
        )}

      {editingAwaySlot !== null && (
        <PlayerEditModal
          key={`away-${editingAwaySlot}`}
          open
          onClose={() => setEditingAwaySlot(null)}
          jersey={awayTeam.jersey}
          player={editingAwayPlayer}
          slotIndex={editingAwaySlot}
          isCaptain={false}
          onToggleCaptain={() => {}}
          showCaptainToggle={false}
          onSave={(data) => setSlotPlayer("away", editingAwaySlot, data)}
          source="lineup"
          team="away"
          teammateNumbers={awayTeam.playerIds
            .slice(0, squadSize)
            .filter((id, i) => id && i !== editingAwaySlot)
            .map((id) => players[id] ?? savedPlayers[id])
            .filter((p): p is Player => Boolean(p))
            .map((p) => ({ number: p.number, name: p.name }))}
          variant="dark"
        />
      )}

      <ModalShell
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        zIndexClass="z-[140]"
        panelClassName="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
      >
        <div className="p-5 space-y-4">
          <p className="text-sm text-zinc-200 leading-relaxed">
            <strong className="text-white">{pendingDelete?.label}</strong> yedek
            havuzundan silinsin mi? Fotoğrafı da silinir.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPendingDelete(null)}
              className="flex-1 h-10 rounded-xl bg-zinc-800 text-sm font-semibold text-zinc-200 hover:bg-zinc-700"
            >
              İptal
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              className="flex-1 h-10 rounded-xl bg-red-600 hover:bg-red-500 text-sm font-semibold text-white"
            >
              Sil
            </button>
          </div>
        </div>
      </ModalShell>

      {creatingBench && (
        <PlayerEditModal
          key="new-bench-player"
          open
          onClose={() => setCreatingBench(false)}
          jersey={NEUTRAL_BENCH_JERSEY}
          player={undefined}
          slotIndex={benchPlayerIds.length}
          isCaptain={false}
          onToggleCaptain={() => {}}
          showCaptainToggle={false}
          onSave={(data) => {
            const id = addPlayerToBench({ name: data.name, number: data.number });
            updateBenchPlayer(id, data);
          }}
          source="bench"
          defaultPlayerName={`Yedek ${benchPlayerIds.length + 1}`}
          variant="dark"
        />
      )}

      {editingBenchId && (
        <PlayerEditModal
          key={editingBenchId}
          open
          onClose={() => setEditingBenchId(null)}
          jersey={NEUTRAL_BENCH_JERSEY}
          player={editingPlayer}
          slotIndex={Math.max(editingBenchIndex, 0)}
          isCaptain={false}
          onToggleCaptain={() => {}}
          showCaptainToggle={false}
          onSave={(data) => updateBenchPlayer(editingBenchId, data)}
          source="bench"
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
