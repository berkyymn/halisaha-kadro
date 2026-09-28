export type AnalyticsEventParams = Record<string, string | number | boolean>;

export const ANALYTICS_CONSENT_KEY = "halisaha-analytics-consent";
export type AnalyticsConsent = "granted" | "denied";

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID?.trim() || "";

type GtagWindow = Window & {
  gtag?: (...args: unknown[]) => void;
  dataLayer?: unknown[];
};

export function readAnalyticsConsent(): AnalyticsConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(ANALYTICS_CONSENT_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

function loadGtagScript() {
  if (!GA_ID || typeof document === "undefined") return;
  if (document.querySelector('script[data-gtag-loader="true"]')) return;
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  script.dataset.gtagLoader = "true";
  document.head.appendChild(script);
}

/** KVKK: GA yalnızca açık rıza sonrası yüklenir ve ölçüm yapar. */
export function setAnalyticsConsent(consent: AnalyticsConsent) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ANALYTICS_CONSENT_KEY, consent);
  } catch {
    // Tercih kaydedilemese de oturum boyunca uygulanır.
  }
  const w = window as GtagWindow;
  w.gtag?.("consent", "update", {
    analytics_storage: consent,
  });
  if (consent === "granted") loadGtagScript();
}

export function clearAnalyticsConsent() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(ANALYTICS_CONSENT_KEY);
  } catch {
    // ignore
  }
}

export function trackEvent(
  eventName: string,
  params: AnalyticsEventParams = {}
) {
  if (typeof window === "undefined") return;
  if (readAnalyticsConsent() !== "granted") return;
  const gtag = (window as GtagWindow).gtag;
  if (typeof gtag !== "function") return;

  try {
    gtag("event", eventName, params);
  } catch {
    // Analytics failures should never break the app.
  }
}
