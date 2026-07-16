import {
  describeCloudSaveResult,
  mapFirestoreError,
  saveUserBranding,
  saveUserPoster,
} from "@/lib/cloudPoster";
import { isResourceExhaustedError } from "@/lib/firestoreWriteQueue";
import { useAppStore } from "@/store/useAppStore";
import type { CloudSyncSaveResult } from "@/lib/cloudSyncManager";
import type { PosterSnapshot } from "@/lib/posterSnapshot";

export type CloudSyncStatus = "idle" | "loading" | "syncing" | "saved" | "error";

export function createCloudSaveHandlers(deps: {
  getUserId: () => string | undefined;
  isConfigured: () => boolean;
  onSyncStatusChange: (status: string) => void;
  onSyncError: (error: string | null) => void;
  onUpdatedAt: (updatedAt: string) => void;
}): {
  pushSnapshot: (snapshot: PosterSnapshot) => Promise<CloudSyncSaveResult>;
  pushBranding: () => Promise<CloudSyncSaveResult>;
} {
  async function pushSnapshot(
    snapshot: PosterSnapshot
  ): Promise<CloudSyncSaveResult> {
    const uid = deps.getUserId();
    if (!deps.isConfigured() || !uid) return { ok: false };

    deps.onSyncStatusChange("syncing");
    console.log("[SYNC-DIAG] pushSnapshot saveUserPoster called");
    try {
      const result = await saveUserPoster(uid, snapshot);
      deps.onUpdatedAt(result.updatedAt);
      deps.onSyncStatusChange("saved");
      const warning = describeCloudSaveResult(result);
      deps.onSyncError(warning);
      return { ok: true, warning, updatedAt: result.updatedAt };
    } catch (err) {
      if (isResourceExhaustedError(err)) {
        deps.onSyncError(mapFirestoreError(err));
        deps.onSyncStatusChange("error");
        return { ok: false, rateLimited: true };
      }
      console.error("Bulut kayıt hatası:", err);
      deps.onSyncError(mapFirestoreError(err));
      deps.onSyncStatusChange("error");
      return { ok: false };
    }
  }

  async function pushBranding(): Promise<CloudSyncSaveResult> {
    const uid = deps.getUserId();
    if (!deps.isConfigured() || !uid) return { ok: false };

    try {
      const result = await saveUserBranding(uid, useAppStore.getState());
      deps.onUpdatedAt(result.updatedAt);
      return { ok: true, updatedAt: result.updatedAt };
    } catch (err) {
      if (isResourceExhaustedError(err)) {
        return { ok: false, rateLimited: true };
      }
      console.error("Branding bulut kayıt hatası:", err);
      return { ok: false };
    }
  }

  return { pushSnapshot, pushBranding };
}
