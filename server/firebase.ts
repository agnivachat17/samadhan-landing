import { cert, getApps, initializeApp, type ServiceAccount } from "firebase-admin/app";
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

export function getFirebaseFirestore() {
  if (!getApps().length) initializeApp({ credential: cert(getServiceAccount() as ServiceAccount) });
  return getFirestore();
}
