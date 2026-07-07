export type SyncRevisions = {
  branding: number;
  roster: number;
  layout: number;
  media: number;
};

export const DEFAULT_SYNC_REVISIONS: SyncRevisions = {
  branding: 1,
  roster: 1,
  layout: 1,
  media: 1,
};

export function fingerprintSyncRevisions(revisions: SyncRevisions): string {
  return JSON.stringify(revisions);
}

export function isBrandingOnlyDirty(
  current: SyncRevisions,
  synced: SyncRevisions | null
): boolean {
  if (!synced) return false;
  return (
    current.branding > synced.branding &&
    current.roster <= synced.roster &&
    current.layout <= synced.layout &&
    current.media <= synced.media
  );
}

export function hasUnsyncedRevisions(
  current: SyncRevisions,
  synced: SyncRevisions | null
): boolean {
  if (!synced) return true;
  return (
    current.branding > synced.branding ||
    current.roster > synced.roster ||
    current.layout > synced.layout ||
    current.media > synced.media
  );
}
