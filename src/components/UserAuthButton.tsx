"use client";

import { Cloud, Loader2, LogIn, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

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

  if (loading && configured) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500 px-2">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      </span>
    );
  }

  if (!user) {
    return (
      <button
        type="button"
        onClick={openAuthModal}
        className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-zinc-600 bg-zinc-800 hover:bg-zinc-700 hover:border-zinc-500 text-[11px] font-semibold text-white shrink-0"
        title={
          configured
            ? "Hesabınla giriş yap, verilerin bulutta saklansın"
            : "Hesap — bulut yedek için yapılandırma gerekli"
        }
      >
        <LogIn className="w-3.5 h-3.5" />
        Giriş yap
      </button>
    );
  }

  const email = user.email ?? "Hesap";
  const syncTitle = syncError ??
    (syncStatus === "loading"
      ? "Bulut verisi yükleniyor"
      : syncPhase === "cooldown"
      ? "Bulut kaydı geçici olarak beklemede"
      : syncPhase === "syncing"
        ? "Buluta kaydediliyor"
        : syncPhase === "pending"
          ? "Buluta kaydedilmek üzere bekliyor"
          : "Bulut kaydı güncel");

  return (
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
        onClick={() => void signOut()}
        className="inline-flex items-center gap-1 h-8 px-2 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800"
        title="Çıkış yap"
      >
        <LogOut className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
