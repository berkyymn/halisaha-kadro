import { describe, expect, it } from "vitest";
import {
  clampMatchTimeForDate,
  displayDateToIso,
  isPastMatchDate,
  isoDateToDisplay,
  nextQuarterHour,
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

describe("geçmiş tarih ve saat", () => {
  const now = new Date(2026, 9, 1, 18, 7); // 01/10/2026 18:07

  it("bugünden önceki tarih geçmiştir, bugün ve sonrası değil", () => {
    expect(isPastMatchDate("30/09/2026", now)).toBe(true);
    expect(isPastMatchDate("01/10/2026", now)).toBe(false);
    expect(isPastMatchDate("15/10/2026", now)).toBe(false);
    expect(isPastMatchDate("bozuk", now)).toBe(false);
  });

  it("bugünse geçmiş saat bir sonraki çeyreğe çekilir; gelecekteki saat ve gün korunur", () => {
    expect(clampMatchTimeForDate("01/10/2026", "17:00", now)).toBe("18:15");
    expect(clampMatchTimeForDate("01/10/2026", "21:00", now)).toBe("21:00");
    expect(clampMatchTimeForDate("02/10/2026", "09:00", now)).toBe("09:00");
  });

  it("gece yarısına yakın en fazla 23:45", () => {
    expect(nextQuarterHour(new Date(2026, 9, 1, 23, 50))).toBe("23:45");
    expect(nextQuarterHour(new Date(2026, 9, 1, 18, 0))).toBe("18:15");
  });
});
