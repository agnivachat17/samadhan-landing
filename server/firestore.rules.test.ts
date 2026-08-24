import { afterEach, describe, expect, it } from "vitest";
import { getFirebaseFirestore } from "./firebase";

const projectId = "samadhan-sih";
const apiKey = "AIzaSyCE4YPRVW7fsmBUwO8JpPHbkVzrXEL7xg4";
const documentId = `browser-boundary-${Date.now()}`;

afterEach(async () => {
  await getFirebaseFirestore().collection("ruleBoundaryChecks").doc(documentId).delete();
});

describe("Firestore browser access boundary", () => {
  it("denies unauthenticated direct REST reads and writes", async () => {
    const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
    const read = await fetch(`${baseUrl}/organizations?key=${apiKey}`);
    expect(read.status).toBe(403);

    const write = await fetch(`${baseUrl}/ruleBoundaryChecks?documentId=${documentId}&key=${apiKey}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fields: { source: { stringValue: "browser-boundary-test" } } }),
    });
    expect(write.status).toBe(403);
  }, 30_000);
});
