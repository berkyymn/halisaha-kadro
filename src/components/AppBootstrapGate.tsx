"use client";

import { useEffect, useState, useRef, type ReactNode } from "react";
import { AppLoadingScreen } from "@/components/AppLoadingScreen";
import { useAuth } from "@/contexts/AuthContext";
import { compressAllSavedPlayers } from "@/lib/imageCompress";
import {
  hasAppStoreHydrated,
  onAppStoreHydrated,
} from "@/store/useAppStore";

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

  const appReady = storeReady && !authLoading && !cloudLoading;
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
