import { describe, expect, it } from "vitest";
import { clampFeeTotal, feePayerCount, feePerPerson, formatLira } from "@/lib/matchFee";

describe("saha ücreti", () => {
  it("iki takımın oyuncularına bölünür; kaleciler ödemiyorsa ikisi düşer", () => {
    const both = { goalkeepersPay: true, teamOnly: false };
    expect(feePayerCount(7, both)).toBe(14);
    expect(feePayerCount(7, { ...both, goalkeepersPay: false })).toBe(12);
    expect(feePerPerson(2100, 7, both)).toBe(150);
    expect(feePerPerson(2100, 7, { ...both, goalkeepersPay: false })).toBe(175);
  });

  it("yalnızca takımımız öderse tek takımın oyuncularına bölünür", () => {
    expect(feePayerCount(7, { goalkeepersPay: true, teamOnly: true })).toBe(7);
    expect(feePayerCount(7, { goalkeepersPay: false, teamOnly: true })).toBe(6);
    expect(feePerPerson(1050, 7, { goalkeepersPay: true, teamOnly: true })).toBe(150);
  });

  it("kuruş kalırsa yukarı yuvarlanır (eksik toplanmasın)", () => {
    const both = { goalkeepersPay: true, teamOnly: false };
    expect(feePerPerson(2000, 7, both)).toBe(143); // 142.86
    expect(feePerPerson(0, 7, both)).toBe(0);
  });

  it("geçersiz ya da negatif tutar 0, Türkçe biçim", () => {
    expect(clampFeeTotal(-5)).toBe(0);
    expect(clampFeeTotal(Number.NaN)).toBe(0);
    expect(clampFeeTotal(1234.6)).toBe(1235);
    expect(formatLira(2100)).toBe("₺2.100");
  });
});

describe("tek takımda varsayılan", () => {
  it("yeni posterde ve alanı olmayan kayıtta ücret yalnızca takımımıza bölünür", async () => {
    const { createDefaultMatchInfo, normalizeMatchInfo } = await import("@/lib/posterSnapshot");
    expect(createDefaultMatchInfo().feeTeamOnly).toBe(true);
    const legacy: Record<string, unknown> = { ...createDefaultMatchInfo() };
    delete legacy.feeTeamOnly;
    expect(normalizeMatchInfo(legacy).feeTeamOnly).toBe(true);
    expect(normalizeMatchInfo({ ...createDefaultMatchInfo(), feeTeamOnly: false }).feeTeamOnly).toBe(false);
  });
});
