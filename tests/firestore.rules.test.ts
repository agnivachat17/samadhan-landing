import { describe, expect, it } from "vitest";

/**
 * Verifies the browser-facing Firestore boundary against the real project.
 *
 * This is the safety net for `firestore.rules`. With the server deleted, those
 * rules are the only access control left, so the important cases are checked
 * here directly over the REST API as an *unauthenticated* caller — which means
 * this test needs no service-account credentials to run.
 *
 * It cannot cover signed-in behaviour (admin claims, per-owner writes); that
 * still needs manual checking or the Firebase emulator.
 */
const projectId = "samadhan-sih";
const apiKey = "AIzaSyCE4YPRVW7fsmBUwO8JpPHbkVzrXEL7xg4";
const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

async function anonymousRead(collection: string) {
  const response = await fetch(
    `${baseUrl}/${collection}?key=${apiKey}&pageSize=1`
  );
  return response.status;
}

async function anonymousWrite(collection: string) {
  const response = await fetch(`${baseUrl}/${collection}?key=${apiKey}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      fields: { source: { stringValue: "rules-boundary-test" } },
    }),
  });
  return response.status;
}

describe("Firestore rules: public read surface", () => {
  it.each(["challenges", "organizations", "projects"])(
    "allows anonymous reads of %s",
    async collection => {
      expect(await anonymousRead(collection)).toBe(200);
    },
    30_000
  );
});

describe("Firestore rules: private read surface", () => {
  it.each(["notifications", "challengeSupports", "users"])(
    "denies anonymous reads of %s",
    async collection => {
      expect(await anonymousRead(collection)).toBe(403);
    },
    30_000
  );
});

describe("Firestore rules: write surface", () => {
  it.each([
    "challenges",
    "organizations",
    "projects",
    "notifications",
    "users",
  ])(
    "denies anonymous writes to %s",
    async collection => {
      expect(await anonymousWrite(collection)).toBe(403);
    },
    30_000
  );
});
