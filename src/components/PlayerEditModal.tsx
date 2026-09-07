"use client";

import { useCallback, useRef, useState } from "react";
import {
  Camera,
  Crown,
  Loader2,
  RotateCcw,
  Scissors,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { blobUrlToDataUrl, fileToDataUrl } from "@/lib/fileToDataUrl";
import {
  compressDataUrl,
  getPhotoDisplayStyle,
  getPhotoImgClassName,
} from "@/lib/imageCompress";
import { PHOTO_CROP_VIEWPORT_REF } from "@/lib/photoCrop";
import { removeBackground, isModelReady } from "@/lib/backgroundRemoval";
import { useModalBackdrop } from "@/hooks/useModalBackdrop";
import { useAppStore } from "@/store/useAppStore";
import type { JerseyConfig, PhotoCrop, Player } from "@/types";
import { PlayerAvatar } from "./PlayerAvatar";

const DEFAULT_CROP: PhotoCrop = { scale: 1, panX: 0, panY: 0 };

interface PlayerEditModalProps {
  open: boolean;
  onClose: () => void;
  jersey: JerseyConfig;
  player?: Player;
  slotIndex: number;
  isCaptain: boolean;
  onSave: (data: {
    name: string;
    number: number;
    photoSource?: string;
    cutoutUrl?: string;
    photoCrop?: PhotoCrop;
    clearPhoto?: boolean;
  }) => void;
  onToggleCaptain: () => void;
  variant?: "light" | "dark";
  showCaptainToggle?: boolean;
  onRemoveFromBench?: () => void;
  defaultPlayerName?: string;
}

export function PlayerEditModal({ open, ...props }: PlayerEditModalProps) {
  if (!open) return null;
  return (
    <PlayerEditModalBody
      key={`${props.player?.id ?? "slot"}-${props.slotIndex}`}
      {...props}
    />
  );
}

function PlayerEditModalBody({
  onClose,
  jersey,
  player,
  slotIndex,
  isCaptain,
  onSave,
  onToggleCaptain,
  variant = "dark",
  showCaptainToggle = true,
  onRemoveFromBench,
  defaultPlayerName,
}: Omit<PlayerEditModalProps, "open">) {
  const [name, setName] = useState(
    () =>
      player?.name?.trim() ||
      defaultPlayerName ||
      `Oyuncu ${slotIndex + 1}`
  );
  const [number, setNumber] = useState(() => player?.number ?? slotIndex + 1);
  const [photoSource, setPhotoSource] = useState<string | null>(
    () => player?.photoSource ?? player?.photoUrl ?? null
  );
  const [cutoutUrl, setCutoutUrl] = useState<string | null>(
    () => player?.cutoutUrl ?? null
  );
  const [beforeCutout, setBeforeCutout] = useState<string | null | undefined>(
    undefined
  );
  const [crop, setCrop] = useState<PhotoCrop>(
    () => player?.photoCrop ?? DEFAULT_CROP
  );
  const [removingBg, setRemovingBg] = useState(false);
  const [bgProgress, setBgProgress] = useState<string | null>(null);
  const [bgError, setBgError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const playerCardSize = useAppStore((s) => s.playerCardSize);
  const photoScalePercent = useAppStore((s) => s.photoScalePercent);

  const { backdropProps, panelProps, openFilePicker, clearPickingFile } =
    useModalBackdrop({
      open: true,
      onClose,
      busy: removingBg || saving,
    });

  const hasPhoto = Boolean(photoSource);
  const displaySrc = cutoutUrl || photoSource;
  const isCutout = Boolean(cutoutUrl);

  const handleFile = async (file: File) => {
    clearPickingFile();
    const url = await fileToDataUrl(file);
    setPhotoSource(url);
    setCutoutUrl(null);
    setBeforeCutout(undefined);
    setCrop(DEFAULT_CROP);
    setBgError(null);
    setBgProgress(null);
  };

  const handleRemoveBg = async () => {
    const src = photoSource;
    if (!src || removingBg) return;
    setRemovingBg(true);
    setBgError(null);
    setBgProgress(isModelReady() ? "Arka plan kaldırılıyor…" : "Model indiriliyor…");
    setBeforeCutout(cutoutUrl);
    try {
      const blobUrl = await removeBackground(src, {
        onProgress: ({ label, percent }) => {
          if (label.startsWith("fetch:")) {
            setBgProgress(`Model indiriliyor… %${percent}`);
            return;
          }
          if (label.startsWith("compute:")) {
            setBgProgress("Arka plan kaldırılıyor…");
            return;
          }
          setBgProgress(`${label}… %${percent}`);
        },
      });
      const dataUrl = await blobUrlToDataUrl(blobUrl);
      const compressed = await compressDataUrl(dataUrl, { kind: "cutout" });
      setCutoutUrl(compressed);
      setBgProgress(null);
    } catch (err) {
      console.error("Background removal failed:", err);
      setBgError(
        err instanceof Error
          ? err.message
          : "Arka plan kaldırılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin."
      );
      setBeforeCutout(undefined);
      setBgProgress(null);
    } finally {
      setRemovingBg(false);
    }
  };

  const undoCutout = () => {
    if (beforeCutout === undefined) return;
    setCutoutUrl(beforeCutout);
    setBeforeCutout(undefined);
  };

  const clearPhoto = () => {
    setPhotoSource(null);
    setCutoutUrl(null);
    setBeforeCutout(undefined);
    setCrop(DEFAULT_CROP);
  };

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setCrop((c) => ({
      ...c,
      scale: Math.max(1, Math.min(5, c.scale - e.deltaY * 0.002)),
    }));
  }, []);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      let finalPhoto = photoSource ?? undefined;
      let finalCutout = cutoutUrl ?? undefined;
      if (finalPhoto?.startsWith("data:")) {
        finalPhoto = await compressDataUrl(finalPhoto, { kind: "photo" });
      }
      if (finalCutout?.startsWith("data:")) {
        finalCutout = await compressDataUrl(finalCutout, { kind: "cutout" });
      }
      onSave({
        name: name.trim(),
        number,
        photoSource: finalPhoto,
        cutoutUrl: finalCutout,
        photoCrop: crop,
        clearPhoto: !finalPhoto && !finalCutout,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const previewPlayer: Player = {
    id: "preview",
    name,
    number,
    photoSource: photoSource ?? undefined,
    cutoutUrl: cutoutUrl ?? undefined,
    photoCrop: crop,
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
      {...backdropProps}
    >
      <div
        className="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-md max-h-[92vh] shadow-2xl overflow-hidden flex flex-col"
        {...panelProps}
      >
        <div className="flex items-center justify-between px-5 py-3.5 shrink-0">
          <h3 className="text-sm font-semibold text-white tracking-wide">
            Oyuncu
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={removingBg}
            className="text-zinc-500 hover:text-white transition-colors disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-4 overflow-y-auto min-h-0">
          <div className="flex justify-center py-2 bg-zinc-950/50 rounded-xl">
            <PlayerAvatar
              player={previewPlayer}
              jersey={jersey}
              number={number}
              name={name}
              size={playerCardSize}
              photoScale={photoScalePercent}
              isCaptain={isCaptain}
              variant={variant}
            />
          </div>

          <div className="space-y-2.5">
            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                max={99}
                value={number}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  if (Number.isFinite(n)) setNumber(n);
                }}
                className="no-spinner w-14 h-11 bg-zinc-800/80 border border-zinc-700 rounded-xl text-center text-xl font-black text-white focus:outline-none focus:border-green-500/70 focus:ring-1 focus:ring-green-500/30"
                aria-label="Numara"
              />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ad Soyad"
                autoFocus
                className="flex-1 min-w-0 h-11 bg-zinc-800/80 border border-zinc-700 rounded-xl px-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-green-500/70 focus:ring-1 focus:ring-green-500/30"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => openFilePicker(fileInputRef.current)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg bg-zinc-800/80 text-xs text-zinc-300 hover:bg-zinc-700 ring-1 ring-zinc-700/80 transition-colors"
              >
                <Camera className="w-3.5 h-3.5" />
                {hasPhoto ? "Fotoğraf değiştir" : "Fotoğraf ekle"}
              </button>
              {showCaptainToggle && (
                <button
                  type="button"
                  onClick={onToggleCaptain}
                  className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-medium transition-colors ${
                    isCaptain
                      ? "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/40"
                      : "bg-zinc-800/80 text-zinc-500 ring-1 ring-zinc-700 hover:text-zinc-300"
                  }`}
                >
                  <Crown
                    className={`w-3.5 h-3.5 ${isCaptain ? "fill-amber-400/30" : ""}`}
                  />
                  {isCaptain ? "Kaptan" : "Kaptan yap"}
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                clearPickingFile();
                if (f) void handleFile(f);
                e.target.value = "";
              }}
            />
          </div>

          {hasPhoto && (
            <div className="space-y-2.5 pt-1 border-t border-zinc-800/80">
              <div className="relative mx-auto w-fit">
                <div
                  className="relative overflow-hidden rounded-full cursor-grab active:cursor-grabbing select-none ring-2 ring-zinc-600"
                  style={{
                    width: 100,
                    height: 100,
                    padding: 3,
                    background: `linear-gradient(135deg, ${jersey.primaryColor} 50%, ${jersey.secondaryColor} 50%)`,
                  }}
                  onWheel={onWheel}
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    setDragging(true);
                    dragStart.current = {
                      x: e.clientX,
                      y: e.clientY,
                      panX: crop.panX,
                      panY: crop.panY,
                    };
                  }}
                  onPointerMove={(e) => {
                    if (!dragging) return;
                    setCrop((c) => ({
                      ...c,
                      panX:
                        dragStart.current.panX +
                        (e.clientX - dragStart.current.x),
                      panY:
                        dragStart.current.panY +
                        (e.clientY - dragStart.current.y),
                    }));
                  }}
                  onPointerUp={() => setDragging(false)}
                  onPointerCancel={() => setDragging(false)}
                >
                  <div className="relative w-full h-full rounded-full overflow-hidden bg-zinc-800">
                    <img
                      src={displaySrc!}
                      alt=""
                      draggable={false}
                      className={getPhotoImgClassName(isCutout)}
                      style={getPhotoDisplayStyle(crop, isCutout, PHOTO_CROP_VIEWPORT_REF)}
                    />
                    {removingBg && (
                      <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center gap-1 px-2 text-center">
                        <Loader2 className="w-6 h-6 animate-spin text-green-400" />
                        <span className="text-[9px] text-white/90">
                          {bgProgress ?? "Kaldırılıyor…"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-center text-[10px] text-zinc-600 mt-1.5">
                  Sürükle · scroll ile yakınlaştır (boydan fotoğraflarda yüzü
                  ortalamak için yakınlaştır)
                </p>
              </div>

              <div className="flex items-center gap-2 px-1">
                <ZoomOut className="w-3 h-3 text-zinc-600 shrink-0" />
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={0.05}
                  value={crop.scale}
                  onChange={(e) =>
                    setCrop((c) => ({
                      ...c,
                      scale: parseFloat(e.target.value),
                    }))
                  }
                  className="flex-1 accent-green-600 h-1"
                />
                <ZoomIn className="w-3 h-3 text-zinc-600 shrink-0" />
              </div>

              {bgError && (
                <p className="text-[11px] text-red-400/90 px-1 leading-snug">
                  {bgError}
                </p>
              )}

              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={handleRemoveBg}
                  disabled={removingBg}
                  className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg bg-zinc-800/80 text-[11px] text-zinc-300 hover:bg-zinc-700 disabled:opacity-40 ring-1 ring-zinc-700/80"
                >
                  <Scissors className="w-3 h-3" />
                  {removingBg ? "İşleniyor…" : "Arka plan kaldır"}
                </button>
                {beforeCutout !== undefined && (
                  <button
                    type="button"
                    onClick={undoCutout}
                    className="flex items-center gap-1 h-8 px-2.5 rounded-lg bg-zinc-800/80 text-[11px] text-amber-400 hover:bg-zinc-700 ring-1 ring-zinc-700/80"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Geri al
                  </button>
                )}
                <button
                  type="button"
                  onClick={clearPhoto}
                  className="flex items-center justify-center h-8 w-8 rounded-lg bg-zinc-800/80 text-red-400/70 hover:text-red-400 hover:bg-zinc-700 ring-1 ring-zinc-700/80"
                  title="Fotoğrafı kaldır"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {onRemoveFromBench && (
            <div className="flex flex-col gap-1.5 pt-1 border-t border-zinc-800/80">
              <button
                type="button"
                onClick={() => {
                  onRemoveFromBench();
                }}
                className="w-full flex items-center justify-center gap-1.5 h-9 rounded-lg bg-red-950/40 text-xs font-semibold text-red-400 hover:bg-red-950/60 ring-1 ring-red-900/50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Yedekten sil
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || removingBg}
            className="w-full h-10 rounded-xl bg-green-600 text-sm font-semibold text-white hover:bg-green-500 active:bg-green-700 transition-colors disabled:opacity-50 disabled:pointer-events-none"
          >
            {saving ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}
