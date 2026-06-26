"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/app";
import { mapAuthError } from "@/lib/cloudPoster";
import { useModalBackdrop } from "@/hooks/useModalBackdrop";
import { useAuth } from "@/contexts/AuthContext";

type AuthTab = "login" | "register";

export function AuthModal() {
  const { authModalOpen, closeAuthModal, configured } = useAuth();
  if (!authModalOpen) return null;
  return <AuthModalBody onClose={closeAuthModal} configured={configured} />;
}

function AuthModalBody({
  onClose,
  configured,
}: {
  onClose: () => void;
  configured: boolean;
}) {
  const [tab, setTab] = useState<AuthTab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const { backdropProps, panelProps } = useModalBackdrop({
    open: true,
    onClose,
    busy,
  });

  const resetFeedback = () => {
    setError(null);
    setMessage(null);
  };

  const handleLogin = async () => {
    resetFeedback();
    if (!email.trim() || !password) {
      setError("E-posta ve şifre gerekli.");
      return;
    }
    setBusy(true);
    try {
      const auth = getFirebaseAuth();
      await signInWithEmailAndPassword(auth, email.trim(), password);
      onClose();
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleRegister = async () => {
    resetFeedback();
    if (!email.trim() || !password) {
      setError("E-posta ve şifre gerekli.");
      return;
    }
    if (password.length < 6) {
      setError("Şifre en az 6 karakter olmalı.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Şifreler eşleşmiyor.");
      return;
    }
    setBusy(true);
    try {
      const auth = getFirebaseAuth();
      await createUserWithEmailAndPassword(auth, email.trim(), password);
      setMessage("Kayıt tamam. Giriş yapıldı, verilerin buluta kaydedilecek.");
      onClose();
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleSignIn = async () => {
    resetFeedback();
    setBusy(true);
    try {
      const auth = getFirebaseAuth();
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);
      onClose();
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const submit = tab === "login" ? handleLogin : handleRegister;

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-black/80 p-4"
      {...backdropProps}
    >
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
        {...panelProps}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800">
          <h3 className="text-sm font-semibold text-white">Hesap</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {!configured ? (
            <>
              <p className="text-sm text-amber-300/90 bg-amber-950/30 border border-amber-900/40 rounded-lg px-3 py-2.5 leading-relaxed">
                Bulut girişi henüz yapılandırılmamış.{" "}
                <code className="text-[11px] bg-zinc-800 px-1 rounded">.env.local</code>{" "}
                dosyasına Firebase anahtarlarını eklemelisin.
              </p>
              <ol className="text-[11px] text-zinc-400 space-y-1.5 list-decimal list-inside">
                <li>console.firebase.google.com → proje oluştur</li>
                <li>Authentication → Email/Password ve Google aç</li>
                <li>Firestore Database oluştur</li>
                <li>
                  <code className="text-zinc-300">firebase/firestore.rules</code>{" "}
                  yayınla
                </li>
                <li>Web app config → .env.local</li>
              </ol>
              <p className="text-[11px] text-zinc-500">
                Şimdilik verilerin yalnızca bu tarayıcıda (localStorage) saklanır.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="w-full h-10 rounded-xl bg-zinc-800 text-sm font-semibold text-zinc-200 hover:bg-zinc-700"
              >
                Tamam
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={busy}
                className="w-full h-10 rounded-xl bg-white hover:bg-zinc-100 text-sm font-semibold text-zinc-900 disabled:opacity-50 flex items-center justify-center gap-2.5"
              >
                <GoogleIcon />
                Google ile devam et
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-zinc-800" />
                <span className="text-[10px] text-zinc-500 uppercase">veya e-posta</span>
                <div className="flex-1 h-px bg-zinc-800" />
              </div>

              <div className="flex bg-zinc-800 rounded-lg p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    setTab("login");
                    resetFeedback();
                  }}
                  className={`flex-1 py-1.5 rounded-md font-semibold transition-colors ${
                    tab === "login"
                      ? "bg-green-600 text-white"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Giriş yap
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTab("register");
                    resetFeedback();
                  }}
                  className={`flex-1 py-1.5 rounded-md font-semibold transition-colors ${
                    tab === "register"
                      ? "bg-green-600 text-white"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Kayıt ol
                </button>
              </div>

              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Giriş yaptığında kadro ve poster ayarların Firebase&apos;de
                saklanır; başka cihazdan veya mobil uygulamadan devam edebilirsin.
              </p>

              <label className="block">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                  E-posta
                </span>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full h-10 bg-zinc-800 border border-zinc-700 rounded-lg px-3 text-sm text-white"
                  placeholder="ornek@mail.com"
                />
              </label>

              <label className="block">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                  Şifre
                </span>
                <input
                  type="password"
                  autoComplete={
                    tab === "login" ? "current-password" : "new-password"
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full h-10 bg-zinc-800 border border-zinc-700 rounded-lg px-3 text-sm text-white"
                  placeholder="••••••"
                />
              </label>

              {tab === "register" && (
                <label className="block">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                    Şifre tekrar
                  </span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="mt-1 w-full h-10 bg-zinc-800 border border-zinc-700 rounded-lg px-3 text-sm text-white"
                    placeholder="••••••"
                  />
                </label>
              )}

              {error && (
                <p className="text-xs text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
              {message && (
                <p className="text-xs text-green-400 bg-green-950/30 border border-green-900/40 rounded-lg px-3 py-2">
                  {message}
                </p>
              )}

              <button
                type="button"
                onClick={submit}
                disabled={busy}
                className="w-full h-10 rounded-xl bg-green-600 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {busy ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Bekleyin...
                  </>
                ) : tab === "login" ? (
                  "Giriş yap"
                ) : (
                  "Kayıt ol"
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
