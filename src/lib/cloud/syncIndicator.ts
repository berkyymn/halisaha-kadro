import type { SyncState } from "@/lib/cloud/syncController";

export type SyncIndicator = {
  tone: "ok" | "busy" | "warn" | "error";
  spinning: boolean;
  label: string;
};

/** Header'daki bulut simgesi: durumdan renk + açıklama. */
export function describeSyncIndicator(sync: SyncState): SyncIndicator {
  switch (sync.phase) {
    case "idle":
      return { tone: "ok", spinning: false, label: "Bulut kaydı kapalı" };
    case "loading":
      return sync.error
        ? { tone: "warn", spinning: false, label: `${sync.error} Tekrar denenecek.` }
        : { tone: "busy", spinning: true, label: "Bulut verisi yükleniyor" };
    case "error":
      return { tone: "error", spinning: false, label: sync.error };
    case "conflict":
      return { tone: "warn", spinning: false, label: "Hangi kadronun kullanılacağını seçmen bekleniyor" };
    case "ready":
      if (sync.error) return { tone: "error", spinning: false, label: sync.error };
      if (sync.saving) return { tone: "busy", spinning: true, label: "Buluta kaydediliyor" };
      if (sync.pending) return { tone: "busy", spinning: false, label: "Buluta kaydedilmek üzere bekliyor" };
      if (sync.notice) return { tone: "warn", spinning: false, label: sync.notice };
      return { tone: "ok", spinning: false, label: "Bulut kaydı güncel" };
  }
}
