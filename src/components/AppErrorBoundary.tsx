"use client";

import type { ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import { ErrorBoundary } from "@/lib/errorReporting";
import { isChunkLoadError, reloadOnceForChunkError } from "@/lib/chunkRecovery";

/** Beklenmeyen render hatasında beyaz ekran yerine kurtarma ekranı; hata Sentry'ye gider. */
export function AppErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      beforeCapture={(scope) => scope.setTag("area", "render")}
      // Deploy sonrası silinmiş eski JS parçası: kurtarma ekranı yerine bir kez yenile.
      onError={(error) => {
        if (isChunkLoadError(error)) reloadOnceForChunkError();
      }}
      fallback={
        <main className="flex h-full flex-col items-center justify-center gap-4 bg-zinc-950 px-6 text-center text-white">
          <img src="/icon.svg" alt="" width={56} height={56} className="rounded-xl" />
          <h1 className="text-lg font-black">Bir şeyler ters gitti</h1>
          <p className="max-w-sm text-sm text-zinc-400">
            Hata bize otomatik olarak bildirildi. Kadron bu cihazda kayıtlı;
            sayfayı yenileyerek devam edebilirsin.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-green-700 px-4 text-sm font-semibold hover:bg-green-800"
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            Sayfayı yenile
          </button>
        </main>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
