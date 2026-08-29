import "dotenv/config";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

/**
 * Grants (or revokes) the `admin` custom claim on a Firebase Auth account.
 *
 * With the server deleted, ADMIN_EMAILS no longer has anywhere to run, so admin
 * is now a custom claim — the only role signal a browser cannot forge.
 * firestore.rules reads it as `request.auth.token.admin == true`.
 *
 * Usage (needs FIREBASE_SERVICE_ACCOUNT_JSON in .env):
 *   node scripts/grant-admin.mjs someone@example.com
 *   node scripts/grant-admin.mjs someone@example.com --revoke
 *
 * The user must sign out and back in (or wait for token refresh) before the
 * claim appears in their ID token.
 */
const email = process.argv[2];
const revoke = process.argv.includes("--revoke");

if (!email) {
  console.error("Usage: node scripts/grant-admin.mjs <email> [--revoke]");
  process.exit(1);
}

const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
if (!raw) {
  console.error(
    "FIREBASE_SERVICE_ACCOUNT_JSON is not set. Add it to .env first."
  );
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({ credential: cert(JSON.parse(raw)) });
}

const auth = getAuth();
const user = await auth.getUserByEmail(email);
const existing = user.customClaims ?? {};

await auth.setCustomUserClaims(user.uid, {
  ...existing,
  admin: revoke ? null : true,
});

console.log(
  `${revoke ? "Revoked" : "Granted"} admin for ${email} (uid ${user.uid}).`,
  "\nThey must sign out and back in for the change to take effect."
);
