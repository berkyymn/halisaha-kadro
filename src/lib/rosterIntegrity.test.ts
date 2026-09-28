import { describe, expect, it } from "vitest";
import { normalizeRoster, pruneFormatOverflow, resizeSquad } from "@/lib/rosterIntegrity";
import { names, numbers, p, placeholderLineup, rosterState } from "@/test/fixtures";

describe("normalizeRoster", () => {
  it("eksik slotları yer tutucuyla doldurur", () => {
    const state = rosterState();
    state.homeTeam = { ...state.homeTeam, playerIds: ["h1", "", "h3"] };
    const out = normalizeRoster(state);
    expect(out.homeTeam.playerIds).toHaveLength(7);
    expect(out.homeTeam.playerIds.every((id) => out.savedPlayers[id])).toBe(true);
  });

  it("aynı oyuncu iki slotta duramaz", () => {
    const state = rosterState();
    state.awayTeam = { ...state.awayTeam, playerIds: ["h1", ...state.awayTeam.playerIds.slice(1)] };
    const out = normalizeRoster(state);
    const all = [...out.homeTeam.playerIds, ...out.awayTeam.playerIds];
    expect(new Set(all).size).toBe(all.length);
  });

  it("takım içi tekrarlı numaraları bir yukarı kaydırır, önceki slot korunur", () => {
    const home = placeholderLineup("h", 7);
    home[5] = { ...home[5], number: 2 };
    home[6] = { ...home[6], number: 2 };
    const out = normalizeRoster(rosterState({ home }));
    // 2 dolu → ilk boşlar 6 ve 7
    expect(numbers(out, "home")).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("yedek listesini tekilleştirir, sahadakileri ve kayıtsızları çıkarır", () => {
    const bench = [p("b1", "Yedek Ali", 20)];
    const state = rosterState({ bench });
    state.benchPlayerIds = ["b1", "b1", "h1", "ghost"];
    expect(normalizeRoster(state).benchPlayerIds).toEqual(["b1"]);
  });

  it("kadroda olmayan kaptanı düşürür", () => {
    const state = rosterState({ homeTeam: { captainId: "yok" } });
    expect(normalizeRoster(state).homeTeam.captainId).toBeUndefined();
  });

  it("squadSize'dan uzun eski dizilerdeki özel oyuncuları yedeğe kurtarır", () => {
    const home = [...placeholderLineup("h", 7), p("h8", "Eski Forvet", 8)];
    const out = normalizeRoster(rosterState({ home }));
    expect(out.benchPlayerIds).toContain("h8");
  });
});

describe("resizeSquad", () => {
  it("küçülürken özel oyuncu yedeğe iner, yer tutucu silinir", () => {
    const home = placeholderLineup("h", 7);
    home[6] = p("h7", "Son Forvet", 7);
    const out = resizeSquad(rosterState({ home }), 6)!;
    expect(names(out, "home")).toHaveLength(6);
    expect(out.benchPlayerIds).toEqual(["h7"]);
    expect(out.formatOverflow.home).toEqual(["h7"]);
    expect(out.savedPlayers.a7).toBeUndefined();
  });

  it("büyürken aynı takımın aynı slotuna geri döner", () => {
    const home = placeholderLineup("h", 7);
    home[6] = p("h7", "Son Forvet", 7);
    const small = resizeSquad(rosterState({ home }), 6)!;
    const back = resizeSquad(small, 7)!;
    expect(names(back, "home")[6]).toBe("Son Forvet");
    expect(back.benchPlayerIds).toEqual([]);
  });

  it("8 → 6 → 7 → 8: slot sırası korunur", () => {
    const home = placeholderLineup("h", 8);
    home[6] = p("h7", "Yedinci", 7);
    home[7] = p("h8", "Sekizinci", 8);
    const s6 = resizeSquad(rosterState({ squadSize: 8, home, away: placeholderLineup("a", 8) }), 6)!;
    const s7 = resizeSquad(s6, 7)!;
    expect(names(s7, "home")[6]).toBe("Yedinci");
    const s8 = resizeSquad(s7, 8)!;
    expect(names(s8, "home")[7]).toBe("Sekizinci");
  });

  it("geri dönen oyuncunun numarası doluysa bir yukarı kayar", () => {
    const home = placeholderLineup("h", 7);
    home[6] = p("h7", "Son Forvet", 7);
    const small = resizeSquad(rosterState({ home }), 6)!;
    const h4 = small.homeTeam.playerIds[3];
    // Uygulamada updatePlayer iki kaydı birlikte günceller (R3'te tek kayda inecek)
    small.savedPlayers[h4] = { ...small.savedPlayers[h4], number: 7 };
    small.players[h4] = small.savedPlayers[h4];
    const back = resizeSquad(small, 7)!;
    expect(numbers(back, "home")[6]).toBe(8);
  });

  it("yedekten silinmiş/sahaya alınmış oyuncu geri gelmez, kopya oluşmaz", () => {
    const home = placeholderLineup("h", 7);
    home[6] = p("h7", "Son Forvet", 7);
    const small = resizeSquad(rosterState({ home }), 6)!;
    small.benchPlayerIds = [];
    const back = resizeSquad(small, 7)!;
    const all = [...back.homeTeam.playerIds, ...back.awayTeam.playerIds];
    expect(new Set(all).size).toBe(all.length);
    expect(names(back, "home")[6]).toBe("Oyuncu 7");
  });

  it("aynı boyut için null döner", () => {
    expect(resizeSquad(rosterState(), 7)).toBeNull();
  });
});

describe("pruneFormatOverflow", () => {
  it("yedekte olmayanları yığından düşürür", () => {
    expect(pruneFormatOverflow({ home: ["x", "y"], away: ["z"] }, ["y"])).toEqual({ home: ["y"], away: [] });
  });
});
