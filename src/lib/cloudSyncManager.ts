import { buildPosterSnapshot, type PosterSnapshot } from "@/lib/posterSnapshot";
import { fingerprintPosterSnapshot } from "@/lib/snapshotFingerprint";
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

export type CloudSyncPhase = "idle" | "pending" | "syncing" | "paused" | "cooldown";

export type CloudSyncSaveResult = {
  ok: boolean;
  warning?: string | null;
  updatedAt?: string;
  rateLimited?: boolean;
};

export type CloudSyncStatus = {
  phase: CloudSyncPhase;
  retryAttempt: number;
  hasPendingChanges: boolean;
};

type SaveHandler = (snapshot: PosterSnapshot) => Promise<CloudSyncSaveResult>;
type BrandingSaveHandler = () => Promise<CloudSyncSaveResult>;
type StatusListener = (status: CloudSyncStatus) => void;
type ForeignTabSyncHandler = (payload: {
  fingerprint: string;
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
  private lastSyncedFingerprint: string | null = null;
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
    this.lastSyncedFingerprint = null;
    this.lastSyncedRevisions = null;
    this.retryAttempt = 0;
    this.dirty = false;
    this.dirtySince = null;
    this.clearTimers();
    this.emitStatus();
  }

  markSynced(snapshot: PosterSnapshot) {
    const state = useAppStore.getState();
    this.lastSyncedFingerprint = fingerprintPosterSnapshot(snapshot);
    this.lastSyncedRevisions = { ...state.syncRevisions };
    this.dirty = false;
    this.dirtySince = null;
    this.retryAttempt = 0;
    this.clearTimers();
    this.emitStatus();
  }

  notifyDirty() {
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
    const revisions = useAppStore.getState().syncRevisions;
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
      const dataResult = await this.handler(snapshot);
      if (!dataResult.ok || !brandingDirty || !this.brandingHandler) {
        return dataResult;
      }

      const brandingResult = await this.brandingHandler();
      if (brandingResult.ok) {
        savedBranding = true;
      }
      return brandingResult.ok ? brandingResult : dataResult;
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
        const snapshot = buildPosterSnapshot(useAppStore.getState());
        const fingerprint = fingerprintPosterSnapshot(snapshot);
        const currentRevisions = useAppStore.getState().syncRevisions;
        const base = this.lastSyncedRevisions ?? { ...DEFAULT_SYNC_REVISIONS };
        this.lastSyncedRevisions = {
          branding: savedBranding
            ? currentRevisions.branding
            : base.branding,
          roster: savedData ? currentRevisions.roster : base.roster,
          layout: savedData ? currentRevisions.layout : base.layout,
          media: savedData ? currentRevisions.media : base.media,
        };
        this.lastSyncedFingerprint = fingerprint;
        this.retryAttempt = 0;
        this.dirty = this.hasPendingSync();
        if (!this.dirty) {
          this.dirtySince = null;
        }
        this.tabChannel?.postMessage({
          type: "synced",
          fingerprint,
          updatedAt: result.updatedAt,
        });
      } else {
        this.retryAttempt += 1;
        this.dirty = true;
        this.scheduleRetry(Boolean(result.rateLimited));
      }
    } finally {
      this.inFlight = false;
      this.emitStatus();
    }
  }

  private bindTabChannel() {
    if (typeof BroadcastChannel === "undefined") return;
    this.tabChannel = new BroadcastChannel(TAB_CHANNEL);
    this.tabChannel.onmessage = (
      event: MessageEvent<{
        type?: string;
        fingerprint?: string;
        updatedAt?: string;
        brandingUpdatedAt?: string;
      }>
    ) => {
      if (event.data?.type !== "synced" || !event.data.fingerprint) return;

      const remoteFingerprint = event.data.fingerprint;
      const localFingerprint = fingerprintPosterSnapshot(
        buildPosterSnapshot(useAppStore.getState())
      );

      if (localFingerprint === remoteFingerprint) {
        this.lastSyncedFingerprint = remoteFingerprint;
        this.lastSyncedRevisions = {
          ...useAppStore.getState().syncRevisions,
        };
        if (!this.hasPendingSync()) {
          this.dirty = false;
          this.dirtySince = null;
          this.clearTimers();
        }
        this.emitStatus();
        return;
      }

      if (localFingerprint === this.lastSyncedFingerprint) {
        this.onForeignTabSync?.({
          fingerprint: remoteFingerprint,
          updatedAt: event.data.updatedAt,
          brandingUpdatedAt: event.data.brandingUpdatedAt,
        });
      }
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
