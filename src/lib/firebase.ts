import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
  memoryLocalCache,
  getFirestore,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const isNew = getApps().length === 0;
const app = isNew ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);

// Choose Firestore cache settings by probing the environment BEFORE calling
// initializeFirestore. This avoids the double-init problem (initializeFirestore
// can only be called once per app; a second call always throws).
//
// - persistentLocalCache + persistentSingleTabManager: works on all browsers
//   that support IndexedDB, including iOS Safari 15+ and Android Chrome.
//   Single-tab is used instead of multi-tab because multi-tab relies on
//   BroadcastChannel, which can fail under storage pressure or private mode.
//
// - memoryLocalCache: fallback for private browsing and very old browsers
//   where indexedDB is unavailable. Data still loads from the server on each
//   visit; it just isn't cached offline.
//
// NOTE: experimentalForceLongPolling is intentionally NOT set here. It is
// incompatible with persistentLocalCache in Firebase SDK v10+ and will throw
// on initialization. The ERR_QUIC_PROTOCOL_ERROR you see in the console is a
// transient probe failure — the Firebase SDK automatically falls back to TCP
// without any help from us.
function buildFirestoreSettings() {
  const hasIndexedDB =
    typeof window !== "undefined" && typeof indexedDB !== "undefined";

  if (hasIndexedDB) {
    return {
      localCache: persistentLocalCache({
        tabManager: persistentSingleTabManager({}),
      }),
    };
  }

  console.warn("[Firebase] IndexedDB unavailable — using in-memory cache");
  return { localCache: memoryLocalCache() };
}

export const db = isNew
  ? initializeFirestore(app, buildFirestoreSettings())
  : getFirestore(app);

export const storage = getStorage(app);
export default app;
