import { describe, expect, it } from "vitest";
import { useAppStore } from "@/store/useAppStore";

/**
 * SyncController'ın dayandığı sözleşme: kullanıcı düzenlemesi editVersion'ı
 * artırır (→ buluta kaydet), buluttan gelen kadro artırmaz (→ yankı döngüsü yok).
 */
describe("editVersion", () => {
  it("poster düzenlemesi sayacı artırır, poster dışı durum artırmaz", () => {
    const before = useAppStore.getState().editVersion;
    useAppStore.getState().setMatchInfo({ venue: "Test Saha" });
    expect(useAppStore.getState().editVersion).toBe(before + 1);
    useAppStore.getState().setLogoDesignerTeam("home");
    expect(useAppStore.getState().editVersion).toBe(before + 1);
  });

  it("applyCloudSnapshot kadroyu uygular ama sayacı artırmaz", () => {
    const cloud = useAppStore.getState().getPosterSnapshot();
    cloud.matchInfo = { ...cloud.matchInfo, venue: "Buluttaki Saha" };
    const before = useAppStore.getState().editVersion;
    useAppStore.getState().applyCloudSnapshot(cloud);
    expect(useAppStore.getState().matchInfo.venue).toBe("Buluttaki Saha");
    expect(useAppStore.getState().editVersion).toBe(before);
  });

  it("uygulanan bulut kadrosu anlık görüntüde birebir geri okunur", () => {
    const cloud = useAppStore.getState().getPosterSnapshot();
    useAppStore.getState().applyCloudSnapshot(cloud);
    const again = useAppStore.getState().getPosterSnapshot();
    expect(again.savedPlayers).toEqual(cloud.savedPlayers);
    expect(again.homeTeam.playerIds).toEqual(cloud.homeTeam.playerIds);
  });
});
