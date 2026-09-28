import type { PosterSnapshot } from "@/lib/posterSnapshot";
import type { FetchPosterResult, RemoteChange, SavePosterResult } from "@/lib/cloud/posterRepository";
import type { LocalPoster, SyncRepository } from "@/lib/cloud/syncController";
import type { SyncedMarker, SyncMetaStore } from "@/lib/cloud/syncMeta";
import type { Player } from "@/types";

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** Bellekte tek dokümanlı bulut: revision kontrolü + canlı dinleyici. */
export class FakeCloud implements SyncRepository {
  doc: { snapshot: PosterSnapshot; revision: number; legacy?: boolean } | null = null;
  saves = 0;
  failNextSave: unknown = null;
  failNextFetch: unknown = null;
  /** true: canlı bildirim, save promise'i çözülmeden ÖNCE gelir (yankı yarışı) */
  echoBeforeResolve = false;
  /** >0: yazım bu kadar ms sürer (bu sırada kullanıcı düzenlemeye devam edebilir) */
  saveDelayMs = 0;
  private listeners = new Set<(change: RemoteChange) => void>();

  async fetch(): Promise<FetchPosterResult> {
    if (this.failNextFetch) {
      const error = this.failNextFetch;
      this.failNextFetch = null;
      throw error;
    }
    if (!this.doc) return { status: "missing" };
    return {
      status: "ok",
      doc: {
        snapshot: clone(this.doc.snapshot),
        revision: this.doc.revision,
        updatedAt: "2026-09-28T12:00:00.000Z",
        photosOmitted: false,
        logosOmitted: false,
        legacy: Boolean(this.doc.legacy),
      },
    };
  }

  async save(_uid: string, snapshot: PosterSnapshot, expectedRevision: number | null): Promise<SavePosterResult> {
    if (this.failNextSave) {
      const error = this.failNextSave;
      this.failNextSave = null;
      throw error;
    }
    const current = this.doc?.revision ?? 0;
    if (expectedRevision !== null && expectedRevision !== current) {
      throw Object.assign(new Error("conflict"), { code: "failed-precondition" });
    }
    this.saves += 1;
    this.doc = { snapshot: clone(snapshot), revision: current + 1 };
    const change = { revision: current + 1, updatedAt: "now" };
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    if (this.echoBeforeResolve) {
      // Sunucu onayı istemciye yazım promise'inden önce ulaşır (yazımın ortasında).
      if (this.saveDelayMs > 0) await sleep(this.saveDelayMs / 2);
      this.emit(change);
      if (this.saveDelayMs > 0) await sleep(this.saveDelayMs / 2);
    } else {
      if (this.saveDelayMs > 0) await sleep(this.saveDelayMs);
      queueMicrotask(() => this.emit(change));
    }
    return { revision: current + 1, updatedAt: "now", cloudSnapshot: clone(snapshot), warning: null };
  }

  /** Başka bir cihazın yazımını taklit eder. */
  writeFromOtherDevice(mutate: (snapshot: PosterSnapshot) => void): void {
    const snapshot = clone(this.doc!.snapshot);
    mutate(snapshot);
    this.doc = { snapshot, revision: this.doc!.revision + 1 };
    this.emit({ revision: this.doc.revision, updatedAt: "other" });
  }

  subscribe(_uid: string, onChange: (change: RemoteChange) => void): () => void {
    this.listeners.add(onChange);
    return () => this.listeners.delete(onChange);
  }

  async deleteOrphans(): Promise<void> {}

  private emit(change: RemoteChange): void {
    for (const listener of this.listeners) listener(change);
  }
}

/** Store yerine: düzenleme sayacı + dinleyiciler. */
export class FakeLocal implements LocalPoster {
  current: PosterSnapshot;
  version = 0;
  private listeners = new Set<() => void>();

  constructor(snapshot: PosterSnapshot) {
    this.current = clone(snapshot);
  }

  snapshot(): PosterSnapshot {
    return clone(this.current);
  }

  editVersion(): number {
    return this.version;
  }

  applyCloud(snapshot: PosterSnapshot): void {
    this.current = clone(snapshot);
  }

  appendToBench(players: Player[]): void {
    this.edit((s) => {
      for (const player of players) {
        s.savedPlayers[player.id] = player;
        s.benchPlayerIds.push(player.id);
      }
    });
  }

  /** Kullanıcı düzenlemesi */
  edit(mutate: (snapshot: PosterSnapshot) => void): void {
    mutate(this.current);
    this.version += 1;
    for (const listener of this.listeners) listener();
  }

  onEdit(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export function memoryMeta(initial: { owner?: string | null; synced?: Record<string, SyncedMarker> } = {}): SyncMetaStore {
  let owner = initial.owner ?? null;
  const synced = new Map(Object.entries(initial.synced ?? {}));
  return {
    owner: () => owner,
    setOwner: (uid: string) => {
      owner = uid;
    },
    synced: (uid: string) => synced.get(uid) ?? null,
    setSynced: (uid: string, marker: SyncedMarker) => {
      synced.set(uid, marker);
    },
    clear: (uid: string | null) => {
      owner = null;
      if (uid) synced.delete(uid);
    },
  };
}
