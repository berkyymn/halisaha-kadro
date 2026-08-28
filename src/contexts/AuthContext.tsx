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
  saveUserBranding,
  saveUserPoster,
  subscribeUserPoster,
} from "@/lib/cloudPoster";
import { mergeCloudBrandingIntoSnapshot } from "@/lib/brandingSnapshot";
import {
  isResourceExhaustedError,
  isRetryableFirestoreError,
} from "@/lib/firestoreWriteQueue";
import { hasPlayerPhoto } from "@/lib/playerPhotos";
import { countCustomTeamLogos } from "@/lib/teamLogoCloud";
import {
  type PosterSnapshot,
} from "@/lib/posterSnapshot";
import { useAppStore, hasAppStoreHydrated, onAppStoreHydrated } from "@/store/useAppStore";
import {
  useCloudSync,
  markPosterSnapshotSynced,
  resetCloudSyncState,
  notifyCloudSyncDirty,
  subscribeCloudSyncStatus,
} from "@/hooks/useCloudSync";
import { cleanupOrphanedMedia } from "@/lib/mediaSync";
import type { CloudSyncPhase } from "@/lib/cloudSyncManager";

export type SyncStatus = "idle" | "loading" | "syncing" | "saved" | "error";

type AuthContextValue = {
  configured: boolean;
  user: User | null;
  loading: boolean;
  syncStatus: SyncStatus;
  syncPhase: CloudSyncPhase;
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

function hasStaleInlineMedia(snapshot: PosterSnapshot): boolean {
  return Object.values(snapshot.savedPlayers).some(
    (player) =>
      (player.cutoutUrl?.startsWith("data:") && player.cutoutStoragePath) ||
      (player.photoSource?.startsWith("data:") && player.photoSourceStoragePath)
  );
}

function hasStaleInlineLogo(logo: Parameters<typeof countCustomTeamLogos>[0]): boolean {
  return Boolean(logo?.imageUrl?.startsWith("data:") && logo.storagePath);
}

function isRevisionConflict(error: unknown): boolean {
  return Boolean(
    error && typeof error === "object" &&
      "code" in error &&
      String((error as { code: string }).code) === "failed-precondition"
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isFirebaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(configured);
  const [storeReady, setStoreReady] = useState(() => hasAppStoreHydrated());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncPhase, setSyncPhase] = useState<CloudSyncPhase>("idle");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [loadRetryNonce, setLoadRetryNonce] = useState(0);
  const loadGenerationRef = useRef(0);
  const loadedUserRef = useRef<string | null>(null);
  const lastRemoteUpdatedAtRef = useRef<string | null>(null);
  const lastRemoteBrandingUpdatedAtRef = useRef<string | null>(null);
  const cloudRevisionRef = useRef<number | null>(null);
  const cloudSnapshotRef = useRef<PosterSnapshot | null>(null);
  const pendingRepushRef = useRef(false);
  const repushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadRetryAttemptRef = useRef(0);

  const scheduleRepush = useCallback(() => {
    if (repushTimerRef.current) clearTimeout(repushTimerRef.current);
    repushTimerRef.current = setTimeout(() => {
      repushTimerRef.current = null;
      notifyCloudSyncDirty();
    }, 3000);
  }, []);

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
        brandingUpdatedAt?: string;
        revision?: number;
        photosOmitted?: boolean;
        logosOmitted?: boolean;
      },
      localSnapshot: PosterSnapshot,
      cloudBranding?: Parameters<typeof mergeCloudBrandingIntoSnapshot>[1]
    ) => {
      const localPhotos = countPhotos(localSnapshot);
      const localCustomLogos = countCustomTeamLogos(
        localSnapshot.homeTeam.logo,
        localSnapshot.awayTeam.logo
      );

      const cloudData = mergeCloudBrandingIntoSnapshot(
        parsed,
        cloudBranding,
        row.brandingUpdatedAt
      );
      cloudSnapshotRef.current = cloudData;

      hydrateFromSnapshot(cloudData, row.updatedAt);
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
      lastRemoteBrandingUpdatedAtRef.current = row.brandingUpdatedAt || null;
      cloudRevisionRef.current = row.revision ?? 0;
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

      const localIsNewer = Boolean(
        localSnapshot.localUpdatedAt &&
          row.updatedAt &&
          localSnapshot.localUpdatedAt > row.updatedAt
      );
      const localMediaWasPreserved =
        (localPhotos > countPhotos(parsed) &&
          mergedPhotos > countPhotos(parsed)) ||
        (localCustomLogos > cloudCustomLogos &&
          mergedCustomLogos > cloudCustomLogos);
      const cloudHasStaleMedia =
        hasStaleInlineMedia(parsed) ||
        hasStaleInlineLogo(cloudBranding?.home.logo) ||
        hasStaleInlineLogo(cloudBranding?.away.logo);
      const needsRepush = localIsNewer || localMediaWasPreserved || cloudHasStaleMedia;

      if (!needsRepush) {
        markPosterSnapshotSynced(merged);
        pendingRepushRef.current = false;
      } else {
        pendingRepushRef.current = true;
      }
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

        applyCloudRow(
          row.doc.data,
          row.doc,
          getPosterSnapshot(),
          row.doc.branding
        );
      } catch (err) {
        console.error("Bulut yenileme hatası:", err);
        setSyncError(mapFirestoreError(err));
        setSyncStatus("error");
      } finally {
        if (generation === loadGenerationRef.current) {
          setRemoteHydrating(false);
          if (pendingRepushRef.current) {
            pendingRepushRef.current = false;
            scheduleRepush();
          }
        }
      }
    },
    [applyCloudRow, getPosterSnapshot, setRemoteHydrating, scheduleRepush]
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
          loadRetryAttemptRef.current = 0;
          applyCloudRow(
            row.doc.data,
            row.doc,
            localSnapshot,
            row.doc.branding
          );
          loadedUserRef.current = userId;
          return;
        }

        if (row.status === "corrupt") {
          loadRetryAttemptRef.current = 0;
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
        loadRetryAttemptRef.current = 0;
        setSyncStatus("saved");
        setSyncError(describeCloudSaveResult(result));
        lastRemoteUpdatedAtRef.current = result.updatedAt;
        cloudRevisionRef.current = result.revision;
        await cleanupOrphanedMedia(cloudSnapshotRef.current, snapshot);
        cloudSnapshotRef.current = snapshot;
        loadedUserRef.current = userId;
        markPosterSnapshotSynced(getPosterSnapshot(), { clearOutbox: true });
      } catch (err) {
        if (generation !== loadGenerationRef.current) return;
        console.error("Bulut yükleme hatası:", err);
        setSyncError(mapFirestoreError(err));
        setSyncStatus("error");
        if (isRetryableFirestoreError(err)) {
          const delay = Math.min(
            60_000,
            5_000 * 2 ** loadRetryAttemptRef.current
          );
          loadRetryAttemptRef.current += 1;
          if (loadRetryTimerRef.current) {
            clearTimeout(loadRetryTimerRef.current);
          }
          loadRetryTimerRef.current = setTimeout(() => {
            loadRetryTimerRef.current = null;
            if (
              generation === loadGenerationRef.current &&
              loadedUserRef.current !== userId
            ) {
              setLoadRetryNonce((nonce) => nonce + 1);
            }
          }, delay);
        }
      } finally {
        if (generation === loadGenerationRef.current) {
          setRemoteHydrating(false);
          if (pendingRepushRef.current) {
            pendingRepushRef.current = false;
            scheduleRepush();
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
      scheduleRepush,
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
        cloudRevisionRef.current = null;
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
    lastRemoteBrandingUpdatedAtRef.current = null;
    cloudRevisionRef.current = null;
    cloudSnapshotRef.current = null;
  }, [user?.uid]);

  useEffect(() => {
    if (!configured || !storeReady || !user) return;
    if (loadedUserRef.current === user.uid) return;
    void loadCloudPoster(user.uid);
  }, [configured, storeReady, user, loadCloudPoster]);

  useEffect(() => {
    if (loadRetryNonce === 0 || !configured || !storeReady || !user) return;
    if (loadedUserRef.current === user.uid) return;
    void loadCloudPoster(user.uid);
  }, [configured, loadRetryNonce, loadCloudPoster, storeReady, user]);

  useEffect(() => {
    if (!configured || !user) return;
    return subscribeUserPoster(
      user.uid,
      (change) => {
        if (useAppStore.getState().remoteHydrating) return;
        if (
          change.revision !== undefined &&
          change.revision > 0 &&
          change.revision <= (cloudRevisionRef.current ?? 0)
        ) {
          return;
        }
        if (
          change.revision === 0 &&
          change.updatedAt &&
          change.updatedAt <= (lastRemoteUpdatedAtRef.current ?? "")
        ) {
          return;
        }
        void softReloadFromCloud(user.uid);
      },
      (error) => {
        console.warn("Realtime cloud listener failed:", error);
      }
    );
  }, [configured, user, softReloadFromCloud]);

  const signOut = useCallback(async () => {
    if (!configured) return;
    loadGenerationRef.current += 1;
    if (loadRetryTimerRef.current) {
      clearTimeout(loadRetryTimerRef.current);
      loadRetryTimerRef.current = null;
    }
    loadRetryAttemptRef.current = 0;
    loadedUserRef.current = null;
    lastRemoteUpdatedAtRef.current = null;
    lastRemoteBrandingUpdatedAtRef.current = null;
    cloudRevisionRef.current = null;
    cloudSnapshotRef.current = null;
    resetCloudSyncState();
    await firebaseSignOut(getFirebaseAuth());
    setUser(null);
    setSyncStatus("idle");
    setSyncError(null);
  }, [configured]);

  const pushSnapshot = useCallback(
    async (
      snapshot: PosterSnapshot,
      options?: { includeBranding?: boolean }
    ) => {
      const uid = user?.uid;
      if (!configured || !uid) return { ok: false };

      setSyncStatus("syncing");
      try {
        const result = await saveUserPoster(uid, snapshot, {
          ...options,
          expectedRevision: cloudRevisionRef.current ?? undefined,
        });
        lastRemoteUpdatedAtRef.current = result.updatedAt;
        cloudRevisionRef.current = result.revision;
        await cleanupOrphanedMedia(cloudSnapshotRef.current, snapshot);
        cloudSnapshotRef.current = snapshot;
        if (result.brandingUpdatedAt) {
          lastRemoteBrandingUpdatedAtRef.current = result.brandingUpdatedAt;
        }
        setSyncStatus("saved");
        const warning = describeCloudSaveResult(result);
        setSyncError(warning);
        return {
          ok: true,
          warning,
          updatedAt: result.updatedAt,
          brandingUpdatedAt: result.brandingUpdatedAt,
          revision: result.revision,
        };
      } catch (err) {
        if (isRevisionConflict(err)) {
          setSyncError("Bulut verisi başka bir cihazda değişti; güncel sürüm yükleniyor.");
          void softReloadFromCloud(uid);
          return { ok: false, conflict: true, retryable: false };
        }
        if (isResourceExhaustedError(err)) {
          setSyncError(mapFirestoreError(err));
          setSyncStatus("error");
          return { ok: false, rateLimited: true, retryable: true };
        }
        console.error("Bulut kayıt hatası:", err);
        setSyncError(mapFirestoreError(err));
        setSyncStatus("error");
        return { ok: false, retryable: isRetryableFirestoreError(err) };
      }
    },
    [configured, user, softReloadFromCloud]
  );

  const pushBranding = useCallback(async () => {
    const uid = user?.uid;
    if (!configured || !uid) return { ok: false };

    try {
      const result = await saveUserBranding(uid, useAppStore.getState(), {
        expectedRevision: cloudRevisionRef.current ?? undefined,
      });
      lastRemoteUpdatedAtRef.current = result.updatedAt;
      cloudRevisionRef.current = result.revision;
      const snapshot = useAppStore.getState().getPosterSnapshot();
      await cleanupOrphanedMedia(cloudSnapshotRef.current, snapshot);
      cloudSnapshotRef.current = snapshot;
      return {
        ok: true,
        updatedAt: result.updatedAt,
        brandingUpdatedAt: result.updatedAt,
        revision: result.revision,
      };
    } catch (err) {
      if (isRevisionConflict(err)) {
        setSyncError("Bulut verisi başka bir cihazda değişti; güncel sürüm yükleniyor.");
        void softReloadFromCloud(uid);
        return { ok: false, conflict: true, retryable: false };
      }
      if (isResourceExhaustedError(err)) {
        return { ok: false, rateLimited: true, retryable: true };
      }
      console.error("Branding bulut kayıt hatası:", err);
      return { ok: false, retryable: isRetryableFirestoreError(err) };
    }
  }, [configured, user, softReloadFromCloud]);

  const handleForeignTabSync = useCallback(
    (payload: {
      updatedAt?: string;
      brandingUpdatedAt?: string;
    }) => {
      if (!user) return;
      const dataStale =
        !payload.updatedAt ||
        !lastRemoteUpdatedAtRef.current ||
        payload.updatedAt > lastRemoteUpdatedAtRef.current;
      const brandingStale =
        Boolean(payload.brandingUpdatedAt) &&
        (!lastRemoteBrandingUpdatedAtRef.current ||
          payload.brandingUpdatedAt! > lastRemoteBrandingUpdatedAtRef.current);
      if (!dataStale && !brandingStale) {
        return;
      }
      void softReloadFromCloud(user.uid);
    },
    [user, softReloadFromCloud]
  );

  useEffect(() => {
    if (!configured || !user) return;
    return subscribeCloudSyncStatus(({ phase }) => {
      setSyncPhase(phase);
    });
  }, [configured, user]);

  useEffect(() => {
    return () => {
      if (repushTimerRef.current) clearTimeout(repushTimerRef.current);
      if (loadRetryTimerRef.current) clearTimeout(loadRetryTimerRef.current);
    };
  }, []);

  const remoteHydrating = useAppStore((s) => s.remoteHydrating);

  useCloudSync({
    enabled: Boolean(user && configured && storeReady),
    paused: remoteHydrating,
    sessionKey: user?.uid ?? null,
    onSync: pushSnapshot,
    onBrandingSync: pushBranding,
    onForeignTabSync: handleForeignTabSync,
  });

  const value = useMemo<AuthContextValue>(
    () => ({
      configured,
      user,
      loading,
      syncStatus,
      syncPhase: configured && user ? syncPhase : "idle",
      syncError,
      authModalOpen,
      openAuthModal: () => setAuthModalOpen(true),
      closeAuthModal: () => setAuthModalOpen(false),
      signOut,
    }),
    [configured, user, loading, syncStatus, syncPhase, syncError, authModalOpen, signOut]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}
