"use client";

import { useEffect, useState } from "react";
import { Cookie } from "lucide-react";
import {
  GA_ID,
  readAnalyticsConsent,
  setAnalyticsConsent,
} from "@/lib/analytics";

export const CONSENT_RESET_EVENT = "halisaha-consent-reset";

/** Analitik (GA4) çerezleri için açık rıza banner'ı. GA yoksa hiç görünmez. */
export function ConsentBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!GA_ID) return;
    const sync = () => setOpen(readAnalyticsConsent() === null);
    sync();
    window.addEventListener(CONSENT_RESET_EVENT, sync);
    return () => window.removeEventListener(CONSENT_RESET_EVENT, sync);
  }, []);

  if (!open) return null;

  const choose = (consent: "granted" | "denied") => {
    setAnalyticsConsent(consent);
    setOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Çerez tercihi"
      className="consent-banner fixed bottom-5 left-1/2 z-[90] flex w-[min(44rem,calc(100%-2rem))] -translate-x-1/2 items-center gap-4 rounded-2xl border border-green-500/40 bg-zinc-900/95 py-3.5 pr-3.5 pl-4 text-white shadow-[0_18px_50px_rgba(0,0,0,0.6)] ring-1 ring-black/40 backdrop-blur"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-500/15 text-green-400">
        <Cookie className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white">Çerez tercihin</p>
        <p className="mt-0.5 text-xs leading-relaxed text-zinc-400">
          Onay verirsen uygulamayı geliştirmek için anonim kullanım istatistikleri
          (Google Analytics) toplarız; onaylamazsan bu çerezler kullanılmaz.{" "}
          <a href="/gizlilik" className="text-green-400 underline underline-offset-2">
            Gizlilik ve KVKK
          </a>
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={() => choose("denied")}
          className="h-9 rounded-lg bg-zinc-800 px-4 text-xs font-semibold text-zinc-200 hover:bg-zinc-700"
        >
          Reddet
        </button>
        <button
          type="button"
          onClick={() => choose("granted")}
          className="h-9 rounded-lg bg-green-600 px-4 text-xs font-semibold text-white hover:bg-green-500"
        >
          Kabul et
        </button>
      </div>
    </div>
  );
}
