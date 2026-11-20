import { describe, expect, it } from "vitest";
import {
  displayDateToIso,
  isoDateToDisplay,
  MATCH_HOUR_OPTIONS,
  matchMinuteOptions,
  normalizeMatchTime,
} from "@/lib/matchDate";
import { isCustomizedPlayer } from "@/lib/playerPool";

describe("normalizeMatchTime", () => {
  it.each([
    ["21:00", "21:00"],
    ["9:05", "09:05"],
    ["19.30", "19:30"],
    ["25:00", "21:00"],
    ["abc", "21:00"],
    [undefined, "21:00"],
  ])("%s → %s", (input, expected) => {
    expect(normalizeMatchTime(input)).toBe(expected);
  });
});

describe("saat / dakika seçenekleri", () => {
  it("saat 00 … 23", () => {
    expect(MATCH_HOUR_OPTIONS).toHaveLength(24);
    expect(MATCH_HOUR_OPTIONS[0]).toBe("00");
    expect(MATCH_HOUR_OPTIONS[23]).toBe("23");
  });

  it("dakika yalnızca çeyrekler", () => {
    expect(matchMinuteOptions("30")).toEqual(["00", "15", "30", "45"]);
    expect(matchMinuteOptions()).toEqual(["00", "15", "30", "45"]);
  });

  it("kayıtlı çeyrek olmayan dakika sırasıyla eklenir", () => {
    expect(matchMinuteOptions("10")).toEqual(["00", "10", "15", "30", "45"]);
  });
});

describe("tarih dönüşümü", () => {
  it("gidiş-dönüş", () => {
    expect(isoDateToDisplay(displayDateToIso("28/09/2026"))).toBe("28/09/2026");
  });
});

describe("isCustomizedPlayer", () => {
  it("yer tutucular özel değildir", () => {
    expect(isCustomizedPlayer({ id: "1", name: "Oyuncu 7", number: 7 })).toBe(false);
    expect(isCustomizedPlayer({ id: "1", name: "Yedek 2", number: 2 })).toBe(false);
  });
  it("isim veya fotoğraf özel yapar", () => {
    expect(isCustomizedPlayer({ id: "1", name: "Berk", number: 1 })).toBe(true);
    expect(isCustomizedPlayer({ id: "1", name: "Oyuncu 1", number: 1, photoSource: "data:x" })).toBe(true);
  });
});
