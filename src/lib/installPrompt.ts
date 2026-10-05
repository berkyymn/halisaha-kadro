/**
 * "Ana ekrana ekle" (PWA kurulumu). Android Chrome/Brave/Samsung tarayıcı
 * sayfa yüklenirken `beforeinstallprompt` gönderir; erken yakalanıp saklanır,
 * kullanıcı menüden istediğinde gösterilir. Kurulan uygulama adres çubuğu
 * olmadan açılır: tam ekran gerekmez, indirme/dosya seçici bozmaz.
 */
type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    listeners.forEach((l) => l());
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    listeners.forEach((l) => l());
  });
}

export function canInstallApp(): boolean {
  return deferred !== null;
}

export function onInstallAvailabilityChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function promptInstallApp(): Promise<boolean> {
  if (!deferred) return false;
  const event = deferred;
  deferred = null;
  listeners.forEach((l) => l());
  await event.prompt();
  const { outcome } = await event.userChoice;
  return outcome === "accepted";
}
