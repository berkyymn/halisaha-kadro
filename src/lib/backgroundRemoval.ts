"use client";

import { removeBackground as imglyRemoveBackground } from "@imgly/background-removal";

export type BackgroundRemovalProgress = {
  label: string;
  percent: number;
};

export type BackgroundRemovalOptions = {
  onProgress?: (progress: BackgroundRemovalProgress) => void;
  model?: "isnet_quint8" | "isnet_fp16" | "isnet";
};

/** Model ilk başarılı kullanımda indirilir; sonrası tarayıcı önbelleğinden gelir. */
let modelReady = false;

export function isModelReady(): boolean {
  return modelReady;
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
  modelReady = true;
  return URL.createObjectURL(blob);
}
