import {
  getAuth,
  type Auth,
} from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";
import { getFirebaseApp } from "./client";

let auth: Auth | null = null;
let db: Firestore | null = null;

export function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
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
  }
  return db;
}
