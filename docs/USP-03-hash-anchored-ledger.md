# USP-03 — Hash-Anchored Closeout Verifiability (NIC CoE Pattern)

**Problem:** `projectActivities`/`projectCloseouts` (`drizzle/schema.ts:245/295`) today store `actorName/actorRole/title/detail` as plain mutable docs. An admin or compromised client can rewrite `riskSummary` or `outcomeSummary` after the fact and `AdminCloseoutReview.tsx` has no way to prove tampering. Every clone demos “blockchain = DB `updatedAt`” hype. Jharkhand needs tamper-evidence for `JPSC leak + Maiya Samman DBT Rs14k Cr` trust deficit, but Spark stays free — no Blaze Cloud Storage, no real chain gas.

**Goal:** Append-only hash chain for every `projectActivities` + `projectCloseouts` write: `hash = SHA-256(canonicalJSON({prevHash, projectId, chainPayload}))` via browser `SubtleCrypto`. Store `prevHash/hash/fileDataHash` alongside the doc (inside Firestore, fits 1 MiB). Nightly admin-anchored `ledgerAnchors` `Merkle(root)` doc. `LedgerSeal` component re-computes chain locally and shows `Verified chain ✓ (N links)` vs `Tampered at #K ✗`. QR links to anchor root. No gas, no Polygon, no server.

**Stack:** Spark-safe. `SubtleCrypto SHA-256` + `Firestore` (add `ledgerAnchors` collection) + `firestore.rules` (admin-only anchor write) + `qrcode` (lazy). Fits `storage.ts:16 MAX_RAW_BYTES` via `fileDataHash` (hash of base64, not extra bytes).

## Steps

### 1. Ledger utility (30m) — new `client/src/lib/ledger.ts`

```ts
function hex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}
async function sha256Hex(input: string): Promise<string> {
  return hex(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input))
  );
}
function canonical(obj: Record<string, unknown>): string {
  return JSON.stringify(obj, Object.keys(obj).sort());
}
export async function chainHash(
  prevHash: string,
  payload: Record<string, unknown>
): Promise<string> {
  return sha256Hex(canonical({ prevHash, ...payload }));
}
export async function fileDataHash(fileData: string): Promise<string> {
  return sha256Hex(fileData);
}
export async function merkleRoot(hashes: string[]): Promise<string> {
  if (hashes.length === 0) return await sha256Hex("EMPTY");
  let layer = [...hashes].sort();
  while (layer.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      const left = layer[i]!,
        right = layer[i + 1] ?? left;
      next.push(await sha256Hex(left + right));
    }
    layer = next;
  }
  return layer[0]!;
}
export async function verifyChain(
  entries: { hash: string; prevHash: string; _recomputed?: string }[],
  recompute: (e: any) => Promise<string>
): Promise<{ valid: boolean; tamperAt: number | null }> {
  for (let i = 0; i < entries.length; i++) {
    const expected = await recompute(entries[i]);
    if (expected !== entries[i]!.hash) return { valid: false, tamperAt: i };
  }
  return { valid: true, tamperAt: null };
}
```

- No deps; `SubtleCrypto` is native (requires HTTPS/localhost — Cloudflare gives HTTPS, dev is localhost so OK).

### 2. Schema (type-only) (15m) — `drizzle/schema.ts:245` + `295`

Add optional fields (type-only, Firestore schemaless — old docs without them still read as `undefined`):

```ts
export const projectActivities = mysqlTable("projectActivities", {
  // ... existing
  prevHash: text("prevHash"),
  hash: text("hash"),
  fileDataHash: text("fileDataHash"),
});
export const projectCloseouts = mysqlTable("projectCloseouts", {
  // ... existing
  prevHash: text("prevHash"),
  hash: text("hash"),
  fileDataHash: text("fileDataHash"),
});
export const ledgerAnchors = mysqlTable("ledgerAnchors", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  root: text("root").notNull(),
  hashCount: int("hashCount").notNull(),
  anchoredBy: varchar("anchoredBy", { length: 128 }),
  anchoredAt: timestamp("anchoredAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
```

- Keep `import type` for these in `db.ts`/`trpc.ts` so `drizzle-orm` stays tree-shaken (a project-wide rule).

### 3. Collection + write path (60m) — `client/src/lib/db.ts:46/552/699`

- **Collection:** `collectionNames:53` add `ledgerAnchors: "ledgerAnchors"`.
- **Helpers:** Add `async function lastHashForProject(projectId:number):Promise<string>` that `listProjectActivities(projectId)` + `listProjectCloseouts(projectId)` (already `where` queries), sort by `createdAt`, return last `.hash ?? "GENESIS"`.
- **Wrap writes:**
  ```ts
  export async function addProjectActivity(input: RecordShape) {
    const projectId = input.projectId as number;
    const prevHash = await lastHashForProject(projectId);
    const fileDataHashVal = input.fileData
      ? await fileDataHash(input.fileData as string)
      : undefined;
    const hash = await chainHash(prevHash, {
      projectId,
      actorName: input.actorName,
      actorRole: input.actorRole,
      type: input.type ?? "note",
      title: input.title,
      detail: input.detail ?? "",
      ts: new Date().toISOString(),
      fileDataHash: fileDataHashVal ?? "",
    });
    return createRecord(collectionNames.projectActivities, {
      ...input,
      type: input.type ?? "note",
      prevHash,
      hash,
      fileDataHash: fileDataHashVal,
    });
  }
  export async function submitCloseout(
    input: RecordShape & { projectId: number }
  ) {
    // same prevHash/hash logic, plus after create also listProjectActivities+closeouts for anchor prep
    const prevHash = await lastHashForProject(input.projectId);
    const hash = await chainHash(prevHash, {
      projectId: input.projectId,
      submittedBy: input.submittedBy,
      outcomeSummary: input.outcomeSummary,
      ts: new Date().toISOString(),
    });
    const result = await createRecord(collectionNames.projectCloseouts, {
      ...input,
      citizenConfirmation: input.citizenConfirmation ?? "pending",
      adminStatus: input.adminStatus ?? "pending",
      prevHash,
      hash,
    });
    // ... existing project status + notification logic unchanged
    return result;
  }
  // Also wrap addProjectMilestone: same prevHash/hash with milestone fields
  // All through omitUndefined:60 so new fields safe on old call sites
  ```
- **Anchor:** Add `export async function anchorLedger(projectId:number):Promise<{root:string,id:number}>`:
  ```ts
  const activities = await listProjectActivities(projectId);
  const closeouts = await listProjectCloseouts(projectId);
  const hashes = [...activities, ...closeouts]
    .filter(r => r.hash)
    .map(r => r.hash as string)
    .sort();
  const root = await merkleRoot(hashes);
  const { id } = await createRecord(collectionNames.ledgerAnchors, {
    projectId,
    root,
    hashCount: hashes.length,
    anchoredBy: auth.currentUser?.uid,
    anchoredAt: new Date(),
    createdAt: new Date(),
  });
  return { root, id };
  ```
  And `export async function listLedgerAnchors(projectId:number)` via `listCollectionWhere:165` on `projectId`, `getLedgerAnchor(id)`.

### 4. Security rules (15m) — `firestore.rules:94`

Add after `projectCloseouts`:

```js
match /ledgerAnchors/{docId} {
  allow read: if true; // public verifiability (like challenges/projects)
  allow create, update: if isAdmin();
  allow delete: if isAdmin();
}
```

- No change to `projectActivities`/`projectCloseouts` `allow write if isSignedIn()` — hash is just a regular field, client-computed, rules don't validate SHA (would require server-side crypto not available in rules). Tampering is detected client-side verification, not write-rejection — honest NIC CoE pattern.
- Deploy with `npm run deploy:rules` separately from `npm run deploy` (two-step per the project architecture notes).

### 5. trpc shim (20m) — `client/src/lib/trpc.ts:51`

Add to `workflowProcedures`:

```ts
anchorLedger: (input:{projectId:number}) => db.anchorLedger(input.projectId),
ledgerAnchors: (input:{projectId:number}) => db.listLedgerAnchors(input.projectId),
verifyLedger: async (input:{projectId:number}) => {
  // client-side recompute; optional helper for UI
  const acts = await db.listProjectActivities(input.projectId);
  const closes = await db.listProjectCloseouts(input.projectId);
  // ... recompute chainHashes and compare
  return { valid, tamperAt, root };
},
```

All through `createRouterHooks:268` so `trpc.workflow.anchorLedger.useMutation()` works in pages without rewriting them.

### 6. Verify UI (60m) — new `client/src/components/LedgerSeal.tsx` + `InstituteProjectWorkspace.tsx:340` + `AdminCloseoutReview.tsx`

- **`LedgerSeal.tsx`**:

  ```tsx
  export function LedgerSeal({ projectId }: { projectId: number }) {
    const acts = trpc.workflow.projectActivities.useQuery({ projectId });
    const closes = trpc.workflow.projectCloseouts.useQuery({ projectId });
    const anchors = trpc.workflow.ledgerAnchors.useQuery({ projectId });
    // useMemo recompute: for each entry in createdAt asc order, await chainHash(prev, payload) inside effect, compare to stored hash
    // Render: if no hashes → "No ledger yet"
    // else if mismatch → "Tampered at #K ✗ — expected {recomputed.slice(0,8)}… got {stored.slice(0,8)}…" (red, border-[#bd5a38])
    // else → "Verified chain ✓ (N links) · Root {root.slice(0,12)}… anchored {date}" (green, border-[#8fa887])
    // QR button: lazy import('qrcode') → dataURL → <img> for anchor root
  }
  ```

  Place in:
  - `InstituteProjectWorkspace.tsx:340 Activity record` section header + `aside` above `Team record`
  - `AdminCloseoutReview.tsx` top banner (required for judge demo)
  - `AdminProjectDetail.tsx` if exists

- Admin button `Anchor now` (admin only) → `trpc.workflow.anchorLedger.useMutation()` → toast.

### 7. Verify

1. `npm run check && npm run build` — `SubtleCrypto` types are `lib:dom`, no extra dep.
2. Create project → add 3 activities + 1 closeout → `ledgerAnchors` gets 1 anchor via `Anchor now` → `LedgerSeal` shows `Verified ✓ (4 links)`.
3. Manually edit one `projectActivities detail` in Firebase Console → `LedgerSeal` flips to `Tampered at #2 ✗` — proving detection.
4. `npm test` — add case `deny anonymous write ledgerAnchors`; `firestore.rules.test.ts` already checks `deny anonymous writes`.

### Demo script (40s)

Create Gumla water project → 2 milestones → "Outcome: handpump restored" closeout → show `Verified chain ✓` + QR → edit hash doc in console → `Tampered` — ask judges: "Where's your Verhoeff/pHash without hash-chain?"

### Risks

- `SubtleCrypto` needs secure context — Cloudflare HTTPS covers prod; `localhost` covers dev; `http://192.168` preview will fail verification locally (document in `docs/LOCAL_SETUP.md`).
- Old docs without `hash` show `No ledger` — migration not needed; new writes chain from `GENESIS`.
- Rules don't enforce hash correctness — a malicious signed-in user can write bad hash, but verifier catches it (verifiability, not prevention). If strict prevention needed, add Cloudflare Worker validator later (free tier).
