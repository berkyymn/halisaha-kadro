import type { SyncRevisions } from "@/lib/syncRevisions";

const OUTBOX_KEY = "halisaha-cloud-sync-outbox-v1";

type OutboxEntry = {
  userId: string;
  revisions: SyncRevisions;
  queuedAt: string;
};

function entryKey(userId: string): string {
  return `${OUTBOX_KEY}:${encodeURIComponent(userId)}`;
}

function readEntry(userId: string): OutboxEntry | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(entryKey(userId));
    if (!raw) return null;
    const entry = JSON.parse(raw) as Partial<OutboxEntry>;
    if (!entry.userId || !entry.revisions) return null;
    return entry as OutboxEntry;
  } catch {
    return null;
  }
}

export function queueCloudSync(userId: string, revisions: SyncRevisions): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      entryKey(userId),
      JSON.stringify({ userId, revisions, queuedAt: new Date().toISOString() })
    );
  } catch {
    // localStorage can be unavailable in private or restricted browser contexts.
  }
}

export function hasQueuedCloudSync(userId: string): boolean {
  return readEntry(userId)?.userId === userId;
}

export function clearQueuedCloudSync(userId: string): void {
  if (typeof window === "undefined") return;
  const entry = readEntry(userId);
  if (entry?.userId !== userId) return;
  window.localStorage.removeItem(entryKey(userId));
}

/**
 * Yerel kadronun hangi hesaba ait olduğu. Aynı kullanıcı gönderilmemiş
 * değişikliklerle geri döndüğünde "başka kadro" çatışması sorulmaz; misafir
 * verisi (sahipsiz) hesaba girerken ise sorulur. Çıkışta silinir.
 */
const LOCAL_OWNER_KEY = "halisaha-local-owner";

export function readLocalOwner(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(LOCAL_OWNER_KEY);
  } catch {
    return null;
  }
}

export function setLocalOwner(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_OWNER_KEY, userId);
  } catch {
    // Özel mod vb. — yalnızca çatışma sorusu daha sık görünür.
  }
}

export function clearLocalOwner(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LOCAL_OWNER_KEY);
  } catch {
    // ignore
  }
}
