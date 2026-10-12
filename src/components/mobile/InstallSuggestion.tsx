"use client";

import { useEffect, useState } from "react";
import { Share, Smartphone, SquarePlus, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { trackEvent } from "@/lib/analytics";
import { isStandaloneApp } from "@/lib/fullscreen";
import { canInstallApp, installMode, onInstallAvailabilityChange, promptInstallApp } from "@/lib/installPrompt";

/**
 * "Ana ekrana ekle" önerisi (yalnızca telefon, tarayıcı kurulum teklif ettiğinde).
 * - İkinci ziyaretten itibaren ya da poster indirildikten sonra (giriş kartı çıkmadıysa).
 * - Oturum başına en fazla bir kez; "Şimdi değil" → 7, sonra 30 gün; 3. redden sonra hiç.
 */
export const POSTER_EXPORTED_EVENT = "halisaha:poster-exported";
/** iPhone'da "Ana ekrana ekle" adımlarını açar (menüdeki düğme gönderir). */
const INSTALL_STEPS_EVENT = "halisaha:install-steps";

/** Kurulumu başlatır: Android'de tarayıcı penceresi, iPhone'da elle adımlar. */
export function startAppInstall(source: string): void {
  trackEvent("install_prompt_opened", { source });
  if (installMode() === "ios") {
    window.dispatchEvent(new Event(INSTALL_STEPS_EVENT));
    return;
  }
  void promptInstallApp().then((ok) => ok && trackEvent("app_installed"));
}

const VISITS_KEY = "halisaha-visits";
const SNOOZE_UNTIL_KEY = "halisaha-install-snoozed-until";
const DISMISS_COUNT_KEY = "halisaha-install-dismissals";
const SESSION_SHOWN_KEY = "halisaha-install-shown";
const SESSION_VISIT_KEY = "halisaha-visit-counted";
const SNOOZE_DAYS = [7, 30];
const DAY_MS = 24 * 60 * 60 * 1000;

export function useInstallAvailable(): boolean {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    const update = () => setAvailable(canInstallApp() && !isStandaloneApp());
    update();
    return onInstallAvailabilityChange(update);
  }, []);
  return available;
}

function countVisit(): number {
  try {
    let visits = Number(localStorage.getItem(VISITS_KEY) || 0);
    if (!sessionStorage.getItem(SESSION_VISIT_KEY)) {
      sessionStorage.setItem(SESSION_VISIT_KEY, "1");
      visits += 1;
      localStorage.setItem(VISITS_KEY, String(visits));
    }
    return visits;
  } catch {
    return 0;
  }
}

function allowed(): boolean {
  try {
    if (sessionStorage.getItem(SESSION_SHOWN_KEY)) return false;
    if (Number(localStorage.getItem(DISMISS_COUNT_KEY) || 0) > SNOOZE_DAYS.length) return false;
    return Number(localStorage.getItem(SNOOZE_UNTIL_KEY) || 0) <= Date.now();
  } catch {
    return false;
  }
}

function snooze(): void {
  try {
    const count = Number(localStorage.getItem(DISMISS_COUNT_KEY) || 0);
    localStorage.setItem(DISMISS_COUNT_KEY, String(count + 1));
    const days = SNOOZE_DAYS[Math.min(count, SNOOZE_DAYS.length - 1)];
    localStorage.setItem(SNOOZE_UNTIL_KEY, String(Date.now() + days * DAY_MS));
  } catch {
    // yok say
  }
}

/** Sahne dışında açık tam ekran katman (pencere, "yan çevir") var mı? */
function overlayOpen(): boolean {
  // Çerez tercihi bekleniyorsa önce o (ipuçlarıyla aynı kural); "yan çevir" şeridi
  // de aynı yerde durur, üst üste binmesinler.
  if (document.querySelector('[aria-label="Çerez tercihi"], [data-rotate-hint]')) return true;
  return Array.from(document.querySelectorAll<HTMLElement>(".fixed.inset-0")).some(
    (el) => !el.hasAttribute("data-mobile-stage")
  );
}

export function InstallSuggestion() {
  const available = useInstallAvailable();
  const { configured, user } = useAuth();
  const [open, setOpen] = useState(false);
  // iPhone: "Ekle" kart içinde Paylaş → Ana Ekrana Ekle adımlarına geçer.
  const [steps, setSteps] = useState(false);

  useEffect(() => {
    const onSteps = () => {
      setSteps(true);
      setOpen(true);
    };
    window.addEventListener(INSTALL_STEPS_EVENT, onSteps);
    return () => window.removeEventListener(INSTALL_STEPS_EVENT, onSteps);
  }, []);

  useEffect(() => {
    if (!available) return;
    let retry: number | undefined;
    const show = (trigger: string, attempts = 0) => {
      if (!allowed()) return;
      if (overlayOpen()) {
        // Pencere / çerez bandı kapanınca göster (en fazla ~1 dk bekle).
        if (attempts < 75) retry = window.setTimeout(() => show(trigger, attempts + 1), 800);
        return;
      }
      try {
        sessionStorage.setItem(SESSION_SHOWN_KEY, "1");
      } catch {
        // yok say
      }
      setOpen(true);
      trackEvent("install_suggestion_shown", { trigger });
    };

    const visits = countVisit();
    const timer = visits >= 2 ? window.setTimeout(() => show("return-visit"), 4000) : undefined;

    const onExported = (e: Event) => {
      // Giriş kartı az önce çıktıysa ikisini aynı anda gösterme.
      if ((e as CustomEvent<{ signInNudgeShown: boolean }>).detail?.signInNudgeShown) return;
      window.setTimeout(() => show("poster-exported"), 1200);
    };
    window.addEventListener(POSTER_EXPORTED_EVENT, onExported);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(retry);
      window.removeEventListener(POSTER_EXPORTED_EVENT, onExported);
    };
  }, [available]);

  if (!open || !available) return null;

  return (
    <div
      role="dialog"
      aria-label="Ana ekrana ekle"
      // Üstte: indirme bildirimi ve giriş kartı altta çıkar, çakışmasınlar.
      className="fixed left-1/2 top-16 z-[114] w-[min(420px,calc(100vw-1.5rem))] -translate-x-1/2 rounded-xl border border-green-600/40 bg-zinc-900/95 p-3 shadow-2xl backdrop-blur"
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-green-500/15 text-green-400">
          <Smartphone className="h-4 w-4" aria-hidden />
        </span>
        {steps ? (
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">Ana ekrana ekle</p>
            <ol className="mt-1.5 space-y-1.5 text-[12px] leading-snug text-zinc-300">
              <li className="flex flex-wrap items-center gap-1.5">
                <span className="text-zinc-500">1.</span>
                Safari&apos;de
                <Share className="h-4 w-4 shrink-0 text-sky-400" aria-label="Paylaş" />
                Paylaş&apos;a dokun
                <span className="text-zinc-500">(yoksa ⋯ menüsünde)</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-zinc-500">2.</span>
                <SquarePlus className="h-4 w-4 shrink-0 text-zinc-300" aria-hidden />
                &ldquo;Ana Ekrana Ekle&rdquo;yi seç
              </li>
            </ol>
            <p className="mt-1.5 text-[11px] leading-snug text-zinc-500">
              Ana ekrandaki simgeden açınca adres çubuğu olmadan tüm ekranı kullanır.
            </p>
            {/* iPhone ana ekran uygulaması Safari'nin kayıtlarını görmez; giriş yapan bulut kadrosuyla açar. */}
            {configured && !user && (
              <p className="mt-1.5 rounded-md bg-amber-500/10 px-2 py-1 text-[11px] leading-snug text-amber-300">
                Kadronu uygulamada da görmek için önce giriş yap; giriş yapmazsan uygulama boş kadroyla açılır.
              </p>
            )}
          </div>
        ) : (
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">Kadro&apos;yu ana ekrana ekle</p>
          <p className="mt-0.5 text-[12px] leading-snug text-zinc-400">
            Uygulama gibi tek dokunuşla açılır; adres çubuğu olmadan tüm ekranı kullanır.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (installMode() === "ios") {
                  trackEvent("install_prompt_opened", { source: "suggestion" });
                  setSteps(true);
                  return;
                }
                setOpen(false);
                startAppInstall("suggestion");
              }}
              className="h-8 rounded-lg bg-green-600 px-3 text-xs font-semibold text-white hover:bg-green-500"
            >
              Ekle
            </button>
            <button
              type="button"
              onClick={() => {
                trackEvent("install_suggestion_dismissed");
                snooze();
                setOpen(false);
              }}
              className="h-8 rounded-lg px-2 text-xs font-semibold text-zinc-400 hover:text-white"
            >
              Şimdi değil
            </button>
          </div>
        </div>
        )}
        <button
          type="button"
          onClick={() => {
            if (!steps) {
              trackEvent("install_suggestion_dismissed");
              snooze();
            }
            setSteps(false);
            setOpen(false);
          }}
          className="p-0.5 text-zinc-500 hover:text-white"
          aria-label="Kapat"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
