"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { AppLoadingScreen } from "@/components/AppLoadingScreen";
import { trackEvent } from "@/lib/analytics";
import { detectLayoutMode, type LayoutMode } from "@/lib/deviceSupport";
// Kurulum teklifini sayfa açılır açılmaz yakalamak için erken yüklenir.
import "@/lib/installPrompt";

const LayoutModeContext = createContext<LayoutMode>("desktop");

export function useLayoutMode(): LayoutMode {
  return useContext(LayoutModeContext);
}

/** Cihaz tipi yalnızca istemcide bilinir; statik HTML yükleme ekranıyla gelir. */
export function LayoutModeGate({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<LayoutMode | null>(null);

  useEffect(() => {
    // Yalnızca canlı derlemede: geliştirmede service worker HMR ile çakışır.
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    const detected = detectLayoutMode();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode(detected);
    if (detected === "mobile") trackEvent("mobile_layout_shown");
  }, []);

  if (!mode) return <AppLoadingScreen message="Yükleniyor…" />;
  return <LayoutModeContext.Provider value={mode}>{children}</LayoutModeContext.Provider>;
}
