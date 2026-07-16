import {
  describeCloudSaveResult,
  fetchUserPoster,
  mapFirestoreError,
  saveUserPoster,
} from "@/lib/cloudPoster";
import { mergeCloudBrandingIntoSnapshot } from "@/lib/brandingSnapshot";
import { hasPlayerPhoto } from "@/lib/playerPhotos";
import { countCustomTeamLogos } from "@/lib/teamLogoCloud";
import type { PosterSnapshot } from "@/lib/posterSnapshot";

function countPhotos(snapshot: PosterSnapshot): number {
  return Object.values(snapshot.savedPlayers).filter((player) =>
    hasPlayerPhoto(player)
  ).length;
}

export function createCloudLoadHandlers(deps: {
  getPosterSnapshot: () => PosterSnapshot;
  hydrateFromSnapshot: (snapshot: PosterSnapshot, updatedAt?: string) => void;
  setRemoteHydrating: (value: boolean) => void;
  onSyncStatusChange: (status: string) => void;
  onSyncError: (error: string | null) => void;
  onUpdatedAt: (at: string | null) => void;
  onBrandingUpdatedAt: (at: string | null) => void;
  onUserLoaded: (userId: string | null) => void;
  onScheduleRepush: () => void;
  generationRef: { current: number };
  configured: boolean;
  storeReady: boolean;
  markSynced: (snapshot: PosterSnapshot) => void;
}) {
  let _pendingRepush = false;

  function applyCloudRow(
    parsed: PosterSnapshot,
    row: {
      updatedAt: string;
      brandingUpdatedAt?: string;
      photosOmitted?: boolean;
      logosOmitted?: boolean;
    },
    localSnapshot: PosterSnapshot,
    cloudBranding?: Parameters<typeof mergeCloudBrandingIntoSnapshot>[1]
  ): void {
    console.log("[SYNC-DIAG] applyCloudRow start", JSON.stringify({ localUpdatedAt: localSnapshot.localUpdatedAt, cloudUpdatedAt: row.updatedAt, cloudBrandingUpdatedAt: row.brandingUpdatedAt }));
    const localPhotos = countPhotos(localSnapshot);
    const localCustomLogos = countCustomTeamLogos(
      localSnapshot.homeTeam.logo,
      localSnapshot.awayTeam.logo
    );

    const cloudData = mergeCloudBrandingIntoSnapshot(
      parsed,
      cloudBranding,
      row.brandingUpdatedAt
    );

    deps.hydrateFromSnapshot(cloudData, row.updatedAt);
    const merged = deps.getPosterSnapshot();
    const mergedPhotos = countPhotos(merged);
    const mergedCustomLogos = countCustomTeamLogos(
      merged.homeTeam.logo,
      merged.awayTeam.logo
    );
    const cloudCustomLogos = countCustomTeamLogos(
      parsed.homeTeam.logo,
      parsed.awayTeam.logo
    );

    deps.onUpdatedAt(row.updatedAt || null);
    deps.onBrandingUpdatedAt(row.brandingUpdatedAt || null);
    deps.onSyncStatusChange("saved");

    if (row.photosOmitted) {
      deps.onSyncError(
        mergedPhotos > countPhotos(parsed)
          ? "Buluttaki bazı fotoğraflar eksikti; bu cihazdaki kopyalar geri yüklendi."
          : "Bulutta kayıtlı kadroda bazı fotoğraflar eksik olabilir."
      );
    } else if (row.logosOmitted) {
      deps.onSyncError(
        mergedCustomLogos > cloudCustomLogos
          ? "Buluttaki yüklenen logolar eksikti; bu cihazdaki kopyalar geri yüklendi."
          : "Bulutta kayıtlı kadroda bazı logolar eksik olabilir."
      );
    } else if (
      localCustomLogos > cloudCustomLogos &&
      mergedCustomLogos > cloudCustomLogos
    ) {
      deps.onSyncError(
        "Eksik logo ayarları bu cihazdan geri yüklendi; buluta yeniden kaydediliyor."
      );
    } else if (
      localPhotos > countPhotos(parsed) &&
      mergedPhotos > countPhotos(parsed)
    ) {
      deps.onSyncError(
        "Eksik fotoğraflar bu cihazdan geri yüklendi; buluta yeniden kaydediliyor."
      );
    } else {
      deps.onSyncError(null);
    }

    _pendingRepush = false;

    const localTime = localSnapshot.localUpdatedAt;
    const cloudTime = row.updatedAt;
    if (localTime && cloudTime && localTime > cloudTime) {
      _pendingRepush = true;
    }
  }

  async function loadCloudPoster(userId: string): Promise<void> {
    if (!deps.configured || !deps.storeReady) return;

    const generation = ++deps.generationRef.current;
    deps.onSyncStatusChange("loading");
    deps.onSyncError(null);
    deps.setRemoteHydrating(true);
    _pendingRepush = false;
    try {
      const localSnapshot = deps.getPosterSnapshot();
      const row = await fetchUserPoster(userId);
      if (generation !== deps.generationRef.current) return;

      if (row.status === "ok") {
        applyCloudRow(
          row.doc.data,
          row.doc,
          localSnapshot,
          row.doc.branding
        );
        deps.onUserLoaded(userId);
        return;
      }

      if (row.status === "corrupt") {
        deps.onSyncError(
          "Bulut verisi okunamadı. Yerel kopyan korundu; buluta yazılmadı."
        );
        deps.onSyncStatusChange("error");
        deps.onUserLoaded(userId);
        return;
      }

      const snapshot = deps.getPosterSnapshot();
      const result = await saveUserPoster(userId, snapshot);
      if (generation !== deps.generationRef.current) return;
      deps.onSyncStatusChange("saved");
      deps.onSyncError(describeCloudSaveResult(result));
      deps.onUpdatedAt(result.updatedAt);
      deps.onUserLoaded(userId);
    } catch (err) {
      if (generation !== deps.generationRef.current) return;
      console.error("Bulut yükleme hatası:", err);
      deps.onSyncError(mapFirestoreError(err));
      deps.onSyncStatusChange("error");
    } finally {
      if (generation === deps.generationRef.current) {
        console.log("[SYNC-DIAG] cloudLoader finally BEFORE markSynced", JSON.stringify({ pendingRepush: _pendingRepush }));
        deps.markSynced(deps.getPosterSnapshot());
        console.log("[SYNC-DIAG] cloudLoader finally AFTER markSynced, setting remoteHydrating=false");
        deps.setRemoteHydrating(false);
        if (_pendingRepush) {
          _pendingRepush = false;
          deps.onScheduleRepush();
        }
      }
    }
  }

  async function softReloadFromCloud(userId: string): Promise<void> {
    const generation = deps.generationRef.current;
    deps.setRemoteHydrating(true);
    try {
      const row = await fetchUserPoster(userId);
      if (generation !== deps.generationRef.current || row.status !== "ok") {
        return;
      }

      applyCloudRow(
        row.doc.data,
        row.doc,
        deps.getPosterSnapshot(),
        row.doc.branding
      );
    } catch (err) {
      console.error("Bulut yenileme hatası:", err);
      deps.onSyncError(mapFirestoreError(err));
      deps.onSyncStatusChange("error");
    } finally {
      if (generation === deps.generationRef.current) {
        console.log("[SYNC-DIAG] softReload finally BEFORE markSynced", JSON.stringify({ pendingRepush: _pendingRepush }));
        deps.markSynced(deps.getPosterSnapshot());
        console.log("[SYNC-DIAG] softReload finally AFTER markSynced, setting remoteHydrating=false");
        deps.setRemoteHydrating(false);
        if (_pendingRepush) {
          _pendingRepush = false;
          deps.onScheduleRepush();
        }
      }
    }
  }

  return { loadCloudPoster, softReloadFromCloud };
}
