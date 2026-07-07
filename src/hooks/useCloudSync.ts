"use client";

import { useEffect } from "react";
import {
  cloudSyncManager,
  type CloudSyncPhase,
  type CloudSyncSaveResult,
} from "@/lib/cloudSyncManager";
import { clearCloudPrepareCache } from "@/lib/cloudPoster";
import { clearMediaUploadCache } from "@/lib/mediaSync";
import { resetFirestoreWriteQueue } from "@/lib/firestoreWriteQueue";
import { setBrandingFlushListener } from "@/lib/posterSyncEvents";
import type { PosterSnapshot } from "@/lib/posterSnapshot";

type UseCloudSyncOptions = {
  enabled: boolean;
  paused: boolean;
  sessionKey: string | null;
  onSync: (snapshot: PosterSnapshot) => Promise<CloudSyncSaveResult>;
  onBrandingSync?: () => Promise<CloudSyncSaveResult>;
  onForeignTabSync?: (payload: {
    fingerprint: string;
    updatedAt?: string;
    brandingUpdatedAt?: string;
  }) => void;
};

export function markPosterSnapshotSynced(snapshot: PosterSnapshot) {
  cloudSyncManager.markSynced(snapshot);
}

export function resetCloudSyncState() {
  cloudSyncManager.reset();
  clearCloudPrepareCache();
  clearMediaUploadCache();
  resetFirestoreWriteQueue();
}

export function subscribeCloudSyncStatus(
  listener: (status: { phase: CloudSyncPhase }) => void
) {
  return cloudSyncManager.subscribe((status) => {
    listener({ phase: status.phase });
  });
}

export function notifyCloudSyncDirty() {
  cloudSyncManager.notifyDirty();
}

export function flushCloudSync() {
  cloudSyncManager.requestFlush();
}

export function flushBrandingSync() {
  cloudSyncManager.requestBrandingFlush();
}

export function useCloudSync({
  enabled,
  paused,
  sessionKey,
  onSync,
  onBrandingSync,
  onForeignTabSync,
}: UseCloudSyncOptions) {
  useEffect(() => {
    cloudSyncManager.configure(onSync);
  }, [onSync]);

  useEffect(() => {
    cloudSyncManager.configureBranding(onBrandingSync ?? (async () => ({ ok: false })));
  }, [onBrandingSync]);

  useEffect(() => {
    setBrandingFlushListener(() => {
      cloudSyncManager.requestBrandingFlush();
    });
    return () => setBrandingFlushListener(null);
  }, []);

  useEffect(() => {
    cloudSyncManager.setForeignTabSyncHandler(onForeignTabSync ?? null);
    return () => {
      cloudSyncManager.setForeignTabSyncHandler(null);
    };
  }, [onForeignTabSync]);

  useEffect(() => {
    cloudSyncManager.setSessionKey(sessionKey);
  }, [sessionKey]);

  useEffect(() => {
    if (paused) cloudSyncManager.pause("hydration");
    else cloudSyncManager.resume();
  }, [paused]);

  useEffect(() => {
    if (!enabled) {
      cloudSyncManager.stop();
      cloudSyncManager.reset();
      return;
    }

    cloudSyncManager.start();
    return () => {
      cloudSyncManager.stop();
    };
  }, [enabled]);
}
