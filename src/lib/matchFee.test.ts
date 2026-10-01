import { describe, expect, it } from "vitest";
import { clampFeeTotal, feePayerCount, feePerPerson, formatLira } from "@/lib/matchFee";

describe("saha ücreti", () => {
  it("iki takımın oyuncularına bölünür; kaleciler ödemiyorsa ikisi düşer", () => {
    expect(feePayerCount(7, true)).toBe(14);
    expect(feePayerCount(7, false)).toBe(12);
    expect(feePerPerson(2100, 7, true)).toBe(150);
    expect(feePerPerson(2100, 7, false)).toBe(175);
  });

  it("kuruş kalırsa yukarı yuvarlanır (eksik toplanmasın)", () => {
    expect(feePerPerson(2000, 7, true)).toBe(143); // 142.86
    expect(feePerPerson(0, 7, true)).toBe(0);
  });

  it("geçersiz ya da negatif tutar 0, Türkçe biçim", () => {
    expect(clampFeeTotal(-5)).toBe(0);
    expect(clampFeeTotal(Number.NaN)).toBe(0);
    expect(clampFeeTotal(1234.6)).toBe(1235);
    expect(formatLira(2100)).toBe("₺2.100");
  });
});
