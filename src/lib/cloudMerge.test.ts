import { describe, expect, it } from "vitest";
import { slimTeamConfigForCloud } from "@/lib/brandingSnapshot";
import { buildPosterSnapshot, createDefaultMatchInfo, type PosterSnapshot } from "@/lib/posterSnapshot";
import { finalizePosterSnapshot, parsePosterSnapshot } from "@/lib/posterSnapshot";
import { collectLocalPlayersForMerge, hasMeaningfulLocalChanges } from "@/lib/loginConflict";
import { normalizeTeamLogo } from "@/lib/logoUtils";
import { rosterState, p } from "@/test/fixtures";

function snapshot(overrides: Partial<PosterSnapshot> = {}): PosterSnapshot {
  const roster = rosterState();
  return {
    ...buildPosterSnapshot({
      ...roster,
      teamMode: "versus",
      mode: "guest",
      players: roster.savedPlayers,
      matchInfo: createDefaultMatchInfo(),
      homeFormationId: "7-3-2-1",
      awayFormationId: "7-3-2-1",
      pitchPlayers: [],
      singlePitchPlayers: [],
      playerCardSize: 100,
      teamLogoDisplaySize: 150,
      posterTheme: "derby-night",
    }),
    ...overrides,
  };
}

/** Buluttaki gibi: takımlarda logo/forma yok */
function slimCloud(snap: PosterSnapshot): PosterSnapshot {
  return {
    ...snap,
    homeTeam: slimTeamConfigForCloud(snap.homeTeam) as PosterSnapshot["homeTeam"],
    awayTeam: slimTeamConfigForCloud(snap.awayTeam) as PosterSnapshot["awayTeam"],
  };
}

describe("normalizeTeamLogo", () => {
  it("eksik logoda çökmez", () => {
    expect(() => normalizeTeamLogo(undefined, "TAKIM A")).not.toThrow();
  });

  it("yüklenen logonun storagePath'ini korur", () => {
    const logo = normalizeTeamLogo({ mode: "upload", storagePath: "users/u/logos/home.webp" }, "A");
    expect(logo.storagePath).toBe("users/u/logos/home.webp");
  });
});

describe("parse + finalize", () => {
  it("slim bulut verisi (branding yok) finalize edilince çökmez", () => {
    const cloud = slimCloud(snapshot());
    const parsed = parsePosterSnapshot(cloud)!;
    expect(() => finalizePosterSnapshot({ ...parsed, players: parsed.savedPlayers })).not.toThrow();
  });
});

describe("giriş çatışması", () => {
  it("dokunulmamış varsayılan kadro anlamlı değişiklik sayılmaz", () => {
    expect(hasMeaningfulLocalChanges(snapshot({ localUpdatedAt: new Date().toISOString() }))).toBe(false);
  });

  it("isim verilmiş oyuncu anlamlı değişiklik sayılır", () => {
    const snap = snapshot({ localUpdatedAt: new Date().toISOString() });
    const id = snap.homeTeam.playerIds[0];
    snap.savedPlayers[id] = { ...snap.savedPlayers[id], name: "Kaleci Ali" };
    expect(hasMeaningfulLocalChanges(snap)).toBe(true);
  });

  it("birleştir: yalnızca buluttaki olmayan özel oyuncular eklenir, storage yolları atılır", () => {
    const local = snapshot();
    // Misafir oyuncunun id'si buluttakilerden farklıdır
    const id = "guest-1";
    local.homeTeam = { ...local.homeTeam, playerIds: [local.homeTeam.playerIds[0], id, ...local.homeTeam.playerIds.slice(2)] };
    local.savedPlayers[id] = p(id, "Yerel Yıldız", 2, { cutoutStoragePath: "users/x/players/y/cutout.webp" });
    const cloud = snapshot();
    const out = collectLocalPlayersForMerge(local, cloud);
    expect(out.map((x) => x.name)).toEqual(["Yerel Yıldız"]);
    expect(out[0].cutoutStoragePath).toBeUndefined();
  });
});
