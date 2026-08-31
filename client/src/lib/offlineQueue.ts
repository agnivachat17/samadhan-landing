/**
 * Offline challenge draft queue — IndexedDB via `idb`.
 *
 * Stores citizen reports + evidence when offline and drains them when
 * online + signed-in. Drafts never touch Firestore until drain time, so
 * `firestore.rules:77 allow create if isSignedIn()` is respected.
 */
import { openDB, type DBSchema } from "idb";
import { auth } from "./firebase";
import * as db from "./db";
import { prepareStoredFile, sanitizeFileName } from "./storage";

type FilePayload = { name: string; type: string; base64: string };

interface QueueDB extends DBSchema {
  challengeDrafts: {
    key: number;
    value: {
      localId: number;
      form: Record<string, unknown>;
      filePayloads: FilePayload[];
      createdAt: string;
    };
  };
}

const dbp = openDB<QueueDB>("samadhan-offline", 1, {
  upgrade(upgrade) {
    upgrade.createObjectStore("challengeDrafts", { keyPath: "localId" });
  },
});

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("File read failed"));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

export async function queueChallengeDraft(
  form: Record<string, unknown>,
  files: File[]
): Promise<number> {
  const localId = Date.now() * 1000 + Math.floor(Math.random() * 1000);
  const filePayloads: FilePayload[] = await Promise.all(
    files.map(async file => ({
      name: file.name,
      type: file.type || "application/octet-stream",
      base64: await fileToBase64(file),
    }))
  );
  const dbi = await dbp;
  await dbi.put("challengeDrafts", {
    localId,
    form,
    filePayloads,
    createdAt: new Date().toISOString(),
  });
  return localId;
}

export async function queueCount(): Promise<number> {
  const dbi = await dbp;
  return (await dbi.getAll("challengeDrafts")).length;
}

export async function getQueuedDrafts() {
  const dbi = await dbp;
  return dbi.getAll("challengeDrafts");
}

export async function clearQueuedDraft(localId: number): Promise<void> {
  const dbi = await dbp;
  await dbi.delete("challengeDrafts", localId);
}

/**
 * Drains all queued drafts: creates the challenge + evidence docs.
 * No-op when offline or not signed-in; drafts stay queued until both
 * conditions are met.
 */
export async function drainQueue(): Promise<{ drained: number; failed: number }> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return { drained: 0, failed: 0 };
  if (!auth.currentUser) return { drained: 0, failed: 0 };

  const dbi = await dbp;
  const drafts = await dbi.getAll("challengeDrafts");
  let drained = 0;
  let failed = 0;

  for (const draft of drafts) {
    try {
      const { id: challengeId } = await db.submitChallenge(draft.form as Record<string, unknown>);
      for (const fp of draft.filePayloads) {
        const stored = await prepareStoredFile({ base64: fp.base64, mimeType: fp.type });
        await db.createChallengeEvidence({
          challengeId,
          uploaderName: (draft.form as Record<string, unknown>).citizenName as string,
          fileName: sanitizeFileName(fp.name, "evidence"),
          fileData: stored.fileData,
          mimeType: stored.mimeType,
        });
      }
      await dbi.delete("challengeDrafts", draft.localId);
      drained += 1;
    } catch {
      failed += 1;
      // Keep draft for retry; don't delete
    }
  }

  return { drained, failed };
}
