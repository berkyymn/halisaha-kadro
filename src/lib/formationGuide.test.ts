import { describe, expect, it } from "vitest";
import { FORMATIONS } from "@/lib/formations";
import { FORMAT_GUIDES, formationDeepLink } from "@/lib/formationGuide";

describe("diziliş rehberi", () => {
  it("rehberdeki ve uygulamadaki dizilişler birebir aynı", () => {
    const guideIds = FORMAT_GUIDES.flatMap((g) => g.formations.map((f) => f.id)).sort();
    const appIds = FORMATIONS.map((f) => f.id).sort();
    expect(guideIds).toEqual(appIds);
  });

  it("her diziliş kendi format sayfasında; öne çıkan diziliş o formatta", () => {
    for (const guide of FORMAT_GUIDES) {
      for (const f of guide.formations) {
        expect(FORMATIONS.find((x) => x.id === f.id)?.squadSize).toBe(guide.size);
      }
      expect(guide.formations.some((f) => f.id === guide.popularId)).toBe(true);
    }
  });

  it("bağlantı uygulamayı dizilişle açar", () => {
    expect(formationDeepLink("7-3-2-1")).toBe("/?dizilis=7-3-2-1");
  });
});
