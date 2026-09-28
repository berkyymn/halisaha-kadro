import { describe, expect, it } from "vitest";
import { displayDateToIso, isoDateToDisplay, normalizeMatchTime } from "@/lib/matchDate";
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
