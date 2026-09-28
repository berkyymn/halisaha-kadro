import * as Sentry from "@sentry/react";
import { SITE_URL } from "@/lib/siteUrl";

/**
 * Hata takibi (Sentry, EU bölgesi). Uygulama Sentry'ye doğrudan bağlı değildir;
 * yalnızca bu modül üzerinden raporlar.
 * - Yalnızca hatalar: performans izleme ve oturum kaydı kapalı (ücretsiz kota).
 * - Kişisel veri yok: IP/çerez gönderilmez; kullanıcı yalnızca anonim uid ile.
 * - localhost'tan gönderim yapılmaz.
 */
const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() || "";

let initialized = false;

export type ErrorArea =
  | "cloud-load"
  | "cloud-save"
  | "cloud-conflict"
  | "cloud-media"
  | "local-storage"
  | "export"
  | "photo"
  | "background-removal"
  | "logo"
  | "auth"
  | "account-delete"
  | "render";

function environmentFor(hostname: string): string {
  const siteHost = new URL(SITE_URL).hostname;
  if (hostname === siteHost || hostname.endsWith(".web.app") || hostname.endsWith(".firebaseapp.com")) {
    return "production";
  }
  return "preview";
}

export function initErrorReporting(): void {
  if (initialized || !DSN || typeof window === "undefined") return;
  const { hostname } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") return;

  Sentry.init({
    dsn: DSN,
    release: process.env.NEXT_PUBLIC_RELEASE || undefined,
    environment: environmentFor(hostname),
    sendDefaultPii: false,
    tracesSampleRate: 0,
    ignoreErrors: [
      // Tarayıcı kaynaklı, zararsız
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",
      // Kullanıcı Google penceresini kapattı vb.
      "auth/popup-closed-by-user",
      "auth/cancelled-popup-request",
    ],
    beforeBreadcrumb(breadcrumb) {
      // Konsol kayıtları oyuncu adı/fotoğraf verisi içerebilir; gönderme.
      if (breadcrumb.category === "console") return null;
      return breadcrumb;
    },
  });
  initialized = true;
}

export function reportError(
  error: unknown,
  area: ErrorArea,
  options: { level?: "error" | "warning"; extra?: Record<string, unknown> } = {}
): void {
  if (!initialized) return;
  Sentry.withScope((scope) => {
    scope.setTag("area", area);
    scope.setLevel(options.level ?? "error");
    if (options.extra) scope.setContext("details", options.extra);
    Sentry.captureException(error instanceof Error ? error : new Error(String(error)));
  });
}

/** Aynı kullanıcının hatalarını gruplamak için yalnızca anonim uid (e-posta yok). */
export function setErrorReportingUser(uid: string | null): void {
  if (!initialized) return;
  Sentry.setUser(uid ? { id: uid } : null);
}

export const ErrorBoundary = Sentry.ErrorBoundary;
