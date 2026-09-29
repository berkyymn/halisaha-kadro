"use client";

import { useState } from "react";
import { Loader2, Trash2, X } from "lucide-react";
import type { User } from "firebase/auth";
import { ModalShell } from "@/components/ModalShell";
import { useAuth } from "@/contexts/AuthContext";

/** Hesap bilgisi ve KVKK silme hakkı: "Hesabımı sil". */
export function AccountModal({
  open,
  onClose,
  user,
}: {
  open: boolean;
  onClose: () => void;
  user: User;
}) {
  const { deleteAccount } = useAuth();
  const [step, setStep] = useState<"info" | "confirm">("info");
  const [password, setPassword] = useState("");
  const [understood, setUnderstood] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usesPassword = user.providerData.some((p) => p.providerId === "password");
  const usesGoogle = user.providerData.some((p) => p.providerId === "google.com");

  const close = () => {
    if (busy) return;
    setStep("info");
    setPassword("");
    setUnderstood(false);
    setError(null);
    onClose();
  };

  const handleDelete = async () => {
    setBusy(true);
    setError(null);
    const result = await deleteAccount({ password: usesPassword ? password : undefined });
    // Başarılıysa sayfa yenilenir; yalnızca hata durumunda buraya döneriz.
    if (!result.ok) {
      setError(result.error);
      setBusy(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={close}
      busy={busy}
      panelClassName="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
    >
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800">
        <h3 className="text-sm font-semibold text-white">
          {step === "info" ? "Hesap" : "Hesabımı sil"}
        </h3>
        <button type="button" onClick={close} disabled={busy} aria-label="Kapat" className="text-zinc-500 hover:text-white disabled:opacity-50">
          <X className="w-4 h-4" />
        </button>
      </div>

      {step === "info" ? (
        <div className="p-5 space-y-4">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">Giriş yapılan hesap</p>
            <p className="text-sm text-white break-all">{user.email ?? "—"}</p>
            <p className="text-[11px] text-zinc-500">
              {usesGoogle ? "Google ile giriş" : "E-posta ve şifre ile giriş"}
            </p>
          </div>
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            Kadron bu hesapta bulutta saklanıyor. Verilerin nasıl işlendiğini{" "}
            <a href="/gizlilik" target="_blank" rel="noopener" className="text-zinc-300 underline underline-offset-2">
              Gizlilik ve KVKK
            </a>{" "}
            sayfasında görebilirsin.
          </p>
          <button
            type="button"
            onClick={() => setStep("confirm")}
            className="w-full h-10 rounded-xl border border-red-900/60 bg-red-950/30 text-sm font-semibold text-red-300 hover:bg-red-950/60 flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" aria-hidden />
            Hesabımı sil
          </button>
        </div>
      ) : (
        <div className="p-5 space-y-4">
          <p className="text-sm text-zinc-300 leading-relaxed">
            Hesabın, buluttaki kadron, oyuncu fotoğrafların ve yüklediğin logolar{" "}
            <strong className="text-white">kalıcı olarak silinir</strong>. Bu işlem geri alınamaz.
          </p>
          {usesPassword && (
            <label className="block">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Onay için şifren</span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy}
                className="mt-1 w-full h-10 bg-zinc-800 border border-zinc-700 rounded-lg px-3 text-sm text-white"
              />
            </label>
          )}
          {!usesPassword && usesGoogle && (
            <p className="text-[11px] text-zinc-500">Onay için Google penceresi açılacak.</p>
          )}
          <label className="flex items-start gap-2 text-[12px] text-zinc-300">
            <input
              type="checkbox"
              checked={understood}
              onChange={(e) => setUnderstood(e.target.checked)}
              disabled={busy}
              className="mt-0.5 accent-red-600"
            />
            Tüm verilerimin kalıcı olarak silineceğini anlıyorum.
          </label>
          {error && (
            <p className="text-xs text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2" role="alert">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep("info")}
              disabled={busy}
              className="flex-1 h-10 rounded-xl bg-zinc-800 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={busy || !understood || (usesPassword && !password)}
              className="flex-1 h-10 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-sm font-semibold text-white flex items-center justify-center gap-2"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Kalıcı olarak sil
            </button>
          </div>
        </div>
      )}
    </ModalShell>
  );
}
