"use client";

import { useEffect } from "react";
import {
  cloudSyncManager,
  type CloudSyncSaveResult,
} from "@/lib/cloudSyncManager";
import { clearCloudPrepareCache } from "@/lib/cloudPoster";
import { resetFirestoreWriteQueue } from "@/lib/firestoreWriteQueue";
import type { PosterSnapshot } from "@/lib/posterSnapshot";

type UseCloudSyncOptions = {
  enabled: boolean;
  paused: boolean;
  sessionKey: string | null;
  onSync: (snapshot: PosterSnapshot) => Promise<CloudSyncSaveResult>;
  onForeignTabSync?: (payload: {
    fingerprint: string;
    updatedAt?: string;
  }) => void;
};

export function markPosterSnapshotSynced(snapshot: PosterSnapshot) {
  cloudSyncManager.markSynced(snapshot);
}

export function resetCloudSyncState() {
  cloudSyncManager.reset();
  clearCloudPrepareCache();
  resetFirestoreWriteQueue();
}

export function notifyCloudSyncDirty() {
  cloudSyncManager.notifyDirty();
}

export function flushCloudSync() {
  cloudSyncManager.requestFlush();
}

export function useCloudSync({
  enabled,
  paused,
  sessionKey,
  onSync,
  onForeignTabSync,
}: UseCloudSyncOptions) {
  useEffect(() => {
    cloudSyncManager.configure(onSync);
  }, [onSync]);

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
