# Update 1 — Institution Self-Enrollment for Challenges

## Summary

Institutions could only work on challenges an admin had explicitly assigned via `assignments`. There was no way for a verified institution to browse open challenges and enroll itself. This update adds a self-enrollment flow so an institution can, from the **review button** on `institute/challenges/:id` (and from the public `challenges/:id` and the `institute/challenges` list), enroll for a challenge. The enrolled challenge is added to that institution's queue and the existing Accept → Create project → Workspace flow takes over without changes.

## Problem

- `InstituteChallenges.tsx` only showed challenges where an `assignments` record already existed for the selected `organizationId`.
- `InstituteChallengeReview.tsx` only rendered the delivery handoff if `eligibleInstitutions.length > 0` (derived from `assignments`). No assignment → "No institution assignment is available" with no CTA.
- An institution that discovered a relevant open challenge on the public directory had no path to claim it.

## Solution Overview

```
Before:
  Admin --assignChallenge--> assignment (status: pending) --> Institute queue --> Accept --> Create Project

After (new path added, admin path unchanged):
  Institution --enrollChallenge--> assignment (status: pending, selfEnrolled: true)
    --> Institute queue (same list) --> Accept --> Create Project
```

Both paths converge on the same `assignments` record shape. The new `selfEnrolled` flag is the only distinction, used for badge/label only.

## Files Touched

| File                                                | Change                                                                                                                                                                                                                                                                                                                                                           |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `drizzle/schema.ts:161`                             | Added `selfEnrolled: boolean("selfEnrolled").default(false)` to `assignments` table (type-only, schemaless in Firestore — no migration, existing docs read as `undefined` → treated as `false`)                                                                                                                                                                  |
| `client/src/lib/db.ts:439`                          | Added `enrollChallenge({ challengeId, organizationId, organizationName })` — validates verified institution, rejects resolved/rejected challenges, duplicate-checks via `listAssignments`, creates assignment `{ adminName: "Self-enrolled", status: "pending", selfEnrolled: true }`                                                                            |
| `client/src/lib/trpc.ts:120`                        | Registered `enrollChallenge` in `workflowProcedures` shim → `trpc.workflow.enrollChallenge.useMutation()` available everywhere                                                                                                                                                                                                                                   |
| `client/src/pages/ChallengeDetail.tsx`              | Sidebar: added `meQuery` + `myOrganization` + `myAssignment` + `enrollMutation`. New section "Institution enrollment" shown only for `role === "institution"`: shows "already enrolled" card with link to `/institute/challenges/:id` if assignment exists, otherwise Enroll button (disabled if not verified). Verifies via `myOrganization.verificationStatus` |
| `client/src/pages/InstituteChallenges.tsx`          | Added `availableChallenges` (open challenges not in `queuedChallengeIds`, clubbed from `challengesQuery`), `selectedInstitution`, `enrollMutation` + `handleEnroll`. New section below assigned queue: "Available challenges — Enroll for open challenges" with `View · Enroll` per card. Queue rows now show `· self-enrolled` suffix                           |
| `client/src/pages/InstituteChallengeReview.tsx:248` | Added self-enrolled badge under the institution select when `assignment.selfEnrolled && status === "pending"` — amber dot + "Self-enrolled — you enrolled for this challenge"                                                                                                                                                                                    |

## Data Model

`assignments` document (Firestore `assignments/record-{id}`):

```ts
{
  id: number              // numeric via createRecord
  challengeId: number
  organizationId: number  // institution id
  adminName: "Self-enrolled" | "<admin name>"
  rationale: "Self-enrolled by <org name>" | "<admin rationale>"
  status: "pending" | "accepted" | "declined" | "cancelled"
  selfEnrolled?: boolean  // true = institution-initiated, undefined/false = admin-initiated
  createdAt: Date
  updatedAt: Date
}
```

- No `firestore.rules` change needed — `assignments` already `allow write: if isSignedIn()` (and `allow read: if true` per current rules)
- `listAssignments` filters by `organizationId`/`challengeId` remain the same; new records are included automatically
- Existing `updateAssignment` (Accept/Decline) works for self-enrolled records with no change

## UI Flow

### 1. Public challenge page — `challenges/:id`

- Logged-in institution user sees new sidebar card "Institution enrollment"
- If not yet enrolled → Enroll button (verified-only; otherwise verificationStatus message). On success: toast "Enrolled successfully" + assignments invalidated
- If already enrolled → card shows `You enrolled · pending` or `Assigned · accepted` + "Open in institute workspace" link to `institute/challenges/:id`

### 2. Institution queue — `institute/challenges`

- Top: "My assignments" (unchanged) — now shows `· self-enrolled` tag on self-enrolled rows
- Below: "Available challenges" — every open challenge (`status !== resolved/rejected`) not in the queued IDs, rendered with `View` (public detail) + `Enroll` pill. Disables if not verified

### 3. Review page — `institute/challenges/:id`

- If assignment is `selfEnrolled: true && status === "pending"` → amber badge "Self-enrolled — you enrolled for this challenge" under the institution dropdown, before the Accept/Decline buttons
- Accept still creates the delivery project and navigates to `institute/projects/:id`

## Behavior & Edge Cases

- **Duplicate enroll**: `enrollChallenge` checks `listAssignments(challengeId, organizationId)` first; throws "already enrolled" if found. UI disables after first success via `myAssignment` becoming truthy on next fetch
- **Unverified institution**: blocked in `db.enrollChallenge` with "Only verified institutions may enroll" + disabled Enroll button with tooltip in `InstituteChallenges`
- **Resolved/Rejected challenge**: blocked with "no longer open for enrollment"
- **Race**: If two tabs enroll concurrently, the second create will find the first's assignment on the duplicate check; no transaction needed (worst case is two assignments for same org — still caught on refetch, but creation is a single `createRecord` which generates unique numeric IDs; duplicate check is best-effort. A transaction would be overkill here)
- **Admin view**: Admin still creates assignments via `assignChallenge` (no `selfEnrolled` flag). Admin's Challenge list shows both types

## Verification

```bash
npm run check  # tsc --noEmit — pass
npm run build  # vite build — pass (3211 modules)
npm run test   # vitest — 11/11 pass (firestore.rules unchanged)
npm run format # prettier — clean
```

### Manual QA (what this shipping commit was verified against)

1. Fresh institution account (verified) → `/challenges/730010` detail → sidebar shows Enroll → click → toast "Enrolled successfully" → sidebar now shows "You enrolled · pending" + link to review
2. `/institute/challenges` → Enrolled challenge now appears in top queue → `Review` → badge "Self-enrolled — you enrolled..." → `Accept` → Create project form enables → create → navigates to workspace
3. Re-visit same challenge → Enroll button gone, "already enrolled" card shown (no duplicate)
4. Public page as anonymous → no Enroll card (institution-only section hidden)
5. Unverified institution → Enroll disabled with verification message (and server rejects if console-forced)
6. Second institution can still enroll for same challenge (different `organizationId`)

## Deploy

- No rules deploy needed (`firestore.rules` unchanged)
- Standard `npm run deploy` ships the client

## Not Changed

- `firestore.rules`, `vite.config.ts`, `wrangler.jsonc`, `main.tsx`, `App.tsx` routes, headers, language auto-translation layer
- Admin assignment flow, citizen/industry flows
