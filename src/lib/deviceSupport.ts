/**
 * Web sürümü yalnızca masaüstünde destekleniyor (sürükle-bırak, dosya ve
 * poster düzeni fare + geniş ekran varsayıyor). Telefon ve tabletler
 * mobil uygulama yayınlanana kadar bilgilendirme ekranı görür.
 */
export function isUnsupportedMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/Android|iPhone|iPad|iPod|Mobile|Windows Phone|Opera Mini|IEMobile/i.test(ua)) {
    return true;
  }
  // iPadOS 13+ kendini masaüstü Safari olarak tanıtır.
  if (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return true;
  // Fare/touchpad olmayan, yalnızca dokunmatik cihazlar.
  return (
    window.matchMedia?.("(pointer: coarse)").matches === true &&
    window.matchMedia?.("(any-pointer: fine)").matches === false
  );
}
