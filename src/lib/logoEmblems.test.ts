import { describe, expect, it } from "vitest";
import { EMBLEMS } from "@/lib/logoEmblems.generated";
import { LOGO_PRESETS } from "@/lib/logoPresets";
import { normalizeLogoIcon, normalizeTeamLogo } from "@/lib/logoUtils";

describe("arma sembolleri", () => {
  it("her sembolün benzersiz kimliği, Türkçe etiketi ve çizim yolu var", () => {
    const ids = EMBLEMS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const emblem of EMBLEMS) {
      expect(emblem.label.length).toBeGreaterThan(0);
      expect(emblem.paths.length).toBeGreaterThan(0);
    }
  });

  it("renk şablonları yalnızca var olan sembolleri kullanır (ad ne vaat ediyorsa o çizilir)", () => {
    for (const preset of LOGO_PRESETS) {
      expect(normalizeLogoIcon(preset.config.icon)).toBe(preset.config.icon);
    }
  });

  it("eski kayıtlardaki kaldırılmış semboller en yakın güncel sembole eşlenir", () => {
    expect(normalizeLogoIcon("football")).toBe("ball");
    expect(normalizeLogoIcon("claw")).toBe("crocodile");
    expect(normalizeLogoIcon("panther")).toBe("wolf");
    expect(normalizeLogoIcon("bilinmeyen")).toBe("none");
    expect(normalizeTeamLogo({ icon: "phoenix", showIcon: true }).icon).toBe("falcon");
  });
});
