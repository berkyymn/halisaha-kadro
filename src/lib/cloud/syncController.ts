import type { PosterSnapshot } from "@/lib/posterSnapshot";
import type { Player } from "@/types";
import type { ParsedCloudDocument } from "@/lib/cloud/cloudDocument";
import type {
  FetchPosterResult,
  RemoteChange,
  SavePosterResult,
} from "@/lib/cloud/posterRepository";
import type { SyncMetaStore } from "@/lib/cloud/syncMeta";
import {
  isResourceExhaustedError,
  isRetryableFirestoreError,
  isRevisionConflictError,
  mapFirestoreError,
} from "@/lib/cloud/errors";

/**
 * Bulut senkronu durum makinesi. React'e ve Firebase'e bağlı değildir; tüm
 * bağımlılıklar dışarıdan verilir (testlerde sahte bulut kullanılır).
 *
 *   idle ──start(uid)──▶ loading ──▶ ready ◀──▶ (saving)
 *                          │  ▲          │
 *                          ▼  │          ▼
 *                        error      conflict ──resolve──▶ ready
 *
 * Kurallar (zaman damgası karşılaştırması YOK; iki sayaç var):
 *  - editVersion: yerel her kullanıcı düzenlemesinde artar (store, persist).
 *  - revision: bulutta her yazımda +1.
 *  - synced marker: bu hesap için son başarılı senkronda ikisinin değeri.
 *
 * İlk yükleme:
 *  - Bulutta doküman yok          → yerel yazılır.
 *  - Yerel veri bu hesabın:
 *      bekleyen düzenleme yok     → bulut uygulanır.
 *      bekleyen var, bulut aynı   → yerel yazılır (soru yok).
 *      bekleyen var, bulut değişmiş → çatışma (ikisi de değişti).
 *  - Yerel veri misafirin/başkasının:
 *      dokunulmamış / bulutla aynı → bulut uygulanır.
 *      özelleştirilmiş            → çatışma (misafir verisi).
 * Canlı değişiklik: kendi yazımımızın yankısı yok sayılır; bekleyen yerel
 * düzenleme varsa çatışma, yoksa bulut uygulanır.
 */

export type ConflictReason = "guest-data" | "concurrent-edit";
export type ConflictChoice = "local" | "cloud" | "merge";

/** Bulut yazımında boyut/Storage nedeniyle atlanan medya (doküman işaretleri). */
export type OmittedMedia = { photos: boolean; logos: boolean };

export type SyncConflict = {
  reason: ConflictReason;
  local: PosterSnapshot;
  cloud: PosterSnapshot;
  cloudRevision: number;
  cloudUpdatedAt: string;
  cloudOmitted: OmittedMedia;
};

type AdoptableDoc = {
  snapshot: PosterSnapshot;
  revision: number;
  legacy?: boolean;
  photosOmitted?: boolean;
  logosOmitted?: boolean;
};

export type SyncState =
  | { phase: "idle" }
  | { phase: "loading"; error: string | null }
  | { phase: "error"; error: string }
  | { phase: "conflict"; conflict: SyncConflict; busy: boolean; error: string | null }
  | { phase: "ready"; saving: boolean; pending: boolean; error: string | null; notice: string | null };

export interface SyncRepository {
  fetch(uid: string): Promise<FetchPosterResult>;
  save(uid: string, snapshot: PosterSnapshot, expectedRevision: number | null): Promise<SavePosterResult>;
  subscribe(uid: string, onChange: (change: RemoteChange) => void, onError: (error: Error) => void): () => void;
  deleteOrphans(previous: PosterSnapshot | null, next: PosterSnapshot): Promise<void>;
}

/** Yerel poster (store) ile köprü. */
export interface LocalPoster {
  snapshot(): PosterSnapshot;
  /** Kullanıcı düzenlemelerinde artan sayaç */
  editVersion(): number;
  /** Bulutu birebir uygular; editVersion'ı DEĞİŞTİRMEZ */
  applyCloud(snapshot: PosterSnapshot): void;
  /** "Birleştir": oyuncuları yedeğe ekler (kullanıcı düzenlemesi sayılır) */
  appendToBench(players: Player[]): void;
  onEdit(listener: () => void): () => void;
}

export interface SyncPolicy {
  isCustomized(snapshot: PosterSnapshot): boolean;
  equivalent(a: PosterSnapshot, b: PosterSnapshot): boolean;
  mergeExtras(local: PosterSnapshot, cloud: PosterSnapshot): Player[];
  /**
   * Bulut kopyasında atlanmış fotoğraf/logoları yerel kopyadan geri koyar.
   * Hiçbir şey geri konmadıysa `cloud` nesnesinin kendisini döndürmelidir.
   */
  restoreOmittedMedia(local: PosterSnapshot, cloud: PosterSnapshot, omitted: OmittedMedia): PosterSnapshot;
}

export type SyncTiming = {
  debounceMs: number;
  maxWaitMs: number;
  retryBaseMs: number;
  retryMaxMs: number;
  exhaustedCooldownMs: number;
};

export const DEFAULT_SYNC_TIMING: SyncTiming = {
  debounceMs: 2_500,
  maxWaitMs: 15_000,
  retryBaseMs: 3_000,
  retryMaxMs: 60_000,
  exhaustedCooldownMs: 30_000,
};

export type SyncDeps = {
  repo: SyncRepository;
  local: LocalPoster;
  meta: SyncMetaStore;
  policy: SyncPolicy;
  timing?: Partial<SyncTiming>;
  report?: (error: unknown, area: "cloud-load" | "cloud-save" | "cloud-conflict", level: "error" | "warning") => void;
};

type Timer = ReturnType<typeof setTimeout>;

export class SyncController {
  private readonly deps: SyncDeps;
  private readonly timing: SyncTiming;
  private state: SyncState = { phase: "idle" };
  private readonly listeners = new Set<(state: SyncState) => void>();

  private uid: string | null = null;
  /** start/stop her çağrıldığında artar; eski işlerin sonuçları yok sayılır */
  private generation = 0;
  private knownRevision: number | null = null;
  private lastCloud: PosterSnapshot | null = null;

  private saving: Promise<void> | null = null;
  private forceSave = false;
  private remoteWhileSaving: RemoteChange | null = null;

  private debounceTimer: Timer | null = null;
  private maxWaitTimer: Timer | null = null;
  private retryTimer: Timer | null = null;
  private retryAttempt = 0;

  private unsubscribeRemote: (() => void) | null = null;
  private unsubscribeEdits: (() => void) | null = null;

  constructor(deps: SyncDeps) {
    this.deps = deps;
    this.timing = { ...DEFAULT_SYNC_TIMING, ...deps.timing };
  }

  // ─── Durum ────────────────────────────────────────────────────────────

  getState(): SyncState {
    return this.state;
  }

  subscribe(listener: (state: SyncState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private setState(next: SyncState): void {
    this.state = next;
    for (const listener of this.listeners) listener(next);
  }

  private hasPendingEdits(): boolean {
    if (!this.uid) return false;
    const synced = this.deps.meta.synced(this.uid);
    return !synced || this.deps.local.editVersion() > synced.editVersion;
  }

  /**
   * Yalnızca "ready" aşamasındaki alanları günceller. Bu arada çatışma/hata
   * aşamasına geçildiyse (ör. yazım sürerken çatışma tespit edildi) o aşamayı
   * EZMEZ — aksi halde çatışma ekranı kendiliğinden kaybolur.
   */
  private updateReady(patch: Partial<Extract<SyncState, { phase: "ready" }>>): void {
    if (this.state.phase !== "ready") return;
    this.setState({ ...this.state, pending: this.hasPendingEdits() || this.forceSave, ...patch });
  }

  // ─── Yaşam döngüsü ────────────────────────────────────────────────────

  start(uid: string): void {
    if (this.uid === uid && this.state.phase !== "idle") return;
    this.stop();
    this.uid = uid;
    const generation = ++this.generation;
    this.setState({ phase: "loading", error: null });
    void this.load(generation);
  }

  stop(): void {
    this.generation += 1;
    this.clearTimers();
    this.unsubscribeRemote?.();
    this.unsubscribeRemote = null;
    this.unsubscribeEdits?.();
    this.unsubscribeEdits = null;
    this.uid = null;
    this.knownRevision = null;
    this.lastCloud = null;
    this.forceSave = false;
    this.remoteWhileSaving = null;
    this.retryAttempt = 0;
    if (this.state.phase !== "idle") this.setState({ phase: "idle" });
  }

  private isCurrent(generation: number): boolean {
    return generation === this.generation && this.uid !== null;
  }

  // ─── İlk yükleme ──────────────────────────────────────────────────────

  private async load(generation: number): Promise<void> {
    const uid = this.uid!;
    let result: FetchPosterResult;
    try {
      result = await this.deps.repo.fetch(uid);
    } catch (error) {
      if (!this.isCurrent(generation)) return;
      this.handleLoadError(error, generation);
      return;
    }
    if (!this.isCurrent(generation)) return;
    this.retryAttempt = 0;

    if (result.status === "missing") {
      await this.writeInitial(generation);
      return;
    }
    if (result.status === "corrupt") {
      // Yerel kopya korunur; bir sonraki kayıt bozuk dokümanın yerini alır.
      this.knownRevision = null;
      this.enterReady({ error: "Bulut kaydı okunamadı; bu cihazdaki kadro korunuyor ve bir sonraki kayıtta buluta yazılacak." });
      return;
    }
    this.decideInitial(result.doc);
  }

  private handleLoadError(error: unknown, generation: number): void {
    const message = mapFirestoreError(error);
    if (isRetryableFirestoreError(error)) {
      this.deps.report?.(error, "cloud-load", "warning");
      this.setState({ phase: "loading", error: message });
      this.retryTimer = setTimeout(() => {
        this.retryTimer = null;
        if (this.isCurrent(generation)) void this.load(generation);
      }, this.backoffMs());
      return;
    }
    this.deps.report?.(error, "cloud-load", "error");
    this.setState({ phase: "error", error: message });
  }

  private decideInitial(doc: ParsedCloudDocument): void {
    const uid = this.uid!;
    const { local, meta, policy } = this.deps;
    const localSnapshot = local.snapshot();

    if (meta.owner() === uid) {
      const synced = meta.synced(uid);
      const pending = !synced || local.editVersion() > synced.editVersion;
      const cloudChanged = !synced || doc.revision !== synced.revision;
      if (!pending || policy.equivalent(localSnapshot, doc.snapshot)) {
        this.adoptCloud(doc);
      } else if (!cloudChanged) {
        // Kendi gönderilmemiş değişikliklerimiz; bulut o sırada değişmemiş.
        this.knownRevision = doc.revision;
        this.lastCloud = doc.snapshot;
        this.enterReady();
        this.scheduleSave(0);
      } else {
        this.enterConflict("concurrent-edit", localSnapshot, doc);
      }
      return;
    }

    if (!policy.isCustomized(localSnapshot) || policy.equivalent(localSnapshot, doc.snapshot)) {
      this.adoptCloud(doc);
    } else {
      this.enterConflict("guest-data", localSnapshot, doc);
    }
  }

  private async writeInitial(generation: number): Promise<void> {
    const uid = this.uid!;
    const editVersion = this.deps.local.editVersion();
    try {
      const saved = await this.deps.repo.save(uid, this.deps.local.snapshot(), null);
      if (!this.isCurrent(generation)) return;
      this.recordSaved(saved, editVersion);
      this.enterReady({ notice: saved.warning });
    } catch (error) {
      if (!this.isCurrent(generation)) return;
      this.handleLoadError(error, generation);
    }
  }

  /**
   * Bulutu uygular ve senkron noktası olarak işaretler. Bulut yazımında
   * atlanmış medya (işaretli dokümanda) bu cihazdaki kopyadan korunur;
   * aksi halde sayfa yenilenince cihazdaki fotoğraflar da kaybolurdu.
   */
  private adoptCloud(doc: AdoptableDoc): void {
    const uid = this.uid!;
    const omitted = { photos: Boolean(doc.photosOmitted), logos: Boolean(doc.logosOmitted) };
    const applied =
      omitted.photos || omitted.logos
        ? this.deps.policy.restoreOmittedMedia(this.deps.local.snapshot(), doc.snapshot, omitted)
        : doc.snapshot;
    this.deps.local.applyCloud(applied);
    this.knownRevision = doc.revision;
    this.lastCloud = doc.snapshot;
    this.deps.meta.setSynced(uid, { editVersion: this.deps.local.editVersion(), revision: doc.revision });
    // Eski biçimdeki doküman bir kez yeni biçimde yazılır.
    this.forceSave = Boolean(doc.legacy);
    this.enterReady({
      notice:
        applied !== doc.snapshot
          ? "Buluttaki bazı fotoğraf/logolar boyut sınırı nedeniyle eksik; bu cihazdaki kopyalar korundu."
          : null,
    });
    if (this.forceSave) this.scheduleSave(0);
  }

  private enterReady(patch: { error?: string | null; notice?: string | null } = {}): void {
    const uid = this.uid!;
    this.deps.meta.setOwner(uid);
    this.setState({
      phase: "ready",
      saving: false,
      pending: this.hasPendingEdits() || this.forceSave,
      error: patch.error ?? null,
      notice: patch.notice ?? null,
    });
    const generation = this.generation;
    if (!this.unsubscribeEdits) {
      this.unsubscribeEdits = this.deps.local.onEdit(() => this.handleLocalEdit());
    }
    if (!this.unsubscribeRemote) {
      this.unsubscribeRemote = this.deps.repo.subscribe(
        uid,
        (change) => this.isCurrent(generation) && this.handleRemoteChange(change),
        (error) => this.deps.report?.(error, "cloud-load", "warning")
      );
    }
  }

  private enterConflict(reason: ConflictReason, local: PosterSnapshot, doc: ParsedCloudDocument): void {
    this.clearSaveTimers();
    this.setState({
      phase: "conflict",
      busy: false,
      error: null,
      conflict: {
        reason,
        local,
        cloud: doc.snapshot,
        cloudRevision: doc.revision,
        cloudUpdatedAt: doc.updatedAt,
        cloudOmitted: { photos: doc.photosOmitted, logos: doc.logosOmitted },
      },
    });
  }

  // ─── Çatışma çözümü ───────────────────────────────────────────────────

  async resolveConflict(choice: ConflictChoice): Promise<void> {
    if (this.state.phase !== "conflict" || this.state.busy) return;
    const { conflict } = this.state;
    const generation = this.generation;
    const uid = this.uid!;
    this.setState({ ...this.state, busy: true, error: null });

    try {
      if (choice === "local") {
        const editVersion = this.deps.local.editVersion();
        // Bilinçli üzerine yazma: beklenen revision yok.
        const saved = await this.deps.repo.save(uid, this.deps.local.snapshot(), null);
        if (!this.isCurrent(generation)) return;
        this.recordSaved(saved, editVersion);
        this.enterReady({ notice: saved.warning });
        return;
      }
      this.adoptCloud({
        snapshot: conflict.cloud,
        revision: conflict.cloudRevision,
        photosOmitted: conflict.cloudOmitted.photos,
        logosOmitted: conflict.cloudOmitted.logos,
      });
      if (choice === "merge") {
        // Yedeğe eklenen oyuncular kullanıcı düzenlemesi → normal kayıt akışı.
        this.deps.local.appendToBench(this.deps.policy.mergeExtras(conflict.local, conflict.cloud));
      }
    } catch (error) {
      if (!this.isCurrent(generation)) return;
      this.deps.report?.(error, "cloud-conflict", "error");
      if (this.state.phase === "conflict") {
        this.setState({ ...this.state, busy: false, error: mapFirestoreError(error) });
      }
    }
  }

  // ─── Kayıt döngüsü ────────────────────────────────────────────────────

  private handleLocalEdit(): void {
    if (this.state.phase !== "ready") return;
    this.updateReady({});
    this.scheduleSave(this.timing.debounceMs);
  }

  private scheduleSave(delayMs: number): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      void this.save();
    }, delayMs);
    if (!this.maxWaitTimer) {
      this.maxWaitTimer = setTimeout(() => {
        this.maxWaitTimer = null;
        void this.save();
      }, this.timing.maxWaitMs);
    }
  }

  /** Bekleyen değişiklikleri hemen yazar. Devam eden yazım varsa onu bekler. */
  private async save(): Promise<void> {
    if (this.saving) return this.saving;
    this.clearSaveTimers();
    if (this.state.phase !== "ready" || (!this.hasPendingEdits() && !this.forceSave)) return;
    this.saving = this.runSave().finally(() => {
      this.saving = null;
    });
    return this.saving;
  }

  private async runSave(): Promise<void> {
    const uid = this.uid!;
    const generation = this.generation;
    const editVersion = this.deps.local.editVersion();
    this.updateReady({ saving: true });

    try {
      const saved = await this.deps.repo.save(uid, this.deps.local.snapshot(), this.knownRevision);
      if (!this.isCurrent(generation)) return;
      this.recordSaved(saved, editVersion);
      this.forceSave = false;
      this.retryAttempt = 0;
      this.updateReady({ saving: false, error: null, notice: saved.warning });
    } catch (error) {
      if (!this.isCurrent(generation)) return;
      this.updateReady({ saving: false });
      await this.handleSaveError(error, generation);
      return;
    }

    // Yazım sırasında gelen canlı değişiklik, kendi revision'ımız belli olunca değerlendirilir.
    const remote = this.remoteWhileSaving;
    this.remoteWhileSaving = null;
    if (remote && this.knownRevision !== null && remote.revision > this.knownRevision) {
      await this.pullRemote(generation);
      return;
    }
    if (this.hasPendingEdits()) this.scheduleSave(this.timing.debounceMs);
  }

  private recordSaved(saved: SavePosterResult, editVersion: number): void {
    const uid = this.uid!;
    const previous = this.lastCloud;
    this.knownRevision = saved.revision;
    this.lastCloud = saved.cloudSnapshot;
    this.deps.meta.setSynced(uid, { editVersion, revision: saved.revision });
    void this.deps.repo.deleteOrphans(previous, saved.cloudSnapshot).catch(() => {});
  }

  private async handleSaveError(error: unknown, generation: number): Promise<void> {
    if (isRevisionConflictError(error)) {
      // Başka bir cihaz/sekme araya yazdı: bulutu oku, karar ver.
      await this.pullRemote(generation);
      return;
    }
    const message = mapFirestoreError(error);
    if (isRetryableFirestoreError(error)) {
      this.deps.report?.(error, "cloud-save", "warning");
      this.updateReady({ error: message });
      const cooldown = isResourceExhaustedError(error) ? this.timing.exhaustedCooldownMs : 0;
      this.retryTimer = setTimeout(() => {
        this.retryTimer = null;
        if (this.isCurrent(generation)) void this.save();
      }, Math.max(cooldown, this.backoffMs()));
      return;
    }
    this.deps.report?.(error, "cloud-save", "error");
    // Kalıcı hata (ör. izin): otomatik tekrar yok; bir sonraki düzenleme yeniden dener.
    this.updateReady({ error: message });
  }

  // ─── Canlı değişiklik ─────────────────────────────────────────────────

  private handleRemoteChange(change: RemoteChange): void {
    if (this.state.phase !== "ready") return;
    if (this.saving) {
      this.remoteWhileSaving = change;
      return;
    }
    if (this.knownRevision !== null && change.revision <= this.knownRevision) return;
    void this.pullRemote(this.generation);
  }

  private async pullRemote(generation: number): Promise<void> {
    let result: FetchPosterResult;
    try {
      result = await this.deps.repo.fetch(this.uid!);
    } catch (error) {
      if (!this.isCurrent(generation)) return;
      this.deps.report?.(error, "cloud-load", "warning");
      this.updateReady({ error: mapFirestoreError(error) });
      return;
    }
    if (!this.isCurrent(generation) || result.status !== "ok") return;
    const local = this.deps.local.snapshot();
    if (!this.hasPendingEdits() || this.deps.policy.equivalent(local, result.doc.snapshot)) {
      this.adoptCloud(result.doc);
    } else {
      this.enterConflict("concurrent-edit", local, result.doc);
    }
  }

  // ─── Dışarıya açık yardımcılar ─────────────────────────────────────────

  /** Çıkış öncesi: bekleyen değişiklikleri yazmayı dener. Kalmadıysa true. */
  async flushNow(timeoutMs = 20_000): Promise<boolean> {
    if (this.state.phase !== "ready") return !this.hasPendingEdits();
    const deadline = Date.now() + timeoutMs;
    const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
    while (Date.now() < deadline && this.state.phase === "ready") {
      if (!this.hasPendingEdits() && !this.forceSave) return true;
      const attempt = this.saving ?? this.save();
      await Promise.race([attempt, sleep(Math.max(0, deadline - Date.now()))]);
      if (!this.hasPendingEdits()) return true;
      if (this.state.phase === "ready" && this.state.error) return false;
    }
    return !this.hasPendingEdits();
  }

  /** Sekme gizlenirken / kapanırken: beklemeden yazmayı başlat. */
  flushInBackground(): void {
    if (this.state.phase === "ready" && this.hasPendingEdits()) void this.save();
  }

  /** Hesap silme vb.: devam eden yazımın bitmesini bekler. */
  async waitForIdle(): Promise<void> {
    this.clearSaveTimers();
    await this.saving?.catch(() => {});
  }

  // ─── Zamanlayıcılar ───────────────────────────────────────────────────

  private backoffMs(): number {
    const delay = Math.min(this.timing.retryMaxMs, this.timing.retryBaseMs * 2 ** this.retryAttempt);
    this.retryAttempt += 1;
    return delay;
  }

  private clearSaveTimers(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    if (this.maxWaitTimer) clearTimeout(this.maxWaitTimer);
    this.debounceTimer = null;
    this.maxWaitTimer = null;
  }

  private clearTimers(): void {
    this.clearSaveTimers();
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
  }
}
