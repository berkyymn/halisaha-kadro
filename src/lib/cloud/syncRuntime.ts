"use client";

import { reportError } from "@/lib/errorReporting";
import {
  areSnapshotsEquivalent,
  collectLocalPlayersForMerge,
  hasMeaningfulLocalChanges,
  restoreOmittedMedia,
} from "@/lib/loginConflict";
import { useAppStore } from "@/store/useAppStore";
import {
  deleteOrphanedMedia,
  fetchPoster,
  savePoster,
  subscribePoster,
} from "@/lib/cloud/posterRepository";
import { SyncController } from "@/lib/cloud/syncController";
import { browserSyncMeta } from "@/lib/cloud/syncMeta";

/**
 * Uygulamadaki tek SyncController: gerçek Firebase deposu + Zustand store +
 * localStorage meta. Testler SyncController'ı sahte bağımlılıklarla kurar.
 */
let controller: SyncController | null = null;

export function getSyncController(): SyncController {
  if (controller) return controller;
  controller = new SyncController({
    repo: {
      fetch: fetchPoster,
      save: savePoster,
      subscribe: subscribePoster,
      deleteOrphans: deleteOrphanedMedia,
    },
    local: {
      snapshot: () => useAppStore.getState().getPosterSnapshot(),
      editVersion: () => useAppStore.getState().editVersion,
      applyCloud: (snapshot) => useAppStore.getState().applyCloudSnapshot(snapshot),
      appendToBench: (players) => useAppStore.getState().appendPlayersToBench(players),
      onEdit: (listener) =>
        useAppStore.subscribe((state, prev) => {
          if (state.editVersion !== prev.editVersion) listener();
        }),
    },
    meta: browserSyncMeta,
    policy: {
      isCustomized: hasMeaningfulLocalChanges,
      equivalent: areSnapshotsEquivalent,
      mergeExtras: collectLocalPlayersForMerge,
      restoreOmittedMedia,
    },
    report: (error, area, level) => reportError(error, area, { level }),
  });
  return controller;
}
