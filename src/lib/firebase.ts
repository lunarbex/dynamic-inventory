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

function initDb() {
  if (!isNew) return getFirestore(app);

  // experimentalForceLongPolling bypasses gRPC-Web / QUIC which is blocked on
  // many mobile cellular networks (ERR_QUIC_PROTOCOL_ERROR). Long-polling uses
  // plain HTTP/1.1 which works everywhere.
  //
  // persistentSingleTabManager is used instead of persistentMultipleTabManager
  // because multi-tab syncing relies on BroadcastChannel / SharedWorker which
  // can fail in iOS Safari private mode or under storage pressure.
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentSingleTabManager({ forceOwnership: true }),
      }),
      experimentalForceLongPolling: true,
    });
  } catch (err) {
    // Persistence unavailable (private browsing, storage quota exceeded, etc.)
    // Fall back to in-memory cache — data still loads from server, just not cached.
    console.warn("[Firebase] Persistence failed, falling back to memory cache:", err);
    try {
      return initializeFirestore(app, {
        localCache: memoryLocalCache(),
        experimentalForceLongPolling: true,
      });
    } catch (err2) {
      console.warn("[Firebase] Memory cache also failed, using default Firestore:", err2);
      return getFirestore(app);
    }
  }
}

export const db = initDb();
export const storage = getStorage(app);
export default app;
