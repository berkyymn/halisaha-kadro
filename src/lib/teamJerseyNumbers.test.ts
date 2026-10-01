import { describe, expect, it } from "vitest";
import {
  nextFreeJerseyNumber,
  resolveJerseyNumber,
  resolveSameTeamJerseyConflicts,
} from "@/lib/teamJerseyNumbers";
import { sanitizeJerseyNumberInput } from "@/lib/teamJerseyNumbers";
import { p } from "@/test/fixtures";
import { defaultHomeTeam } from "@/lib/defaults";

describe("resolveJerseyNumber", () => {
  it("boş numarayı olduğu gibi verir", () => {
    expect(resolveJerseyNumber(9, new Set([1, 2]))).toBe(9);
  });

  it("dolu numarada bir yukarı çıkar", () => {
    expect(resolveJerseyNumber(9, new Set([9]))).toBe(10);
    expect(resolveJerseyNumber(9, new Set([9, 10, 11]))).toBe(12);
  });

  it("99'dan sonra 1'den devam eder", () => {
    expect(resolveJerseyNumber(99, new Set([99]))).toBe(1);
    expect(resolveJerseyNumber(99, new Set([99, 1]))).toBe(2);
  });

  it("aralık dışı istekleri 1–99 içine sarar", () => {
    expect(resolveJerseyNumber(100, new Set())).toBe(1);
    expect(resolveJerseyNumber(0, new Set())).toBe(99);
  });
});

describe("nextFreeJerseyNumber", () => {
  it("başlangıçtan itibaren ilk boşu bulur ve başa sarar", () => {
    expect(nextFreeJerseyNumber(new Set([98, 99]), 98)).toBe(1);
  });
});

describe("resolveSameTeamJerseyConflicts", () => {
  it("giren oyuncu dolu numaradaysa bir yukarı kayar", () => {
    const registry = { a: p("a", "A", 1), b: p("b", "B", 9), in: p("in", "Yedek", 9) };
    const team = { ...defaultHomeTeam, playerIds: ["a", "in"] };
    // 'in' b'nin yerine girdi; b artık kadroda değil → 9 serbest
    expect(resolveSameTeamJerseyConflicts({ team, squadSize: 6, registry, incomingPlayerId: "in" })).toEqual({});
    const teamWithB = { ...defaultHomeTeam, playerIds: ["b", "in"] };
    const updates = resolveSameTeamJerseyConflicts({ team: teamWithB, squadSize: 6, registry, incomingPlayerId: "in" });
    expect(updates.in.number).toBe(10);
  });
});

describe("numara alanı", () => {
  it("harf ve üçüncü basamak yazılamaz, baştaki sıfır atılır", () => {
    expect(sanitizeJerseyNumberInput("12a")).toBe("12");
    expect(sanitizeJerseyNumberInput("100")).toBe("10");
    expect(sanitizeJerseyNumberInput("abc")).toBe("");
    expect(sanitizeJerseyNumberInput("07")).toBe("7");
    expect(sanitizeJerseyNumberInput("00")).toBe("");
  });
});
