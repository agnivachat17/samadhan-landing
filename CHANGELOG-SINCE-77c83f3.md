# Changelog — Changes since `77c83f3`

Base commit: `77c83f321b0d6860235986675da8d33f7496f075`

All features, fixes, and infrastructure changes implemented in this session.

---

## 1. Invite-Based Faculty & Student Onboarding System

**Files:** `StudentOnboarding.tsx`, `FacultyOnboarding.tsx`, `Login.tsx`, `SignUp.tsx`, `App.tsx`, `InstituteHeader.tsx`, `db.ts`, `userProfile.ts`, `firestore.rules`

The core new feature. Institutes can now invite faculty and students via tokenized links. The flow is:

1. **Admin creates invite** — stored in `organizationInvites` collection with a token, role (`faculty`/`student`), and linked org.
2. **Invitee clicks the link** — lands on `/login?invite=<token>` or `/signup?invite=<token>`.
3. **Accepted in Login or SignUp**:
   - **Login page** — if the user already has an account, the invite banner shows and they can accept directly. After login, the account is auto-linked to the org via `updateUserProfile`, the invite is consumed, and the user is routed to the appropriate onboarding page.
   - **SignUp page** — if the user is already logged in, an "Accept with this account" button is shown inline. New signups store the invite in `localStorage` under `samadhan-invite` and redirect to the role-specific onboarding page.
   - If signup fails with "already exists", a link to `/login?invite=<token>` is shown.
4. **Onboarding pages** (`/student/onboarding`, `/faculty/onboarding`) — on mount, read the stored invite from `localStorage`, link the user to the org (`role: "institution"`, `memberRole: "student"|"faculty"`, `organizationId`), consume the invite token, then present the profile completion form.
5. **Role-based routing** — `App.tsx` adds `instituteAdminGuarded()` for admin-only institute routes (challenges, projects, profile). Students and faculty are redirected to `/institute/dashboard` if they try to access admin routes. New routes added:
   - `/student/onboarding` — student first-time profile completion
   - `/student/profile` — student profile editing
   - `/faculty/onboarding` — faculty first-time profile completion
   - `/faculty/profile` — faculty profile editing

### Firestore Rules Changes
- **`users/{uid}` read rule** — added `callerOrgId()` check so same-org members can read each other's profiles (needed for `LinkedStudentsPanel`).
- **`users/{uid}` write rule** — removed the `isOrgOwner` check on `organizationId` for faculty/student invites (without this, invitees hitting "Missing permissions" on login). Faculty/students can now claim `organizationId` via invite token.
- **`organizationMembers` update rule** — students can update their own member record (for onboarding profile sync), with strict field constraints (`organizationId`, `email`, `memberRole`, `fullName` cannot change).
- **`organizationInvites` update rule** — fixed `usedByUid` null-check logic to use `resource.data.get('usedByUid', null)` for safe access on documents where the field may not exist yet.

### InstituteHeader Role-Awareness
`InstituteHeader.tsx` now reads `useMemberRole()` context and renders different nav sets:
- **Admin** sees: Dashboard, Challenges, Active projects, Profile
- **Faculty** sees: Dashboard, Profile (links to `/faculty/profile`)
- **Student** sees: Dashboard, Profile (links to `/student/profile`)

---

## 2. Faculty Profile Management

**Files:** `FacultyOnboarding.tsx`, `FacultyProfile.tsx`

### FacultyOnboarding (new page)
- First-time form: department, designation, expertise (comma-separated), "Available to mentor" checkbox, bio.
- On submit: saves `facultyProfile` sub-object to user profile (`department`, `designation`, `expertise`, `mentorAvailable`, `bio`, `onboardingCompleted: true`).
- **Syncs to `organizationMembers`** — queries the member doc by `(organizationId, email)` and writes department/designation/expertise/mentorAvailable so the institute's student directory displays consistent data.
- Skip option available ("Skip for now" goes to dashboard).

### FacultyProfile (new page)
- Edit form for all faculty fields plus name and phone.
- Same orgMembers sync on save.
- Reads org name for display context.

---

## 3. Student Profile Management

**Files:** `StudentOnboarding.tsx`, `StudentProfile.tsx`

### StudentOnboarding (new page)
- First-time form: department, programme (B.Tech/M.Tech/Diploma), year, semester, skills (comma-separated), GitHub URL, LinkedIn URL, bio.
- Required fields: department, programme, year.
- On submit: saves `studentProfile` sub-object with all fields plus `onboardingCompleted: true`.
- **Syncs to `organizationMembers`** — writes `department`, `program`, `academicYear`, `skills` to the member doc for directory display.
- Skip option available.

### StudentProfile (new page)
- Edit form for all student fields plus name and phone.
- Same orgMembers sync on save.

---

## 4. Enhanced Duplicate Challenge Detection

**Files:** `duplicateCheck.ts`, `DuplicateWarningDialog.tsx`, `SubmitChallenge.tsx`

Completely rewritten from a simple title-overlap check to a multi-signal duplicate detector:

- **Pre-filtering** — only compares challenges in the same district AND same domain (cross-domain ≠ duplicate). Resolved/rejected challenges are excluded.
- **Title similarity** — word-overlap after tokenization, filtering stopwords and words < 4 chars.
- **Description second-pass** — when title similarity is borderline (0.4–0.6), description similarity is blended in (60% title + 40% description) to reduce false negatives from generic titles like "Water problem".
- **Threshold** — 0.5 (50%) combined similarity flags a duplicate.

### DuplicateWarningDialog (new component)
Paper-aesthetic Radix `Dialog` matching the site's design. Shows:
- The matched challenge's domain, district, and similarity percentage.
- Matched title and truncated description.
- Two CTAs: "View & upvote this report →" (navigates to the existing challenge) and "Submit anyway" (dismisses and proceeds).

### Duplicate count tracking
`db.ts` `incrementDuplicateCount()` bumps a `duplicateCount` field on the challenge document (type-only addition to schema, schemaless in Firestore).

---

## 5. Hindi Speech Synthesis (Text-to-Speech)

**Files:** `SubmitChallenge.tsx`, `db.ts` (indirectly via duplicate check integration)

Added a "Read in Hindi" button on the challenge description field that uses the browser's `SpeechSynthesis` API:

- **Voice selection** — attempts to find a Hindi voice (`hi-IN` or `hi` lang prefix) from the system's installed voices. Falls back to the first available voice if no Hindi voice is found.
- **Improved voice selection logic** — iterates all available voices, prefers exact `hi-IN` match, then any voice with `hi` in its lang code, then any available voice as last resort.
- **Playback control** — toggle between play/stop; stops any ongoing speech before starting a new one.
- Used on the challenge description field in `SubmitChallenge.tsx` to let citizens hear the description read back in Hindi for accessibility.

---

## 6. LinkedAccountsPanel

**Files:** `dc6b475` commit, referenced in `InstituteProfile.tsx`

A panel component that displays linked faculty and student accounts within an institute's profile view. Shows the member's name, email, role (faculty/student), department, and other profile details pulled from `organizationMembers`.

---

## 7. GROQ API Key Injection & Debug Endpoint

**Files:** `worker/index.ts`, `client/src/lib/groqClient.ts`, `vite.config.ts`, `wrangler.jsonc`

- **Cloudflare Worker** (`worker/index.ts`) — enhanced to inject the GROQ API key into the HTML response at build time via a placeholder replacement, and added a `/debug/key-check` endpoint for verifying the key is present (returns masked version of the key for debugging without exposing it).
- **`groqClient.ts`** — updated to read the key from the injected HTML/meta or environment, with improved error handling.
- **`wrangler.jsonc`** — added the GROQ API key as a worker variable.
- **`vite.config.ts`** — updated glob patterns to exclude JavaScript files from caching to prevent stale bundles.

---

## 8. Caching & Asset Loading Fixes

**Files:** `vite.config.ts`, `worker/index.ts`

- **`globPatterns`** updated to exclude `*.js` from caching so service worker updates propagate immediately (fixes stale JS bundles after deploy).
- **Asset fetching** enhanced in the Cloudflare Worker to prevent caching of `index.html`, ensuring users always get the latest version of the app.

---

## 9. Evidence File Upload Fix

**Files:** `SubmitChallenge.tsx`

Fixed a bug where the same file could be added multiple times to the evidence list during submission. Added deduplication logic before attaching files to prevent duplicate evidence entries.

---

## 10. Workflow / CI Infrastructure

**Files:** `.github/workflows/sync-fork.yml`, `.opencode/`

- **Sync-fork workflow** — multiple iterations to make the `agnivachat17/samadhan-landing` fork auto-sync from upstream. Changes included:
  - Granting `workflows:write` permission so the workflow can push upstream workflow-file changes.
  - Making the workflow self-healing across upstream merges (handles modify/delete conflicts when upstream lacks the sync-fork file).
  - Ultimately removed from the upstream repo (since it's fork-specific housekeeping).
- **OpenCode config** — added `.opencode/opencode.json` and `.opencode/plugins/graphify.js` for the Graphify code analysis plugin.

---

## Summary of New Files

| File | Purpose |
|------|---------|
| `client/src/pages/StudentOnboarding.tsx` | Student first-time profile completion page |
| `client/src/pages/StudentProfile.tsx` | Student profile editing page |
| `client/src/pages/FacultyOnboarding.tsx` | Faculty first-time profile completion page |
| `client/src/pages/FacultyProfile.tsx` | Faculty profile editing page |
| `client/src/components/DuplicateWarningDialog.tsx` | Modal warning citizens about potential duplicate challenges |
| `docs/ARCHITECTURE.md` | Architecture documentation |

## Summary of Modified Files

| File | Changes |
|------|---------|
| `client/src/App.tsx` | New routes for student/faculty onboarding + profiles, `instituteAdminGuarded` wrapper |
| `client/src/components/InstituteHeader.tsx` | Role-aware nav (admin/faculty/student see different menus) |
| `client/src/pages/Login.tsx` | Invite flow integration — banner, auto-linking, role-based redirect |
| `client/src/pages/SignUp.tsx` | Invite flow — "Accept with current account", already-exists link, localStorage invite handoff |
| `client/src/pages/SubmitChallenge.tsx` | Hindi TTS button, improved duplicate check integration, file dedup fix |
| `client/src/lib/duplicateCheck.ts` | Complete rewrite — domain filter, description second-pass, stopword filtering |
| `client/src/lib/userProfile.ts` | Added `studentProfile`/`facultyProfile` sub-object support, `memberRole` field |
| `client/src/lib/db.ts` | `incrementDuplicateCount`, `consumeInvite` integration, email handling improvements |
| `client/src/lib/groqClient.ts` | Improved key injection and error handling |
| `client/src/lib/matching.ts` | Institution matching logic improvements, email handling |
| `client/src/pages/InstituteProfile.tsx` | Added LinkedAccountsPanel, student/faculty directory display |
| `client/src/pages/InstituteChallenges.tsx` | Simplified for admin-only view |
| `client/src/pages/InstituteDashboard.tsx` | Student/faculty-aware dashboard view |
| `firestore.rules` | Users read (org-member), users write (invite claim), orgMembers update (student self-update), invites update (safe null-check) |
| `worker/index.ts` | GROQ key injection, debug endpoint, asset caching fixes |
| `vite.config.ts` | Glob pattern update for cache exclusion |
| `wrangler.jsonc` | GROQ API key worker variable |
