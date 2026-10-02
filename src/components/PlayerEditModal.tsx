"use client";

import { reportError } from "@/lib/errorReporting";
import { useCallback, useRef, useState } from "react";
import {
  Camera,
  Crown,
  ImagePlus,
  Loader2,
  RotateCcw,
  Scissors,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { blobUrlToDataUrl, fileToDataUrl } from "@/lib/fileToDataUrl";
import {
  compressDataUrl,
  getPhotoDisplayStyle,
  getPhotoImgClassName,
} from "@/lib/imageCompress";
import { loadImage, PHOTO_CROP_VIEWPORT_REF } from "@/lib/photoCrop";
import { removeBackground, isModelReady } from "@/lib/backgroundRemoval";
import { resolveJerseyNumber, sanitizeJerseyNumberInput } from "@/lib/teamJerseyNumbers";
import { useModalBackdrop } from "@/hooks/useModalBackdrop";
import type { JerseyConfig, PhotoCrop, Player } from "@/types";
import { PlayerAvatar } from "./PlayerAvatar";

const DEFAULT_CROP: PhotoCrop = { scale: 1, panX: 0, panY: 0 };
/** Kırpma dairesi (dış çap, 3px çerçeve). Kaydırma PHOTO_CROP_VIEWPORT_REF'e göre
 *  saklanır: pencerede görülen kırpma kartta birebir aynı çıkar. */
const CROP_VIEW_PX = 120;
const CROP_INNER_PX = CROP_VIEW_PX - 6;
const CROP_TO_REF = PHOTO_CROP_VIEWPORT_REF / CROP_INNER_PX;
const MAX_PHOTO_BYTES = 20 * 1024 * 1024;

function clampJerseyNumber(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(99, Math.round(value)));
}

function isEnterSubmit(e: React.KeyboardEvent): boolean {
  return e.key === "Enter" && !e.nativeEvent.isComposing;
}

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
  /** Pencere başlığındaki bağlam (takım adı); yedek havuzunda gösterilmez */
  teamName?: string;
  defaultPlayerName?: string;
  source?: "lineup" | "bench";
  team?: "home" | "away";
  /** Aynı takımdaki diğer oyuncuların numaraları (tekrar uyarısı için) */
  teammateNumbers?: { number: number; name: string }[];
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
  source = "lineup",
  team,
  teammateNumbers = [],
  teamName,
}: Omit<PlayerEditModalProps, "open">) {
  const [name, setName] = useState(
    () =>
      player?.name?.trim() ||
      defaultPlayerName ||
      `Oyuncu ${slotIndex + 1}`
  );
  // Metin olarak tutulur: yazarken boş bırakılabilir; yalnızca 1–99 rakam kabul edilir.
  const [numberText, setNumberText] = useState(() => String(player?.number ?? slotIndex + 1));
  const number = parseInt(numberText, 10);
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
  const [photoError, setPhotoError] = useState<string | null>(null);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Fotoğraf her değiştiğinde artar; bittiğinde fotoğrafı değişmiş olan arka
  // plan kaldırma işleminin sonucu yok sayılır (yanlış fotoğrafa yazılmasın).
  const photoVersionRef = useRef(0);
  // Pencereye dosya sürüklenirken vurgu; iç öğelere girip çıkınca titremesin diye sayaç.
  const [fileOver, setFileOver] = useState(false);
  const fileDragDepth = useRef(0);

  const { backdropProps, panelProps, openFilePicker, clearPickingFile } =
    useModalBackdrop({
      open: true,
      onClose,
      busy: removingBg || saving,
    });

  const hasPhoto = Boolean(photoSource || cutoutUrl);
  const typedNumber = clampJerseyNumber(number);
  const numberOwner = teammateNumbers.find((t) => t.number === typedNumber);
  const resolvedNumber = numberOwner
    ? resolveJerseyNumber(
        typedNumber,
        new Set(teammateNumbers.map((t) => t.number))
      )
    : typedNumber;
  const displaySrc = cutoutUrl || photoSource;
  const contextLabel =
    source === "bench"
      ? "Yedek havuzu"
      : [teamName, slotIndex === 0 ? "Kaleci" : "Kadro"].filter(Boolean).join(" · ");
  const isCutout = Boolean(cutoutUrl);

  const handleFile = async (file: File) => {
    clearPickingFile();
    setPhotoError(null);
    const hadPhotoBefore = Boolean(
      player?.photoSource || player?.photoUrl || player?.cutoutUrl
    );
    if (/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name)) {
      setPhotoError(
        "HEIC fotoğraflar desteklenmiyor. Lütfen JPG veya PNG bir fotoğraf seçin."
      );
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError("Görsel çok büyük (en fazla 20 MB).");
      return;
    }
    let url: string;
    try {
      url = await fileToDataUrl(file);
      // Tarayıcının açamadığı formatları kaydetmeden önce yakala.
      await loadImage(url);
    } catch {
      setPhotoError("Bu görsel açılamadı. Farklı bir JPG veya PNG deneyin.");
      return;
    }
    photoVersionRef.current += 1;
    setPhotoSource(url);
    setCutoutUrl(null);
    setBeforeCutout(undefined);
    setCrop(DEFAULT_CROP);
    setBgError(null);
    setBgProgress(null);
    trackEvent(hadPhotoBefore ? "player_photo_changed" : "player_photo_added");
  };

  const handleRemoveBg = async () => {
    const src = photoSource;
    if (!src || removingBg) return;
    const version = photoVersionRef.current;
    const isStale = () => version !== photoVersionRef.current;
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
      if (isStale()) return;
      setCutoutUrl(compressed);
      setBgProgress(null);
      trackEvent("background_removed");
    } catch (err) {
      if (isStale()) return;
      console.error("Background removal failed:", err);
      reportError(err, "background-removal", { level: "warning" });
      setBgError(
        err instanceof Error
          ? err.message
          : "Arka plan kaldırılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin."
      );
      setBeforeCutout(undefined);
      setBgProgress(null);
    } finally {
      setRemovingBg(false);
      if (isStale()) setBgProgress(null);
    }
  };

  const isFileDrag = (e: React.DragEvent) => e.dataTransfer.types.includes("Files");

  const fileDropProps = {
    onDragEnter: (e: React.DragEvent) => {
      if (!isFileDrag(e)) return;
      e.preventDefault();
      fileDragDepth.current += 1;
      if (!removingBg) setFileOver(true);
    },
    onDragOver: (e: React.DragEvent) => {
      if (!isFileDrag(e)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = removingBg ? "none" : "copy";
    },
    onDragLeave: (e: React.DragEvent) => {
      if (!isFileDrag(e)) return;
      fileDragDepth.current = Math.max(0, fileDragDepth.current - 1);
      if (fileDragDepth.current === 0) setFileOver(false);
    },
    onDrop: (e: React.DragEvent) => {
      if (!isFileDrag(e)) return;
      e.preventDefault();
      e.stopPropagation();
      fileDragDepth.current = 0;
      setFileOver(false);
      if (removingBg || saving) return;
      const file = e.dataTransfer.files[0];
      if (!file) return;
      if (!file.type.startsWith("image/") && !/\.hei[cf]$/i.test(file.name)) {
        setPhotoError("Yalnızca fotoğraf bırakabilirsin (JPG, PNG veya WebP).");
        return;
      }
      void handleFile(file);
    },
  };

  const undoCutout = () => {
    if (beforeCutout === undefined || removingBg) return;
    setCutoutUrl(beforeCutout);
    setBeforeCutout(undefined);
  };

  const clearPhoto = () => {
    if (removingBg) return;
    photoVersionRef.current += 1;
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
    if (saving || removingBg) return;
    setSaving(true);
    setPhotoError(null);
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
        number: clampJerseyNumber(number),
        photoSource: finalPhoto,
        cutoutUrl: finalCutout,
        photoCrop: crop,
        clearPhoto: !finalPhoto && !finalCutout,
      });
      if (source === "lineup") {
        trackEvent("player_edited", { source, team: team ?? "" });
      }
      onClose();
    } catch (err) {
      console.error("Player save failed:", err);
      reportError(err, "photo");
      setPhotoError("Fotoğraf işlenemedi. Farklı bir görsel seçip tekrar deneyin.");
    } finally {
      setSaving(false);
    }
  };

  const handleEnterKey = (e: React.KeyboardEvent) => {
    if (!isEnterSubmit(e)) return;
    e.preventDefault();
    void handleSave();
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
      // Pencere dışına bırakılan dosyayı tarayıcı açmasın (sayfa kaybolur).
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => e.preventDefault()}
    >
      <div
        className="relative bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-md max-h-[92vh] shadow-2xl overflow-hidden flex flex-col"
        {...panelProps}
        {...fileDropProps}
      >
        {fileOver && (
          <div
            className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-green-500/80 bg-zinc-950/85 text-green-300"
            aria-hidden
          >
            <ImagePlus className="h-8 w-8" />
            <p className="text-sm font-semibold">Fotoğrafı bırak</p>
            <p className="text-[11px] text-zinc-400">Oyuncunun fotoğrafı olarak eklenir</p>
          </div>
        )}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white">Oyuncu</h3>
            <p className="truncate text-[10px] text-zinc-500">{contextLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={removingBg}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors disabled:opacity-40"
            aria-label="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 py-4 space-y-4 overflow-y-auto min-h-0">
          <div className="flex justify-center py-2 bg-zinc-950/50 rounded-xl">
            <PlayerAvatar
              player={previewPlayer}
              jersey={jersey}
              number={number}
              name={name}
              size={120}
              isCaptain={isCaptain}
              variant={variant}
            />
          </div>

          <div className="space-y-2.5">
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={numberText}
                onChange={(e) => setNumberText(sanitizeJerseyNumberInput(e.target.value))}
                onBlur={() => setNumberText(String(clampJerseyNumber(number)))}
                onKeyDown={handleEnterKey}
                className="no-spinner w-14 h-11 bg-zinc-800/80 border border-zinc-700 rounded-xl text-center text-xl font-black text-white focus:outline-none focus:border-green-500/70 focus:ring-1 focus:ring-green-500/30"
                aria-label="Numara"
              />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ad Soyad"
                autoFocus
                maxLength={24}
                enterKeyHint="done"
                onKeyDown={handleEnterKey}
                className="flex-1 min-w-0 h-11 bg-zinc-800/80 border border-zinc-700 rounded-xl px-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-green-500/70 focus:ring-1 focus:ring-green-500/30"
              />
            </div>
            {numberOwner && (
              <p className="text-[11px] text-amber-300/90 px-1 leading-snug" role="status">
                {typedNumber} numara {numberOwner.name || "başka bir oyuncu"} oyuncusunda;
                kaydedince {resolvedNumber} numara verilecek.
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => openFilePicker(fileInputRef.current)}
                disabled={removingBg}
                title={removingBg ? "Arka plan kaldırma bitince fotoğrafı değiştirebilirsin" : undefined}
                className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg bg-zinc-800/80 text-xs text-zinc-300 hover:bg-zinc-700 ring-1 ring-zinc-700/80 transition-colors disabled:opacity-40 disabled:hover:bg-zinc-800/80"
              >
                <Camera className="w-3.5 h-3.5" />
                {hasPhoto ? "Fotoğraf değiştir" : "Fotoğraf ekle"}
              </button>
              {showCaptainToggle && (
                <button
                  type="button"
                  onClick={() => {
                    trackEvent(isCaptain ? "captain_unset" : "captain_set", {
                      team: team ?? "",
                    });
                    onToggleCaptain();
                  }}
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
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                clearPickingFile();
                if (f) void handleFile(f);
                e.target.value = "";
              }}
            />
            {!hasPhoto && !photoError && (
              <p className="px-1 text-[11px] text-zinc-500">
                İpucu: fotoğrafı bu pencereye sürükleyip bırakabilirsin.
              </p>
            )}
            {photoError && (
              <p className="text-[11px] text-red-400/90 px-1 leading-snug" role="alert">
                {photoError}
              </p>
            )}
          </div>

          {hasPhoto && (
            <div className="flex gap-4 pt-4 border-t border-zinc-800/80">
              <div className="shrink-0">
                <div
                  className="relative overflow-hidden rounded-full cursor-grab active:cursor-grabbing select-none ring-2 ring-zinc-600"
                  style={{
                    width: CROP_VIEW_PX,
                    height: CROP_VIEW_PX,
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
                        (e.clientX - dragStart.current.x) * CROP_TO_REF,
                      panY:
                        dragStart.current.panY +
                        (e.clientY - dragStart.current.y) * CROP_TO_REF,
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
                      style={getPhotoDisplayStyle(crop, isCutout, CROP_INNER_PX)}
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
              </div>

              <div className="flex min-w-0 flex-1 flex-col justify-center gap-2.5">
                <p className="text-[11px] leading-snug text-zinc-400">
                  Fotoğrafı sürükleyerek konumla; boydan fotoğraflarda yüzü ortalamak için yakınlaştır.
                </p>
                <div className="flex items-center gap-2">
                  <ZoomOut className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
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
                    aria-label="Yakınlaştır"
                  />
                  <ZoomIn className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                </div>

                {bgError && (
                  <p className="text-[11px] text-red-400/90 leading-snug">{bgError}</p>
                )}

                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={handleRemoveBg}
                    disabled={removingBg || !photoSource}
                    title={!photoSource ? "Arka planı kaldırmak için orijinal fotoğrafı yeniden seçin" : undefined}
                    className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg bg-zinc-800/80 text-[11px] text-zinc-300 hover:bg-zinc-700 disabled:opacity-40 ring-1 ring-zinc-700/80"
                  >
                    <Scissors className="w-3 h-3" />
                    {removingBg ? "İşleniyor…" : "Arka plan kaldır"}
                  </button>
                  {beforeCutout !== undefined && (
                    <button
                      type="button"
                      onClick={undoCutout}
                      disabled={removingBg}
                      className="flex items-center gap-1 h-8 px-2.5 rounded-lg bg-zinc-800/80 text-[11px] text-amber-400 hover:bg-zinc-700 ring-1 ring-zinc-700/80 disabled:opacity-40"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Geri al
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={clearPhoto}
                    disabled={removingBg}
                    className="flex items-center justify-center h-8 w-8 rounded-lg bg-zinc-800/80 text-red-400/70 hover:text-red-400 hover:bg-zinc-700 ring-1 ring-zinc-700/80 disabled:opacity-40"
                    title="Fotoğrafı kaldır"
                    aria-label="Fotoğrafı kaldır"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-t border-zinc-800">
          {onRemoveFromBench && (
            <button
              type="button"
              onClick={onRemoveFromBench}
              disabled={saving || removingBg}
              className="inline-flex items-center gap-1.5 h-9 px-2.5 rounded-lg text-xs font-semibold text-red-400 hover:bg-red-950/40 disabled:opacity-40"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Yedekten sil
            </button>
          )}
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            disabled={removingBg}
            className="h-9 px-4 rounded-lg bg-zinc-800 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 disabled:opacity-40"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || removingBg}
            className="h-9 px-5 rounded-lg bg-green-600 text-xs font-semibold text-white hover:bg-green-500 disabled:opacity-50"
          >
            {saving ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}
