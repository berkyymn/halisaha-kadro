import { describe, expect, it } from "vitest";
import {
  buildPosterTitleStyles,
  clampTitleFontSize,
  titleLines,
  TITLE_FONT_SIZE_RANGE,
} from "@/lib/posterTitleStyles";
import { createDefaultMatchInfo, normalizeMatchInfo } from "@/lib/posterSnapshot";

describe("başlık satırları", () => {
  it("alt satır boşsa tek satır; üst satır boşsa varsayılan", () => {
    expect(titleLines({ titleLine1: "SALI", titleLine2: "  ", titleSubtitle: "" })).toEqual({
      line1: "SALI",
      line2: "",
      subtitle: "",
    });
    expect(titleLines({ titleLine1: "", titleLine2: "X", titleSubtitle: "" }).line1).toBe("DERBİ");
  });
});

describe("başlık boyutu", () => {
  it("80–120 aralığına sıkıştırılır, bozuk değer varsayılana döner", () => {
    expect(clampTitleFontSize(130)).toBe(TITLE_FONT_SIZE_RANGE.max);
    expect(clampTitleFontSize(70)).toBe(TITLE_FONT_SIZE_RANGE.min);
    expect(clampTitleFontSize(Number.NaN)).toBe(100);
  });

  it("yalnızca poster genişliğine bağlı (rem sınırı yok): ekran, önizleme ve çıktı aynı oran", () => {
    const styles = buildPosterTitleStyles(createDefaultMatchInfo());
    expect(styles.fontSize).toMatch(/^[\d.]+cqw$/);
    expect(String(styles.subtitle.fontSize)).toMatch(/^[\d.]+cqw$/);
  });
});

describe("eski başlık alanları", () => {
  it("döndürme ve max genişlik normalize edilince silinir", () => {
    const legacy = { ...createDefaultMatchInfo(), titleRotation: 4, titleMaxWidth: 60, titleFontSize: 130 };
    const info = normalizeMatchInfo(legacy);
    expect(info).not.toHaveProperty("titleRotation");
    expect(info).not.toHaveProperty("titleMaxWidth");
    expect(info.titleFontSize).toBe(120);
  });
});
