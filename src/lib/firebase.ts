import { initializeApp, getApps } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User
} from "firebase/auth";
import { doc, getDoc, getFirestore, setDoc } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import type { AppData } from "../types";

const env = import.meta.env;

// Firebase Web configuration identifies the project; it is not an authorization secret.
// Protect user data with Firebase Authentication, Firestore Security Rules and App Check.
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyCzedzahHLNM8NcJbf3VDosf_2XhGzMoQE",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "project-01-5a1fa.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "project-01-5a1fa",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "project-01-5a1fa.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "151105826761",
  appId: env.VITE_FIREBASE_APP_ID || "1:151105826761:web:911cbf645ddfdb163dc218",
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || "G-SMS7968FQD"
};

const configured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
);

const firebaseApp = configured
  ? (getApps().find((app) => app.name === "[DEFAULT]") || initializeApp(firebaseConfig))
  : null;

export const firebaseConfigured = Boolean(firebaseApp);
export const firebaseProjectId = firebaseApp ? firebaseConfig.projectId : null;
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
  if (!auth) throw new Error("Firebase is not configured.");
  const result = await createUserWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function loginAccount(email: string, password: string): Promise<User> {
  if (!auth) throw new Error("Firebase is not configured.");
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