"use client";

import type { StateStorage } from "zustand/middleware";

const DB_NAME = "halisaha-kadro-db";
const DB_VERSION = 1;
const STORE_NAME = "persist";
export const LEGACY_LOCAL_STORAGE_KEY = "halisaha-kadro";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      reject(new Error("IndexedDB kullanılamıyor"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB açılamadı"));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
  });
}

async function idbRequest<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const req = operation(store);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB işlemi başarısız"));
    req.onsuccess = () => resolve(req.result);
  });
}

async function idbGet(key: string): Promise<string | undefined> {
  const result = await idbRequest("readonly", (store) => store.get(key));
  if (result && typeof (result as { value?: unknown }).value === "string") {
    return (result as { value: string }).value;
  }
  return undefined;
}

async function idbSet(key: string, value: string): Promise<void> {
  await idbRequest("readwrite", (store) => store.put({ key, value }));
}

async function idbRemove(key: string): Promise<void> {
  await idbRequest("readwrite", (store) => store.delete(key));
}

function getLocalStorageItem(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function setLocalStorageItem(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore quota errors
  }
}

function removeLocalStorageItem(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

const fallbackStorage: StateStorage = {
  getItem: async (name) => getLocalStorageItem(name),
  setItem: async (name, value) => setLocalStorageItem(name, value),
  removeItem: async (name) => removeLocalStorageItem(name),
};

async function migrateLegacyLocalStorage(key: string): Promise<string | null> {
  const legacy = getLocalStorageItem(LEGACY_LOCAL_STORAGE_KEY);
  if (!legacy) return null;
  try {
    await idbSet(key, legacy);
    removeLocalStorageItem(LEGACY_LOCAL_STORAGE_KEY);
  } catch {
    // IDB yazamazsan localStorage’daki veriyi en azından koruyup döndür
  }
  return legacy;
}

export const indexedDBStorage: StateStorage = {
  getItem: async (name) => {
    try {
      const value = await idbGet(name);
      if (value !== undefined) return value;
      const migrated = await migrateLegacyLocalStorage(name);
      return migrated;
    } catch {
      return fallbackStorage.getItem(name);
    }
  },
  setItem: async (name, value) => {
    try {
      await idbSet(name, value);
      // IndexedDB birincil kaynak; localStorage’ı sessiz yedek olarak tut.
      // Kotası dolarsa uygulama çalışmaya devam etsin.
      try {
        window.localStorage.setItem(name, value);
      } catch {
        // ignore localStorage quota errors
      }
    } catch {
      fallbackStorage.setItem(name, value);
    }
  },
  removeItem: async (name) => {
    try {
      await idbRemove(name);
    } catch {
      // ignore
    }
    removeLocalStorageItem(LEGACY_LOCAL_STORAGE_KEY);
    removeLocalStorageItem(name);
  },
};

export async function clearIndexedDBStorage(): Promise<void> {
  try {
    await idbRemove(LEGACY_LOCAL_STORAGE_KEY);
  } catch {
    // ignore
  }
  removeLocalStorageItem(LEGACY_LOCAL_STORAGE_KEY);
}
