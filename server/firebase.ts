import { cert, getApps, initializeApp, type ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

type FirebaseServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

function normalizePrivateKey(value: string) {
  return value
    .replace(/-----BEGIN\s*PRIVATE\s*KEY-----/, "-----BEGIN PRIVATE KEY-----")
    .replace(/-----END\s*PRIVATE\s*KEY-----/, "-----END PRIVATE KEY-----");
}

function getServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("Firebase server credentials are not configured.");
  const serviceAccount = JSON.parse(raw) as FirebaseServiceAccount;
  return { ...serviceAccount, private_key: normalizePrivateKey(serviceAccount.private_key) };
}

function ensureFirebaseApp() {
  if (!getApps().length) initializeApp({ credential: cert(getServiceAccount() as ServiceAccount) });
}

export function getFirebaseFirestore() {
  ensureFirebaseApp();
  return getFirestore();
}

export function getFirebaseAuth() {
  ensureFirebaseApp();
  return getAuth();
}

export async function verifyFirebaseIdToken(idToken: string) {
  return getFirebaseAuth().verifyIdToken(idToken);
}
