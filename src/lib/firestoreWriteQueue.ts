const MIN_GAP_MS = 12_000;
const PRIORITY_MIN_GAP_MS = 5_000;
const EXHAUSTED_COOLDOWN_MS = 120_000;
const MAX_WRITES_PER_MINUTE = 4;
const BUDGET_WINDOW_MS = 60_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Firestore hata koduna / mesajına bakarak rate-limit tespiti yapar (pure, instance state kullanmaz) */
export function isResourceExhaustedError(error: unknown): boolean {
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code: string }).code)
      : "";
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return (
    code === "resource-exhausted" ||
    message.includes("resource-exhausted") ||
    message.includes("queued writes")
  );
}

export function isRetryableFirestoreError(error: unknown): boolean {
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code: string }).code)
      : "";
  return [
    "aborted",
    "deadline-exceeded",
    "internal",
    "resource-exhausted",
    "unavailable",
  ].includes(code);
}

class FirestoreWriteCancelledError extends Error {
  constructor() {
    super("Firestore write cancelled after session reset");
    this.name = "FirestoreWriteCancelledError";
  }
}

/** Tüm Firestore yazılarını tek kuyrukta serileştirir; aralık, bütçe ve cooldown uygular */
export class FirestoreWriteQueue {
  private chain: Promise<void> = Promise.resolve();
  private lastWriteFinishedAt = 0;
  private cooldownUntil = 0;
  private recentWriteTimestamps: number[] = [];
  private generation = 0;

  enqueue<T>(
    fn: () => Promise<T>,
    options?: { priority?: boolean }
  ): Promise<T> {
    const priority = options?.priority ?? false;
    const enqueueGeneration = this.generation;
    const run = async (): Promise<T> => {
      const minGap = priority ? PRIORITY_MIN_GAP_MS : MIN_GAP_MS;

      for (;;) {
        if (enqueueGeneration !== this.generation) {
          throw new FirestoreWriteCancelledError();
        }
        const now = Date.now();
        const waitMs = Math.max(
          0,
          this.cooldownUntil - now,
          minGap - (now - this.lastWriteFinishedAt),
          this.msUntilBudgetAvailable(now)
        );
        if (waitMs > 0) {
          await sleep(waitMs);
          continue;
        }
        break;
      }

      if (enqueueGeneration !== this.generation) {
        throw new FirestoreWriteCancelledError();
      }
      try {
        const result = await fn();
        this.recordWriteCompleted();
        return result;
      } catch (error) {
        if (isResourceExhaustedError(error)) {
          this.notifyExhausted();
        }
        throw error;
      }
    };

    const result = this.chain.then(run, run);
    this.chain = result.then(
      () => undefined,
      () => undefined
    );
    return result;
  }

  isCooldown(): boolean {
    return Date.now() < this.cooldownUntil;
  }

  getCooldownRemainingMs(): number {
    return Math.max(0, this.cooldownUntil - Date.now());
  }

  /** Cooldown ve yazı bütçesini sıfırlar; devam eden promise zincirine dokunmaz */
  reset(): void {
    this.generation += 1;
    this.cooldownUntil = 0;
    this.lastWriteFinishedAt = 0;
    this.recentWriteTimestamps.length = 0;
  }

  private notifyExhausted(): void {
    this.cooldownUntil = Date.now() + EXHAUSTED_COOLDOWN_MS;
  }

  private pruneBudget(now = Date.now()): void {
    while (
      this.recentWriteTimestamps.length > 0 &&
      now - this.recentWriteTimestamps[0] >= BUDGET_WINDOW_MS
    ) {
      this.recentWriteTimestamps.shift();
    }
  }

  private msUntilBudgetAvailable(now = Date.now()): number {
    this.pruneBudget(now);
    if (this.recentWriteTimestamps.length < MAX_WRITES_PER_MINUTE) {
      return 0;
    }
    const oldest = this.recentWriteTimestamps[0] ?? now;
    return Math.max(0, BUDGET_WINDOW_MS - (now - oldest) + 50);
  }

  private recordWriteCompleted(at = Date.now()): void {
    this.pruneBudget(at);
    this.recentWriteTimestamps.push(at);
    this.lastWriteFinishedAt = at;
  }
}

export const firestoreWriteQueue = new FirestoreWriteQueue();

export function isFirestoreWriteCooldown(): boolean {
  return firestoreWriteQueue.isCooldown();
}

export function getFirestoreWriteCooldownRemainingMs(): number {
  return firestoreWriteQueue.getCooldownRemainingMs();
}

export function resetFirestoreWriteQueue(): void {
  firestoreWriteQueue.reset();
}
