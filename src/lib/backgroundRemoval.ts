"use client";

import { removeBackground as imglyRemoveBackground } from "@imgly/background-removal";

export type BackgroundRemovalProgress = {
  label: string;
  percent: number;
};

export type BackgroundRemovalOptions = {
  onProgress?: (progress: BackgroundRemovalProgress) => void;
  /** Smaller model (~40MB) — faster first run than default medium (~80MB). */
  model?: "isnet_quint8" | "isnet_fp16" | "isnet";
};

export async function removeBackground(
  file: File,
  options: BackgroundRemovalOptions = {}
): Promise<string> {
  const blob = await imglyRemoveBackground(file, {
    model: options.model ?? "isnet_quint8",
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
