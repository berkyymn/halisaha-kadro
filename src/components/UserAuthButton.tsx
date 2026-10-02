"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ChevronDown,
  Cloud,
  CloudOff,
  HardDrive,
  Loader2,
  LogIn,
  LogOut,
  Menu,
  MessageSquare,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { trackEvent } from "@/lib/analytics";
import { ModalShell } from "@/components/ModalShell";
import { AccountModal } from "@/components/AccountModal";
import { ContactModal } from "@/components/ContactModal";
import { describeSyncIndicator, type SyncIndicator } from "@/lib/cloud/syncIndicator";

const TONE_CLASS: Record<SyncIndicator["tone"], string> = {
  ok: "text-green-400 bg-green-950/30",
  busy: "text-sky-400 bg-sky-950/30",
  warn: "text-amber-400 bg-amber-950/30",
  error: "text-red-400 bg-red-950/40 cursor-help",
};

export function UserAuthButton() {
  const {
    configured,
    user,
    loading,
    sync,
    openAuthModal,
    signOut,
  } = useAuth();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [unsyncedWarning, setUnsyncedWarning] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  const openContact = () => {
    trackEvent("contact_opened");
    setContactOpen(true);
  };

  if (loading && configured) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500 px-2">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      </span>
    );
  }

  if (!configured) {
    return (
      <span
        className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-amber-900/40 bg-amber-950/30 text-[11px] font-medium text-amber-300/90"
        title="Bulut yedek devre dışı — veriler sadece bu cihazda saklanıyor."
      >
        <CloudOff className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Çevrimdışı</span>
      </span>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center gap-1.5 shrink-0">
        <span
          className="inline-flex items-center gap-1 h-8 px-2 rounded-lg border border-zinc-700 bg-zinc-800 text-[11px] font-medium text-zinc-400"
          title="Misafir modu: veriler sadece bu tarayıcıda saklanıyor."
        >
          <HardDrive className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Yerel</span>
        </span>
        <button
          type="button"
          onClick={() => {
            trackEvent("auth_modal_opened");
            openAuthModal();
          }}
          className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-zinc-600 bg-zinc-800 hover:bg-zinc-700 hover:border-zinc-500 text-[11px] font-semibold text-white shrink-0"
          title="Hesabınla giriş yap, verilerin bulutta saklansın"
        >
          <LogIn className="w-3.5 h-3.5" />
          Giriş yap
        </button>
        <HeaderMenu
          label="Menü"
          trigger={<Menu className="w-4 h-4" aria-hidden />}
          triggerClassName="w-8 justify-center"
        >
          <MenuItem icon={<MessageSquare />} onSelect={openContact}>
            İletişim
          </MenuItem>
          <PrivacyMenuItem />
        </HeaderMenu>
        <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} />
      </div>
    );
  }

  const email = user.email ?? "Hesap";
  const indicator = describeSyncIndicator(sync);
  const syncTitle = indicator.label;

  const handleConfirmSignOut = async (force = false) => {
    setSigningOut(true);
    try {
      const result = await signOut({ force });
      if (!result.ok) {
        setUnsyncedWarning(true);
        setSigningOut(false);
        return;
      }
      trackEvent("sign_out");
    } catch {
      setSigningOut(false);
    }
  };

  const closeConfirm = () => {
    setConfirmOpen(false);
    setUnsyncedWarning(false);
  };

  return (
    <>
      <div className="flex items-center gap-1.5 shrink-0">
        <span
          className={`inline-flex items-center justify-center w-7 h-7 rounded-md ${TONE_CLASS[indicator.tone]}`}
          title={syncTitle}
          aria-label={syncTitle}
        >
          {indicator.spinning ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Cloud className="w-3.5 h-3.5" />
          )}
        </span>
        <HeaderMenu
          label="Hesap menüsü"
          trigger={
            <>
              <UserRound className="w-3.5 h-3.5" aria-hidden />
              <span className="hidden lg:inline max-w-[140px] truncate text-[11px]">{email}</span>
              <ChevronDown className="w-3 h-3" aria-hidden />
            </>
          }
          triggerClassName="gap-1.5 px-2"
          header={
            <div className="px-3 py-2.5 border-b border-zinc-800">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">Giriş yapılan hesap</p>
              <p className="truncate text-xs font-medium text-white">{email}</p>
              <p className="mt-0.5 text-[10px] text-zinc-500">{syncTitle}</p>
            </div>
          }
        >
          <MenuItem icon={<UserRound />} onSelect={() => setAccountOpen(true)}>
            Hesap ayarları
          </MenuItem>
          <MenuItem icon={<MessageSquare />} onSelect={openContact}>
            İletişim
          </MenuItem>
          <PrivacyMenuItem />
          <div className="my-1 h-px bg-zinc-800" />
          <MenuItem icon={<LogOut />} onSelect={() => setConfirmOpen(true)} tone="danger">
            Çıkış yap
          </MenuItem>
        </HeaderMenu>
      </div>

      <AccountModal open={accountOpen} onClose={() => setAccountOpen(false)} user={user} />
      <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} />

      <ModalShell
        open={confirmOpen}
        onClose={closeConfirm}
        busy={signingOut}
        panelClassName="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800">
          <h3 className="text-sm font-semibold text-white">Çıkış yap</h3>
          <button
            type="button"
            onClick={closeConfirm}
            disabled={signingOut}
            className="text-zinc-500 hover:text-white disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-zinc-300 leading-relaxed">
            Oturumunuz kapatılacak ve bu cihazdaki kadro kopyası silinecek.
            Kadronuz bulut hesabınızda saklanmaya devam eder.
          </p>
          {signingOut && !unsyncedWarning && (
            <p className="text-xs text-sky-300/90">
              Son değişiklikler buluta kaydediliyor…
            </p>
          )}
          {unsyncedWarning && (
            <p className="text-xs text-amber-300 bg-amber-950/40 border border-amber-900/50 rounded-lg px-3 py-2 leading-relaxed" role="alert">
              Son değişiklikler buluta kaydedilemedi. Şimdi çıkarsan bu
              değişiklikler kaybolur. İnternet bağlantını kontrol edip tekrar
              deneyebilir ya da yine de çıkabilirsin.
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={closeConfirm}
              disabled={signingOut}
              className="flex-1 h-10 rounded-xl bg-zinc-800 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
            >
              İptal
            </button>
            <button
              type="button"
              onClick={() => void handleConfirmSignOut(unsyncedWarning)}
              disabled={signingOut}
              className="flex-1 h-10 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-sm font-semibold text-white flex items-center justify-center gap-2"
            >
              {signingOut ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogOut className="w-4 h-4" />
              )}
              {unsyncedWarning ? "Yine de çık" : "Çıkış yap"}
            </button>
          </div>
        </div>
      </ModalShell>
    </>
  );
}

/** Başlıktaki açılır menü: dışarı tıklayınca ya da Esc ile kapanır. */
function HeaderMenu({
  label,
  trigger,
  triggerClassName = "",
  header,
  children,
}: {
  label: string;
  trigger: ReactNode;
  triggerClassName?: string;
  header?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        title={label}
        className={`inline-flex items-center h-8 rounded-lg transition-colors ${
          open ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-800"
        } ${triggerClassName}`}
      >
        {trigger}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-[95] mt-1.5 w-60 overflow-hidden rounded-xl border border-zinc-700/80 bg-zinc-900 py-1 shadow-2xl"
          onClick={(e) => {
            // Öğe seçilince menü kapanır.
            if ((e.target as HTMLElement).closest("[role=menuitem]")) setOpen(false);
          }}
        >
          {header && <div className="-mt-1 mb-1">{header}</div>}
          {children}
        </div>
      )}
    </div>
  );
}

const MENU_ITEM_CLASS =
  "flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium transition-colors [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:shrink-0";

function MenuItem({
  icon,
  onSelect,
  tone = "default",
  children,
}: {
  icon: ReactNode;
  onSelect: () => void;
  tone?: "default" | "danger";
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onSelect}
      className={`${MENU_ITEM_CLASS} ${
        tone === "danger"
          ? "text-red-400 hover:bg-red-950/40"
          : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function PrivacyMenuItem() {
  return (
    <a
      href="/gizlilik"
      target="_blank"
      rel="noopener"
      role="menuitem"
      className={`${MENU_ITEM_CLASS} text-zinc-300 hover:bg-zinc-800 hover:text-white`}
    >
      <ShieldCheck />
      Gizlilik ve KVKK
    </a>
  );
}
