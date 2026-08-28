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

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isFirebaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(configured);
  const [storeReady, setStoreReady] = useState(() => hasAppStoreHydrated());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncPhase, setSyncPhase] = useState<CloudSyncPhase>("idle");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const loadGenerationRef = useRef(0);
  const loadedUserRef = useRef<string | null>(null);
  const lastRemoteUpdatedAtRef = useRef<string | null>(null);
  const lastRemoteBrandingUpdatedAtRef = useRef<string | null>(null);
  const pendingRepushRef = useRef(false);
  const repushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    lastRemoteBrandingUpdatedAtRef.current = null;
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
        const result = await saveUserPoster(uid, snapshot, options);
        lastRemoteUpdatedAtRef.current = result.updatedAt;
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
        };
      } catch (err) {
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
    [configured, user]
  );

  const pushBranding = useCallback(async () => {
    const uid = user?.uid;
    if (!configured || !uid) return { ok: false };

    try {
      const result = await saveUserBranding(uid, useAppStore.getState());
      lastRemoteUpdatedAtRef.current = result.updatedAt;
      return {
        ok: true,
        updatedAt: result.updatedAt,
        brandingUpdatedAt: result.updatedAt,
      };
    } catch (err) {
      if (isResourceExhaustedError(err)) {
        return { ok: false, rateLimited: true, retryable: true };
      }
      console.error("Branding bulut kayıt hatası:", err);
      return { ok: false, retryable: isRetryableFirestoreError(err) };
    }
  }, [configured, user]);

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
