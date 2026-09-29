import { describe, expect, it } from "vitest";
import { isChunkLoadError } from "@/lib/chunkRecovery";

describe("isChunkLoadError", () => {
  it("deploy sonrası eksik parça hatalarını tanır", () => {
    expect(isChunkLoadError(Object.assign(new Error("x"), { name: "ChunkLoadError" }))).toBe(true);
    expect(isChunkLoadError(new Error("Failed to load chunk /_next/static/chunks/39txn.js from module 64893"))).toBe(true);
    expect(isChunkLoadError(new TypeError("Failed to fetch dynamically imported module: https://x/a.js"))).toBe(true);
    expect(isChunkLoadError(new TypeError("Importing a module script failed."))).toBe(true);
  });

  it("sıradan hataları yenileme sebebi saymaz", () => {
    expect(isChunkLoadError(new Error("Cannot read properties of undefined"))).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
    expect(isChunkLoadError(42)).toBe(false);
  });
});
