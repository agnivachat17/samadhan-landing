# USP-01 — Offline-First PWA with Background Sync

**Problem:** `SubmitChallenge.tsx:33` requires online + checks 5 MB vs real `storage.ts:16 MAX_RAW_BYTES=680KB`. West Singhbhum / Gumla / Latehar hamlets (Naxal-affected, 2G, forest) cannot file. Every SIH clone is online-only. Judges ask "Will this work beyond Ranchi?" and generic portals fail.

**Goal:** Citizen files challenge + up to 5 photos **offline**; queued in IndexedDB; auto-syncs when online via existing `trpc.workflow.submitChallenge` + `uploadChallengeEvidence` (`trpc.ts:152`). Reads already cacheable via Firestore persistence.

**Stack:** Spark-safe, no Blaze, no server. `firebase/firestore enableIndexedDbPersistence` + `workbox-window` + `idb` (IndexedDB wrapper). Works with `firestore.rules:77 allow create if isSignedIn()` unchanged.

## Steps

### 1. Firestore offline persistence (30m) — `client/src/lib/firebase.ts:30`

After `getFirestore(firebaseApp)`:

```ts
import { enableIndexedDbPersistence } from "firebase/firestore";
enableIndexedDbPersistence(db, { synchronizeTabs: true }).catch(e => {
  if (e.code !== "failed-precondition" && e.code !== "unimplemented") throw e;
});
```

- `failed-precondition` = multi-tab conflict, `unimplemented` = browser doesn't support IndexedDB — both are expected and safe to swallow.
- Queue drains only when `auth.currentUser != null`; offline guest drafts stay queued until login (see Step 4).

### 2. PWA shell (45m) — `client/public/manifest.json`, `client/index.html`, `client/src/main.tsx`, `vite.config.ts`

- **`client/public/manifest.json`**:
  ```json
  {
    "name": "Samadhan — Jharkhand Civic Innovation",
    "short_name": "Samadhan",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#f1eadc",
    "theme_color": "#07271e",
    "icons": [
      {
        "src": "/images/jharkhand-government-seal_3431be25.svg",
        "sizes": "512x512",
        "type": "image/svg+xml"
      }
    ]
  }
  ```
- **`client/index.html`**: add `<link rel="manifest" href="/manifest.json">` + `<meta name="theme-color" content="#07271e">`
- **`client/src/main.tsx`**: after `AuthProvider` mount:
  ```ts
  import { Workbox } from "workbox-window";
  if ("serviceWorker" in navigator) {
    const wb = new Workbox("/sw.js");
    wb.register();
  }
  ```
- **`vite.config.ts`**: add `VitePWA({ registerType: "autoUpdate", workbox: { globPatterns: ["**/*.{js,css,html,svg,jpg,png,woff2}"] } })`. File is now plain `react()+tailwindcss()` per the project architecture notes — no Manus plugins to conflict with.

Install: `npm install idb workbox-window` + `npm install -D vite-plugin-pwa`

### 3. Offline queue (60m) — new `client/src/lib/offlineQueue.ts`

Create IndexedDB store `samadhan-offline` / `challengeDrafts`:

```ts
import { openDB } from "idb";
import { auth } from "./firebase";
import * as db from "./db";
import { prepareStoredFile, sanitizeFileName } from "./storage";

const dbp = openDB("samadhan-offline", 1, upgrade => {
  upgrade.createObjectStore("challengeDrafts", { keyPath: "localId" });
});

function toBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onerror = () => rej(new Error("File read failed"));
    r.onload = () => res(String(r.result));
    r.readAsDataURL(file);
  });
}

export async function queueChallengeDraft(
  form: Record<string, unknown>,
  files: File[]
) {
  const localId = Date.now() * 1000 + Math.floor(Math.random() * 1000);
  const filePayloads = await Promise.all(
    files.map(async f => ({
      name: f.name,
      type: f.type || "application/octet-stream",
      base64: await toBase64(f),
    }))
  );
  await (
    await dbp
  ).put("challengeDrafts", {
    localId,
    form,
    filePayloads,
    createdAt: new Date().toISOString(),
  });
  return localId;
}

export async function queueCount(): Promise<number> {
  return (await (await dbp).getAll("challengeDrafts")).length;
}

export async function drainQueue(): Promise<void> {
  if (!navigator.onLine || !auth.currentUser) return;
  const store = await dbp;
  const drafts = await store.getAll("challengeDrafts");
  for (const d of drafts) {
    const { id: challengeId } = await db.submitChallenge(d.form as any);
    for (const fp of d.filePayloads as {
      name: string;
      type: string;
      base64: string;
    }[]) {
      const stored = await prepareStoredFile({
        base64: fp.base64,
        mimeType: fp.type,
      });
      await db.createChallengeEvidence({
        challengeId,
        uploaderName: (d.form as any).citizenName,
        fileName: sanitizeFileName(fp.name, "evidence"),
        fileData: stored.fileData,
        mimeType: stored.mimeType,
      });
    }
    await store.delete("challengeDrafts", d.localId);
  }
}
```

- Reuses `SubmitChallenge.tsx:305 toBase64` logic and `storage.ts:74 prepareStoredFile` (already handles `MAX_RAW_BYTES` compression + `omitUndefined`).
- No new Firestore collection; drafts never touch Firestore until online.

### 4. Wire submit UI (30m) — `client/src/pages/SubmitChallenge.tsx:33`

```ts
import {
  queueChallengeDraft,
  drainQueue,
  queueCount,
} from "@/lib/offlineQueue";

// inside component:
const [offlineQueued, setOfflineQueued] = useState(0);
useEffect(() => {
  const sync = () =>
    drainQueue().then(() => queueCount().then(setOfflineQueued));
  window.addEventListener("online", sync);
  // Background Sync fallback (Chrome)
  navigator.serviceWorker?.ready.then(reg =>
    (reg as any).sync?.register("samadhan-drain").catch(() => {})
  );
  sync();
  return () => window.removeEventListener("online", sync);
}, []);

async function submit(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault();
  setUploadError("");
  const data = new FormData(event.currentTarget);
  const payload = {
    citizenName: text(data, "citizenName")!,
    citizenEmail: text(data, "citizenEmail"),
    citizenPhone: text(data, "citizenPhone"),
    title: text(data, "title")!,
    description: text(data, "description")!,
    domain: text(data, "domain")!,
    district: text(data, "district")!,
    latitude: coords.latitude,
    longitude: coords.longitude,
  };
  // Offline path
  if (!navigator.onLine) {
    await queueChallengeDraft(payload, files);
    setOfflineQueued(await queueCount());
    toast.info("Saved offline — will sync when you are back online");
    setCreatedId(-1); // show offline confirmation state
    return;
  }
  // Online path — existing logic unchanged
  try {
    const result = await submitMutation.mutateAsync(payload);
    // ... existing evidence loop
    setCreatedId(result.id);
  } catch (error) {
    /* ... */
  }
}
```

- If `offlineQueued > 0` show banner: `"Offline · ${offlineQueued} drafts queued"` above form.
- Success state (`createdId === -1`) renders distinct copy: "Saved offline — queued for sync" vs existing "Thank you for speaking up."

### 5. UX polish (20m)

- Offline badge in `PublicPortalHeader.tsx` (reuse `sonner` richColors from `client/src/components/ui/sonner.tsx`).
- Reuse `Challenges.tsx:329 InteractiveMap blurred` pattern: when offline confirmation modal is open, pass `blurred={offlineQueued>0}` to map.
- Keep the project's rounding rules: badge is `rounded-full` (pill), not card.

### 6. Verify

1. `npm run check && npm run build` — bundle impact minimal (`idb` ~2KB, `workbox-window` ~5KB).
2. Chrome DevTools > Application > Service Workers > Offline (check) -> fill `SubmitChallenge` + 2 photos -> submit -> toast "Saved offline" -> Application > IndexedDB > `samadhan-offline` > `challengeDrafts` has 1 row.
3. Toggle Offline off -> `online` event fires -> `challenges` collection gets `record-*` doc (`db.ts:308 submitChallenge` + `createNotification:797`), `districtCounts` (`Challenges.tsx:241`) increments, evidence appears via `listChallengeEvidence:539`.
4. `npm test` still passes — `firestore.rules` unchanged, anonymous reads still public.
5. Throttle Network to Slow 3G: 1.5 MB photo -> `storage.ts:44 compressImage` downscales to <680KB and still queues/syncs.

### Demo script (30s)

Airplane mode ON -> citizen files "Gumla handpump dry for 3 weeks" + tanker photo -> "Saved offline" -> AIRPLANE OFF -> challenge appears live at `/challenges` with Gumla pin on `InteractiveMap`. Ask judges: "Will your portal work beyond Ranchi?"

### Risks

- `trpc.ts:152 uploadChallengeEvidence` calls `requireUser()` — offline draft from signed-out guest stays queued until `auth.currentUser` exists. Show "Sign in to sync" hint if `!auth.currentUser && offlineQueued>0`.
- 1 MiB doc cap still applies after decompression — `prepareStoredFile` already throws explicit error before `setDoc`; queue should surface it on drain, not silently drop.
