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
