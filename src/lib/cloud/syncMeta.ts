/**
 * Senkron meta verisi (localStorage). Poster verisi burada değil, store'un
 * persist katmanındadır; burada yalnızca "kimin ve nereye kadar senkron" bilgisi.
 *
 * - owner: yerel kadronun ait olduğu hesap (misafir verisi → null)
 * - synced: bu hesap için son başarılı senkron: yerel düzenleme sayacı + bulut revision
 */
const OWNER_KEY = "halisaha-local-owner";
const SYNCED_PREFIX = "halisaha-synced:";

export type SyncedMarker = { editVersion: number; revision: number };

function read(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Özel mod vb.: yalnızca çatışma sorusu daha sık görünür.
  }
}

export const browserSyncMeta = {
  owner: (): string | null => read(OWNER_KEY),
  setOwner: (uid: string): void => write(OWNER_KEY, uid),
  synced(uid: string): SyncedMarker | null {
    const raw = read(SYNCED_PREFIX + uid);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as Partial<SyncedMarker>;
      return typeof parsed.editVersion === "number" && typeof parsed.revision === "number"
        ? { editVersion: parsed.editVersion, revision: parsed.revision }
        : null;
    } catch {
      return null;
    }
  },
  setSynced: (uid: string, marker: SyncedMarker): void =>
    write(SYNCED_PREFIX + uid, JSON.stringify(marker)),
  /** Çıkış / hesap silme: bu cihazdaki senkron izi silinir. */
  clear(uid: string | null): void {
    write(OWNER_KEY, null);
    if (uid) write(SYNCED_PREFIX + uid, null);
  },
};

export type SyncMetaStore = typeof browserSyncMeta;
