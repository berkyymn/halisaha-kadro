"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  deleteUser,
  EmailAuthProvider,
  GoogleAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { getFirebaseAuth } from "@/lib/firebase/app";
import { deleteCloudAccountData } from "@/lib/accountDeletion";
import { trackEvent } from "@/lib/analytics";
import { reportError, setErrorReportingUser } from "@/lib/errorReporting";
import { clearIndexedDBStorage } from "@/lib/indexedDBStorage";
import { clearMediaUploadCache } from "@/lib/mediaSync";
import { errorCode, mapAuthError, mapFirestoreError } from "@/lib/cloud/errors";
import { resetRepositoryCaches } from "@/lib/cloud/posterRepository";
import { browserSyncMeta } from "@/lib/cloud/syncMeta";
import type { ConflictChoice, SyncState } from "@/lib/cloud/syncController";
import { getSyncController } from "@/lib/cloud/syncRuntime";
import { buildConflictSummary } from "@/lib/loginConflict";
import { hasAppStoreHydrated, onAppStoreHydrated } from "@/store/useAppStore";
import { LoginConflictModal } from "@/components/LoginConflictModal";

/**
 * Oturum (Firebase Auth) + bulut senkronunun arayüze bağlandığı yer.
 * Senkron KARARLARI burada değil, lib/cloud/syncController'dadır; bu dosya
 * yalnızca oturuma göre kontrolcüyü başlatır/durdurur ve durumunu yayınlar.
 */

export type DeleteAccountResult = { ok: true } | { ok: false; error: string };
export type SignOutResult = { ok: true } | { ok: false; reason: "unsynced" };

type AuthContextValue = {
  configured: boolean;
  user: User | null;
  /** Firebase oturum durumu henüz bilinmiyor */
  loading: boolean;
  sync: SyncState;
  authModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  signOut: (options?: { force?: boolean }) => Promise<SignOutResult>;
  deleteAccount: (options: { password?: string }) => Promise<DeleteAccountResult>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth AuthProvider içinde kullanılmalıdır.");
  return ctx;
}

/** Çıkış / hesap silme sonrası bu cihazdaki tüm kullanıcı izini temizler ve yeniler. */
async function wipeLocalAndReload(uid: string | null): Promise<void> {
  browserSyncMeta.clear(uid);
  resetRepositoryCaches();
  clearMediaUploadCache();
  try {
    await clearIndexedDBStorage();
  } catch {
    // Yenileme sonrası misafir kadrosu yine temiz başlar.
  }
  window.location.reload();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isFirebaseConfigured();
  const controller = getSyncController();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(configured);
  const [storeReady, setStoreReady] = useState(() => hasAppStoreHydrated());
  const [sync, setSync] = useState<SyncState>(() => controller.getState());
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => controller.subscribe(setSync), [controller]);

  useEffect(() => {
    if (storeReady) return;
    return onAppStoreHydrated(() => setStoreReady(true));
  }, [storeReady]);

  useEffect(() => {
    if (!configured) return;
    return onAuthStateChanged(getFirebaseAuth(), (nextUser) => {
      setUser(nextUser);
      setLoading(false);
      setErrorReportingUser(nextUser?.uid ?? null);
    });
  }, [configured]);

  // Oturum ve yerel kayıt hazırsa senkronu başlat; oturum kapanınca durdur.
  const uid = user?.uid ?? null;
  useEffect(() => {
    if (!configured || !storeReady) return;
    if (uid) controller.start(uid);
    else controller.stop();
  }, [configured, storeReady, uid, controller]);

  // Sekme gizlenirken/kapanırken bekleyen değişikliği göndermeyi dene.
  useEffect(() => {
    const flush = () => controller.flushInBackground();
    const onVisibility = () => document.visibilityState === "hidden" && flush();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
    };
  }, [controller]);

  const signOut = useCallback(
    async (options?: { force?: boolean }): Promise<SignOutResult> => {
      if (!configured) return { ok: true };
      // Çıkış yerel kopyayı sildiği için bekleyen değişiklik önce gönderilmeli.
      if (!options?.force && !(await controller.flushNow(20_000))) {
        return { ok: false, reason: "unsynced" };
      }
      const signingOut = getFirebaseAuth().currentUser?.uid ?? null;
      controller.stop();
      await firebaseSignOut(getFirebaseAuth());
      await wipeLocalAndReload(signingOut);
      return { ok: true };
    },
    [configured, controller]
  );

  /**
   * KVKK silme hakkı: yeniden doğrula → senkronu durdur → Storage + bulut
   * kadrosu → Auth hesabı → cihazdaki veri. Doğrulama en başta: veri silinip
   * hesabın silinemediği yarım durum oluşmasın.
   */
  const deleteAccount = useCallback(
    async (options: { password?: string }): Promise<DeleteAccountResult> => {
      if (!configured) return { ok: false, error: "Bulut hesabı yapılandırılmamış." };
      const current = getFirebaseAuth().currentUser;
      if (!current) return { ok: false, error: "Oturum bulunamadı." };
      const providers = current.providerData.map((p) => p.providerId);
      try {
        if (providers.includes("password")) {
          if (!options.password) return { ok: false, error: "Şifreni gir." };
          await reauthenticateWithCredential(
            current,
            EmailAuthProvider.credential(current.email ?? "", options.password)
          );
        } else if (providers.includes("google.com")) {
          await reauthenticateWithPopup(current, new GoogleAuthProvider());
        }
        await controller.waitForIdle();
        controller.stop();
        await deleteCloudAccountData(current.uid);
        await deleteUser(current);
        trackEvent("account_deleted");
        await wipeLocalAndReload(current.uid);
        return { ok: true };
      } catch (error) {
        reportError(error, "account-delete");
        if (uid) controller.start(uid);
        return {
          ok: false,
          error: errorCode(error).startsWith("auth/") ? mapAuthError(error) : mapFirestoreError(error),
        };
      }
    },
    [configured, controller, uid]
  );

  const resolveConflict = useCallback(
    (choice: ConflictChoice) => controller.resolveConflict(choice),
    [controller]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      configured,
      user,
      loading,
      sync,
      authModalOpen,
      openAuthModal: () => setAuthModalOpen(true),
      closeAuthModal: () => setAuthModalOpen(false),
      signOut,
      deleteAccount,
    }),
    [configured, user, loading, sync, authModalOpen, signOut, deleteAccount]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      {sync.phase === "conflict" && (
        <LoginConflictModal
          open
          reason={sync.conflict.reason}
          busy={sync.busy}
          error={sync.error}
          localSummary={buildConflictSummary(sync.conflict.local)}
          cloudSummary={buildConflictSummary(sync.conflict.cloud)}
          cloudUpdatedAt={sync.conflict.cloudUpdatedAt}
          onResolve={(choice) => void resolveConflict(choice)}
        />
      )}
    </AuthContext.Provider>
  );
}
