"use client";

import { removeBackground as imglyRemoveBackground, preload as imglyPreload } from "@imgly/background-removal";

export type BackgroundRemovalProgress = {
  label: string;
  percent: number;
};

export type BackgroundRemovalOptions = {
  onProgress?: (progress: BackgroundRemovalProgress) => void;
  model?: "isnet_quint8" | "isnet_fp16" | "isnet";
};

type PreloadState = "idle" | "loading" | "ready" | "error";

let preloadState: PreloadState = "idle";
let preloadPromise: Promise<void> | null = null;

export function getPreloadState(): PreloadState {
  return preloadState;
}

export function isModelReady(): boolean {
  return preloadState === "ready";
}

export async function preloadBackgroundRemovalModel(): Promise<void> {
  if (preloadState === "ready" || preloadState === "loading") {
    if (preloadPromise) return preloadPromise;
    return;
  }

  preloadState = "loading";
  preloadPromise = imglyPreload({ model: "isnet_quint8", device: "cpu" })
    .then(() => {
      preloadState = "ready";
      preloadPromise = null;
    })
    .catch((err) => {
      console.warn("[BG-REMOVAL] Model preload failed:", err);
      preloadState = "error";
      preloadPromise = null;
    });

  return preloadPromise;
}

export async function removeBackground(
  source: File | string,
  options: BackgroundRemovalOptions = {}
): Promise<string> {
  const blob = await imglyRemoveBackground(source as Parameters<typeof imglyRemoveBackground>[0], {
    model: options.model ?? "isnet_quint8",
    device: "cpu",
    output: {
      format: "image/webp",
      quality: 0.9,
    },
    progress: options.onProgress
      ? (key, current, total) => {
          options.onProgress?.({
            label: key,
            percent: total > 0 ? Math.round((current / total) * 100) : 0,
          });
        }
      : undefined,
  });
  return URL.createObjectURL(blob);
}
