import { initializeApp, getApps } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User
} from "firebase/auth";
import { doc, getDoc, getFirestore, setDoc } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import type { AppData } from "../types";

const env = import.meta.env;
const configured = Boolean(
  env.VITE_FIREBASE_API_KEY &&
  env.VITE_FIREBASE_AUTH_DOMAIN &&
  env.VITE_FIREBASE_PROJECT_ID &&
  env.VITE_FIREBASE_APP_ID
);

const firebaseApp = configured
  ? (getApps()[0] || initializeApp({
      apiKey: env.VITE_FIREBASE_API_KEY,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: env.VITE_FIREBASE_APP_ID
    }))
  : null;

export const firebaseConfigured = Boolean(firebaseApp);
export const auth = firebaseApp ? getAuth(firebaseApp) : null;
const db = firebaseApp ? getFirestore(firebaseApp) : null;
const functions = firebaseApp
  ? getFunctions(firebaseApp, env.VITE_FIREBASE_FUNCTIONS_REGION || "us-central1")
  : null;

export function watchAuth(callback: (user: User | null) => void): () => void {
  if (!auth) {
    callback(null);
    return () => undefined;
  }
  return onAuthStateChanged(auth, callback);
}

export async function registerAccount(email: string, password: string): Promise<User> {
  if (!auth) throw new Error("Firebase is not configured. Add your Firebase settings to .env.local.");
  const result = await createUserWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function loginAccount(email: string, password: string): Promise<User> {
  if (!auth) throw new Error("Firebase is not configured. Add your Firebase settings to .env.local.");
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function logoutAccount(): Promise<void> {
  if (auth) await signOut(auth);
}

export async function readCloudData(uid: string): Promise<AppData | null> {
  if (!db) return null;
  const snapshot = await getDoc(doc(db, "users", uid, "private", "appData"));
  return snapshot.exists() ? snapshot.data().payload as AppData : null;
}

export async function writeCloudData(uid: string, data: AppData): Promise<void> {
  if (!db) return;
  await setDoc(doc(db, "users", uid, "private", "appData"), {
    payload: data,
    updatedAt: new Date().toISOString()
  }, { merge: true });
}

export async function requestPersonalInsight(payload: {
  consent: boolean;
  logs: unknown[];
  journalEntries?: unknown[];
}): Promise<string> {
  if (!functions) throw new Error("Configure Firebase Functions to enable private AI guidance.");
  const callable = httpsCallable<typeof payload, { insight: string }>(functions, "generatePersonalInsight");
  const response = await callable(payload);
  return response.data.insight;
}