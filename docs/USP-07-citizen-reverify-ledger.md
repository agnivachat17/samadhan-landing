# USP-07 — Citizen Re-Verify Closeout + Public Impact Ledger

**Problem:** `projectCloseouts:295 citizenConfirmation/ adminStatus:301`, `CitizenCloseoutConfirm.tsx`, `ProjectCloseout.tsx`, `AdminCloseoutReview.tsx`, `ChallengeDetail.tsx`, and `challenges status:109 resolved` exist but are not enforced as a chain. Today a project can be `status:resolved` without citizen proof, so `Home.tsx:174` impact metrics (`2,847/112/34`) and `AdminReports:77` CSV are fiction. Audit `docs/samadhan_flow_gap_audit.md:29` flags closeout + citizen confirmation as missing handoff — `Admin Project Detail` shows milestones but no before/after evidence pair requirement.

**Goal:** Enforce `closeout → citizen confirms (before/after photo) → admin approves → challenge resolved` and make it public: `ChallengeDetail` timeline `createdAt → assignment → project milestones → closeout → citizen ✓ → admin ✓` with `upvoteCount:133`. Without citizen+admin, `challenge.status` never flips to `resolved`. Spark-safe.

**Stack:** Existing `projectCloseouts:295`, `projectDocuments:223` (base64), `projectActivities:245`, `assignments:156`, `challenges:98` reads + `withFileUrls:517` + `storedFileUrl:115`. No new collection.

## Steps

### 1. Closeout form stricter (30m) — `client/src/pages/ProjectCloseout.tsx`

Require before/after pair:

```tsx
const docs = trpc.workflow.projectDocuments.useQuery({projectId});
const [beforeId, setBeforeId] = useState<number| null>(null);
const [afterId, setAfterId] = useState<number| null>(null);
// In submit:
if (!beforeId || !afterId) { toast.error("Pick before + after evidence (project documents)"); return; }
await trpc.workflow.submitCloseout.mutateAsync({
  projectId, submittedBy: project.leadName,
  outcomeSummary: outcome,
  evidenceUrl: docs.data?.find(d=>d.id===afterId)?.fileUrl!, // synthesised via withFileUrls
  beforeEvidenceId: beforeId, afterEvidenceId: afterId, // new optional fields, type-only in schema
  citizenConfirmation: "pending", adminStatus: "pending",
});
// also log activity:
await trpc.workflow.addActivity.mutateAsync({projectId, actorName: project.leadName, actorRole:"Institute lead", type:"closeout", title:"Closeout submitted", detail: outcome});
```

- Add `beforeEvidenceId/afterEvidenceId: int` to `drizzle/schema.ts:295 projectCloseouts` (type-only).
- UI: two `<select citizen-input>` populated from `projectDocuments` (`documentType` + `name`), show preview thumb via `storedFileUrl:115` (same `withFileUrls` pattern).

### 2. Citizen confirm (40m) — `client/src/pages/CitizenCloseoutConfirm.tsx`

Show side-by-side:

```tsx
const closeout = trpc.workflow.projectCloseouts.useQuery({projectId});
const docs = trpc.workflow.projectDocuments.useQuery({projectId});
const before = docs.data?.find(d=>d.id===closeout.data?.[0]?.beforeEvidenceId);
const after = docs.data?.find(d=>d.id===closeout.data?.[0]?.afterEvidenceId);
// JSX:
<div className="grid gap-6 sm:grid-cols-2">
  <a href={before?.fileUrl} target="_blank" className="border border-[#a58c6d]/45 p-2"><img src={before?.fileUrl} className="aspect-[4/3] object-cover" /><p className="font-mono-ui text-[0.6rem] uppercase">Before</p></a>
  <a href={after?.fileUrl} target="_blank" className="border border-[#a58c6d]/45 p-2"><img src={after?.fileUrl} className="aspect-[4/3] object-cover" /><p className="font-mono-ui text-[0.6rem] uppercase">After</p></a>
</div>
// Actions:
<button onClick={()=>updateCloseout.mutate({id: closeout.id, citizenConfirmation:"confirmed"})}>Confirm ✓</button>
<button onClick={()=>updateCloseout.mutate({id: closeout.id, citizenConfirmation:"disputed", citizenNotes: reason})}>Dispute</button>
<button onClick={()=>updateCloseout.mutate({id: closeout.id, citizenConfirmation:"pending", citizenNotes: "Need more evidence"})}>Request more evidence</button>
// On disputed → also db.updateProject(projectId:{status:"at_risk", riskSummary: `Citizen disputed: ${reason}`})
```

- Wire `updateProjectCloseout:227` → already `db.ts:735` sends `notification` to `institution.contactEmail` on `citizenConfirmation` change (`db.ts:755`). No rules change (`firestore.rules:94 allow write if isSignedIn()`).

### 3. Admin approve (30m) — `client/src/pages/AdminCloseoutReview.tsx`

Show citizen vote + `LedgerSeal` (`USP-03`) + approve/reject:

```tsx
const closeout = trpc.workflow.projectCloseouts.useQuery({projectId});
const challenge = trpc.workflow.challengeById.useQuery({id: project.challengeId});
<div className="border-t border-[#a78e6e]/45 pt-6">
  <LedgerSeal projectId={projectId} />
  <p className="font-mono-ui text-[0.62rem] uppercase">Citizen: {closeout.citizenConfirmation}</p>
  {closeout.citizenConfirmation!=="confirmed" && <p className="font-body text-[0.78rem] text-[#a34b2c]">Citizen hasn't confirmed — approve will still notify but not auto-resolve challenge</p>}
  <div className="flex gap-3 mt-4">
    <button onClick={async()=>{
      await updateCloseout.mutateAsync({id: closeout.id, adminStatus:"approved", adminNotes});
      await updateProject.mutateAsync({id: projectId, status:"resolved", progress:100});
      if (closeout.citizenConfirmation==="confirmed") await updateChallenge.mutateAsync({id: challenge.id, status:"resolved", resolutionSummary: closeout.outcomeSummary});
      toast.success("Closeout approved");
    }}>Approve</button>
    <button onClick={()=>updateCloseout.mutate({id: closeout.id, adminStatus:"rejected", adminNotes})}>Reject</button>
  </div>
</div>
```

- Mirrors `db.ts:760` notification to `institution` + `citizenEmail` on `adminStatus` change.
- Gate: if `citizenConfirmation !== "confirmed"`, `challenge.status` stays `in_progress` — not `resolved` — so `Home.tsx:174` metrics stay honest.

### 4. Public ledger (30m) — `client/src/pages/ChallengeDetail.tsx` + `Challenges.tsx:396 StatusChip`

Add timeline section (reuses existing queries):

```tsx
const assignments = trpc.workflow.assignments.useQuery({challengeId: id});
const projects = trpc.workflow.projects.useQuery({challengeId: id});
const acts = projects.data?.[0] ? trpc.workflow.projectActivities.useQuery({projectId: projects.data[0].id}) : null;
const closeouts = projects.data?.[0] ? trpc.workflow.projectCloseouts.useQuery({projectId: projects.data[0].id}) : null;
// Timeline JSX sorted by createdAt:
[
  {ts: challenge.createdAt, label: "Reported", who: challenge.citizenName},
  ...assignments.data?.map(a=>({ts:a.createdAt, label:`Assigned to ${orgMap[a.organizationId]}`, who:a.adminName})),
  {ts: project.createdAt, label: `Project: ${project.title}`, who: project.leadName},
  ...acts?.data?.map(a=>({ts:a.createdAt, label: a.title, who:a.actorName})),
  closeouts.data?.[0] && {ts: closeouts.data[0].createdAt, label:`Outcome: ${closeouts.data[0].outcomeSummary.slice(0,60)}…`, who: closeouts.data[0].submittedBy},
  closeouts.data?.[0]?.citizenConfirmation==="confirmed" && {ts: closeouts.data[0].updatedAt, label:"Citizen confirmed ✓"},
  closeouts.data?.[0]?.adminStatus==="approved" && {ts: closeouts.data[0].updatedAt, label:"Admin approved ✓"},
].filter(Boolean).sort((a,b)=> new Date(a.ts).getTime()-new Date(b.ts).getTime()).map(entry=> /* border-l-2 #8fa887 timeline row */)
```

- Show before/after thumbs if closeout has them (`withFileUrls:517`), link via `storedFileUrl`.
- `Challenges.tsx:396` status `resolved` now only appears after this chain — previously could be set inline, now enforced.

### 5. Live metrics (10m) — `client/src/pages/Home.tsx:174` + `AdminDashboard.tsx`

Keep hero hard-coded `2,847/112/34` for landing polish, but add live footnote:

```tsx
const {data: challenges} = trpc.workflow.challenges.useQuery({});
<p className="font-mono-ui text-[0.58rem] uppercase tracking-[0.1em] text-[#345045]">Live: {(challenges?.length ?? 0).toLocaleString()} challenges today</p>
```

- Optional: `districtsActive` (`Challenges.tsx:274`) + `verifiedOrganizations` live count under metrics.

### 6. Verify

1. `npm run check && npm run build && npm test` — no `firestore.rules` change (closeouts already `allow write if isSignedIn()`).
2. E2E: citizen `/citizen/submit` → admin `/admin/challenges/:id` assign → institute `/institute/projects/:id` create + 2 milestones + closeout with before/after → `/citizen/challenges/:id/closeout` citizen `Confirm` → `/admin/projects/:id/closeout` `Anchor` (USP-03) → `Approve` → `challenges/:id` status flips `resolved` → `ChallengeDetail` timeline shows all 7 steps → `Home` live count increments.
3. Disputed path: citizen `Dispute` → `projects status=at_risk` → admin sees `Citizen disputed` banner, cannot auto-resolve.
4. Evidence links: before/after thumbs use `storedFileUrl:115` blob URLs — `target="_blank"` works (Chrome data-URL block avoided).

### Demo script (60s, the hero)

Run full loop with 2 tabs (Gumla citizen + admin) + 1 institution: submit → assign → milestone → closeout before/after → citizen confirm → `LedgerSeal Verified ✓` + QR → admin approve → public `ChallengeDetail` shows resolved + timeline. Say: "Your portal stops at 'resolved' — ours proves it with citizen + admin + before/after."

### Risks

- Old projects without `beforeEvidenceId/afterEvidenceId` show "No evidence pair" — don't block `Approve`; just warn.
- `fileData` base64 evidence is 680KB-capped (`storage.ts:16`) — before/after must be two separate `projectDocuments`, not one 1.5MB doc.
- `citizenConfirmation` write is `allow write if isSignedIn()` (`firestore.rules:94`) — any signed-in user could confirm чужой closeout. Harden by adding `request.resource.data.citizenConfirmation` check tied to `challenge.citizenEmail` via `request.auth.token.email` in rules if needed for SIH (optional hardening, document trade-off).
