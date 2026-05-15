import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const requiredFirebaseConfig = {
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId,
};

export const isFirebaseConfigured = Object.values(requiredFirebaseConfig).every(Boolean);

export function assertFirebaseConfigured() {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase is not configured. Add EXPO_PUBLIC_FIREBASE_* values before using live data.");
  }
}

const safeFirebaseConfig = {
  apiKey: firebaseConfig.apiKey ?? "missing-api-key",
  authDomain: firebaseConfig.authDomain ?? "missing-auth-domain.firebaseapp.com",
  projectId: firebaseConfig.projectId ?? "missing-project-id",
  storageBucket: firebaseConfig.storageBucket ?? "missing-storage-bucket.appspot.com",
  messagingSenderId: firebaseConfig.messagingSenderId ?? "000000000000",
  appId: firebaseConfig.appId ?? "1:000000000000:web:missing-app-id",
  measurementId: firebaseConfig.measurementId,
};

export const firebaseApp = getApps().length ? getApps()[0] : initializeApp(safeFirebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);
export const functions = getFunctions(firebaseApp);

export async function initAnalytics() {
  if (typeof window === "undefined" || !firebaseConfig.measurementId) {
    return null;
  }

  const { getAnalytics, isSupported } = await import("firebase/analytics");
  return (await isSupported()) ? getAnalytics(firebaseApp) : null;
}
