import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { reportError } from "@/lib/errorReporting";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function isFirebaseConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId &&
      firebaseConfig.appId
  );
}

let app: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured()) {
    throw new Error(
      "Firebase yapılandırması eksik. .env.local dosyasına Firebase anahtarlarını ekleyin."
    );
  }
  if (!app) {
    const existing = getApps()[0];
    app = existing ?? initializeApp(firebaseConfig);
    if (!existing) startAppCheck(app);
  }
  return app;
}

/**
 * Firebase App Check: Firestore/Storage isteklerinin yalnızca bu uygulamadan
 * gelmesini sağlar (kotayı dışarıdan tüketmeyi engeller). Site anahtarı yoksa
 * ya da emülatörde çalışıyorsa kapalıdır. Zorunlu kılma (enforcement) Firebase
 * konsolundan açılır; ayrıntı: docs/LAUNCH-PLAN.md "App Check".
 */
function startAppCheck(firebaseApp: FirebaseApp): void {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  if (typeof window === "undefined" || !siteKey) return;
  if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true") return;

  if (process.env.NODE_ENV !== "production") {
    // localhost reCAPTCHA'dan geçemez: konsola basılan debug token'ı
    // Firebase konsolunda App Check → Uygulamalar → Debug token'lara ekle.
    (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string | boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN =
      process.env.NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN || true;
  }

  try {
    initializeAppCheck(firebaseApp, {
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (error) {
    reportError(error, "auth", { level: "warning", extra: { op: "app-check" } });
  }
}
