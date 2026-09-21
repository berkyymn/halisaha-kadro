export type AnalyticsEventParams = Record<string, string | number | boolean>;

export function trackEvent(
  eventName: string,
  params: AnalyticsEventParams = {}
) {
  if (typeof window === "undefined") return;
  const gtag = (window as any).gtag;
  if (typeof gtag !== "function") return;

  try {
    gtag("event", eventName, params);
  } catch {
    // Analytics failures should never break the app.
  }
}
