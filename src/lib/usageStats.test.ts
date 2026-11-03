import { describe, expect, it } from "vitest";
import { buildIncrementCommit, istanbulDay } from "@/lib/usageStats";

describe("kullanım sayacı", () => {
  it("gün İstanbul saatine göre", () => {
    // UTC 21:30 → İstanbul (UTC+3) ertesi gün 00:30
    expect(istanbulDay(new Date("2026-10-19T21:30:00Z"))).toBe("2026-10-20");
    expect(istanbulDay(new Date("2026-10-19T20:59:00Z"))).toBe("2026-10-19");
  });

  it("her alan bir kez, 1 artırılır", () => {
    const body = buildIncrementCommit("p", "2026-10-19", ["posters", "whatsapp", "posters"]);
    expect(body.writes[0].transform.document).toBe("projects/p/databases/(default)/documents/stats/2026-10-19");
    expect(body.writes[0].transform.fieldTransforms).toEqual([
      { fieldPath: "posters", increment: { integerValue: "1" } },
      { fieldPath: "whatsapp", increment: { integerValue: "1" } },
    ]);
  });
});
