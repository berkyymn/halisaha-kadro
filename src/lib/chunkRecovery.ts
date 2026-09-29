/**
 * Yeni sürüm yayınlandığında açık kalmış bir sekme, artık sunucuda olmayan
 * eski bir JS parçasını isteyebilir (ChunkLoadError). Kullanıcıya donmuş ekran
 * göstermek yerine sayfa bir kez yenilenir ve güncel sürüm yüklenir.
 * Döngüye girmemek için bir dakika içinde en fazla bir kez yenilenir.
 */

const RELOAD_KEY = "halisaha-chunk-reload-at";
const RELOAD_GUARD_MS = 60_000;

const CHUNK_ERROR_PATTERN =
  /ChunkLoadError|Loading chunk [\w-]+ failed|Failed to load chunk|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i;

export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  if (typeof error === "string") return CHUNK_ERROR_PATTERN.test(error);
  if (typeof error !== "object") return false;
  const { name, message } = error as { name?: unknown; message?: unknown };
  return (
    name === "ChunkLoadError" ||
    (typeof message === "string" && CHUNK_ERROR_PATTERN.test(message))
  );
}

/** Son bir dakikada yenilenmediyse sayfayı yeniler. Yeniledi mi döner. */
export function reloadOnceForChunkError(now = Date.now()): boolean {
  if (typeof window === "undefined") return false;
  try {
    const last = Number(window.sessionStorage.getItem(RELOAD_KEY) ?? 0);
    if (now - last < RELOAD_GUARD_MS) return false;
    window.sessionStorage.setItem(RELOAD_KEY, String(now));
  } catch {
    // sessionStorage kapalıysa da bir kez denemeye değer.
  }
  window.location.reload();
  return true;
}

let installed = false;

export function installChunkRecovery(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;
  window.addEventListener("error", (event) => {
    if (isChunkLoadError(event.error ?? event.message)) reloadOnceForChunkError();
  });
  window.addEventListener("unhandledrejection", (event) => {
    if (isChunkLoadError(event.reason)) reloadOnceForChunkError();
  });
}
