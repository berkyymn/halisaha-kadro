"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAppStore } from "@/store/useAppStore";
import { LEGACY_LOCAL_STORAGE_KEY } from "@/lib/indexedDBStorage";

type PersistedStore = typeof useAppStore & {
  persist?: {
    rehydrate?: () => Promise<void>;
  };
};

function rehydrateStore() {
  const store = useAppStore as unknown as PersistedStore;
  if (typeof store.persist?.rehydrate === "function") {
    void store.persist.rehydrate();
  }
}

export function useGuestTabSync() {
  const { user } = useAuth();

  useEffect(() => {
    if (typeof window === "undefined" || user) return;

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== LEGACY_LOCAL_STORAGE_KEY) return;
      // Diğer sekme localStorage yedeğini güncellediğinde IndexedDB’den
      // en güncel veriyi yeniden yükle.
      rehydrateStore();
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [user]);
}
