import { describe, expect, it } from "vitest";
import { buildShareMessage, posterFileName, xShareUrl } from "@/lib/shareMessage";

const SITE = "https://halisahakadro.com";

describe("paylaşım mesajı", () => {
  it("tarih, saat ve saha adıyla", () => {
    expect(buildShareMessage({ date: "14/10/2026", time: "22:00", venue: "ALİBEYKÖY" }, SITE)).toBe(
      "⚽ Maç kadromuz hazır! 14/10 22:00 · ALİBEYKÖY. Kadronu sen de kur: halisahakadro.com"
    );
  });

  it("varsayılan ya da boş saha adı mesaja girmez", () => {
    const expected = "⚽ Maç kadromuz hazır! 14/10 22:00. Kadronu sen de kur: halisahakadro.com";
    expect(buildShareMessage({ date: "14/10/2026", time: "22:00", venue: "HALI SAHA" }, SITE)).toBe(expected);
    expect(buildShareMessage({ date: "14/10/2026", time: "22:00", venue: "  " }, SITE)).toBe(expected);
  });

  it("bilgi yoksa sade mesaj", () => {
    expect(buildShareMessage({}, SITE)).toBe("⚽ Maç kadromuz hazır! Kadronu sen de kur: halisahakadro.com");
  });

  it("paylaşım bağlantıları metni kodlar", () => {
    expect(xShareUrl("ç")).toBe("https://x.com/intent/post?text=%C3%A7");
  });
});

describe("poster dosya adı", () => {
  it("tek takım", () => {
    expect(posterFileName(["Black Eagles"], "14/10/2026")).toBe("kadro-black-eagles-14-10-2026.jpg");
  });

  it("iki takım ve Türkçe harfler", () => {
    expect(posterFileName(["Çılgın Şahinler", "Gölbaşı Üniv."], "01/11/2026")).toBe(
      "kadro-cilgin-sahinler-vs-golbasi-univ-01-11-2026.jpg"
    );
  });

  it("isim ya da tarih yoksa yine geçerli ad", () => {
    expect(posterFileName(["", "!!"], "")).toBe("kadro.jpg");
  });
});
