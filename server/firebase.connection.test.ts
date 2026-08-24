import { describe, expect, it } from "vitest";
import { importPKCS8, SignJWT } from "jose";

type FirebaseServiceAccount = {
  client_email: string;
  private_key: string;
  project_id: string;
};

function normalizePrivateKey(value: string) {
  return value
    .replace(/-----BEGIN\s*PRIVATE\s*KEY-----/, "-----BEGIN PRIVATE KEY-----")
    .replace(/-----END\s*PRIVATE\s*KEY-----/, "-----END PRIVATE KEY-----");
}

async function createGoogleAccessToken(serviceAccount: FirebaseServiceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const privateKey = await importPKCS8(normalizePrivateKey(serviceAccount.private_key), "RS256");
  const assertion = await new SignJWT({
    scope: "https://www.googleapis.com/auth/cloud-platform",
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(serviceAccount.client_email)
    .setSubject(serviceAccount.client_email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(now)
    .setExpirationTime(now + 300)
    .sign(privateKey);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!response.ok) throw new Error(`Firebase service-account token request failed with HTTP ${response.status}.`);
  const token = await response.json() as { access_token?: string };
  if (!token.access_token) throw new Error("Firebase service-account token response did not include an access token.");
  return token.access_token;
}

describe("Firebase service account", () => {
  it("can access the configured Firestore database from the server", async () => {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    expect(raw, "FIREBASE_SERVICE_ACCOUNT_JSON must be configured").toBeTruthy();
    const serviceAccount = JSON.parse(raw!) as FirebaseServiceAccount;
    expect(serviceAccount.project_id).toBe("samadhan-sih");
    expect(serviceAccount.client_email).toContain("@samadhan-sih.iam.gserviceaccount.com");
    expect(normalizePrivateKey(serviceAccount.private_key)).toContain("BEGIN PRIVATE KEY");

    const token = await createGoogleAccessToken(serviceAccount);
    const response = await fetch(`https://firestore.googleapis.com/v1/projects/${serviceAccount.project_id}/databases/(default)`, {
      headers: { authorization: `Bearer ${token}` },
    });
    const responseBody = await response.text();
    expect(response.status, responseBody).toBe(200);
  }, 30_000);
});
