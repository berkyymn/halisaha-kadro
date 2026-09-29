import {
  connectStorageEmulator,
  deleteObject,
  getDownloadURL,
  getStorage,
  ref,
  uploadString,
} from "firebase/storage";
import { getFirebaseApp } from "@/lib/firebase/client";
import { USE_FIREBASE_EMULATORS } from "@/lib/firebase/app";

let storage: ReturnType<typeof getStorage> | null = null;

export function isFirebaseStorageConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
}

export function getFirebaseStorage() {
  if (!storage) {
    storage = getStorage(getFirebaseApp());
    if (USE_FIREBASE_EMULATORS) {
      connectStorageEmulator(storage, "127.0.0.1", 9199);
    }
  }
  return storage;
}

export async function uploadDataUrlToStorage(
  path: string,
  dataUrl: string
): Promise<string> {
  const storageRef = ref(getFirebaseStorage(), path);
  await uploadString(storageRef, dataUrl, "data_url");
  return path;
}

export async function resolveStorageDownloadUrl(path: string): Promise<string> {
  return getDownloadURL(ref(getFirebaseStorage(), path));
}

export async function deleteStorageObject(path: string): Promise<void> {
  await deleteObject(ref(getFirebaseStorage(), path));
}

export function playerCutoutStoragePath(
  userId: string,
  playerId: string
): string {
  return `users/${userId}/players/${playerId}/cutout.webp`;
}

export function playerSourceStoragePath(
  userId: string,
  playerId: string
): string {
  return `users/${userId}/players/${playerId}/source.jpg`;
}

export function teamLogoStoragePath(
  userId: string,
  side: "home" | "away"
): string {
  return `users/${userId}/logos/${side}.webp`;
}
