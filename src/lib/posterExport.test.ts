import { describe, expect, it } from "vitest";
import { needsWarmupRender } from "./posterExport";

const UA = {
  macSafari:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15",
  iphoneSafari:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.7 Mobile/15E148 Safari/604.1",
  iphoneChrome:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.0.0 Mobile/15E148 Safari/604.1",
  macChrome:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  macEdge:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0",
  android:
    "Mozilla/5.0 (Linux; Android 14; Pixel 9a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
  firefox: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:132.0) Gecko/20100101 Firefox/132.0",
};

describe("needsWarmupRender", () => {
  it("Safari ve iPhone'daki tüm tarayıcılarda yeniden çizer", () => {
    expect(needsWarmupRender(UA.macSafari)).toBe(true);
    expect(needsWarmupRender(UA.iphoneSafari)).toBe(true);
    expect(needsWarmupRender(UA.iphoneChrome)).toBe(true);
  });

  it("Chrome, Edge, Android ve Firefox'ta tek çizim yeter", () => {
    expect(needsWarmupRender(UA.macChrome)).toBe(false);
    expect(needsWarmupRender(UA.macEdge)).toBe(false);
    expect(needsWarmupRender(UA.android)).toBe(false);
    expect(needsWarmupRender(UA.firefox)).toBe(false);
  });
});
