const MIN_GAP_MS = 8_000;
const EXHAUSTED_COOLDOWN_MS = 90_000;

let chain: Promise<void> = Promise.resolve();
let lastWriteFinishedAt = 0;
let cooldownUntil = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

/** Tüm Firestore yazılarını tek kuyrukta serileştirir; aralık ve cooldown uygular */
export function enqueueFirestoreWrite<T>(fn: () => Promise<T>): Promise<T> {
  const run = async (): Promise<T> => {
    const now = Date.now();
    const waitMs = Math.max(
      0,
      cooldownUntil - now,
      MIN_GAP_MS - (now - lastWriteFinishedAt)
    );
    if (waitMs > 0) {
      await sleep(waitMs);
    }

    try {
      const result = await fn();
      lastWriteFinishedAt = Date.now();
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
}
