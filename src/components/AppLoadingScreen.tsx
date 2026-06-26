"use client";

import { Loader2 } from "lucide-react";

type AppLoadingScreenProps = {
  message?: string;
};

export function AppLoadingScreen({
  message = "Kadro yükleniyor…",
}: AppLoadingScreenProps) {
  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-zinc-950 text-white"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-5 px-6 text-center">
        <p className="text-lg font-black tracking-wide">⚽ Halı Saha Kadro</p>
        <Loader2
          className="h-8 w-8 animate-spin text-green-500"
          aria-hidden
        />
        <p className="text-sm text-zinc-500">{message}</p>
      </div>
    </div>
  );
}
