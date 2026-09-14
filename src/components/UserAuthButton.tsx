"use client";

import { useState } from "react";
import {
  Cloud,
  CloudOff,
  HardDrive,
  Loader2,
  LogIn,
  LogOut,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ModalShell } from "@/components/ModalShell";

export function UserAuthButton() {
  const {
    configured,
    user,
    loading,
    syncStatus,
    syncPhase,
    syncError,
    openAuthModal,
    signOut,
  } = useAuth();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

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
          onClick={openAuthModal}
          className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-zinc-600 bg-zinc-800 hover:bg-zinc-700 hover:border-zinc-500 text-[11px] font-semibold text-white shrink-0"
          title="Hesabınla giriş yap, verilerin bulutta saklansın"
        >
          <LogIn className="w-3.5 h-3.5" />
          Giriş yap
        </button>
      </div>
    );
  }

  const email = user.email ?? "Hesap";
  const syncTitle =
    syncError ??
    (syncStatus === "loading"
      ? "Bulut verisi yükleniyor"
      : syncPhase === "cooldown"
        ? "Bulut kaydı geçici olarak beklemede"
        : syncPhase === "syncing"
          ? "Buluta kaydediliyor"
          : syncPhase === "pending"
            ? "Buluta kaydedilmek üzere bekliyor"
            : "Bulut kaydı güncel");

  const handleConfirmSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } catch {
      setSigningOut(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-1.5 shrink-0">
        <span
          className={`inline-flex items-center justify-center w-7 h-7 rounded-md ${
            syncStatus === "error"
              ? "text-red-400 bg-red-950/40 cursor-help"
              : syncPhase === "cooldown"
                ? "text-amber-400 bg-amber-950/30"
                : syncStatus === "loading" ||
                    syncPhase === "syncing" ||
                    syncPhase === "pending"
                  ? "text-sky-400 bg-sky-950/30"
                  : "text-green-400 bg-green-950/30"
          }`}
          title={syncTitle}
          aria-label={syncTitle}
        >
          {syncStatus === "loading" || syncPhase === "syncing" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Cloud className="w-3.5 h-3.5" />
          )}
        </span>
        <span
          className="hidden lg:inline max-w-[140px] truncate text-[11px] text-zinc-400"
          title={email}
        >
          {email}
        </span>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="inline-flex items-center gap-1 h-8 px-2 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800"
          title="Çıkış yap"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>

      <ModalShell
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        busy={signingOut}
        panelClassName="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800">
          <h3 className="text-sm font-semibold text-white">Çıkış yap</h3>
          <button
            type="button"
            onClick={() => setConfirmOpen(false)}
            disabled={signingOut}
            className="text-zinc-500 hover:text-white disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-zinc-300 leading-relaxed">
            Oturumunuz kapatılacak ve bu cihazdaki tüm kadro verileri
            silinecek. Devam etmek istiyor musunuz?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              disabled={signingOut}
              className="flex-1 h-10 rounded-xl bg-zinc-800 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
            >
              İptal
            </button>
            <button
              type="button"
              onClick={handleConfirmSignOut}
              disabled={signingOut}
              className="flex-1 h-10 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-sm font-semibold text-white flex items-center justify-center gap-2"
            >
              {signingOut ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogOut className="w-4 h-4" />
              )}
              Çıkış yap
            </button>
          </div>
        </div>
      </ModalShell>
    </>
  );
}
