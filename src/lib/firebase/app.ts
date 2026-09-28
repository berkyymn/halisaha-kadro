import {
  connectAuthEmulator,
  getAuth,
  type Auth,
} from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";
import { getFirebaseApp } from "./client";

/** Yalnızca yerel test: `npm run emulators` + `npm run dev:emulator`. */
export const USE_FIREBASE_EMULATORS =
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true";

let auth: Auth | null = null;
let db: Firestore | null = null;

export function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
    if (USE_FIREBASE_EMULATORS) {
      connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    }
  }
  return auth;
}

export function getFirebaseDb(): Firestore {
  if (!db) {
    const app = getFirebaseApp();
    try {
      db = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      });
    } catch {
      // Hot reload veya ikinci init denemesinde mevcut instance'ı kullan
      db = getFirestore(app);
    }
    if (USE_FIREBASE_EMULATORS) {
      connectFirestoreEmulator(db, "127.0.0.1", 8080);
    }
  }
  return db;
}
