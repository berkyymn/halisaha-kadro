"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { getFirebaseAuth } from "@/lib/firebase/app";
import {
  describeCloudSaveResult,
  fetchUserPoster,
  mapFirestoreError,
  saveUserPoster,
} from "@/lib/cloudPoster";
import { isResourceExhaustedError } from "@/lib/firestoreWriteQueue";
import { hasPlayerPhoto } from "@/lib/playerPhotos";
import { countCustomTeamLogos } from "@/lib/teamLogoCloud";
import {
  type PosterSnapshot,
} from "@/lib/posterSnapshot";
import { fingerprintPosterSnapshot } from "@/lib/snapshotFingerprint";
import { useAppStore, hasAppStoreHydrated, onAppStoreHydrated } from "@/store/useAppStore";
import {
  useCloudSync,
  markPosterSnapshotSynced,
  resetCloudSyncState,
  notifyCloudSyncDirty,
} from "@/hooks/useCloudSync";

export type SyncStatus = "idle" | "loading" | "syncing" | "saved" | "error";

type AuthContextValue = {
  configured: boolean;
  user: User | null;
  loading: boolean;
  syncStatus: SyncStatus;
  syncError: string | null;
  authModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth AuthProvider içinde kullanılmalıdır.");
  }
  return ctx;
}

function countPhotos(snapshot: PosterSnapshot): number {
  return Object.values(snapshot.savedPlayers).filter((player) =>
    hasPlayerPhoto(player)
  ).length;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isFirebaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(configured);
  const [storeReady, setStoreReady] = useState(() => hasAppStoreHydrated());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const loadGenerationRef = useRef(0);
  const loadedUserRef = useRef<string | null>(null);
  const lastRemoteUpdatedAtRef = useRef<string | null>(null);
  const pendingRepushRef = useRef(false);

  const hydrateFromSnapshot = useAppStore((s) => s.hydrateFromSnapshot);
  const getPosterSnapshot = useAppStore((s) => s.getPosterSnapshot);
  const setRemoteHydrating = useAppStore((s) => s.setRemoteHydrating);

  useEffect(() => {
    if (storeReady) return;
    return onAppStoreHydrated(() => {
      setStoreReady(true);
    });
  }, [storeReady]);

  const applyCloudRow = useCallback(
    (
      parsed: PosterSnapshot,
      row: {
        updatedAt: string;
        photosOmitted?: boolean;
        logosOmitted?: boolean;
      },
      localSnapshot: PosterSnapshot
    ) => {
      const localPhotos = countPhotos(localSnapshot);
      const localCustomLogos = countCustomTeamLogos(
        localSnapshot.homeTeam.logo,
        localSnapshot.awayTeam.logo
      );

      hydrateFromSnapshot(parsed);
      const merged = getPosterSnapshot();
      const mergedPhotos = countPhotos(merged);
      const mergedCustomLogos = countCustomTeamLogos(
        merged.homeTeam.logo,
        merged.awayTeam.logo
      );
      const cloudCustomLogos = countCustomTeamLogos(
        parsed.homeTeam.logo,
        parsed.awayTeam.logo
      );

      lastRemoteUpdatedAtRef.current = row.updatedAt || null;
      setSyncStatus("saved");

      if (row.photosOmitted) {
        setSyncError(
          mergedPhotos > countPhotos(parsed)
            ? "Buluttaki bazı fotoğraflar eksikti; bu cihazdaki kopyalar geri yüklendi."
            : "Bulutta kayıtlı kadroda bazı fotoğraflar eksik olabilir."
        );
      } else if (row.logosOmitted) {
        setSyncError(
          mergedCustomLogos > cloudCustomLogos
            ? "Buluttaki yüklenen logolar eksikti; bu cihazdaki kopyalar geri yüklendi."
            : "Bulutta kayıtlı kadroda bazı logolar eksik olabilir."
        );
      } else if (
        localCustomLogos > cloudCustomLogos &&
        mergedCustomLogos > cloudCustomLogos
      ) {
        setSyncError(
          "Eksik logo ayarları bu cihazdan geri yüklendi; buluta yeniden kaydediliyor."
        );
      } else if (
        localPhotos > countPhotos(parsed) &&
        mergedPhotos > countPhotos(parsed)
      ) {
        setSyncError(
          "Eksik fotoğraflar bu cihazdan geri yüklendi; buluta yeniden kaydediliyor."
        );
      } else {
        setSyncError(null);
      }

      const mergedFingerprint = fingerprintPosterSnapshot(merged);
      const cloudFingerprint = fingerprintPosterSnapshot(parsed);
      markPosterSnapshotSynced(parsed);
      pendingRepushRef.current = mergedFingerprint !== cloudFingerprint;
    },
    [hydrateFromSnapshot, getPosterSnapshot]
  );

  const softReloadFromCloud = useCallback(
    async (userId: string) => {
      const generation = loadGenerationRef.current;
      setRemoteHydrating(true);
      try {
        const row = await fetchUserPoster(userId);
        if (generation !== loadGenerationRef.current || row.status !== "ok") {
          return;
        }

        applyCloudRow(row.doc.data, row.doc, getPosterSnapshot());
      } catch (err) {
        console.error("Bulut yenileme hatası:", err);
        setSyncError(mapFirestoreError(err));
        setSyncStatus("error");
      } finally {
        if (generation === loadGenerationRef.current) {
          setRemoteHydrating(false);
          if (pendingRepushRef.current) {
            pendingRepushRef.current = false;
            notifyCloudSyncDirty();
          }
        }
      }
    },
    [applyCloudRow, getPosterSnapshot, setRemoteHydrating]
  );

  const loadCloudPoster = useCallback(
    async (userId: string) => {
      if (!configured || !storeReady) return;

      const generation = ++loadGenerationRef.current;
      setSyncStatus("loading");
      setSyncError(null);
      setRemoteHydrating(true);
      pendingRepushRef.current = false;
      try {
        const localSnapshot = getPosterSnapshot();
        const row = await fetchUserPoster(userId);
        if (generation !== loadGenerationRef.current) return;

        if (row.status === "ok") {
          applyCloudRow(row.doc.data, row.doc, localSnapshot);
          loadedUserRef.current = userId;
          return;
        }

        if (row.status === "corrupt") {
          setSyncError(
            "Bulut verisi okunamadı. Yerel kopyan korundu; buluta yazılmadı."
          );
          setSyncStatus("error");
          loadedUserRef.current = userId;
          markPosterSnapshotSynced(getPosterSnapshot());
          return;
        }

        const snapshot = getPosterSnapshot();
        const result = await saveUserPoster(userId, snapshot);
        if (generation !== loadGenerationRef.current) return;
        setSyncStatus("saved");
        setSyncError(describeCloudSaveResult(result));
        lastRemoteUpdatedAtRef.current = result.updatedAt;
        loadedUserRef.current = userId;
        markPosterSnapshotSynced(getPosterSnapshot());
      } catch (err) {
        if (generation !== loadGenerationRef.current) return;
        console.error("Bulut yükleme hatası:", err);
        setSyncError(mapFirestoreError(err));
        setSyncStatus("error");
      } finally {
        if (generation === loadGenerationRef.current) {
          setRemoteHydrating(false);
          if (pendingRepushRef.current) {
            pendingRepushRef.current = false;
            notifyCloudSyncDirty();
          }
        }
      }
    },
    [
      configured,
      storeReady,
      applyCloudRow,
      getPosterSnapshot,
      setRemoteHydrating,
    ]
  );

  useEffect(() => {
    if (!configured) return;

    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
      if (nextUser) {
        if (loadedUserRef.current !== nextUser.uid) {
          setRemoteHydrating(true);
        }
      } else {
        loadGenerationRef.current += 1;
        loadedUserRef.current = null;
        lastRemoteUpdatedAtRef.current = null;
        setRemoteHydrating(false);
        setSyncStatus("idle");
        setSyncError(null);
      }
    });

    return () => unsubscribe();
  }, [configured, setRemoteHydrating]);

  useEffect(() => {
    resetCloudSyncState();
    lastRemoteUpdatedAtRef.current = null;
  }, [user?.uid]);

  useEffect(() => {
    if (!configured || !storeReady || !user) return;
    if (loadedUserRef.current === user.uid) return;
    void loadCloudPoster(user.uid);
  }, [configured, storeReady, user, loadCloudPoster]);

  const signOut = useCallback(async () => {
    if (!configured) return;
    loadGenerationRef.current += 1;
    loadedUserRef.current = null;
    lastRemoteUpdatedAtRef.current = null;
    resetCloudSyncState();
    await firebaseSignOut(getFirebaseAuth());
    setUser(null);
    setSyncStatus("idle");
    setSyncError(null);
  }, [configured]);

  const pushSnapshot = useCallback(
    async (snapshot: PosterSnapshot) => {
      const uid = user?.uid;
      if (!configured || !uid) return { ok: false };

      setSyncStatus("syncing");
      try {
        const result = await saveUserPoster(uid, snapshot);
        lastRemoteUpdatedAtRef.current = result.updatedAt;
        setSyncStatus("saved");
        const warning = describeCloudSaveResult(result);
        setSyncError(warning);
        return { ok: true, warning, updatedAt: result.updatedAt };
      } catch (err) {
        if (isResourceExhaustedError(err)) {
          setSyncError(mapFirestoreError(err));
          setSyncStatus("error");
          return { ok: false, rateLimited: true };
        }
        console.error("Bulut kayıt hatası:", err);
        setSyncError(mapFirestoreError(err));
        setSyncStatus("error");
        return { ok: false };
      }
    },
    [configured, user, softReloadFromCloud]
  );

  const handleForeignTabSync = useCallback(
    (payload: { fingerprint: string; updatedAt?: string }) => {
      if (!user) return;
      if (
        payload.updatedAt &&
        lastRemoteUpdatedAtRef.current &&
        payload.updatedAt <= lastRemoteUpdatedAtRef.current
      ) {
        return;
      }
      void softReloadFromCloud(user.uid);
    },
    [user, softReloadFromCloud]
  );

  const remoteHydrating = useAppStore((s) => s.remoteHydrating);

  useCloudSync({
    enabled: Boolean(user && configured && storeReady),
    paused: remoteHydrating,
    sessionKey: user?.uid ?? null,
    onSync: pushSnapshot,
    onForeignTabSync: handleForeignTabSync,
  });

  const value = useMemo<AuthContextValue>(
    () => ({
      configured,
      user,
      loading,
      syncStatus,
      syncError,
      authModalOpen,
      openAuthModal: () => setAuthModalOpen(true),
      closeAuthModal: () => setAuthModalOpen(false),
      signOut,
    }),
    [configured, user, loading, syncStatus, syncError, authModalOpen, signOut]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}
