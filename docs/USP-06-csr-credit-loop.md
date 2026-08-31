# USP-06 — CSR & Academic Credit Loop (Certificate + Badge)

**Problem:** `InstituteProjectWorkspace.tsx:8` + `organizationMembers:72` + `industryInterests:266` + `projectMilestones:202` exist but are siloed. Students do work, industry offers `supportType` (`trpc.ts:201`), yet there's no career artefact. SIKSHALOG (winner) linked attendance → resource; Tata Motors IDTR Jamshedpur + 112 institutions (`CLAUDE.md:51` + Jharkhand budget 2026 B2G alliances) need credit/CSR flow. Without it, engagement drops post-hackathon.

**Goal:** When project hits `stage:closeout` + `status:resolved`, award `creditsAwarded` (project) + `creditsEarned` (each `organizationMembers` student/faculty) and issue verifiable PDF co-certificate (Samadhan + Govt seal + hash-chain QR from USP-03) + industry CSR badge via `industryInterests supportType` pills. Uses existing collections, fits 680KB.

**Stack:** `jspdf` (lazy, ~80KB) + `qrcode` (lazy, ~20KB) + `SubtleCrypto` QR root from `ledger.ts` (`USP-03`). Spark-safe.

## Steps

### 1. Schema type-only (15m) — `drizzle/schema.ts:72/245`

Add optional fields (Firestore schemaless):
```ts
export const organizationMembers = mysqlTable("organizationMembers", {
  // ... existing
  creditsEarned: int("creditsEarned").default(0),
});
export const projects = mysqlTable("projects", {
  // ... existing
  creditsAwarded: int("creditsAwarded"),
  certificateHash: text("certificateHash"),
});
```

- Keep `import type` in `db.ts`/`trpc.ts` (`CLAUDE.md` keeps `drizzle-orm` tree-shaken).

### 2. Award logic (40m) — `client/src/lib/db.ts:469/271` + `client/src/lib/credits.ts`

New `client/src/lib/credits.ts`:
```ts
export function creditsForProject(teamSize: number, milestoneCount: number): number {
  return Math.min(100, teamSize * 10 + milestoneCount * 5); // cap 100
}
```

Add `db.ts: awardCredits(projectId:number)`:
```ts
export async function awardCredits(projectId: number): Promise<{credits:number}> {
  const project = await getProject(projectId);
  if (!project) throw new Error("Project not found");
  const members = await listOrganizationMembers(project.organizationId);
  const milestones = await listProjectMilestones(projectId);
  const credits = creditsForProject(members.length, milestones.length);
  await updateRecord(collectionNames.projects, projectId, { creditsAwarded: credits });
  // Distribute to students/faculty (even split)
  const share = Math.floor(credits / Math.max(1, members.length));
  for (const m of members) {
    await updateRecord(collectionNames.organizationMembers, m.id, { creditsEarned: (m.creditsEarned ?? 0) + share });
  }
  return { credits };
}
```

- Via `omitUndefined:79`, old project rows without `creditsAwarded` read as `undefined` (render "Not awarded").

### 3. Certificate gen (40m) — new `client/src/lib/certificate.ts`

Lazy `jspdf` + `qrcode`:

```ts
export async function generateCertificate(input: { projectTitle:string; institutionName:string; team:string[]; leadName:string; credits:number; anchorRoot:string; date:Date }): Promise<string> {
  const { jsPDF } = await import("jspdf");
  const QRCode = await import("qrcode");
  const doc = new jsPDF({ orientation:"landscape", format:"a4" });
  // paper grain bg: optional
  doc.setFillColor(241,234,220); doc.rect(0,0,297,210,"F");
  doc.setFont("helvetica","bold"); doc.setFontSize(28); doc.setTextColor(12,48,33);
  doc.text("SAMADHAN", 15, 25); doc.setFontSize(12); doc.text("Government of Jharkhand · Civic Innovation", 15, 32);
  doc.setFontSize(18); doc.text(input.projectTitle, 15, 55);
  doc.setFontSize(11); doc.text(`Institution: ${input.institutionName}  ·  Lead: ${input.leadName}`, 15, 65);
  doc.text(`Team: ${input.team.join(", ")}`, 15, 72);
  doc.setFontSize(14); doc.setTextColor(201,74,32); doc.text(`${input.credits} credits awarded`, 15, 85);
  doc.setFontSize(9); doc.setTextColor(82,103,93); doc.text(`Date: ${input.date.toLocaleDateString()}  ·  Anchor: ${input.anchorRoot.slice(0,24)}…`, 15, 95);
  // QR bottom-right
  const qrDataUrl = await QRCode.toDataURL(input.anchorRoot, { margin:1, width:120 });
  doc.addImage(qrDataUrl, "PNG", 245, 140, 35, 35);
  doc.setFontSize(7); doc.text("Scan to verify ledger root", 245, 180);
  // seals
  // optional: doc.addImage(sealPngBase64, "PNG", 120, 120, 40, 40);
  return doc.output("dataurlstring"); // for <a href={url} download> or storedFileUrl pattern
}
```

- Keep `seal` as `/images/jharkhand-government-seal_3431be25.svg` rendered via `canvas` → `toDataURL` if needed, else text.

### 4. trpc (15m) — `client/src/lib/trpc.ts:51`

Add to `workflowProcedures`:
```ts
awardCredits: (input:{projectId:number}) => db.awardCredits(input.projectId),
generateCertificate: async (input:{projectId:number}) => {
  const project = await db.getProject(input.projectId);
  const institution = project ? await db.getOrganization(project.organizationId) : null;
  const members = project ? await db.listOrganizationMembers(project.organizationId) : [];
  const anchors = await db.listLedgerAnchors(input.projectId);
  const root = anchors[0]?.root ?? "NO-ANCHOR-YET";
  return db.generateCertificateData({ project, institution, members, root }); // wrapper that calls certificate.ts
},
```

All through `createRouterHooks:268`.

### 5. UI (40m) — `InstituteProjectWorkspace.tsx:173` + `InstituteProfile.tsx` + `IndustryDashboard.tsx`

- **`InstituteProjectWorkspace.tsx:173 Delivery control`** — when `stage==="closeout" && status==="resolved" && !project.creditsAwarded` show:
  ```tsx
  <button onClick={async()=>{
    const {credits}= await awardCredits.mutateAsync({projectId: project.id});
    const dataUrl = await generateCertificate({projectTitle: project.title, institutionName: institution?.name ?? "", team: members.map(m=>m.fullName), leadName: project.leadName, credits, anchorRoot, date: new Date()});
    window.open(dataUrl, "_blank");
    toast.success(`${credits} credits awarded + certificate generated`);
  }} className="rounded-full bg-[#16422f] px-5 py-3 font-mono-ui text-[0.58rem] uppercase text-white">Award credits & certificate</button>
  ```

- **`InstituteProfile.tsx`** team list — show `creditsEarned` badge `pill bg-[#dce6d0] text-[#537246]`.

- **`IndustryDashboard.tsx` / `IndustryProjectInterest.tsx`** — render `industryInterests supportType` as badge pill: `Funding` → `bg-[#c94a20] text-white`, `Expertise` → `bg-[#16422f] text-white`, `CSR` → `bg-[#f3e5bd] text-[#a2731c]` (reuse `statusStyle:51` tone).

- **`CitizenDashboard.tsx` / citizen view** — optionally show `creditsEarned` if citizen is also `organizationMembers.student`.

### 6. Verify

1. `npm install jspdf qrcode @types/qrcode` (lazy `import()` so bundle stays ~2.17MB).
2. Create project with 3 `organizationMembers` + 2 milestones → `Award credits` → `projects.creditsAwarded = 40`, each member `creditsEarned +13`.
3. Click generates PDF landscape with QR linking to `ledgerAnchors root` (USP-03); scan QR → anchor verifier shows `Verified`.
4. `npm run check && npm run build` — `jspdf` must be code-split; check `dist/public/assets` chunk count increases but main stays <2.5MB.

### Demo script (30s)

Resolve Gumla water project → `Award credits` → PDF opens with seal + QR → scan → `Verified chain ✓`. Say: "Industry CSR (`Tata Motors IDTR` style, budget 2026 B2G) now has proof of impact."

### Risks

- `organizationMembers` without `creditsEarned` read as `null` — coerce `??0`.
- `qrcode` canvas + `jspdf` both need `await import()` to avoid bundling on landing (`Home.tsx:1` hero must stay light).
- Certificate ` Anchor: …` without USP-03 anchor shows `NO-ANCHOR-YET` — gate `Award credits` button on `anchors.length>0` or generate pending state.
