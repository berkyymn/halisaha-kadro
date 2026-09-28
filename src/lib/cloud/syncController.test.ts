import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SyncController, type SyncPolicy, type SyncState } from "@/lib/cloud/syncController";
import {
  areSnapshotsEquivalent,
  collectLocalPlayersForMerge,
  hasMeaningfulLocalChanges,
} from "@/lib/loginConflict";
import { FakeCloud, FakeLocal, memoryMeta } from "@/test/fakeCloud";
import { renamePlayer, testSnapshot } from "@/test/fixtures";
import type { SyncMetaStore } from "@/lib/cloud/syncMeta";

const UID = "user-1";
const policy: SyncPolicy = {
  isCustomized: hasMeaningfulLocalChanges,
  equivalent: areSnapshotsEquivalent,
  mergeExtras: collectLocalPlayersForMerge,
};

function name(snapshot: ReturnType<FakeLocal["snapshot"]>, slot = 0): string {
  return snapshot.savedPlayers[snapshot.homeTeam.playerIds[slot]].name;
}

/** Zamanlayıcıları ve bekleyen promise'leri ilerletir. */
async function settle(ms = 20_000): Promise<void> {
  for (let i = 0; i < 20; i++) {
    await vi.advanceTimersByTimeAsync(ms / 20);
  }
}

function setup(options: {
  local?: FakeLocal;
  cloud?: FakeCloud;
  meta?: SyncMetaStore;
} = {}) {
  const local = options.local ?? new FakeLocal(testSnapshot());
  const cloud = options.cloud ?? new FakeCloud();
  const meta = options.meta ?? memoryMeta();
  const controller = new SyncController({ repo: cloud, local, meta, policy });
  const phases: SyncState["phase"][] = [];
  controller.subscribe((state) => phases.push(state.phase));
  return { local, cloud, meta, controller, phases };
}

function cloudWith(mutate?: (s: ReturnType<typeof testSnapshot>) => void, revision = 5): FakeCloud {
  const cloud = new FakeCloud();
  const snapshot = testSnapshot();
  mutate?.(snapshot);
  cloud.doc = { snapshot, revision };
  return cloud;
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("ilk yükleme", () => {
  it("bulutta doküman yoksa yerel kadro yazılır", async () => {
    const local = new FakeLocal(testSnapshot());
    local.edit((s) => renamePlayer(s, "Yerel Kaleci"));
    const { cloud, controller, meta } = setup({ local });
    controller.start(UID);
    await settle();
    expect(cloud.saves).toBe(1);
    expect(name(cloud.doc!.snapshot)).toBe("Yerel Kaleci");
    expect(controller.getState().phase).toBe("ready");
    expect(meta.owner()).toBe(UID);
  });

  it("REGRESYON: dokunulmamış yerel kadro bulutu asla ezmez (çıkış sonrası / yeni cihaz)", async () => {
    const cloud = cloudWith((s) => renamePlayer(s, "Bulut Forvet"));
    const { local, controller } = setup({ cloud });
    controller.start(UID);
    await settle();
    expect(name(local.snapshot())).toBe("Bulut Forvet");
    expect(cloud.saves).toBe(0);
    expect(controller.getState().phase).toBe("ready");
  });

  it("REGRESYON: aynı kullanıcının gönderilmemiş değişikliği çatışma sorusu çıkarmaz, yazılır", async () => {
    const cloud = cloudWith((s) => renamePlayer(s, "Eski İsim"), 5);
    const local = new FakeLocal(cloud.doc!.snapshot);
    const meta = memoryMeta({ owner: UID, synced: { [UID]: { editVersion: 0, revision: 5 } } });
    local.edit((s) => renamePlayer(s, "Yeni İsim"));
    const { controller } = setup({ local, cloud, meta });
    controller.start(UID);
    await settle();
    expect(controller.getState().phase).toBe("ready");
    expect(name(cloud.doc!.snapshot)).toBe("Yeni İsim");
    expect(cloud.doc!.revision).toBe(6);
  });

  it("bekleyen değişiklik yoksa bulut uygulanır", async () => {
    const cloud = cloudWith((s) => renamePlayer(s, "Diğer Cihaz"), 7);
    const local = new FakeLocal(testSnapshot());
    local.edit((s) => renamePlayer(s, "Eski Yerel"));
    const meta = memoryMeta({ owner: UID, synced: { [UID]: { editVersion: 1, revision: 5 } } });
    const { controller } = setup({ local, cloud, meta });
    controller.start(UID);
    await settle();
    expect(name(local.snapshot())).toBe("Diğer Cihaz");
    expect(cloud.saves).toBe(0);
  });

  it("hem yerel hem bulut değişmişse çatışma sorulur (sessiz kayıp yok)", async () => {
    const cloud = cloudWith((s) => renamePlayer(s, "Diğer Cihaz"), 7);
    const local = new FakeLocal(testSnapshot());
    local.edit((s) => renamePlayer(s, "Bu Cihaz"));
    const meta = memoryMeta({ owner: UID, synced: { [UID]: { editVersion: 0, revision: 5 } } });
    const { controller } = setup({ local, cloud, meta });
    controller.start(UID);
    await settle();
    const state = controller.getState();
    expect(state.phase).toBe("conflict");
    expect(state.phase === "conflict" && state.conflict.reason).toBe("concurrent-edit");
    expect(cloud.saves).toBe(0);
  });

  it("özelleştirilmiş misafir verisi hesaba girerken çatışma sorulur", async () => {
    const cloud = cloudWith((s) => renamePlayer(s, "Bulut"), 3);
    const local = new FakeLocal(testSnapshot());
    local.edit((s) => renamePlayer(s, "Misafir"));
    const { controller } = setup({ local, cloud });
    controller.start(UID);
    await settle();
    const state = controller.getState();
    expect(state.phase === "conflict" && state.conflict.reason).toBe("guest-data");
    expect(name(local.snapshot())).toBe("Misafir");
  });

  it("eski biçimdeki doküman bir kez yeni biçimde yazılır", async () => {
    const cloud = cloudWith((s) => renamePlayer(s, "Eski Biçim"), 4);
    cloud.doc!.legacy = true;
    const { controller } = setup({ cloud });
    controller.start(UID);
    await settle();
    expect(cloud.saves).toBe(1);
    expect(cloud.doc!.revision).toBe(5);
    expect(controller.getState()).toMatchObject({ phase: "ready", pending: false });
  });

  it("geçici okuma hatası geri çekilerek tekrar denenir", async () => {
    const cloud = cloudWith((s) => renamePlayer(s, "Bulut"), 2);
    cloud.failNextFetch = Object.assign(new Error("offline"), { code: "unavailable" });
    const { local, controller } = setup({ cloud });
    controller.start(UID);
    await settle(1_000);
    expect(controller.getState()).toMatchObject({ phase: "loading" });
    await settle(10_000);
    expect(controller.getState().phase).toBe("ready");
    expect(name(local.snapshot())).toBe("Bulut");
  });

  it("kalıcı okuma hatasında buluta hiçbir şey yazılmaz", async () => {
    const cloud = cloudWith(undefined, 2);
    cloud.failNextFetch = Object.assign(new Error("denied"), { code: "permission-denied" });
    const { controller } = setup({ cloud });
    controller.start(UID);
    await settle();
    expect(controller.getState().phase).toBe("error");
    expect(cloud.saves).toBe(0);
  });
});

describe("çatışma çözümü", () => {
  async function inGuestConflict() {
    const cloud = cloudWith((s) => renamePlayer(s, "Bulut Oyuncu"), 3);
    const local = new FakeLocal(testSnapshot());
    local.edit((s) => {
      renamePlayer(s, "Misafir");
      const id = "guest-player";
      s.savedPlayers[id] = { id, name: "Misafir Yıldız", number: 22 };
      s.benchPlayerIds.push(id);
    });
    const ctx = setup({ local, cloud });
    ctx.controller.start(UID);
    await settle();
    return ctx;
  }

  it("Bu cihazı kullan: yerel kadro buluta yazılır", async () => {
    const { controller, cloud } = await inGuestConflict();
    await controller.resolveConflict("local");
    await settle();
    expect(controller.getState().phase).toBe("ready");
    expect(name(cloud.doc!.snapshot)).toBe("Misafir");
  });

  it("Bulutu kullan: yerel kadro birebir buluttakiyle değişir, bulut yazılmaz", async () => {
    const { controller, cloud, local } = await inGuestConflict();
    await controller.resolveConflict("cloud");
    await settle();
    expect(name(local.snapshot())).toBe("Bulut Oyuncu");
    expect(local.snapshot().benchPlayerIds).toEqual([]);
    expect(cloud.saves).toBe(0);
  });

  it("Birleştir: bulut + misafir oyuncular yedekte, sonuç buluta yazılır", async () => {
    const { controller, cloud, local } = await inGuestConflict();
    await controller.resolveConflict("merge");
    await settle();
    expect(name(local.snapshot())).toBe("Bulut Oyuncu");
    const bench = cloud.doc!.snapshot.benchPlayerIds.map((id) => cloud.doc!.snapshot.savedPlayers[id].name);
    expect(bench).toContain("Misafir Yıldız");
    expect(controller.getState()).toMatchObject({ phase: "ready", pending: false });
  });

  it("çözüm sırasında hata olursa çatışma ekranı açık kalır", async () => {
    const { controller, cloud } = await inGuestConflict();
    cloud.failNextSave = Object.assign(new Error("denied"), { code: "permission-denied" });
    await controller.resolveConflict("local");
    const state = controller.getState();
    expect(state.phase).toBe("conflict");
    expect(state.phase === "conflict" && state.error).toBeTruthy();
  });
});

describe("kayıt döngüsü ve canlı değişiklik", () => {
  async function ready() {
    const cloud = cloudWith((s) => renamePlayer(s, "Başlangıç"), 1);
    const ctx = setup({ cloud });
    ctx.controller.start(UID);
    await settle();
    return ctx;
  }

  it("düzenlemeler gruplanıp tek yazımda gönderilir", async () => {
    const { controller, cloud, local } = await ready();
    local.edit((s) => renamePlayer(s, "A"));
    local.edit((s) => renamePlayer(s, "AB"));
    local.edit((s) => renamePlayer(s, "ABC"));
    expect(controller.getState()).toMatchObject({ pending: true });
    await settle();
    expect(cloud.saves).toBe(1);
    expect(name(cloud.doc!.snapshot)).toBe("ABC");
    expect(controller.getState()).toMatchObject({ phase: "ready", pending: false });
  });

  it("REGRESYON: kendi yazımımızın yankısı dışarıdan değişiklik sanılmaz", async () => {
    const { controller, cloud, local } = await ready();
    // Yankı, yazım bitmeden gelir; kullanıcı bu sırada düzenlemeye devam eder.
    cloud.echoBeforeResolve = true;
    cloud.saveDelayMs = 1_000;
    local.edit((s) => renamePlayer(s, "Kendi Yazım"));
    // t=2500 yazım başlar (debounce); t=3000 yankı gelir; t=3500 yazım biter.
    await vi.advanceTimersByTimeAsync(2_700);
    local.edit((s) => renamePlayer(s, "Yazım Sırasında", 1)); // yazım sürerken düzenleme
    await settle();
    expect(controller.getState().phase).toBe("ready");
    expect(name(local.snapshot())).toBe("Kendi Yazım");
    expect(name(cloud.doc!.snapshot, 1)).toBe("Yazım Sırasında");
    expect(cloud.saves).toBe(2);
  });

  it("başka cihazdaki değişiklik, bekleyen düzenleme yoksa uygulanır", async () => {
    const { controller, cloud, local } = await ready();
    cloud.writeFromOtherDevice((s) => renamePlayer(s, "Telefondan"));
    await settle();
    expect(name(local.snapshot())).toBe("Telefondan");
    expect(controller.getState().phase).toBe("ready");
  });

  it("başka cihaz yazarken bizde bekleyen düzenleme varsa çatışma sorulur", async () => {
    const { controller, cloud, local } = await ready();
    local.edit((s) => renamePlayer(s, "Bu Cihaz"));
    cloud.writeFromOtherDevice((s) => renamePlayer(s, "Diğer Cihaz"));
    await settle();
    expect(controller.getState()).toMatchObject({ phase: "conflict", conflict: { reason: "concurrent-edit" } });
  });

  it("revision çakışmasında (araya yazım) bulut okunur ve çatışma sorulur", async () => {
    const { controller, cloud, local } = await ready();
    // Canlı bildirim kaçırılmış gibi: bulut sessizce ilerlemiş.
    cloud.doc = { snapshot: cloud.doc!.snapshot, revision: cloud.doc!.revision + 1 };
    renamePlayer(cloud.doc.snapshot, "Sessiz Değişiklik");
    local.edit((s) => renamePlayer(s, "Bu Cihaz"));
    await settle();
    expect(controller.getState()).toMatchObject({ phase: "conflict" });
  });

  it("geçici kayıt hatası tekrar denenir", async () => {
    const { controller, cloud, local } = await ready();
    cloud.failNextSave = Object.assign(new Error("net"), { code: "unavailable" });
    local.edit((s) => renamePlayer(s, "Tekrar"));
    await settle(3_000);
    expect(controller.getState()).toMatchObject({ error: expect.any(String) });
    await settle(20_000);
    expect(name(cloud.doc!.snapshot)).toBe("Tekrar");
    expect(controller.getState()).toMatchObject({ pending: false, error: null });
  });

  it("flushNow: çıkış öncesi bekleyen değişiklik hemen yazılır", async () => {
    const { controller, cloud, local } = await ready();
    local.edit((s) => renamePlayer(s, "Hemen"));
    const flushed = controller.flushNow(5_000);
    await settle(1_000);
    expect(await flushed).toBe(true);
    expect(name(cloud.doc!.snapshot)).toBe("Hemen");
  });

  it("stop sonrası geç gelen sonuçlar yok sayılır", async () => {
    const cloud = cloudWith((s) => renamePlayer(s, "Bulut"), 1);
    const { controller, local } = setup({ cloud });
    controller.start(UID);
    controller.stop();
    await settle();
    expect(controller.getState().phase).toBe("idle");
    expect(name(local.snapshot())).toBe("Oyuncu 1");
  });
});
