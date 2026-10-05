"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, Check, Copy, Download, ExternalLink, Share2, X } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useAuth } from "@/contexts/AuthContext";
import { SignInNudge, canShowSignInNudge, markSignInNudgeShown } from "@/components/SignInNudge";
import { noteFullscreenInterruption } from "@/lib/fullscreen";
import { POSTER_EXPORTED_EVENT } from "@/components/mobile/InstallSuggestion";
import { trackEvent } from "@/lib/analytics";
import { reportError } from "@/lib/errorReporting";
import {
  POSTER_FILENAME,
  canCopyImage,
  canShareFile,
  copyImageToClipboard,
  downloadBlob,
  jpegToPng,
  renderPosterJpeg,
} from "@/lib/posterExport";

type Notice = { text: string; detail?: string; action?: { label: string; url: string }; error?: boolean };
type Channel = "whatsapp" | "instagram" | "x" | "copy" | "system";

/** Geliştirmede teşhis için: html-to-image görsel yüklenemeyince Event fırlatır. */
function describeExportError(err: unknown): string {
  if (err instanceof Event) {
    const target = err.target as { src?: string; tagName?: string } | null;
    const src = (target?.src ?? "").replace(/^https?:\/\/[^/]+/, "");
    return `${err.type} ${target?.tagName ?? ""} ${src.startsWith("data:") ? src.slice(0, 30) : src || "(boş)"}`;
  }
  if (err instanceof Error) return `${err.name}: ${err.message}`.slice(0, 160);
  return String(err).slice(0, 160);
}

const IS_MAC = typeof navigator !== "undefined" && /Mac/i.test(navigator.platform);
const PASTE = IS_MAC ? "⌘V" : "Ctrl+V";

/**
 * Poster İndir + Paylaş. Poster bir kez çizilir ve poster değişene kadar
 * önbellekte kalır. Paylaş menüsü açılınca çizim arka planda başlar: tarayıcılar
 * paylaşımı yalnızca tıklamadan kısa süre sonrasına kadar açtığı için.
 */
/** `compact`: mobilde yalnızca simgeler, alt alta (poster kenarında yer kaplamasın). */
export function PosterExportControls({ compact = false }: { compact?: boolean } = {}) {
  const teamMode = useAppStore((s) => s.teamMode);
  const editVersion = useAppStore((s) => s.editVersion);
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [nudgeOpen, setNudgeOpen] = useState(false);
  const { configured, user } = useAuth();
  const cacheRef = useRef<{ key: string; promise: Promise<Blob> } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const cacheKey = `${editVersion}:${teamMode}`;

  const getJpeg = (): Promise<Blob> => {
    if (cacheRef.current?.key !== cacheKey) {
      setReady(false);
      const promise = renderPosterJpeg(teamMode);
      cacheRef.current = { key: cacheKey, promise };
      promise.then(
        () => cacheRef.current?.promise === promise && setReady(true),
        () => {
          if (cacheRef.current?.promise === promise) cacheRef.current = null;
        }
      );
    }
    return cacheRef.current!.promise;
  };

  // Poster değişince eski çizim geçersiz.
  useEffect(() => {
    if (cacheRef.current && cacheRef.current.key !== cacheKey) {
      cacheRef.current = null;
      setReady(false);
    }
  }, [cacheKey]);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 12_000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const run = async (task: () => Promise<void>, channel: Channel | "download") => {
    setMenuOpen(false);
    setBusy(true);
    // Geliştirme teşhisi: html-to-image indiremediği kaynağı console.warn ile bildirir.
    const warnings: string[] = [];
    const originalWarn = console.warn;
    if (process.env.NODE_ENV !== "production") {
      console.warn = (...args: unknown[]) => {
        warnings.push(args.map(String).join(" ").slice(0, 160));
        originalWarn(...args);
      };
    }
    try {
      await task();
      trackEvent(channel === "download" ? "poster_downloaded" : "poster_shared", { channel });
      // Değer anı: poster hazır. Misafire hesabın ne kazandıracağını hatırlat.
      const showNudge = configured && !user && canShowSignInNudge();
      if (showNudge) {
        markSignInNudgeShown();
        setNudgeOpen(true);
        trackEvent("signin_nudge_shown", { channel });
      }
      window.dispatchEvent(new CustomEvent(POSTER_EXPORTED_EVENT, { detail: { signInNudgeShown: showNudge } }));
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return; // paylaşım penceresi kapatıldı
      reportError(err, "export", { extra: { teamMode, channel } });
      console.error("Poster export failed:", err);
      setNotice({
        error: true,
        text: "Poster hazırlanamadı",
        detail:
          "Sayfayı yenileyip tekrar dene; sorun sürerse fotoğrafları yeniden yükle." +
          (process.env.NODE_ENV !== "production"
            ? ` [geliştirme: ${channel} · ${describeExportError(err)}${warnings.length ? ` · uyarı: ${warnings.join(" | ")}` : ""}]`
            : ""),
      });
    } finally {
      console.warn = originalWarn;
      setBusy(false);
    }
  };

  const download = () =>
    run(async () => {
      noteFullscreenInterruption();
      downloadBlob(await getJpeg());
    }, "download");

  const copyThen = (channel: Channel, notice: Notice) =>
    run(async () => {
      try {
        await copyImageToClipboard(getJpeg().then(jpegToPng));
        setNotice(notice);
      } catch (err) {
        // Tarayıcı panoya yazmaya izin vermedi: poster yine de hazır, indir.
        if (!(err instanceof DOMException && err.name === "NotAllowedError")) throw err;
        noteFullscreenInterruption();
      downloadBlob(await getJpeg());
        setNotice({
          ...notice,
          text: "Panoya kopyalanamadı, poster indirildi",
          detail: "İndirilen posteri sohbete ya da gönderiye sürükleyip bırakabilirsin.",
        });
      }
    }, channel);

  const shareToWhatsApp = () =>
    copyThen("whatsapp", {
      text: "Poster panoya kopyalandı",
      detail: `WhatsApp Web'de sohbeti aç ve ${PASTE} ile yapıştır.`,
      action: { label: "WhatsApp Web'i aç", url: "https://web.whatsapp.com/" },
    });

  const shareToX = () =>
    copyThen("x", {
      text: "Poster panoya kopyalandı",
      detail: `Gönderi kutusuna ${PASTE} ile yapıştır.`,
      action: { label: "X'i aç", url: "https://x.com/compose/post" },
    });

  const copyOnly = () =>
    copyThen("copy", {
      text: "Poster panoya kopyalandı",
      detail: `İstediğin yere ${PASTE} ile yapıştırabilirsin.`,
    });

  const shareToInstagram = () =>
    run(async () => {
      noteFullscreenInterruption();
      downloadBlob(await getJpeg());
      setNotice({
        text: "Poster indirildi",
        detail: "Instagram'da + Oluştur → Bilgisayardan seç ile indirilen posteri yükle.",
        action: { label: "Instagram'ı aç", url: "https://www.instagram.com/" },
      });
    }, "instagram");

  const shareWithSystem = () =>
    run(async () => {
      const file = new File([await getJpeg()], POSTER_FILENAME, { type: "image/jpeg" });
      try {
        noteFullscreenInterruption();
        await navigator.share({ files: [file], title: "Halı Saha Kadro" });
      } catch (err) {
        // Çizim uzun sürdüyse dokunuşun verdiği izin dolmuş olabilir; poster artık hazır.
        if (!(err instanceof DOMException && err.name === "NotAllowedError")) throw err;
        setNotice({ text: "Poster hazır", detail: "Göndermek için Paylaş'a bir kez daha dokun." });
      }
    }, "system");

  const systemShareSupported =
    typeof File !== "undefined" &&
    canShareFile(new File([""], POSTER_FILENAME, { type: "image/jpeg" }));
  // Telefonda Paylaş doğrudan sistem paylaşımını açar (WhatsApp, Instagram…).
  const nativeShareFirst = compact && systemShareSupported;
  // Sistem paylaşımı olmayan mobil tarayıcı (ör. Brave Android): galeriye indir, yol göster.
  const mobileDownloadShare = () =>
    run(async () => {
      noteFullscreenInterruption();
      downloadBlob(await getJpeg());
      setNotice({
        text: "Poster telefonuna indirildi",
        detail: "WhatsApp'ta sohbeti aç → 📎 → Galeri (ya da Belge) ile posteri gönder.",
      });
    }, "download");

  // Telefonda poster değişiklikten kısa süre sonra arka planda çizilir: paylaşım
  // penceresi dokunuştan hemen sonra açılabilsin (tarayıcı izni birkaç saniye sürer).
  useEffect(() => {
    if (!nativeShareFirst) return;
    const timer = window.setTimeout(() => void getJpeg().catch(() => undefined), 1500);
    return () => window.clearTimeout(timer);
    // getJpeg her render yeni; yalnızca poster değişince planla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nativeShareFirst, cacheKey]);
  const copySupported = typeof window !== "undefined" && canCopyImage();

  return (
    <>
      <div ref={menuRef} className={`relative flex items-center gap-1.5 ${compact ? "landscape:flex-col" : ""}`}>
        <button
          type="button"
          onClick={() => {
            // Telefonda tek düğme: paylaşım yoksa (ör. Brave) doğrudan indir + yol göster.
            if (compact && !nativeShareFirst) {
              mobileDownloadShare();
              return;
            }
            const next = !menuOpen;
            setMenuOpen(next);
            if (next) void getJpeg().catch(() => undefined);
          }}
          disabled={busy}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label="Paylaş"
          className={`flex items-center justify-center gap-1.5 text-xs font-semibold disabled:opacity-50 ${
            compact
              ? "h-10 w-10 rounded-xl bg-green-700 text-white hover:bg-green-800"
              : "rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-zinc-200 hover:bg-zinc-700"
          }`}
        >
          <Share2 className={compact ? "w-4 h-4" : "w-3.5 h-3.5"} />
          {!compact && "Paylaş"}
        </button>
        {/* Telefonda indirme, Paylaş menüsünün içinde (o da bir paylaşma yolu). */}
        {!compact && (
        <button
          type="button"
          onClick={download}
          disabled={busy}
          aria-label="Poster İndir"
          className={`flex items-center justify-center gap-1.5 bg-green-700 text-xs font-semibold hover:bg-green-800 disabled:opacity-50 ${
            compact ? "h-10 w-10 rounded-xl" : "rounded px-3 py-1.5"
          }`}
        >
          <Download className={compact ? "w-4 h-4" : "w-3.5 h-3.5"} />
          {!compact && "Poster İndir"}
        </button>
        )}

        {menuOpen && (
          <div
            role="menu"
            className={`absolute z-[90] w-64 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 p-1.5 shadow-2xl ${
              compact
                ? "right-0 top-full mt-1.5 landscape:right-full landscape:top-0 landscape:mt-0 landscape:mr-2"
                : "right-0 top-full mt-1.5"
            }`}
          >
            {compact ? (
              <>
                <MenuItem
                  icon={<Share2 className="w-4 h-4 text-green-400" />}
                  label="Paylaş…"
                  hint={ready ? "WhatsApp, Instagram ve diğerleri" : "Poster hazırlanıyor…"}
                  onClick={shareWithSystem}
                />
                <MenuItem
                  icon={<Download className="w-4 h-4 text-zinc-300" />}
                  label="Telefona indir"
                  hint="Galeriye / İndirilenler'e kaydet"
                  onClick={download}
                />
              </>
            ) : (
            <>
            {copySupported && (
              <MenuItem icon={<Badge className="bg-[#25d366]">W</Badge>} label="WhatsApp" hint="Kopyala, sohbete yapıştır" onClick={shareToWhatsApp} />
            )}
            <MenuItem icon={<Badge className="bg-gradient-to-tr from-[#f58529] via-[#dd2a7b] to-[#8134af]">I</Badge>} label="Instagram" hint="İndir, Instagram'a yükle" onClick={shareToInstagram} />
            {copySupported && (
              <MenuItem icon={<Badge className="bg-black ring-1 ring-zinc-600">X</Badge>} label="X (Twitter)" hint="Kopyala, gönderiye yapıştır" onClick={shareToX} />
            )}
            <div className="my-1 h-px bg-zinc-800" />
            {copySupported && (
              <MenuItem icon={<Copy className="w-4 h-4 text-zinc-300" />} label="Panoya kopyala" onClick={copyOnly} />
            )}
            {systemShareSupported && (
              <MenuItem
                icon={<Share2 className="w-4 h-4 text-zinc-300" />}
                label="Diğer…"
                hint={ready ? "Sistem paylaşım menüsü" : "Poster hazırlanıyor…"}
                onClick={shareWithSystem}
                disabled={!ready}
              />
            )}
            </>
            )}
          </div>
        )}
      </div>

      {busy && <PreparingOverlay />}

      <div className="pointer-events-none fixed bottom-5 left-1/2 z-[115] flex w-[min(420px,calc(100vw-2rem))] -translate-x-1/2 flex-col gap-2 [&>*]:pointer-events-auto">
      {nudgeOpen && !user && <SignInNudge onClose={() => setNudgeOpen(false)} />}
      {notice && (
        <div
          role="status"
          className="rounded-xl border border-zinc-700 bg-zinc-900/95 p-3 shadow-2xl backdrop-blur"
        >
          <div className="flex items-start gap-2.5">
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                notice.error ? "bg-red-600" : "bg-green-600"
              }`}
            >
              {notice.error ? (
                <AlertTriangle className="w-3 h-3 text-white" />
              ) : (
                <Check className="w-3 h-3 text-white" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">{notice.text}</p>
              {notice.detail && <p className="mt-0.5 text-[12px] leading-snug text-zinc-400">{notice.detail}</p>}
              {notice.action && (
                <a
                  href={notice.action.url}
                  target="_blank"
                  rel="noopener"
                  onClick={() => setNotice(null)}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-green-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-600"
                >
                  {notice.action.label}
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="p-0.5 text-zinc-500 hover:text-white"
              aria-label="Kapat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      </div>
    </>
  );
}

function MenuItem({
  icon,
  label,
  hint,
  onClick,
  disabled = false,
}: {
  icon: ReactNode;
  label: string;
  hint?: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-zinc-800 disabled:opacity-50 disabled:hover:bg-transparent"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center">{icon}</span>
      <span className="min-w-0">
        <span className="block text-xs font-semibold text-zinc-100">{label}</span>
        {hint && <span className="block text-[10px] text-zinc-500">{hint}</span>}
      </span>
    </button>
  );
}

function Badge({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-[11px] font-black text-white ${className}`}>
      {children}
    </span>
  );
}

/** Poster çizilirken: yarı saydam katman + hareketli poster simgesi. */
function PreparingOverlay() {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/55 backdrop-blur-[2px]" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-zinc-700 bg-zinc-900/95 px-8 py-6 shadow-2xl">
        <div className="relative h-16 w-24">
          <div className="absolute inset-0 overflow-hidden rounded-lg border border-zinc-600 bg-gradient-to-b from-zinc-800 to-zinc-950">
            <div className="absolute inset-x-3 top-2 h-1.5 rounded-full bg-zinc-600" />
            <div className="absolute inset-x-6 top-5 h-1 rounded-full bg-zinc-700" />
            <div className="absolute bottom-2 left-3 right-3 grid grid-cols-4 gap-1">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className="h-3 rounded-sm bg-green-700/70 animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />
              ))}
            </div>
            <div className="poster-export-shine absolute inset-y-0 w-1/2" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-white">Poster hazırlanıyor…</p>
          <p className="text-[11px] text-zinc-400">Yüksek çözünürlükte çiziliyor</p>
        </div>
      </div>
    </div>
  );
}
