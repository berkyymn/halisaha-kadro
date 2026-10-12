/**
 * "Ana ekrana ekle" (PWA kurulumu). Android Chrome/Brave/Samsung tarayıcı
 * sayfa yüklenirken `beforeinstallprompt` gönderir; erken yakalanıp saklanır,
 * kullanıcı menüden istediğinde gösterilir. Kurulan uygulama adres çubuğu
 * olmadan açılır: tam ekran gerekmez, indirme/dosya seçici bozmaz.
 * iPhone bu olayı göndermez (tam ekran da yok): orada kullanıcıya Paylaş →
 * "Ana Ekrana Ekle" adımları gösterilir (`installMode() === "ios"`).
 */
import { isIosDevice } from "@/lib/deviceSupport";

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
  return installMode() !== null;
}

/** "prompt": tarayıcının kurulum penceresi; "ios": elle adımlar; null: kurulamaz. */
export function installMode(): "prompt" | "ios" | null {
  if (deferred) return "prompt";
  return isIosDevice() ? "ios" : null;
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
