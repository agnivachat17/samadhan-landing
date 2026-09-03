/**
 * USP-10: Confidential & Safety-Aware Reporting — rules verification
 *
 * Uses Firebase Admin SDK to create test documents (bypassing rules),
 * then reads them anonymously via REST API to verify the rules block
 * confidential reads.
 *
 * Requires FIREBASE_SERVICE_ACCOUNT_JSON in .env
 */
import "dotenv/config";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const projectId = "samadhan-sih";
const apiKey = "AIzaSyCE4YPRVW7fsmBUwO8JpPHbkVzrXEL7xg4";
const restBase = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

async function anonRead(docPath) {
  const r = await fetch(`${restBase}/${docPath}?key=${apiKey}`);
  return { status: r.status };
}

let passed = 0;
let failed = 0;
function ok(cond, msg) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); }
  else { failed++; console.error(`  ✗ ${msg}`); }
}

async function main() {
  console.log("USP-10: Confidential & Safety-Aware Reporting — Rules Verification\n");

  // Init Admin SDK
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) { console.error("FIREBASE_SERVICE_ACCOUNT_JSON not set"); process.exit(1); }
  if (!getApps().length) initializeApp({ credential: cert(JSON.parse(raw)) });
  const db = getFirestore();
  const auth = getAuth();

  // Get admin user's UID to set citizenEmail on test records
  const adminUser = await auth.getUserByEmail("agnivachat17@gmail.com");
  const adminUid = adminUser.uid;
  console.log("Admin UID:", adminUid);

  const now = new Date();
  const testIds = [];

  // Create 3 test challenges via Admin SDK (bypasses rules)
  const tiers = ["confidential", "restricted", "public"];
  for (const tier of tiers) {
    const id = `usp10-test-${tier}-${Date.now()}`;
    await db.collection("challenges").doc(id).set({
      citizenName: `Test ${tier}`,
      citizenEmail: `${tier}-test@test.com`,
      title: `USP-10 Test: ${tier}`,
      description: `Test challenge for visibilityTier=${tier}`,
      domain: "Water",
      district: "Ranchi",
      status: "submitted",
      priority: "medium",
      visibilityTier: tier,
      createdAt: now,
      updatedAt: now,
    });
    testIds.push(id);
    console.log(`Created: ${id} (visibilityTier=${tier})`);
  }

  // Admin reads all three via Admin SDK (bypasses rules)
  console.log("\n--- Admin reads (via Admin SDK) ---");
  for (let i = 0; i < testIds.length; i++) {
    const snap = await db.collection("challenges").doc(testIds[i]).get();
    ok(snap.exists, `Admin can read ${tiers[i]} challenge (exists=${snap.exists})`);
  }

  // Anonymous reads via REST API
  console.log("\n--- Anonymous reads (via REST API) ---");
  const expected = { confidential: 403, restricted: 200, public: 200 };
  for (let i = 0; i < testIds.length; i++) {
    const tier = tiers[i];
    const id = testIds[i];
    const { status } = await anonRead(`challenges/${id}`);
    const exp = expected[tier];
    const label =
      tier === "confidential"
        ? `Anonymous CANNOT read ${tier} (got ${status}, expected ${exp})`
        : `Anonymous CAN read ${tier} (got ${status}, expected ${exp})`;
    ok(status === exp, label);
  }

  // Cleanup
  console.log("\n--- Cleanup ---");
  for (const id of testIds) {
    await db.collection("challenges").doc(id).delete();
  }
  console.log("Cleaned up test documents.\n");

  console.log(`Results: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

main().catch(e => { console.error(e); process.exit(1); });
