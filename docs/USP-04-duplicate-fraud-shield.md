# USP-04 — Duplicate & Fraud Shield (pHash + Geo-fence + Verhoeff)

**Problem:** `SubmitChallenge.tsx:44` accepts any photo + district + pin. CPGRAMS win `66d → 48d → 16d` came from dedup; without it spam kills `challengeEvidence:539 listChallengeEvidence` and district counts. `Nagrik-Samadhan` already advertises pHash + Verhoeff Aadhaar — judges expect it. Current 5 MB check vs real 680KB `storage.ts:16` mismatch lets non-images slip past, and pins outside Jharkhand (e.g., Delhi lat/lng) are accepted silently.

**Goal:** Before `uploadChallengeEvidence:181` / `uploadProjectDocument:151`, block: (a) near-duplicate photos across districts via perceptual hash (Hamming < 8), (b) pins outside `JHARKHAND_BBOX`, (c) bad phone checksum via Verhoeff. Client-side, Spark-safe, admin-override toggle.

**Stack:** `storage.ts:51 canvas` (reuse downscale) + `blockhash-js` (~3KB, browser DCT) OR manual 8×8 pHash + `jharkhandDistricts.ts:5 JHARKHAND_DISTRICTS` bbox + Verhoeff table (20 lines). No server.

## Steps

### 1. BBox helper (10m) — `client/src/lib/jharkhandDistricts.ts:48`

Add:

```ts
export const JHARKHAND_BBOX = {
  latMin: 21.9,
  latMax: 25.8,
  lngMin: 83.2,
  lngMax: 88.2,
};
export function isInJharkhand(lat: number, lng: number): boolean {
  return (
    lat >= JHARKHAND_BBOX.latMin &&
    lat <= JHARKHAND_BBOX.latMax &&
    lng >= JHARKHAND_BBOX.lngMin &&
    lng <= JHARKHAND_BBOX.lngMax
  );
}
export function findBboxViolation(
  district: string | undefined,
  lat?: string,
  lng?: string
): string | null {
  if (!lat || !lng) return null;
  const nLat = Number(lat),
    nLng = Number(lng);
  if (Number.isNaN(nLat) || Number.isNaN(nLng)) return null;
  if (!isInJharkhand(nLat, nLng))
    return `Pin (${nLat.toFixed(2)}, ${nLng.toFixed(2)}) is outside Jharkhand — pick within state or clear the pin`;
  return null;
}
```

- 24 districts `JHARKHAND_DISTRICTS:5` already cover centroids; BBox is coarse gate, district string still free-form (don't reject valid new hamlet name).

### 2. Verhoeff (15m) — new `client/src/lib/verhoeff.ts`

```ts
// Verhoeff tables (d/p/inv) — 10×10, standard
const d = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];
const p = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 7, 2, 5],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];
const inv = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];
export function verhoeffCheck(num: string): boolean {
  const s = num.replace(/\D/g, "");
  if (s.length < 6) return true; // don't block short optional phones
  let c = 0;
  for (let i = 0; i < s.length; i++)
    c = d[c][p[(s.length - i) % 8][Number(s[s.length - 1 - i])]!]!;
  return c === 0;
}
export function verhoeffValidatePhone(phone?: string): string | null {
  if (!phone) return null;
  const d = phone.replace(/\D/g, "").slice(-12);
  if (d.length < 10) return null;
  return verhoeffCheck(d)
    ? null
    : "Phone number checksum failed — check digits";
}
```

- Don't block submission on Verhoeff fail — show `setUploadError` warning + allow admin override checkbox (trust but verify).

### 3. pHash in compression pipeline (45m) — `client/src/lib/storage.ts:44/74`

- **Install:** `npm install blockhash-js` (or vendor 30-line `blockhash` to avoid wasm).

- **Extend `storage.ts`:**

  ```ts
  import { blockhash } from "blockhash-js"; // if vendored, local import
  export async function pHashFromCanvas(
    canvas: HTMLCanvasElement
  ): Promise<string> {
    // blockhash expects {width,height,data} ImageData; draw to 32×32 first if needed
    const ctx = canvas.getContext("2d")!;
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return blockhash(imgData, 16, 16); // 16×16 = 64-hex hash
  }
  export function hammingDistance(a: string, b: string): number {
    let dist = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      const xor = parseInt(a[i]!, 16) ^ parseInt(b[i]!, 16);
      dist += xor.toString(2).split("1").length - 1;
    }
    return dist + Math.abs(a.length - b.length) * 4;
  }
  // In prepareStoredFile: after compressImage canvas exists, compute pHash
  export async function prepareStoredFile(input: {
    base64: string;
    mimeType: string;
  }): Promise<{ fileData: string; mimeType: string; pHash: string | null }> {
    const isImage = input.mimeType.startsWith("image/");
    // ... existing compressImage path, but capture canvas reference
    // if isImage: const {fileData, canvas} = await compressImageWithCanvas(dataUrl); const pHash = await pHashFromCanvas(canvas);
    // else: pHash = null
  }
  // Keep backward compat: callers that destructure {fileData,mimeType} still work; those needing pHash read third field
  ```

- **Schema type-only:** `drizzle/schema.ts:141 challengeEvidence` + `223 projectDocuments` add `pHash: text("pHash")` (optional).

### 4. Persist hash (20m) — `client/src/lib/db.ts:548/506` + `trpc.ts:152/181`

- `db.ts:createChallengeEvidence` + `addProjectDocument` already via `createRecord:113` + `omitUndefined:79` — just include `pHash` in payload.
- `trpc.ts:152 uploadProjectDocument` + `181 uploadChallengeEvidence`: change
  ```ts
  const stored = await prepareStoredFile({base64: input.base64, mimeType: input.mimeType});
  return db.addProjectDocument({ ..., fileData: stored.fileData, mimeType: stored.mimeType, pHash: stored.pHash });
  ```
- `firestore.rules:94 challengeEvidence` / `projectDocuments` remain `allow write if isSignedIn()` — pHash is regular field.

### 5. Compare & block (40m) — `SubmitChallenge.tsx:33` + `InstituteProjectWorkspace.tsx:101`

- **Helper:** `client/src/lib/duplicateCheck.ts`:

  ```ts
  export async function findDuplicateEvidence(
    pHash: string | null,
    challengeId?: number
  ): Promise<{ duplicateId: number | null; distance: number }> {
    if (!pHash) return { duplicateId: null, distance: Infinity };
    // fetch recent 200 evidence rows (world-readable via listCollection:153) — local compare, O(n) cheap
    const recents =
      await listCollection<ChallengeEvidence>("challengeEvidence"); // or db.listChallengeEvidence for scoped
    let best: { duplicateId: number | null; d: number } = {
      duplicateId: null,
      d: Infinity,
    };
    for (const r of recents)
      if (r.pHash && r.challengeId !== challengeId) {
        const d = hammingDistance(pHash, r.pHash as string);
        if (d < best.d) best = { duplicateId: r.challengeId as number, d };
      }
    return {
      duplicateId: best.d < 8 ? best.duplicateId : null,
      distance: best.d,
    };
  }
  ```

- **Wire `SubmitChallenge.tsx:33 submit()`** before `uploadChallengeEvidence` loop:

  ```ts
  for (const file of files) {
    const base64 = await toBase64(file);
    const stored = await prepareStoredFile({ base64, mimeType: file.type });
    if (stored.pHash) {
      const { duplicateId, distance } = await findDuplicateEvidence(
        stored.pHash
      );
      if (duplicateId) {
        setUploadError(
          `Duplicate image detected — matches challenge #${duplicateId} (${distance} bits apart). Use an original photo or check "Override duplicate" as admin.`
        );
        if (!isAdmin) return; // block; admin can tick override checkbox to proceed
      }
    }
    // geo-fence
    const geoErr = findBboxViolation(
      payload.district,
      payload.latitude,
      payload.longitude
    );
    if (geoErr) {
      setUploadError(geoErr);
      return;
    }
    const phoneErr = verhoeffValidatePhone(
      payload.citizenPhone as string | undefined
    );
    if (phoneErr) toast.warning(phoneErr); // warn, don't block
  }
  ```

- Add `Override duplicate` checkbox (admin-only, `isAdmin()` from `userProfile.ts` custom claim) near Evidence dropzone.

### 6. Verify

1. `npm run check && npm run build` — `blockhash-js` lazy via dynamic `import("blockhash-js")` if bundle bloat exceeds 100KB; else static import.
2. Upload same `detail-water-tanker_cee68d25.jpg` to Palamu then Ranchi → second flags `Duplicate matches #730030 (3 bits)`.
3. Pin Delhi (28.6,77.2) → `Pin is outside Jharkhand` error.
4. Enter phone `9999999999` vs bad checksum → warning (not block).

### Demo script (30s)

Two tabs same tanker photo → second toast "Duplicate" → toggle `Override` as admin → succeeds. Ask: "Your portal would count this twice — ours doesn't."

### Risks

- `listCollection("challengeEvidence")` fetches all evidence (each with `fileData` base64) — heavy once pHash is stored. Switch to `listCollectionWhere:165` or add `pHashes` lightweight collection later. For SIH, 200 rows is fine.
- `blockhash` on large canvas is CPU — already downscaled to `MAX_IMAGE_EDGE 1600` (`storage.ts:17`), reuse that canvas.
- Re-encode `waste-collection-point.jpg` AVIF case (`CLAUDE.md:259`) — re-encode to JPEG before hashing so hash is stable.
