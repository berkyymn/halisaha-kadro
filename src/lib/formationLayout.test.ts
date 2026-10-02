import { describe, expect, it } from "vitest";
import { FORMATIONS } from "@/lib/formations";
import {
  cardPixelSize,
  computeFormationLayout,
  computeSingleFormationLayout,
  getPitchMetrics,
  getSinglePitchMetrics,
  maxPlayersInRow,
  SINGLE_PITCH_AREA,
} from "@/lib/formationEngine";
import { getAutoCardSize } from "@/lib/posterLayout";
import { DEFAULT_LOGO_DISPLAY_SIZE, type PosterMetrics } from "@/types";

/** 13" dizüstü, 15" ve 27" ekrandaki poster boyutları (16:10 ve 4:5) */
const VERSUS_POSTERS: PosterMetrics[] = [
  { width: 900, height: 562 },
  { width: 1120, height: 700 },
  { width: 1900, height: 1188 },
];
const SINGLE_POSTERS: PosterMetrics[] = [
  { width: 460, height: 575 },
  { width: 560, height: 700 },
  { width: 950, height: 1188 },
];

type Box = { left: number; right: number; top: number; bottom: number; label: string };

function boxes(
  slots: { x: number; y: number; label: string }[],
  pitch: PosterMetrics,
  cardSize: number,
  prefix: string
): Box[] {
  const { width, height } = cardPixelSize(cardSize);
  return slots.map((s) => {
    const cx = (s.x / 100) * pitch.width;
    const cy = (s.y / 100) * pitch.height;
    return {
      left: cx - width / 2,
      right: cx + width / 2,
      top: cy - height / 2,
      bottom: cy + height / 2,
      label: `${prefix}${s.label}`,
    };
  });
}

function overlaps(a: Box, b: Box, tolerancePx: number): boolean {
  return (
    Math.min(a.right, b.right) - Math.max(a.left, b.left) > tolerancePx &&
    Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > tolerancePx
  );
}

function expectNoOverlap(all: Box[], context: string) {
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      if (overlaps(all[i], all[j], 1)) {
        throw new Error(`${context}: ${all[i].label} ile ${all[j].label} çakışıyor`);
      }
    }
  }
}

describe("saha dizilimi: kartlar üst üste binmez", () => {
  for (const formation of FORMATIONS) {
    for (const poster of VERSUS_POSTERS) {
      it(`ikili ${formation.id} @ ${poster.width}px`, () => {
        const cardSize = getAutoCardSize(poster, maxPlayersInRow(formation), "versus");
        const pitch = getPitchMetrics(poster);
        const home = computeFormationLayout(formation, "home", poster, cardSize);
        const away = computeFormationLayout(formation, "away", poster, cardSize);
        expectNoOverlap(
          [...boxes(home, pitch, cardSize, "ev-"), ...boxes(away, pitch, cardSize, "dep-")],
          `${formation.id} ${poster.width}px`
        );
      });
    }

    for (const poster of SINGLE_POSTERS) {
      it(`tekli ${formation.id} @ ${poster.width}px`, () => {
        const cardSize = getAutoCardSize(poster, maxPlayersInRow(formation), "single");
        const pitch = getSinglePitchMetrics(poster);
        const slots = computeSingleFormationLayout(formation, poster, cardSize);
        const all = boxes(slots, pitch, cardSize, "");
        expectNoOverlap(all, `${formation.id} ${poster.width}px`);
        // Saha alanı posterin %19–87'si; üstte takım şeridi %18'de biter,
        // alt bilgi %88,5'te başlar: kart bu şeritlere binmemeli.
        const posterPct = pitch.height / SINGLE_PITCH_AREA.height;
        for (const box of all) {
          expect(box.left).toBeGreaterThanOrEqual(-1);
          expect(box.right).toBeLessThanOrEqual(pitch.width + 1);
          expect(box.top).toBeGreaterThanOrEqual(-1 * posterPct - 1);
          expect(box.bottom).toBeLessThanOrEqual(pitch.height + 1.5 * posterPct + 1);
        }
      });
    }
  }

  it("kart boyutu postere orantılı: ekran büyüyünce oran korunur", () => {
    const formation = FORMATIONS.find((f) => f.id === "7-3-2-1")!;
    const ratio = (poster: PosterMetrics) =>
      getAutoCardSize(poster, maxPlayersInRow(formation), "versus") / poster.width;
    expect(ratio(VERSUS_POSTERS[2])).toBeCloseTo(ratio(VERSUS_POSTERS[1]), 2);
  });
});

describe("takım adı ölçeği", () => {
  it("logo boyutuyla birlikte değişir; varsayılanda 1, uçlarda sınırlı", async () => {
    const { teamNameScale } = await import("@/lib/posterLayout");
    expect(teamNameScale(DEFAULT_LOGO_DISPLAY_SIZE)).toBeCloseTo(1, 5);
    expect(teamNameScale(60)).toBeCloseTo(0.65, 5);
    expect(teamNameScale(220)).toBeCloseTo(1.3, 5);
    expect(teamNameScale(100)).toBeGreaterThan(0.65);
    expect(teamNameScale(100)).toBeLessThan(1);
    expect(teamNameScale(999)).toBeCloseTo(1.3, 5);
  });
});
