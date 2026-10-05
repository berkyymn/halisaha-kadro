/**
 * Mobil tam ekran. Android tarayıcıları destekler; iPhone Safari sayfa için
 * tam ekranı desteklemez (canFullscreen false döner).
 */
export function canFullscreen(): boolean {
  return typeof document !== "undefined" && typeof document.documentElement.requestFullscreen === "function";
}

export function isFullscreen(): boolean {
  return typeof document !== "undefined" && Boolean(document.fullscreenElement);
}

/** Tam ekran: yalnızca adres çubuğunu gizler; ekran telefonun tutuluşuna göre döner. */
export async function enterFullscreen(): Promise<void> {
  try {
    await document.documentElement.requestFullscreen({ navigationUI: "hide" });
  } catch {
    // izin verilmedi / desteklenmiyor
  }
}

export async function exitFullscreen(): Promise<void> {
  if (!document.fullscreenElement) return;
  try {
    await document.exitFullscreen();
  } catch {
    // yok say
  }
}

/**
 * Android indirme, paylaşım ve dosya seçici sayfayı tam ekrandan çıkarır.
 * Bunları başlatmadan önce çağrılır: hemen ardından gelen çıkış "beklenen"
 * sayılır ve mobil sahne ilk dokunuşta tam ekrana geri döner.
 */
let lastInterruptionAt = 0;

export function noteFullscreenInterruption(): void {
  if (isFullscreen()) lastInterruptionAt = Date.now();
}

export function wasFullscreenInterrupted(withinMs = 4000): boolean {
  return lastInterruptionAt > 0 && Date.now() - lastInterruptionAt < withinMs;
}

/** Ana ekrana eklenmiş uygulama olarak mı açıldı (adres çubuğu yok, tam ekran gereksiz). */
export function isStandaloneApp(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(display-mode: standalone)").matches === true;
}
