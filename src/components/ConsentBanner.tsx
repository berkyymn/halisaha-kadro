"use client";

import { useEffect, useState } from "react";
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
      className="fixed inset-x-3 bottom-3 z-[90] mx-auto max-w-xl rounded-2xl border border-zinc-700 bg-zinc-900/95 p-4 text-white shadow-2xl backdrop-blur sm:inset-x-auto sm:right-4 sm:bottom-4"
    >
      <p className="text-[13px] leading-relaxed text-zinc-300">
        Uygulamayı geliştirmek için, onay verirsen anonim kullanım
        istatistikleri (Google Analytics çerezleri) topluyoruz. Zorunlu
        olmayan bu çerezler sen onaylamadan kullanılmaz. Ayrıntılar:{" "}
        <a href="/gizlilik" className="text-green-400 underline underline-offset-2">
          Gizlilik ve KVKK
        </a>
        .
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => choose("denied")}
          className="h-9 flex-1 rounded-lg bg-zinc-800 text-xs font-semibold text-zinc-200 hover:bg-zinc-700"
        >
          Reddet
        </button>
        <button
          type="button"
          onClick={() => choose("granted")}
          className="h-9 flex-1 rounded-lg bg-green-700 text-xs font-semibold text-white hover:bg-green-800"
        >
          Kabul et
        </button>
      </div>
    </div>
  );
}
