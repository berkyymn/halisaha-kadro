import { afterEach, describe, expect, it, vi } from "vitest";
import { createId } from "@/lib/id";

describe("createId", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("randomUUID yoksa geçerli bir UUID v4 üretir", () => {
    const real = globalThis.crypto;
    vi.stubGlobal("crypto", { getRandomValues: real.getRandomValues.bind(real) });
    const id = createId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(createId()).not.toBe(id);
  });
});
