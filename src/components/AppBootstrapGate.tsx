"use client";

import { useEffect, useState, useRef, type ReactNode } from "react";
import { AppLoadingScreen } from "@/components/AppLoadingScreen";
import { useAuth } from "@/contexts/AuthContext";
import { compressAllSavedPlayers } from "@/lib/imageCompress";
import {
  hasAppStoreHydrated,
  onAppStoreHydrated,
} from "@/store/useAppStore";

/** Oturum kontrolü için en fazla bekleme (sonra yerel kadroyla açılır). */
const AUTH_WAIT_MS = 4000;

type AppBootstrapGateProps = {
  children: ReactNode;
};

export function AppBootstrapGate({ children }: AppBootstrapGateProps) {
  const { loading: authLoading, sync } = useAuth();
  // İlk bulut yüklemesi bitene kadar bekle; ağ hatasında yerel kadroyla aç.
  const cloudLoading = sync.phase === "loading" && !sync.error;
  const [storeReady, setStoreReady] = useState(() => hasAppStoreHydrated());

  useEffect(() => {
    if (storeReady) return;
    return onAppStoreHydrated(() => {
      setStoreReady(true);
    });
  }, [storeReady]);

  // iPhone Safari'de askıya alınmış başka bir sekme Firebase'in oturum deposunu
  // kilitli tutabiliyor; oturum kontrolü hiç bitmeyince uygulama yükleme
  // ekranında kalıyordu. Belli bir süreden sonra yerel kadroyla açılır; oturum
  // sonradan gelirse senkron her zamanki gibi başlar.
  const [authTimedOut, setAuthTimedOut] = useState(false);
  useEffect(() => {
    if (!authLoading) return;
    const timer = window.setTimeout(() => setAuthTimedOut(true), AUTH_WAIT_MS);
    return () => window.clearTimeout(timer);
  }, [authLoading]);

  const appReady = storeReady && (!authLoading || authTimedOut) && !cloudLoading;
  const migrationTriggeredRef = useRef(false);

  useEffect(() => {
    if (!appReady || migrationTriggeredRef.current) return;
    migrationTriggeredRef.current = true;

    const runMigration = () => {
      if (typeof window !== "undefined" && "requestIdleCallback" in window) {
        window.requestIdleCallback(() => {
          void compressAllSavedPlayers();
        });
      } else {
        setTimeout(() => {
          void compressAllSavedPlayers();
        }, 1000);
      }
    };

    runMigration();
  }, [appReady]);

  if (!appReady) {
    return <AppLoadingScreen />;
  }

  return <div className="h-full app-fade-in">{children}</div>;
}
