/**
 * Telefonlar mobil düzeni (MobileStage) görür; masaüstü ve tabletler mevcut
 * düzeni. Karar ekranın kısa kenarına ve dokunmatik olmaya göre verilir.
 * `?mobil=1` / `?mobil=0` ile zorlanabilir (masaüstünde deneme için).
 */
const PHONE_SHORT_SIDE_MAX = 600;

export type LayoutMode = "desktop" | "mobile";

export function detectLayoutMode(): LayoutMode {
  if (typeof window === "undefined") return "desktop";
  const forced = new URLSearchParams(window.location.search).get("mobil");
  if (forced === "1") return "mobile";
  if (forced === "0") return "desktop";

  const shortSide = Math.min(window.screen.width, window.screen.height);
  const ua = navigator.userAgent || "";
  const phoneUa = /iPhone|iPod|Android.+Mobile|Windows Phone|Opera Mini|IEMobile/i.test(ua);
  const touchOnly =
    window.matchMedia?.("(pointer: coarse)").matches === true &&
    window.matchMedia?.("(any-pointer: fine)").matches === false;
  return (phoneUa || touchOnly) && shortSide < PHONE_SHORT_SIDE_MAX ? "mobile" : "desktop";
}
