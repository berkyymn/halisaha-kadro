const MIN_GAP_MS = 12_000;
const PRIORITY_MIN_GAP_MS = 5_000;
const EXHAUSTED_COOLDOWN_MS = 120_000;
const MAX_WRITES_PER_MINUTE = 4;
const BUDGET_WINDOW_MS = 60_000;

let chain: Promise<void> = Promise.resolve();
let lastWriteFinishedAt = 0;
let cooldownUntil = 0;
const recentWriteTimestamps: number[] = [];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pruneWriteBudget(now = Date.now()) {
  while (
    recentWriteTimestamps.length > 0 &&
    now - recentWriteTimestamps[0] >= BUDGET_WINDOW_MS
  ) {
    recentWriteTimestamps.shift();
  }
}

function msUntilWriteBudgetAvailable(now = Date.now()): number {
  pruneWriteBudget(now);
  if (recentWriteTimestamps.length < MAX_WRITES_PER_MINUTE) {
    return 0;
  }
  const oldest = recentWriteTimestamps[0] ?? now;
  return Math.max(0, BUDGET_WINDOW_MS - (now - oldest) + 50);
}

function recordWriteCompleted(at = Date.now()) {
  pruneWriteBudget(at);
  recentWriteTimestamps.push(at);
  lastWriteFinishedAt = at;
}

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

export function isFirestoreWriteCooldown(): boolean {
  return Date.now() < cooldownUntil;
}

export function getFirestoreWriteCooldownRemainingMs(): number {
  return Math.max(0, cooldownUntil - Date.now());
}

export function notifyFirestoreWriteExhausted() {
  cooldownUntil = Date.now() + EXHAUSTED_COOLDOWN_MS;
}

/** Tüm Firestore yazılarını tek kuyrukta serileştirir; aralık, bütçe ve cooldown uygular */
export function enqueueFirestoreWrite<T>(
  fn: () => Promise<T>,
  options?: { priority?: boolean }
): Promise<T> {
  const priority = options?.priority ?? false;
  const run = async (): Promise<T> => {
    const minGap = priority ? PRIORITY_MIN_GAP_MS : MIN_GAP_MS;

    for (;;) {
      const now = Date.now();
      const waitMs = Math.max(
        0,
        cooldownUntil - now,
        minGap - (now - lastWriteFinishedAt),
        msUntilWriteBudgetAvailable(now)
      );
      if (waitMs > 0) {
        await sleep(waitMs);
        continue;
      }
      break;
    }

    try {
      const result = await fn();
      recordWriteCompleted();
      return result;
    } catch (error) {
      if (isResourceExhaustedError(error)) {
        notifyFirestoreWriteExhausted();
      }
      throw error;
    }
  };

  const result = chain.then(run, run);
  chain = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

export function resetFirestoreWriteQueue() {
  cooldownUntil = 0;
  lastWriteFinishedAt = 0;
  recentWriteTimestamps.length = 0;
}
