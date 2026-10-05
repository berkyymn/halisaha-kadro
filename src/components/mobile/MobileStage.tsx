"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Maximize2, MessageSquare, Minimize2, RotateCcw, ShieldCheck, SlidersHorizontal, Smartphone, X } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useDragStore } from "@/store/useDragStore";
import { BenchPanel } from "@/components/BenchPanel";
import { PosterToolbar } from "@/components/PosterToolbar";
import { PosterExportControls } from "@/components/PosterExportControls";
import { UserAuthButton } from "@/components/UserAuthButton";
import { ContactModal } from "@/components/ContactModal";
import { MobileHints } from "@/components/mobile/MobileHints";
import { usePosterBackground } from "@/components/StaticPosterBackground";
import { trackEvent } from "@/lib/analytics";
import {
  canFullscreen,
  enterFullscreen,
  exitFullscreen,
  isFullscreen,
  isStandaloneApp,
  noteFullscreenInterruption,
  wasFullscreenInterrupted,
} from "@/lib/fullscreen";
import { promptInstallApp } from "@/lib/installPrompt";
import { InstallSuggestion, useInstallAvailable } from "@/components/mobile/InstallSuggestion";

/** Sahadan sürüklenen oyuncu sağ kenara bu kadar yaklaşınca yedek çekmecesi açılır. */
const BENCH_EDGE_PX = 56;

function useIsPortrait(): boolean {
  const [portrait, setPortrait] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(orientation: portrait)").matches
  );
  useEffect(() => {
    const query = window.matchMedia("(orientation: portrait)");
    const update = () => setPortrait(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return portrait;
}

function useFullscreenState(): boolean {
  const [full, setFull] = useState(false);
  useEffect(() => {
    const update = () => setFull(isFullscreen());
    update();
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);
  return full;
}

/**
 * Telefon düzeni: poster ekranı kaplar; ayarlar soldan (☰), yedekler sağdan
 * çekmece olarak açılır. İki takım posteri yatay ister; dikeyde "yan çevir".
 */
export function MobileStage({
  background,
  poster,
  onReset,
}: {
  background: string;
  poster: ReactNode;
  onReset: () => void;
}) {
  const teamMode = useAppStore((s) => s.teamMode);
  const { src: backdropSrc } = usePosterBackground();
  const portrait = useIsPortrait();
  const fullscreen = useFullscreenState();
  useFullscreenRestore();
  const installAvailable = useInstallAvailable();
  const showFullscreenButton = canFullscreen() && !isStandaloneApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const backdropPressRef = useRef(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [benchOpen, setBenchOpen] = useState(false);
  useBenchAutoOpen(benchOpen, setBenchOpen);
  useMobileDefaults();
  useEffect(() => {
    // Kadro modu değişince menü kapanır: yeni düzen hemen görünsün.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMenuOpen(false);
  }, [teamMode]);

  return (
    <div
      data-mobile-stage
      className="fixed inset-0 overflow-hidden text-white"
      style={{ background, touchAction: "manipulation" }}
    >
      {/* Tema atmosferi ekranın tamamına yayılır: posterin dışında kalan alan boş/siyah görünmesin. */}
      <img
        src={backdropSrc}
        alt=""
        aria-hidden
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full scale-125 select-none object-cover opacity-90 blur-xl saturate-125"
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/45 via-black/10 to-black/55" />

      {/* Dikeyde üstte düğme şeridi, yatayda yanlarda boşluk (poster yüksekliğe sığar). */}
      <div className="absolute inset-0 flex items-center justify-center px-2 pb-4 pt-14 [container-type:size] landscape:px-12 landscape:py-1 [&>[data-poster-frame]]:shadow-[0_24px_60px_rgba(0,0,0,0.65)]">
        {poster}
      </div>

      {/* Ayarlar + hesap: dikeyde yan yana, yatayda (poster kenarındaki boşlukta) alt alta. */}
      <div className="absolute left-2 top-2 z-30 flex items-center gap-1.5 landscape:flex-col landscape:items-start">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-700/70 bg-zinc-900/75 text-zinc-200 backdrop-blur"
          aria-label="Ayarlar"
        >
          <SlidersHorizontal className="h-5 w-5" />
        </button>
        <UserAuthButton compact />
        {showFullscreenButton && (
          <button
            type="button"
            onClick={() => void (fullscreen ? exitFullscreen() : enterFullscreen())}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-700/70 bg-zinc-900/75 text-zinc-200 backdrop-blur"
            aria-label={fullscreen ? "Tam ekrandan çık" : "Tam ekran"}
            title={fullscreen ? "Tam ekrandan çık" : "Tam ekran"}
          >
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        )}
      </div>

      <div className="absolute right-2 top-2 z-30">
        <PosterExportControls compact />
      </div>

      <BenchPanel drawer={{ open: benchOpen, onOpenChange: setBenchOpen }} />
      <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} />
      {!menuOpen && !benchOpen && <MobileHints />}
      <InstallSuggestion />


      {/* İki takım dikeyde de kullanılabilir; yatay yalnızca önerilir (otomatik döndürmesi kapalı olanlar da kullanabilsin). */}
      {teamMode === "versus" && portrait && <RotateHint />}

      {menuOpen && (
        <>
          <button
            type="button"
            aria-label="Menüyü kapat"
            className="absolute inset-0 z-40 bg-black/50"
            // Yalnızca dokunuş burada başladıysa kapat: menü içinde başlayan dokunuş
            // (menü boyu değişip parmak buraya kaysa da) menüyü kapatmasın.
            onPointerDown={() => {
              backdropPressRef.current = true;
            }}
            onClick={() => {
              if (backdropPressRef.current) setMenuOpen(false);
              backdropPressRef.current = false;
            }}
          />
          {/* Dikeyde alttan açılan kompakt panel; yatayda soldan çekmece. */}
          <aside className="absolute inset-x-0 bottom-0 z-50 flex max-h-[80vh] flex-col rounded-t-2xl border-t border-zinc-800 bg-zinc-900 shadow-2xl landscape:inset-x-auto landscape:left-0 landscape:top-0 landscape:max-h-none landscape:w-[min(20rem,46vw)] landscape:rounded-none landscape:border-r landscape:border-t-0">
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-zinc-800 px-3 py-2">
              <span className="flex items-center gap-2 text-sm font-black tracking-wide">
                <img src="/icon.svg" alt="" width={20} height={20} className="rounded-md" />
                Halı Saha Kadro
              </span>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="p-1.5 text-zinc-400"
                aria-label="Kapat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
              <PosterToolbar variant="panel" />

              <div className="flex gap-1.5 border-t border-zinc-800 pt-3 landscape:flex-col">
                {installAvailable && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      trackEvent("install_prompt_opened");
                      void promptInstallApp().then((ok) => ok && trackEvent("app_installed"));
                    }}
                    className="flex h-10 flex-1 items-center gap-2 rounded-lg bg-zinc-800 px-3 text-left text-xs font-semibold text-zinc-200 landscape:flex-none"
                  >
                    <Smartphone className="h-4 w-4 shrink-0" />
                    Ana ekrana ekle
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onReset();
                  }}
                  className="flex h-10 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-zinc-400"
                >
                  <RotateCcw className="h-4 w-4" />
                  Sıfırla
                </button>
              </div>

              {/* Sık kullanılmayanlar: menünün en altında küçük bağlantılar. */}
              <div className="flex items-center gap-3 text-[11px] text-zinc-500">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    trackEvent("contact_opened");
                    setContactOpen(true);
                  }}
                  className="inline-flex items-center gap-1 hover:text-zinc-300"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  İletişim
                </button>
                <a href="/gizlilik" target="_blank" rel="noopener" className="inline-flex items-center gap-1 hover:text-zinc-300">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Gizlilik ve KVKK
                </a>
              </div>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}

/**
 * Sahadan oyuncu sürüklerken sağ kenara gelinince çekmeceyi açar, çekmeceden
 * çıkınca kapatır; sürükleme bitince kendi açtığını kapatır.
 */
function useBenchAutoOpen(benchOpen: boolean, setBenchOpen: (open: boolean) => void) {
  const pitchDragActive = useDragStore(
    (s) => s.dragIntent.kind === "active" && s.dragIntent.source.type === "pitch"
  );
  const autoOpened = useRef(false);
  const openRef = useRef(benchOpen);
  useEffect(() => {
    openRef.current = benchOpen;
  }, [benchOpen]);

  useEffect(() => {
    if (!pitchDragActive) {
      if (autoOpened.current) {
        autoOpened.current = false;
        setBenchOpen(false);
      }
      return;
    }
    const onMove = (e: PointerEvent) => {
      if (!openRef.current) {
        if (e.clientX >= window.innerWidth - BENCH_EDGE_PX) {
          autoOpened.current = true;
          setBenchOpen(true);
        }
        return;
      }
      if (!autoOpened.current) return;
      const drawer = document.querySelector<HTMLElement>('[data-bench-drop="true"]');
      // offsetLeft kayma animasyonundan etkilenmez: açılırken ara konuma göre
      // "çekmeceden çıktı" sanıp hemen kapatmasın.
      const left = drawer ? drawer.offsetLeft : window.innerWidth;
      if (e.clientX < left - 12) {
        autoOpened.current = false;
        setBenchOpen(false);
      }
    };
    document.addEventListener("pointermove", onMove);
    return () => document.removeEventListener("pointermove", onMove);
  }, [pitchDragActive, setBenchOpen]);
}

/**
 * Android; dosya seçici, indirme ve paylaşım sırasında sayfayı tam ekrandan
 * çıkarır. Bu "beklenen" çıkışları fark edip ilk dokunuşta sessizce tam ekrana
 * geri döner. Kullanıcı tam ekrandan kendisi çıktıysa karışmaz.
 */
function useFullscreenRestore() {
  useEffect(() => {
    let restorePending = false;

    const onClick = (e: MouseEvent) => {
      if (e.target instanceof HTMLInputElement && e.target.type === "file") noteFullscreenInterruption();
    };
    const onFullscreenChange = () => {
      if (!isFullscreen() && wasFullscreenInterrupted()) restorePending = true;
    };
    // Tam ekran isteği bir kullanıcı dokunuşu ister: dönünce ilk dokunuş.
    const onPointerUp = () => {
      if (!restorePending) return;
      restorePending = false;
      void enterFullscreen();
    };

    document.addEventListener("click", onClick, true);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("pointerup", onPointerUp, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("pointerup", onPointerUp, true);
    };
  }, []);
}

const MOBILE_DEFAULTS_KEY = "halisaha-mobile-defaults-v1";

/**
 * Telefonda ilk açılışta (hiç düzenlenmemiş kadro) tek takım modu: dikey
 * ekranda doğrudan kullanılabilir. Cihaz başına bir kez; sonra kullanıcının seçimi.
 */
function useMobileDefaults() {
  useEffect(() => {
    try {
      if (localStorage.getItem(MOBILE_DEFAULTS_KEY)) return;
      localStorage.setItem(MOBILE_DEFAULTS_KEY, "1");
    } catch {
      return;
    }
    const state = useAppStore.getState();
    if ((state.editVersion ?? 0) === 0 && state.teamMode === "versus") {
      state.setTeamMode("single");
    }
  }, []);
}

const ROTATE_HINT_KEY = "halisaha-rotate-hint-dismissed";

/** Dikey + iki takım: kapatılabilir öneri şeridi (oturum boyunca kapalı kalır). */
function RotateHint() {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(ROTATE_HINT_KEY) === "1";
    } catch {
      return false;
    }
  });
  if (dismissed) return null;
  return (
    <div className="absolute left-1/2 top-16 z-30 flex w-[min(380px,calc(100vw-1.5rem))] -translate-x-1/2 items-start gap-2.5 rounded-xl border border-zinc-700/70 bg-zinc-900/85 px-3 py-2.5 shadow-2xl backdrop-blur">
      <Smartphone className="mt-0.5 h-5 w-5 shrink-0 rotate-90 text-green-400" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-white">Telefonu yan çevir, kartlar büyür</p>
        <p className="mt-0.5 text-[11px] leading-snug text-zinc-400">
          Ekran dönmüyorsa bildirim panelinden otomatik döndürmeyi aç.
        </p>
      </div>
      <button
        type="button"
        onClick={() => {
          try {
            sessionStorage.setItem(ROTATE_HINT_KEY, "1");
          } catch {
            // yok say
          }
          setDismissed(true);
        }}
        className="p-0.5 text-zinc-500"
        aria-label="Kapat"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
