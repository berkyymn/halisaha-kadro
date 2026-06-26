"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AppLoadingScreen } from "@/components/AppLoadingScreen";
import { useAuth } from "@/contexts/AuthContext";
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

  if (!appReady) {
    return <AppLoadingScreen />;
  }

  return <div className="h-full app-fade-in">{children}</div>;
}
