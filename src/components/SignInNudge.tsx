"use client";

import { useState } from "react";
import { CloudUpload, Loader2, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { trackEvent } from "@/lib/analytics";
import { isPopupDismissed, signInWithGoogle } from "@/lib/auth/googleSignIn";

/**
 * Giriş teşviki: misafir poster indirip/paylaşınca (değer anı) gösterilir.
 * - Oturum başına en fazla bir kez.
 * - "Şimdi değil" sonrası artan bekleme: 3 → 7 → 30 gün.
 * - Tek dokunuşla Google; e-posta için giriş penceresi.
 */
const SNOOZE_UNTIL_KEY = "halisaha-signin-nudge-snoozed-until";
const DISMISS_COUNT_KEY = "halisaha-signin-nudge-dismissals";
const SESSION_KEY = "halisaha-signin-nudge-shown";
const SNOOZE_DAYS = [3, 7, 30];
const DAY_MS = 24 * 60 * 60 * 1000;

export function canShowSignInNudge(): boolean {
  try {
    if (sessionStorage.getItem(SESSION_KEY)) return false;
    return Number(localStorage.getItem(SNOOZE_UNTIL_KEY) || 0) <= Date.now();
  } catch {
    return false;
  }
}

export function markSignInNudgeShown(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    // depolama yoksa bu oturumda yine de bir kez gösterildi
  }
}

function snooze(): void {
  try {
    const count = Number(localStorage.getItem(DISMISS_COUNT_KEY) || 0);
    const days = SNOOZE_DAYS[Math.min(count, SNOOZE_DAYS.length - 1)];
    localStorage.setItem(DISMISS_COUNT_KEY, String(count + 1));
    localStorage.setItem(SNOOZE_UNTIL_KEY, String(Date.now() + days * DAY_MS));
  } catch {
    // yok say
  }
}

export function SignInNudge({ onClose }: { onClose: () => void }) {
  const { openAuthModal } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const google = async () => {
    trackEvent("signin_nudge_clicked", { method: "google" });
    setBusy(true);
    setError(false);
    try {
      await signInWithGoogle("signin-nudge");
      onClose();
    } catch (err) {
      if (!isPopupDismissed(err)) setError(true);
    } finally {
      setBusy(false);
    }
  };

  const dismiss = () => {
    trackEvent("signin_nudge_dismissed");
    snooze();
    onClose();
  };

  return (
    <div role="dialog" aria-label="Hesap öner" className="rounded-xl border border-green-600/40 bg-zinc-900/95 p-3 shadow-2xl backdrop-blur">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-green-500/15 text-green-400">
          <CloudUpload className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">Kadronu kaybetme</p>
          <p className="mt-0.5 text-[12px] leading-snug text-zinc-400">
            Şu an yalnızca bu tarayıcıda kayıtlı. Giriş yaparsan hazırladığın kadro hesabına aktarılır;
            telefondan ve bilgisayardan aynı kadroya ulaşırsın.
          </p>
          {error && (
            <p className="mt-1 text-[11px] text-red-400" role="alert">
              Google ile giriş yapılamadı. E-posta ile deneyebilirsin.
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void google()}
              disabled={busy}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white px-3 text-xs font-semibold text-zinc-900 hover:bg-zinc-200 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <GoogleMark />}
              Google ile devam et
            </button>
            <button
              type="button"
              onClick={() => {
                trackEvent("signin_nudge_clicked", { method: "email" });
                onClose();
                openAuthModal();
              }}
              className="h-8 rounded-lg px-2 text-xs font-semibold text-zinc-300 hover:text-white"
            >
              E-posta ile
            </button>
          </div>
        </div>
        <button type="button" onClick={dismiss} className="p-0.5 text-zinc-500 hover:text-white" aria-label="Şimdi değil">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-3.5 w-3.5" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.5z" />
    </svg>
  );
}
