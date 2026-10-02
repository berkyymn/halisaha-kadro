import { describe, expect, it } from "vitest";
import { areSnapshotsEquivalent } from "@/lib/loginConflict";
import { testSnapshot } from "@/test/fixtures";
import type { PosterSnapshot } from "@/lib/posterSnapshot";

/**
 * "Eşit" denen iki kopyada senkron buluttakini alır. İçerikteki bir alan
 * karşılaştırmaya girmezse, o alandaki bekleyen yerel değişiklik kaybolur.
 */
function variant(mutate: (s: PosterSnapshot) => void): [PosterSnapshot, PosterSnapshot] {
  const a = testSnapshot();
  const b = structuredClone(a);
  mutate(b);
  return [a, b];
}

describe("kadro eşitliği", () => {
  it("aynı içerik eşittir; yalnızca zaman damgası farkı önemsizdir", () => {
    const [a, b] = variant((s) => {
      s.localUpdatedAt = "2099-01-01T00:00:00.000Z";
    });
    expect(areSnapshotsEquivalent(a, b)).toBe(true);
  });

  it.each([
    ["saha ücreti", (s: PosterSnapshot) => { s.matchInfo = { ...s.matchInfo, feeEnabled: true, feeTotal: 2100 }; }],
    ["başlık gizleme", (s: PosterSnapshot) => { s.matchInfo = { ...s.matchInfo, titleHidden: !s.matchInfo.titleHidden }; }],
    ["logo şekli", (s: PosterSnapshot) => { s.homeTeam = { ...s.homeTeam, logo: { ...s.homeTeam.logo, mode: "generated", shape: "hexagon" } }; }],
    ["kaptan", (s: PosterSnapshot) => { s.homeTeam = { ...s.homeTeam, captainId: s.homeTeam.playerIds[2] }; }],
    ["oyuncu konumu", (s: PosterSnapshot) => { s.pitchPlayers = [{ playerId: s.homeTeam.playerIds[1], slotIndex: 1, team: "home", x: 30, y: 40 }]; }],
    ["fotoğraf kırpma", (s: PosterSnapshot) => {
      const id = s.homeTeam.playerIds[1];
      s.savedPlayers[id] = { ...s.savedPlayers[id], photoCrop: { scale: 1.5, panX: 0, panY: 0 } };
    }],
    ["fotoğraf değişti", (s: PosterSnapshot) => {
      const id = s.homeTeam.playerIds[1];
      s.savedPlayers[id] = { ...s.savedPlayers[id], cutoutStoragePath: "users/u/players/x/cutout.webp" };
    }],
  ])("%s farkı eşit sayılmaz", (_label, mutate) => {
    const [a, b] = variant(mutate);
    expect(areSnapshotsEquivalent(a, b)).toBe(false);
  });

  it("yedek oyuncunun adı değişince eşit sayılmaz (önceden yalnızca sayı karşılaştırılıyordu)", () => {
    const a = testSnapshot();
    const benchId = "bench-1";
    a.savedPlayers[benchId] = { id: benchId, name: "Yedek Ali", number: 12 };
    a.benchPlayerIds = [benchId];
    const b = structuredClone(a);
    b.savedPlayers[benchId] = { ...b.savedPlayers[benchId], name: "Yedek Veli" };
    expect(areSnapshotsEquivalent(a, b)).toBe(false);
  });
});
