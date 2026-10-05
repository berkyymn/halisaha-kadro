import { describe, expect, it } from "vitest";
import { POSTER_LOGICAL_SIZE } from "@/lib/posterScale";
import { EXPORT_WIDTH } from "@/lib/posterExport";

describe("sabit poster boyutu", () => {
  it("ekrandaki çerçeve oranlarıyla aynı (iki takım 16:10, tek takım 4:5)", () => {
    expect(POSTER_LOGICAL_SIZE.versus.width / POSTER_LOGICAL_SIZE.versus.height).toBeCloseTo(16 / 10, 5);
    expect(POSTER_LOGICAL_SIZE.single.width / POSTER_LOGICAL_SIZE.single.height).toBeCloseTo(4 / 5, 5);
  });

  it("indirilen poster hedef genişliğe en az 2x çözünürlükle çizilir", () => {
    for (const mode of ["versus", "single"] as const) {
      const ratio = EXPORT_WIDTH[mode] / POSTER_LOGICAL_SIZE[mode].width;
      expect(ratio).toBeGreaterThanOrEqual(2);
    }
  });
});
