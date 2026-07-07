"use client";

import { useEffect, useState, useRef, type ReactNode } from "react";
import { AppLoadingScreen } from "@/components/AppLoadingScreen";
import { useAuth } from "@/contexts/AuthContext";
import { compressAllSavedPlayers } from "@/lib/imageCompress";
import {
  hasAppStoreHydrated,
  onAppStoreHydrated,
  useAppStore,
} from "@/store/useAppStore";

type AppBootstrapGateProps = {
  children: ReactNode;
};

export function AppBootstrapGate({ children }: AppBootstrapGateProps) {
  const { loading: authLoading } = useAuth();
  const remoteHydrating = useAppStore((s) => s.remoteHydrating);
  const [storeReady, setStoreReady] = useState(() => hasAppStoreHydrated());

  useEffect(() => {
    if (storeReady) return;
    return onAppStoreHydrated(() => {
      setStoreReady(true);
    });
  }, [storeReady]);

  const appReady = storeReady && !authLoading && !remoteHydrating;
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
