"use client";

import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/analytics";

/**
 * İlk kullanım ipuçları (coach mark): kısa, bağlamsal, cihaz başına bir kez.
 * Ekrana ilk dokunuşta kaybolur, dokunuşu engellemez; pencere açıkken beklenir.
 */
const STORAGE_KEY = "halisaha-mobile-hints-v1";

type HintId = "tap-player" | "bench";

const HINTS: { id: HintId; text: string; anchor: () => DOMRect | null; side: "above" | "left" }[] = [
  {
    id: "tap-player",
    text: "Oyuncuya dokun: isim, numara ve fotoğraf ekle.",
    side: "above",
    anchor: () => {
      const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-player-card="true"]'));
      if (!cards.length) return null;
      // Ekranın ortasına en yakın kart.
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const rects = cards.map((c) => c.getBoundingClientRect());
      return rects.reduce((best, r) =>
        Math.hypot(r.left + r.width / 2 - cx, r.top + r.height / 2 - cy) <
        Math.hypot(best.left + best.width / 2 - cx, best.top + best.height / 2 - cy)
          ? r
          : best
      );
    },
  },
  {
    id: "bench",
    text: "Yedekler burada. Oyuncuyu sürükleyip sahadakiyle yer değiştir; sahadan buraya sürükleyince yedeğe alınır.",
    side: "left",
    anchor: () => document.querySelector<HTMLElement>('[aria-label="Yedekleri aç"]')?.getBoundingClientRect() ?? null,
  },
];

function readSeen(): Set<HintId> {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as HintId[]);
  } catch {
    return new Set(HINTS.map((h) => h.id)); // depolama yoksa hiç gösterme
  }
}

function markSeen(id: HintId) {
  try {
    const seen = readSeen();
    seen.add(id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...seen]));
  } catch {
    // yok say
  }
}

/** Sahne dışında açık tam ekran katman (pencere, "yan çevir") var mı? */
function overlayOpen(): boolean {
  // Çerez tercihi henüz verilmediyse önce o: ilk açılışta ekranda iki şey birden olmasın.
  if (document.querySelector('[aria-label="Çerez tercihi"]')) return true;
  return Array.from(document.querySelectorAll<HTMLElement>(".fixed.inset-0")).some(
    (el) => !el.hasAttribute("data-mobile-stage")
  );
}

export function MobileHints() {
  const [active, setActive] = useState<{ id: HintId; rect: DOMRect } | null>(null);

  useEffect(() => {
    let timer: number | undefined;
    let current: HintId | null = null;

    const next = () => {
      const seen = readSeen();
      const hint = HINTS.find((h) => !seen.has(h.id));
      if (!hint) return;
      timer = window.setTimeout(function tryShow() {
        const rect = hint.anchor();
        if (!rect || overlayOpen()) {
          timer = window.setTimeout(tryShow, 800);
          return;
        }
        current = hint.id;
        setActive({ id: hint.id, rect });
        trackEvent("mobile_hint_shown", { hint: hint.id });
      }, 1200);
    };

    const dismiss = () => {
      if (!current) return;
      markSeen(current);
      current = null;
      setActive(null);
      next();
    };

    document.addEventListener("pointerdown", dismiss, true);
    next();
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("pointerdown", dismiss, true);
    };
  }, []);

  if (!active) return null;
  const hint = HINTS.find((h) => h.id === active.id)!;
  const r = active.rect;
  const BUBBLE_W = 240;
  const left = Math.min(Math.max(12, r.left + r.width / 2 - BUBBLE_W / 2), window.innerWidth - BUBBLE_W - 12);
  const style =
    hint.side === "above"
      ? { left, top: Math.max(8, r.top - 70) }
      : { right: window.innerWidth - r.left + 10, top: Math.max(8, r.top + r.height / 2 - 34) };
  // Hedefi gösteren ok: kartın ortasına (aşağı) ya da tutamaca (sağa).
  const arrowStyle =
    hint.side === "above"
      ? { left: Math.min(Math.max(14, r.left + r.width / 2 - left - 6), BUBBLE_W - 26), bottom: -6 }
      : { right: -6, top: 28 };

  return (
    <div
      role="status"
      className="pointer-events-none absolute z-[35] w-60 rounded-xl border border-green-500/50 bg-zinc-900/95 px-3 py-2 text-[12px] leading-snug text-zinc-100 shadow-2xl backdrop-blur"
      style={style}
    >
      {hint.text}
      <span className="mt-1 block text-[10px] text-zinc-500">Ekrana dokununca kapanır</span>
      <span
        aria-hidden
        className={`absolute h-3 w-3 rotate-45 border-green-500/50 bg-zinc-900 ${
          hint.side === "above" ? "border-b border-r" : "border-r border-t"
        }`}
        style={arrowStyle}
      />
    </div>
  );
}
