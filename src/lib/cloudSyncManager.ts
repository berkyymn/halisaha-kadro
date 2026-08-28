import { buildPosterSnapshot, type PosterSnapshot } from "@/lib/posterSnapshot";
import {
  DEFAULT_SYNC_REVISIONS,
  hasUnsyncedRevisions,
  isBrandingOnlyDirty,
  type SyncRevisions,
} from "@/lib/syncRevisions";
import {
  getFirestoreWriteCooldownRemainingMs,
  isFirestoreWriteCooldown,
} from "@/lib/firestoreWriteQueue";
import { useAppStore } from "@/store/useAppStore";

const DEBOUNCE_MS = 8_000;
const MAX_WAIT_MS = 45_000;
const LIFECYCLE_FLUSH_MIN_GAP_MS = 15_000;
const LOCK_NAME = "halisaha-poster-cloud-sync";
const TAB_CHANNEL = "halisaha-poster-sync";

const MIN_RETRY_MS = 3_000;
const MAX_RETRY_MS = 60_000;

function logSyncEvent(event: string, details?: Record<string, unknown>) {
  console.info(`[SYNC] ${event}`, details ?? {});
}

export type CloudSyncPhase = "idle" | "pending" | "syncing" | "paused" | "cooldown";

export type CloudSyncSaveResult = {
  ok: boolean;
  warning?: string | null;
  updatedAt?: string;
  brandingUpdatedAt?: string;
  rateLimited?: boolean;
  retryable?: boolean;
};

export type CloudSyncStatus = {
  phase: CloudSyncPhase;
  retryAttempt: number;
  hasPendingChanges: boolean;
};

type SaveHandler = (
  snapshot: PosterSnapshot,
  options?: { includeBranding?: boolean }
) => Promise<CloudSyncSaveResult>;
type BrandingSaveHandler = () => Promise<CloudSyncSaveResult>;
type StatusListener = (status: CloudSyncStatus) => void;
type ForeignTabSyncHandler = (payload: {
  updatedAt?: string;
  brandingUpdatedAt?: string;
}) => void;

function computeBackoffMs(attempt: number): number {
  const base = Math.min(MAX_RETRY_MS, MIN_RETRY_MS * 2 ** attempt);
  const jitter = Math.floor(Math.random() * 400);
  return base + jitter;
}

class CloudSyncManager {
  private handler: SaveHandler | null = null;
  private brandingHandler: BrandingSaveHandler | null = null;
  private onForeignTabSync: ForeignTabSyncHandler | null = null;
  private enabled = false;
  private paused = false;

  private unsubscribe: (() => void) | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private maxWaitTimer: ReturnType<typeof setTimeout> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  private inFlight = false;
  private dirty = false;
  private dirtySince: number | null = null;
  private retryAttempt = 0;
  private lastSyncedRevisions: SyncRevisions | null = null;
  private sessionKey: string | null = null;
  private sessionGeneration = 0;

  private listeners = new Set<StatusListener>();
  private tabChannel: BroadcastChannel | null = null;
  private onVisibilityChange: (() => void) | null = null;
  private onPageHide: (() => void) | null = null;
  private lastLifecycleFlushAt = 0;

  configure(handler: SaveHandler) {
    this.handler = handler;
  }

  configureBranding(handler: BrandingSaveHandler) {
    this.brandingHandler = handler;
  }

  setForeignTabSyncHandler(handler: ForeignTabSyncHandler | null) {
    this.onForeignTabSync = handler;
  }

  setSessionKey(key: string | null) {
    if (this.sessionKey === key) return;
    this.sessionKey = key;
    this.sessionGeneration += 1;
    this.inFlight = false;
    this.clearTimers();
    this.dirty = false;
    this.dirtySince = null;
    this.emitStatus();
  }

  subscribe(listener: StatusListener) {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => {
      this.listeners.delete(listener);
    };
  }

  getStatus(): CloudSyncStatus {
    let phase: CloudSyncPhase = "idle";
    if (this.paused) phase = "paused";
    else if (isFirestoreWriteCooldown()) phase = "cooldown";
    else if (this.inFlight) phase = "syncing";
    else if (this.dirty || this.debounceTimer || this.maxWaitTimer || this.retryTimer) {
      phase = "pending";
    }
    return {
      phase,
      retryAttempt: this.retryAttempt,
      hasPendingChanges: this.dirty,
    };
  }

  private emitStatus() {
    const status = this.getStatus();
    for (const listener of this.listeners) {
      listener(status);
    }
  }

  start() {
    if (this.enabled) return;
    this.enabled = true;
    this.bindTabChannel();
    this.bindLifecycleFlush();

    this.unsubscribe = useAppStore.subscribe((state, prevState) => {
      if (state.remoteHydrating || this.paused) return;
      if (state.syncRevisions === prevState.syncRevisions) return;
      if (!hasUnsyncedRevisions(state.syncRevisions, this.lastSyncedRevisions)) {
        return;
      }
      this.markDirty();
    });

    this.emitStatus();
  }

  stop() {
    this.enabled = false;
    this.sessionGeneration += 1;
    this.clearTimers();
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.unbindTabChannel();
    this.unbindLifecycleFlush();
    this.dirty = false;
    this.dirtySince = null;
    this.inFlight = false;
    this.emitStatus();
  }

  pause(reason: "hydration" | "manual" = "manual") {
    void reason;
    this.paused = true;
    this.clearTimers();
    this.emitStatus();
  }

  resume() {
    if (!this.paused) return;
    this.paused = false;
    if (this.enabled && this.hasPendingSync()) {
      this.markDirty();
    }
    this.emitStatus();
  }

  reset() {
    this.lastSyncedRevisions = null;
    this.retryAttempt = 0;
    this.dirty = false;
    this.dirtySince = null;
    this.clearTimers();
    this.emitStatus();
  }

  markSynced(snapshot: PosterSnapshot) {
    void snapshot;
    const state = useAppStore.getState();
    this.lastSyncedRevisions = { ...state.syncRevisions };
    this.dirty = false;
    this.dirtySince = null;
    this.retryAttempt = 0;
    this.clearTimers();
    this.emitStatus();
  }

  notifyDirty() {
    if (!this.hasPendingSync()) return;
    this.markDirty();
  }

  requestFlush() {
    if (!this.enabled || this.paused || useAppStore.getState().remoteHydrating) {
      return;
    }
    if (!this.hasPendingSync()) return;

    const now = Date.now();
    if (now - this.lastLifecycleFlushAt < LIFECYCLE_FLUSH_MIN_GAP_MS) {
      return;
    }
    this.lastLifecycleFlushAt = now;
    this.clearDebounceTimers();
    void this.flush();
  }

  requestBrandingFlush() {
    this.markDirty();
  }

  private hasPendingSync(): boolean {
    const revisions = { ...useAppStore.getState().syncRevisions };
    return hasUnsyncedRevisions(revisions, this.lastSyncedRevisions);
  }

  private markDirty() {
    if (!this.enabled || this.paused || useAppStore.getState().remoteHydrating) {
      return;
    }

    this.dirty = true;
    if (!this.dirtySince) {
      this.dirtySince = Date.now();
    }

    this.scheduleDebounce();
    this.scheduleMaxWait();
    this.emitStatus();
  }

  private scheduleDebounce() {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      void this.flush();
    }, DEBOUNCE_MS);
  }

  private scheduleMaxWait() {
    if (this.maxWaitTimer || !this.dirtySince) return;

    const elapsed = Date.now() - this.dirtySince;
    const remaining = Math.max(0, MAX_WAIT_MS - elapsed);
    this.maxWaitTimer = setTimeout(() => {
      this.maxWaitTimer = null;
      void this.flush();
    }, remaining);
  }

  private clearDebounceTimers() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.maxWaitTimer) {
      clearTimeout(this.maxWaitTimer);
      this.maxWaitTimer = null;
    }
  }

  private clearTimers() {
    this.clearDebounceTimers();
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  private scheduleRetry(rateLimited = false) {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    const backoff = computeBackoffMs(this.retryAttempt);
    const cooldown = rateLimited ? getFirestoreWriteCooldownRemainingMs() : 0;
    const delay = Math.max(backoff, cooldown) + 500;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void this.flush();
    }, delay);
    this.emitStatus();
  }

  private async flush(): Promise<void> {
    this.clearDebounceTimers();

    if (!this.enabled || this.paused) return;
    if (useAppStore.getState().remoteHydrating) return;
    if (!this.hasPendingSync()) {
      this.dirty = false;
      this.dirtySince = null;
      this.emitStatus();
      return;
    }

    if (isFirestoreWriteCooldown()) {
      this.dirty = true;
      this.scheduleRetry(true);
      return;
    }

    const flushGeneration = this.sessionGeneration;
    const flushSession = this.sessionKey;
    const revisions = useAppStore.getState().syncRevisions;
    const synced = this.lastSyncedRevisions;
    const brandingDirty =
      !synced || revisions.branding > synced.branding;
    const dataDirty =
      !synced ||
      revisions.roster > synced.roster ||
      revisions.layout > synced.layout ||
      revisions.media > synced.media;
    const brandingOnly =
      brandingDirty &&
      !dataDirty &&
      isBrandingOnlyDirty(revisions, synced);

    if (this.inFlight) {
      this.dirty = true;
      return;
    }

    this.inFlight = true;
    this.emitStatus();
    logSyncEvent("flush:start", {
      sessionKey: flushSession,
      revisions,
      brandingOnly,
      brandingDirty,
      dataDirty,
    });

    let result: CloudSyncSaveResult = { ok: false };
    let savedBranding = false;
    let savedData = false;

    const runSave = async (): Promise<CloudSyncSaveResult> => {
      if (brandingOnly && this.brandingHandler) {
        savedBranding = true;
        return this.brandingHandler();
      }
      if (!dataDirty || !this.handler) {
        if (brandingDirty && this.brandingHandler) {
          savedBranding = true;
          return this.brandingHandler();
        }
        return { ok: false };
      }

      const snapshot = buildPosterSnapshot(useAppStore.getState());
      savedData = true;
      const dataResult = await this.handler(snapshot, {
        includeBranding: brandingDirty,
      });
      if (dataResult.ok && dataResult.brandingUpdatedAt) {
        savedBranding = true;
      }
      return dataResult;
    };

    try {
      if (typeof navigator !== "undefined" && "locks" in navigator) {
        await navigator.locks.request(LOCK_NAME, async () => {
          if (
            flushGeneration !== this.sessionGeneration ||
            flushSession !== this.sessionKey
          ) {
            return;
          }
          if (isFirestoreWriteCooldown()) {
            this.dirty = true;
            result = { ok: false, rateLimited: true };
            return;
          }
          result = await runSave();
        });
      } else if (
        flushGeneration === this.sessionGeneration &&
        flushSession === this.sessionKey &&
        !isFirestoreWriteCooldown()
      ) {
        result = await runSave();
      } else if (isFirestoreWriteCooldown()) {
        this.dirty = true;
        result = { ok: false, rateLimited: true };
      }

      if (
        flushGeneration !== this.sessionGeneration ||
        flushSession !== this.sessionKey
      ) {
        return;
      }

      if (result.ok) {
        const base = this.lastSyncedRevisions ?? { ...DEFAULT_SYNC_REVISIONS };
        this.lastSyncedRevisions = {
          branding: savedBranding
            ? revisions.branding
            : base.branding,
          roster: savedData ? revisions.roster : base.roster,
          layout: savedData ? revisions.layout : base.layout,
          media: savedData ? revisions.media : base.media,
        };
        this.retryAttempt = 0;
        this.dirty = this.hasPendingSync();
        if (!this.dirty) {
          this.dirtySince = null;
        } else if (!this.dirtySince) {
          this.dirtySince = Date.now();
        }
        this.tabChannel?.postMessage({
          type: "synced",
          updatedAt: result.updatedAt,
          brandingUpdatedAt: result.brandingUpdatedAt,
        });
      } else {
        this.retryAttempt += 1;
        this.dirty = true;
        if (result.retryable !== false) {
          this.scheduleRetry(Boolean(result.rateLimited));
        }
      }
      logSyncEvent("flush:result", {
        ok: result.ok,
        rateLimited: result.rateLimited ?? false,
        retryable: result.retryable ?? true,
        pendingAfterFlush: this.hasPendingSync(),
      });
    } catch (error) {
      if (
        flushGeneration !== this.sessionGeneration ||
        flushSession !== this.sessionKey
      ) {
        return;
      }
      this.retryAttempt += 1;
      this.dirty = true;
      logSyncEvent("flush:exception", {
        message: error instanceof Error ? error.message : String(error),
      });
      this.scheduleRetry();
    } finally {
      this.inFlight = false;
      logSyncEvent("flush:finally", {
        pending: this.hasPendingSync(),
        retryAttempt: this.retryAttempt,
      });
      const sessionIsCurrent =
        flushGeneration === this.sessionGeneration &&
        flushSession === this.sessionKey;
      const shouldRetry = result.retryable !== false;
      if (
        sessionIsCurrent &&
        shouldRetry &&
        this.dirty &&
        this.hasPendingSync() &&
        !this.retryTimer
      ) {
        this.scheduleDebounce();
        this.scheduleMaxWait();
      }
      this.emitStatus();
    }
  }

  private bindTabChannel() {
    if (typeof BroadcastChannel === "undefined") return;
    this.tabChannel = new BroadcastChannel(TAB_CHANNEL);
    this.tabChannel.onmessage = (
      event: MessageEvent<{
        type?: string;
        updatedAt?: string;
        brandingUpdatedAt?: string;
      }>
    ) => {
      if (event.data?.type !== "synced") return;

      if (this.hasPendingSync()) return;
      this.onForeignTabSync?.({
        updatedAt: event.data.updatedAt,
        brandingUpdatedAt: event.data.brandingUpdatedAt,
      });
    };
  }

  private unbindTabChannel() {
    this.tabChannel?.close();
    this.tabChannel = null;
  }

  private bindLifecycleFlush() {
    if (typeof document === "undefined") return;

    this.onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        this.requestFlush();
      }
    };
    this.onPageHide = () => {
      this.requestFlush();
    };

    document.addEventListener("visibilitychange", this.onVisibilityChange);
    window.addEventListener("pagehide", this.onPageHide);
  }

  private unbindLifecycleFlush() {
    if (typeof document === "undefined") return;
    if (this.onVisibilityChange) {
      document.removeEventListener("visibilitychange", this.onVisibilityChange);
      this.onVisibilityChange = null;
    }
    if (this.onPageHide) {
      window.removeEventListener("pagehide", this.onPageHide);
      this.onPageHide = null;
    }
  }
}

export const cloudSyncManager = new CloudSyncManager();
