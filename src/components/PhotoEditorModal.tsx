"use client";

/** @deprecated Unused — player photos are edited in PlayerEditModal. Kept for reference. */

import { useCallback, useRef, useState } from "react";
import { Loader2, Upload, X, ZoomIn, ZoomOut } from "lucide-react";
import { removeBackground } from "@/lib/backgroundRemoval";
import { fileToDataUrl } from "@/lib/fileToDataUrl";
import { type PhotoCrop, renderPlayerAvatar } from "@/lib/photoCrop";
import type { JerseyConfig } from "@/types";

export interface PhotoEditorResult {
  avatarUrl: string;
  photoSource: string;
  photoCrop: PhotoCrop;
}

interface PhotoEditorModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (result: PhotoEditorResult) => void;
  jersey: JerseyConfig;
  playerName?: string;
  initialSource?: string;
  initialCrop?: PhotoCrop;
}

const DEFAULT_CROP: PhotoCrop = { scale: 1, panX: 0, panY: 0 };

export function PhotoEditorModal({ open, ...props }: PhotoEditorModalProps) {
  if (!open) return null;
  return <PhotoEditorModalBody {...props} />;
}

function PhotoEditorModalBody({
  onClose,
  onSave,
  jersey,
  playerName,
  initialSource,
  initialCrop,
}: Omit<PhotoEditorModalProps, "open">) {
  const [source, setSource] = useState<string | null>(
    () => initialSource ?? null
  );
  const [crop, setCrop] = useState<PhotoCrop>(
    () => initialCrop ?? DEFAULT_CROP
  );
  const [removeBg, setRemoveBg] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const viewportRef = useRef<HTMLDivElement>(null);

  const handleFile = async (file: File) => {
    const url = await fileToDataUrl(file);
    setSource(url);
    setCrop(DEFAULT_CROP);
  };

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setCrop((c) => ({
      ...c,
      scale: Math.max(1, Math.min(3, c.scale - e.deltaY * 0.002)),
    }));
  }, []);

  const handleSave = async () => {
    if (!source) return;
    setProcessing(true);
    try {
      let processed = source;
      if (removeBg) {
        const res = await fetch(source);
        const blob = await res.blob();
        const file = new File([blob], "photo.jpg", { type: blob.type });
        processed = await removeBackground(file);
      }
      const avatarUrl = await renderPlayerAvatar(processed, crop, {
        primaryColor: jersey.primaryColor,
        secondaryColor: jersey.secondaryColor,
      });
      onSave({ avatarUrl, photoSource: source, photoCrop: crop });
      onClose();
    } catch {
      alert("Fotoğraf işlenemedi. Tekrar deneyin.");
    } finally {
      setProcessing(false);
    }
  };

  const previewSize = 220;
  const ring = 5;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <div>
            <h3 className="text-sm font-bold text-white">Fotoğraf Düzenle</h3>
            {playerName && (
              <p className="text-xs text-zinc-500">{playerName}</p>
            )}
          </div>
          <button type="button" onClick={onClose} className="p-1 text-zinc-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {!source ? (
            <label className="flex flex-col items-center justify-center h-52 border-2 border-dashed border-zinc-700 rounded-xl cursor-pointer hover:border-green-600 hover:bg-zinc-800/50 transition-colors">
              <Upload className="w-8 h-8 text-zinc-500 mb-2" />
              <span className="text-sm text-zinc-400">Fotoğraf seç</span>
              <span className="text-xs text-zinc-600 mt-1">JPG, PNG</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </label>
          ) : (
            <>
              <div
                ref={viewportRef}
                className="relative mx-auto overflow-hidden rounded-full cursor-grab active:cursor-grabbing select-none"
                style={{
                  width: previewSize,
                  height: previewSize,
                  padding: ring,
                  background: `linear-gradient(135deg, ${jersey.primaryColor} 50%, ${jersey.secondaryColor} 50%)`,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
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
                    panX: dragStart.current.panX + (e.clientX - dragStart.current.x),
                    panY: dragStart.current.panY + (e.clientY - dragStart.current.y),
                  }));
                }}
                onPointerUp={() => setDragging(false)}
                onPointerCancel={() => setDragging(false)}
              >
                <div className="w-full h-full rounded-full overflow-hidden bg-zinc-800">
                  <img
                    src={source}
                    alt=""
                    className="w-full h-full object-cover pointer-events-none"
                    style={{
                      transform: `scale(${crop.scale}) translate(${crop.panX / crop.scale}px, ${crop.panY / crop.scale}px)`,
                      transformOrigin: "center center",
                    }}
                    draggable={false}
                  />
                </div>
              </div>

              <p className="text-center text-[11px] text-zinc-500">
                Sürükle = konum · Scroll = yakınlaştır
              </p>

              <div className="flex items-center gap-3">
                <ZoomOut className="w-4 h-4 text-zinc-500 shrink-0" />
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.05}
                  value={crop.scale}
                  onChange={(e) =>
                    setCrop((c) => ({ ...c, scale: parseFloat(e.target.value) }))
                  }
                  className="flex-1 accent-green-600"
                />
                <ZoomIn className="w-4 h-4 text-zinc-500 shrink-0" />
              </div>

              <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={removeBg}
                  onChange={(e) => setRemoveBg(e.target.checked)}
                  className="accent-green-600"
                />
                Arka plan kaldır (yavaş, isteğe bağlı)
              </label>

              <label className="block text-center text-xs text-green-500 cursor-pointer hover:underline">
                Başka fotoğraf seç
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
              </label>
            </>
          )}
        </div>

        <div className="flex gap-2 px-4 py-3 border-t border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-9 rounded-lg bg-zinc-800 text-sm text-zinc-300 hover:bg-zinc-700"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!source || processing}
            className="flex-1 h-9 rounded-lg bg-green-600 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                İşleniyor...
              </>
            ) : (
              "Kaydet"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
