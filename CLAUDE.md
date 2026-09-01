# CLAUDE.md

Guidance for Claude Code (or any future engineer) working in this repository. This file reflects the **actual current implementation**, verified by reading the code — not aspirational design. Where something is genuinely ambiguous, it's marked `UNCLEAR` rather than guessed.

## Project overview

**Samadhan** is a civic-innovation platform (built for a Jharkhand government hackathon / SIH-style submission) that connects three kinds of participants around local civic problems:

- **Citizens** report challenges (water, health, safety, digital access, etc.) with location, description, and district.
- **Institutions** (colleges, universities, research centers) apply to join, get verified by an admin, and turn assigned challenges into delivery **projects** (milestones, documents, team members).
- **Industry partners** apply similarly and back institution-led projects with funding/expertise/CSR support (`industryInterests`).
- **Admins** verify/moderate organizations, assign challenges to verified institutions, review project closeouts, and oversee the whole workflow.

The data model (see `shared/workflow.ts`) is intentionally a single pipeline: `challenge → assignment → project → closeout`, with citizen confirmation and admin approval as the final steps.

## Working in this repo — read this first

**Every Claude Code session in this repository must read this file before doing any work**, and must treat it as the current source of truth for architecture, conventions, and deployment — not the training-time defaults for a "typical React app."

**MANDATORY CLAUDE.md MAINTENANCE RULE:** Whenever Claude Code reads this file and performs work in this repository based on its instructions, it MUST update `CLAUDE.md` before finishing that work/session whenever there is any new information, change, decision, convention, architectural detail, deployment detail, configuration change, discovered issue, resolved issue, or other project knowledge that would be useful for a future Claude Code session. Do not wait for the user to explicitly ask for `CLAUDE.md` to be updated — treat keeping it current as a required part of every work session, the same as running `npm run check`. Never remove existing useful documentation just because it is inconvenient to update; instead, edit it carefully so the file stays an accurate description of the _current_ repository, correcting anything that has become outdated rather than leaving stale claims alongside new ones. Do not turn this file into a chronological diary of every small action taken in a session — keep entries as durable facts about the codebase's current state and hard-won lessons, not a changelog.

## Tech stack

- **Frontend**: React 19 + Vite 7 + TypeScript, `wouter` for routing (not react-router), TanStack Query, Tailwind CSS v4, shadcn/ui-style components (`client/src/components/ui`), Framer Motion for animation, `sonner` for toasts.
- **PWA / Offline**: `vite-plugin-pwa` (auto-generated `sw.js` + Workbox runtime caching), `idb` (IndexedDB wrapper for offline queue), `workbox-window` (SW registration). Enabled `enableIndexedDbPersistence(db)` for Firestore reads offline. Manifest at `client/public/manifest.json`.
- **Hash chain**: `SubtleCrypto SHA-256` (native, no dep) for USP-03 ledger hashes. `qrcode` (lazy) for anchor QR codes.
- **API layer**: **none — there is no backend.** The browser talks to Firestore directly via the Firebase client SDK. `client/src/lib/trpc.ts` is a _shim_ that preserves the old tRPC call shape (see "Client-side data layer" below); it is not tRPC and there is no server to call.
- **Backend runtime**: **none.** The app is a pure static SPA. `server/`, `api/`, Express, tRPC, and `firebase-admin`-in-a-request-path have all been deleted.
- **Primary datastore**: **Cloud Firestore**, accessed **directly from the browser** with the Firebase client SDK. All application records (organizations, challenges, projects, users, notifications, etc.) live in Firestore, and `firestore.rules` is the sole access-control boundary.
- **File storage**: **none — files are stored as base64 inside the Firestore record that references them** (`client/src/lib/storage.ts`). Firebase Cloud Storage requires the Blaze plan; this project stays on **Spark (free)**, so it is deliberately not used.
- **Authentication**: **Firebase Authentication** (client SDK `firebase/auth` only — there is no server left to verify tokens). See the dedicated Authentication section below.
- **Legacy/unused**: `drizzle-orm` (`drizzle/schema.ts`) — a **type source only**, never a live database. Import it with `import type` so it stays out of the bundle.
- **OCR**: `tesseract.js` — used only by `SubmitChallenge.tsx`'s handwriting-scan button (see "Bhasha & Bol" below). Always dynamically `import()`-ed, never a top-level import, so it stays out of the main bundle and only loads on demand.
- **Testing**: Vitest (`npm test`). `tests/firestore.rules.test.ts` checks the real project's rules boundary over the REST API as an anonymous caller — **no credentials needed**, and it is now the primary safety net for access control.

## Project / folder structure

```
client/public/
  images/         Static image assets (hero photo, paper-grain/contour textures, challenge
                    thumbnails, the Jharkhand map/choropleth/government seal) referenced
                    throughout the app as `/images/<file>`. See docs/LOCAL_ASSET_MANIFEST.md.
client/src/
  pages/          One file per route (see "Routing" below). Mostly self-contained,
                   large single-return JSX with local sub-components at the bottom.
  components/      Shared UI. Notably:
                     AccountMenu.tsx        - auth-aware header widget: signed-out renders the Sign in/up action button;
                                              signed-in renders a rounded avatar-pill trigger (Radix `DropdownMenu` +
                                              shadcn `Avatar`, `client/src/components/ui/dropdown-menu.tsx` /
                                              `ui/avatar.tsx`) that opens a paper-styled dropdown with the user's name/
                                              email/role, a Dashboard link, a role-specific secondary link
                                              (settings for citizen/admin, org profile for institution/industry -
                                              only once `organizationId` exists), and an async Sign out item with a
                                              spinner + sonner toast. The avatar shows the Firebase `user.photoURL`
                                              (populated for Google/Facebook sign-in) via `AvatarImage`, falling back
                                              to initials.
                     ProtectedRoute.tsx      - the route guard (see Auth section)
                     OrganizationStatus.tsx  - shared animated verification/standing status screen
                     PublicPortalHeader.tsx / AdminHeader.tsx / InstituteHeader.tsx / IndustryHeader.tsx
                       - one header per "realm"; all render <AccountMenu/> for the sign-in/account area.
                       Every nav item's `href` must point at a route that actually exists - a past pass
                       left several as `href: "#top"` placeholders (dead links) and one
                       (`IndustryHeader`'s "Institutions") pointed at `/institute/dashboard`, the wrong
                       role's dashboard, both since fixed. `InstituteHeader`/`IndustryHeader` take an
                       `active` prop to highlight the current section; don't add a nav item without also
                       deciding what `active` value highlights it.
                     DashboardLayout.tsx     - a sidebar shell that is NOT currently used by any route (dead/scaffold code, left as-is)
                      AuthRequiredDialog.tsx  - shared "sign in to continue" gate, built on `ui/dialog.tsx` (Radix) rather
                                               than a hand-rolled fixed/backdrop-blur div, for any action a guest can see
                                               but not perform (currently: upvoting a challenge on `Challenges.tsx` /
                                               `ChallengeDetail.tsx`). Reuse this rather than rolling another one-off modal.
                      LedgerSeal.tsx          - USP-03: hash-anchored ledger verification seal; shows Verified ✓ (N links)
                                               or Tampered at #K ✗; QR links to admin-anchored Merkle root via lazy
                                               `qrcode` import. Wired into `InstituteProjectWorkspace.tsx` and
                                               `AdminCloseoutReview.tsx`.
                      InteractiveMap.tsx      - Leaflet wrapper; takes a `blurred?: boolean` prop that applies a real
                                              CSS `filter: blur()` (+ `pointer-events-none`) directly on the map's own
                                              container. This exists because `backdrop-filter: blur()` on an overlay
                                              ABOVE the map does not blur Leaflet's tile layer - each `.leaflet-tile` is
                                              positioned with `transform: translate3d(...)`, which promotes it to its
                                              own GPU compositing layer that browsers exclude from backdrop-filter
                                              sampling, so the map stayed crisp while the rest of a page blurred behind
                                              a modal. Pass `blurred` down from whatever page-level modal/dialog state
                                              is open; don't try to fix this with z-index or `isolate` - it's not a
                                              stacking-order bug, it's a compositing one, and it can only be fixed on
                                              the map's own element.
                     ui/                    - shadcn-style primitives (button, dialog, sonner toaster, etc.)
                     VoiceCapture.tsx        - "Bhasha & Bol" Hindi/English voice-to-form-fill widget (Web Speech API,
                                              on-device, no server). Used only by `SubmitChallenge.tsx`. See the
                                              dedicated section below and `client/src/lib/bhasha.ts`.
  hooks/
    useAuth.tsx     - React context wrapping Firebase's onAuthStateChanged (see Auth section)
  lib/
    firebase.ts     - Firebase client SDK init + auth helper functions
    roles.ts        - Role type + dashboardPathForRole() (single source of truth for "where does this user land")
    trpc.ts         - the API shim: preserves the tRPC call shape over direct Firestore calls
    db.ts            - Firestore data layer (port of the old server/workflow.ts)
    userProfile.ts    - users/{uid} profile CRUD + admin-claim role resolution
    storage.ts         - inline file storage: image compression + base64/object-URL handling
    ledger.ts          - USP-03: SubtleCrypto SHA-256 chain hash utilities (chainHash, fileDataHash, merkleRoot, verifyChain)
    offlineQueue.ts    - USP-01: IndexedDB offline challenge draft queue (queueChallengeDraft, drainQueue)
    bhasha.ts            - shared naive keyword parser (`parseBhashaText`) for voice transcripts and OCR text,
                            used by both `VoiceCapture.tsx` and `SubmitChallenge.tsx`'s handwriting-scan button
  contexts/ThemeContext.tsx
  App.tsx           - route table (wouter <Switch>), wraps routes in ProtectedRoute where needed
  main.tsx          - React root, AuthProvider, QueryClientProvider (no API client — there is no API)

shared/
  workflow.ts        - shared status/stage enums + route-path constants, used by both client and server
  types.ts            - re-exports drizzle schema types + shared/_core/errors
  const.ts             - UNAUTHED_ERR_MSG / NOT_ADMIN_ERR_MSG (tRPC error message constants)
  _core/errors.ts       - HttpError + BadRequestError/UnauthorizedError/etc. constructors

drizzle/
  schema.ts           - MySQL table definitions — used ONLY as a TypeScript type source now (see below),
                         not a connected database.

firestore.rules       - THE access-control boundary; see Firestore section. Load-bearing.
firebase.json           - points Firebase CLI at firestore.rules
wrangler.jsonc           - Cloudflare Workers static-asset config (SPA fallback)
tests/                    - Vitest tests (rules boundary check)

docs/                   - all non-CLAUDE.md project documentation (research notes, verification logs,
                          setup notes, todo/ideas lists, asset manifests, a plain-text route list).
                          CLAUDE.md itself stays at the repo root (Claude Code looks for it there).
scripts/                - one-off dev tooling: screenshot.mjs (Playwright page screenshots for visual QA),
                          grant-admin.mjs (sets the `admin` custom claim — the only way to create an admin).
                          **`screenshot.mjs`'s `waitUntil: "networkidle"` does not reliably resolve on pages
                          that use the Firestore SDK** — Firestore holds a long-lived connection open, so the
                          page can sit well past `networkidle`'s "no network activity for 500ms" threshold and
                          the script times out. Any authenticated/data page needs `waitUntil: "domcontentloaded"`
                          plus a fixed `waitForTimeout` instead; this affects most routes in the app, not just
                          the obviously "authenticated" ones, since even public pages like `/challenges` query
                          Firestore.
```

## Frontend architecture

- **Routing**: `wouter`, defined entirely in `client/src/App.tsx` as a flat `<Switch>`. No nested layouts/route trees.
- **Data fetching**: React Query via the `trpc` shim in `client/src/lib/trpc.ts`. Pages still call `trpc.<router>.<procedure>.useQuery/useMutation` exactly as before, but those now run Firestore calls in-browser rather than HTTP requests. See "Client-side data layer".
- **Styling**: Tailwind v4, custom CSS variables in `client/src/index.css` define the site's actual palette (`--background`, `--primary`, etc., all `oklch()`) ("civic editorial paper" aesthetic: cream backgrounds, ember/orange accents `#c94a20`-ish, forest green text, `font-display` serif for headings, `font-mono-ui` for labels/buttons, `font-body` for prose). Match this palette/typography when adding UI.
  - **Corners are rounded, not square.** The site originally shipped with `--radius-*: 0px` (deliberately square) but was changed on explicit request to feel more like a normal modern site. `--radius-sm/md/lg/xl` in `client/src/index.css` are now `0.375rem`/`0.625rem`/`0.875rem`/`1.25rem`, which rounds every shadcn `ui/` primitive (Button, Dialog, Card, Input, Badge, Popover, DropdownMenu, ...) automatically. `.auth-input` / `.citizen-input` (the hand-rolled form-field classes used across ~20 pages) got an explicit `border-radius: 0.625rem` to match. Real "button" elements across the ~37 page components (`<button>`/`<a>`/`motion.a`/`motion.button` with a solid non-hover `bg-[#hex]` or a full border+padding chip) were rounded individually with `rounded-full` (pills/circles) since they're hardcoded inline Tailwind strings, not theme-token-driven — there is no single switch for those. Large selectable cards (e.g. the role picker on `SignUp.tsx`) use `rounded-2xl` instead of `rounded-full`, since a full pill on something that tall looks wrong. **Exception, deliberately not rounded:** `client/src/components/ui/sonner.tsx` toasts stay `!rounded-none` — a past version of the toast styling was fixed for a contrast bug and the square shape is part of that fix, not an oversight.
  - **`AccountMenu.tsx`'s avatar/trigger is `rounded-full`** even where the rest of a page stays square-ish — see the component note below.
  - **`rounded-full` is for actual buttons/pills/chips/circular icon buttons only** — not for data rows, notification/evidence cards, or the file-upload dropzone. A previous rounding pass mistakenly added `rounded-full` to `CitizenDashboard.tsx`'s `SubmissionRow` (a full-width table row), `Notifications.tsx`'s notification card, `ChallengeDetail.tsx`'s evidence-file card, and `SubmitChallenge.tsx`'s upload dropzone — each is a wide, short, non-button container, so `rounded-full` produced a distorted stadium/pill shape instead of a normal card. All four were fixed by removing `rounded-full` (leaving them square-cornered, consistent with every other card/row in the app). If you're doing another rounding pass, only touch elements that are genuinely clickable single-action buttons/links styled as pills — leave containers/rows/cards alone.
- **Toasts**: `client/src/components/ui/sonner.tsx` is customized (not stock shadcn) — `richColors` + custom `classNames` to match the paper aesthetic and guarantee contrast. Don't revert this to the stock config; a past version of it was nearly unreadable (near-white text on near-white background).
- **No global state library** beyond React Query's cache and the two React Contexts (`AuthProvider`, `ThemeProvider`).

## Client-side data layer (there is no backend)

The server was deleted. Every read and write goes browser -> Firebase client SDK -> Firestore, and **`firestore.rules` is the only thing enforcing access control.** There is no server-side validation left anywhere: the zod input schemas died with the tRPC router.

Three files replace the whole `server/` tree:

- **`client/src/lib/db.ts`** - a near-line-for-line port of the old `server/workflow.ts`: `createRecord`/`getRecord`/`updateRecord`/`listCollection` generics with the same domain functions (`submitChallenge`, `createProject`, ...) and the same `createNotification()` side effects. Document IDs are still `record-{numericId}`, so **existing Firestore data keeps working unchanged**.
- **`client/src/lib/userProfile.ts`** - `users/{uid}` CRUD plus role resolution.
- **`client/src/lib/trpc.ts`** - a **shim**, not tRPC. It exposes the exact old surface (`trpc.workflow.<proc>.useQuery/useMutation`, `trpc.auth.me`, `trpc.useUtils().<router>.<proc>.invalidate()`) over TanStack Query with a Firestore call as the `queryFn`. This exists so the ~37 page components did **not** have to be rewritten; treat it as the seam, and register new procedures in its `workflowProcedures` table rather than calling Firestore from pages directly.

Two consequences worth internalising before changing anything here:

- **Anything a page can call, an attacker can call**, with any arguments, from the browser console. Client-side checks are UX only. If a rule isn't in `firestore.rules`, it isn't enforced.
- **`import type` from `drizzle/schema` is erased at build time**, which is how the collection shapes stay type-checked without shipping drizzle-orm to the browser. Keep those imports type-only.

## Authentication architecture (read this before touching auth)

This project's authentication was fully rebuilt this session, replacing an old third-party "Manus OAuth" cookie-session system (now deleted: `server/_core/oauth.ts`, `server/_core/sdk.ts`, `server/_core/cookies.ts`, `server/db.ts` no longer exist).

### Identity provider: Firebase Authentication

- Client SDK initialized in `client/src/lib/firebase.ts` (`getAuth(firebaseApp)`), exporting `auth` plus helpers: `signUpWithEmail`, `signInWithEmail`, `signInWithGoogle`, `signInWithFacebook`, `signOutUser`.
- **Enabled sign-in methods**: Email/Password, Google, Facebook. **Apple sign-in was deliberately removed** (no Apple Developer Program account) — do not re-add an Apple button without being asked; the `signInWithApple` helper and its UI buttons were intentionally deleted.
- Google/Facebook are offered only on the **citizen** signup/login flow. Institutions and industry partners use email/password only (they go through a detailed onboarding form afterward, so a lightweight social account doesn't make sense for them).
- The Firebase project's public client config (`apiKey`, `authDomain`, `projectId`, etc.) is hardcoded in `client/src/lib/firebase.ts`. This is **not a secret** — Firebase web config is meant to be public; access control is enforced entirely by `firestore.rules`, evaluated against the caller's ID token by Firestore itself — not by hiding this config, and not by any server-side token verification (there is no server).

### How auth state is maintained (client)

- `client/src/hooks/useAuth.tsx` (`AuthProvider`) wraps the whole app in `main.tsx` and subscribes to `onAuthStateChanged`, exposing `{ user, loading, logout }` via `useAuth()`.
- There is no bearer-token-attaching HTTP client to document here — the Firestore client SDK talks to Firestore directly and manages the caller's ID token internally (fetching and refreshing it) on every read/write; nothing in application code touches the token except reading custom claims off it (`getIdTokenResult()`, see role resolution below).
- **`main.tsx` treats a Firestore `permission-denied` error as "you need to log in again" and hard-redirects to `/login`** (`redirectToLoginIfUnauthorized`, subscribed to the React Query query/mutation caches) — but only when `auth.currentUser` is null. This distinction is load-bearing: `permission-denied` can also mean "you're signed in, but `firestore.rules` rejected this specific operation" (wrong owner, a duplicate-check inside a transaction, etc.), which is not a session problem, and treating it as one will silently boot a legitimately signed-in user to `/login` on any rules rejection. This exact bug showed up on the challenge-upvote flow (see below) before both the rules gap and this handler were fixed. If you add a new mutation that can legitimately hit `permission-denied` for a signed-in user, you don't need to special-case it here — the `auth.currentUser` check already covers it — but do keep this guard in mind rather than "fixing" a wrongly-triggered redirect by loosening rules instead.
- **Never treat `useAuth()`'s `loading: true` as "guest."** Any guest-vs-authenticated branch (e.g. an upvote/support action) must check `loading` first and no-op while it's true; checking only `!user` misclassifies a session that's still resolving on page load as logged-out, which the challenge-upvote flow above did until fixed.

### How roles are resolved (no server)

- `client/src/lib/userProfile.ts` `loadOrCreateProfile(user)` loads `users/{uid}`, creating it on first sight. This is the browser-side replacement for what `server/_core/context.ts` used to do per request.
- **`admin` is a Firebase Auth custom claim, never a Firestore field.** `resolveRole()` reads `getIdTokenResult().claims.admin`. It deliberately ignores any `role: "admin"` stored in the document, and `firestore.rules` additionally refuses to persist that value - because the user can write their own profile document.
- The old `ADMIN_EMAILS` env var is gone; there is no server to evaluate it.

### User profile / role data (Firestore, not MySQL)

- Collection: `users`, **document ID = Firebase Auth `uid`** (not an auto-generated numeric ID like other collections).
- Shape (`client/src/lib/userProfile.ts` `UserProfile`): `{ uid, email, name, role: "citizen"|"institution"|"industry"|"admin", district?, phone?, organizationId?, notificationPreferences?: { email, sms, weeklySummary }, authProvider, createdAt, updatedAt }`. Note the stored document never contains `role: "admin"` - that value is resolved from the custom claim at read time. `phone` and `notificationPreferences` are optional and only appear once a user has actually saved them from `/citizen/settings` or `/admin/settings` - never invent placeholder values for a user who hasn't set them; render an explicit "Not provided" / default-preferences state instead.
- **`auth.bootstrapProfile`** (now a shim mutation, not an API call) still runs right after `signUpWithEmail`/social sign-in to record the chosen role (`citizen`/`institution`/`industry`) and name/district. It cannot set `role: "admin"` - its input type excludes it and `firestore.rules` rejects it.
- **`auth.updateProfile`** (`client/src/lib/trpc.ts`) is the settings-page mutation: updates `name`/`phone`/`district`/`notificationPreferences` on the caller's own `users/{uid}` doc via `updateUserProfile`, and - when `name` changes - also calls the new `updateDisplayName()` helper in `client/src/lib/firebase.ts` so the Firebase Auth `displayName` (which `AccountMenu` and other UI read directly off the `User` object) stays in sync with Firestore. Used by `CitizenSettings.tsx` and the account section of `AdminSettings.tsx`.
- **`auth.allUsers`** (`client/src/lib/trpc.ts`, backed by `listAllUserProfiles()` in `userProfile.ts`) does an unfiltered read of the whole `users` collection. This only resolves for the `admin` custom claim - `firestore.rules`' `users/{uid}` read rule (`isAdmin() || own uid`) rejects an unfiltered list for anyone else - so any page using it **must** stay behind an admin-only route. It's currently only used by `AdminUsers.tsx` / `AdminUserDetail.tsx` (route `/admin/users/:uid`, keyed by uid now, not email) so admins can see real signed-up accounts instead of a registry synthesized from `organizations`/`challenges` contact fields. `client/src/lib/firebase.ts` also exports `changePassword(user, currentPassword, newPassword)` (reauthenticates then calls `updatePassword`), used by the Security tab in `CitizenSettings.tsx` - only rendered for the `password` auth provider, since Google/Facebook accounts have no Samadhan password to change.
- When an institution/industry account completes `workflow.organizationOnboard`, the server stamps `ownerUid` on the new `organizations/{id}` Firestore doc and calls `linkOrganizationOwner(uid, organizationId, kind)`, which sets `organizationId` + `role` back onto the user's profile.
- **Firestore write gotcha (already hit and fixed once)**: Firestore throws on any `undefined` field value in a `set()`. `client/src/lib/userProfile.ts` and `db.ts` wrap every write in an `omitUndefined()` filter — **do not bypass this** by writing to the `users` collection directly elsewhere without the same filtering, or you'll silently break profile updates for any role that omits an optional field (this exact bug caused institution/industry signups to fail after account creation while leaving the Firebase Auth account behind).

### Route guards (client)

- `client/src/components/ProtectedRoute.tsx` wraps route components (used from `App.tsx` via the `guarded`/`citizenGuarded`/`instituteGuarded`/`industryGuarded`/`adminGuarded` helper functions):
  - Redirects to `/login` if not authenticated.
  - `roles?: Role[]` — if the user's actual role isn't in the list, redirects them to **their own** dashboard (`dashboardPathForRole`) rather than a generic page.
  - `requireVerifiedOrganization?: boolean` — for institution/industry operational routes (dashboard, challenges, projects — **not** the profile page, which stays editable pre-verification). If the linked organization isn't `verificationStatus: "verified"`, or its `standing` is `"suspended"`/`"terminated"`, it renders `<OrganizationStatus>` (an animated status screen) instead of the page — no separate redirect, the route itself shows the status inline, and it updates live once an admin acts (no re-login needed).
- **Route → role mapping** (see `App.tsx` for the literal list): `/citizen/*` → citizen+admin, `/institute/*` → institution+admin, `/industry/*` → industry+admin, `/admin/*` → admin only. `/onboarding/:kind` requires institution or industry. `/citizen/submit`, `/`, `/challenges`, `/challenges/:id`, `/login`, `/signup` are public (no guard).
- `dashboardPathForRole(role, organizationId)` in `client/src/lib/roles.ts` is the **single source of truth** for "where does this user belong" — used by login/signup redirects and by `ProtectedRoute`'s mismatch redirect. Keep it that way; don't hardcode dashboard paths elsewhere.

### Organization verification & standing (moderation)

Two independent status fields on `organizations` docs, both admin-only to change:

- `verificationStatus`: `"pending" | "verified" | "rejected"` — the initial application decision (`workflow.verifyOrganization`).
- `standing`: `"active" | "warned" | "suspended" | "terminated"` (`workflow.updateOrganizationStanding`) — ongoing moderation, independent of and available at any time regardless of verification status. Only `suspended`/`terminated` block dashboard access; `warned` does not (it's informational — a notification is sent, but no lockout).
- The admin UI for both lives on `client/src/pages/AdminInstitutionVerify.tsx` (route `/admin/institutions/:id/verify`), with toast feedback (`sonner`) on every action.

### Admin bootstrapping

Admins are created with the Admin SDK from your machine, using the service-account key in `.env`:

```bash
npm run grant-admin -- someone@example.com          # grant
npm run grant-admin -- someone@example.com --revoke # revoke
```

The user must sign out and back in before the claim lands in their ID token. `FIREBASE_SERVICE_ACCOUNT_JSON` is now used **only** by this script - it is never shipped to a browser and is not needed at runtime.

## File uploads (no Cloud Storage — the project is on Spark)

Firebase Cloud Storage is a **Blaze-only** feature, and this project must stay on the free Spark plan. Uploaded files are therefore stored **inside the Firestore document** that references them, in a `fileData` field holding a base64 data URL.

`client/src/lib/storage.ts` owns this, and the constraints are real:

- **A Firestore document cannot exceed 1 MiB**, including every other field, and base64 inflates bytes by ~4/3. The practical ceiling is `MAX_RAW_BYTES` (680 KB).
- **Images are downscaled and re-encoded** (max edge 1600px, JPEG, stepping quality down through `QUALITY_STEPS`) until they fit. Only if the smallest step still overflows does the upload fail.
- **Non-images cannot be compressed**, so anything over the ceiling is rejected up front with an explicit message rather than failing inside the Firestore SDK.
- **`fileUrl` is synthesised at read time**, not stored. `storedFileUrl()` converts the base64 into an `blob:` object URL, cached per record. This matters: every consumer renders `<a href={fileUrl} target="_blank">`, and **Chrome blocks top-level navigation to `data:` URLs** — a raw data URL there would silently do nothing.
- **Legacy records still work.** Documents written before this change carry a real S3 `fileUrl` and no `fileData`; `withFileUrls()` leaves those untouched.
- **`listChallengeEvidence` / `listProjectDocuments` query with `where`, not `listCollection`.** Now that records embed file bytes, listing a whole collection would download every stored file in the database on every page load. Do not "simplify" these back to `listCollection`.

If the project ever moves to Blaze, this is the first thing worth replacing with real Cloud Storage.

## Firestore data model

All real application data lives in Firestore, read and written from the browser through `client/src/lib/db.ts` (see Firestore rules below for what actually constrains that). Collections (see `collectionNames` in `db.ts`): `organizations`, `organizationMembers`, `challenges`, `challengeEvidence`, `assignments`, `projects`, `projectMilestones`, `projectDocuments`, `projectActivities`, `industryInterests`, `challengeSupports`, `projectCloseouts`, `notifications`, plus `users` (auth profiles, keyed differently — see above).

Except for `users`, every collection uses a synthetic numeric ID (`Date.now() * 1000 + random`) stored as Firestore document `record-{id}`, generated by `createRecord()` in `db.ts` — unchanged from the server implementation, so existing documents keep working. The `drizzle/schema.ts` MySQL table definitions are used **only for `typeof table.$inferInsert` / `$inferSelect` TypeScript types** — they document each collection's shape, but **no MySQL database is actually connected or written to**. `drizzle.config.ts` and the `db:push` script have been deleted. Import these types with `import type` only, so drizzle-orm stays out of the browser bundle.

### Challenge upvoting (`db.ts` `upvoteChallenge`, one data model, not two)

`challenges/{id}.upvoteCount` is a denormalized counter, kept in sync with `challengeSupports` records of `kind: "upvote"` (the same collection/shape `supportChallenge()` already used for `kind: "follow"` - there is deliberately only one support data model). It exists because `challengeSupports` itself is **not** world-readable (scoped to the supporter's own email, see rules above), so a public challenge list has no other way to show "how many people upvoted this."

- `db.upvoteChallenge({ challengeId, supporterEmail })` runs a **Firestore transaction**: it reads a deterministic support doc (`upvote-{challengeId}-{sanitizedEmail}`) and the challenge doc, and — only if the support doc doesn't already exist — creates it and increments `upvoteCount` in the same transaction. This is what makes it safe under a double-click or two tabs; the older `supportChallenge()` (`follow`, and any future non-counted kind) still does a plain read-then-write duplicate check, which is fine for something with no public counter to keep consistent.
- `trpc.workflow.upvoteChallenge` wraps it. `Challenges.tsx` and `ChallengeDetail.tsx` both call it, both derive "have I already upvoted this" from `trpc.workflow.challengeSupports.useQuery({ supporterEmail: user.email })` (already-fetched, not a new read), and both apply an optimistic local +1 that reconciles once the mutation settles and the query is invalidated.
- **Never gate the upvote button on `!user` alone** - `useAuth()`'s `loading` flag must be checked first and treated as "don't know yet," not "guest." Classifying a not-yet-resolved Firebase session as logged-out is exactly the bug this page had (see below), and it's an easy one to reintroduce.
- **`upvoteCount` carries a one-time seeded baseline on pre-existing demo data, real user upvotes on top.** The 50 synthetic seed challenges (title starts with `"Demo "`, or description contains `"Synthetic demo record"`) were backfilled once with a deterministic, status-weighted baseline (roughly 15-260, higher for `resolved`/`in_progress`) via a throwaway admin script - not via fake `challengeSupports` documents, and not touching the 2 genuine non-demo challenge docs. This exists purely so the Challenges page doesn't look empty while the platform has few real users; every real, authenticated upvote after that increments the same field through the normal transaction, and individual "have I upvoted this" state is still 100% derived from real `challengeSupports` docs keyed by the caller's actual email - the baseline never touches that. **Do not re-run a similar backfill against non-demo/real citizen-submitted challenges**, and don't give new real submissions a nonzero starting `upvoteCount` in `submitChallenge()` - a freshly reported real challenge legitimately starts at 0.

### Challenge domain taxonomy is inconsistent between the submission form and the seed dataset - normalize, don't drop

`SubmitChallenge.tsx`'s domain dropdown (`Water | Education | Health | Agriculture | Infrastructure | Livelihoods`) is not the only taxonomy live data uses. The seeded demo dataset also contains `Mobility`, `Waste`, `Accessibility`, `Safety`, `"Digital access"`, and the singular `Livelihood` (vs `Livelihoods`) - a real, pre-existing inconsistency, not something introduced by any one page. `Challenges.tsx`'s `normalizeDomain()` buckets every one of these into one of the six canonical categories for **filtering only** (`Livelihood → Livelihoods`; everything infrastructure-flavoured → `Infrastructure`) while still **displaying the raw domain string** on the card. If you add a new domain value anywhere (a new option in `SubmitChallenge.tsx`'s dropdown, a new seed script, etc.), add it to `normalizeDomain()` too, or it silently falls out of every specific filter pill except "All."

### "Bhasha & Bol" — Hindi/English voice + handwriting-OCR auto-fill on `SubmitChallenge.tsx`

Implements `docs/USP-02-bhasha-bol.md`. `title`/`description`/`domain` on `SubmitChallenge.tsx` are now **controlled** React state (they were plain uncontrolled `<input>`/`<textarea>`/`<select>` read via `FormData` before this feature — changed specifically so a voice/OCR fill is visible in the fields immediately, not just at submit time). `district` was already controlled (for `LocationPicker`'s auto-fill) and is reused as-is.

- **`client/src/lib/bhasha.ts`** — `parseBhashaText(raw, districts)` is the **one shared parser** for both entry points below. Naive keyword/first-sentence heuristics only, deliberately not an LLM call (no backend to call one from). It returns `{ title, description, district?, domain? }`; `domain` is guessed from a small Hindi+English keyword map and always lands on one of the six canonical `SubmitChallenge.tsx` dropdown values (`Water | Education | Health | Agriculture | Infrastructure | Livelihoods`) — this is a **separate, independent** keyword map from `Challenges.tsx`'s `normalizeDomain()` (different purpose: guessing a domain from free text vs. bucketing an already-known raw domain string for filtering), not a shared function. If you add a new domain keyword, edit `DOMAIN_KEYWORDS` in `bhasha.ts`.
- **`client/src/components/VoiceCapture.tsx`** — mic button using `window.SpeechRecognition`/`webkitSpeechRecognition` (Chrome/Edge/Safari only; feature-detected via `getSpeechRecognitionCtor()`, with a `sonner` toast fallback on unsupported browsers, e.g. Firefox). Has its own `hi-IN`/`en-IN` toggle button, entirely local UI state — it does not talk to the parent about which language is active, only the finished `BhashaFill` result via `onFill`.
- **Handwriting OCR** lives inline in `SubmitChallenge.tsx` (`scanHandwriting()`), not as a separate component, since it's a single button tied to a hidden file input next to the existing Evidence dropzone. Uses `tesseract.js` (`createWorker("hin+eng")`), **always dynamically imported** (`await import("tesseract.js")`) inside the handler — never a top-level import — so it code-splits into its own on-demand chunk instead of bloating the ~2.16 MB main bundle; verified after adding this feature that the build still emits it as a separate small chunk, not inlined. The worker is created once and cached in a `ref` for the lifetime of the page (avoids re-paying the multi-MB `hin` language-pack fetch — from tesseract.js's default CDN, not bundled locally — on every scan) and terminated on unmount. The scanned image is also kept and attached as evidence via the existing `files` state/upload path, not discarded after OCR.
- Both entry points call the same `handleBhashaFill()` in `SubmitChallenge.tsx`, which — exactly like the pre-existing `handleLocationPick()` — only overwrites `district` if the user hasn't already hand-edited it (`districtEdited` flag), so a voice/OCR fill can never clobber a district the user just typed.
- **Never auto-submits.** Every filled field is shown in the normal form inputs for the user to review/correct before pressing Submit — the parser is a heuristic and is expected to sometimes guess wrong.
- Verified end-to-end with a Playwright script driving the real dev server (not just typecheck/build): a synthetic canvas-rendered "note" image run through the real `scanHandwriting()` path correctly filled title, description, domain (`Water`, matched on "handpump"), and district (`Ranchi`), and attached the scanned image as evidence.

### Challenge thumbnails: verified-relevant photos only, icon tile otherwise

`Challenges.tsx` resolves a thumbnail in two layers, both defined near the top of that file:

1. **`challengePhotoOverride`** - keyed by the challenge's numeric `id`, for when several distinct real photos exist for the same raw domain. Currently used for the five seeded Water challenges, each paired with a different real water-access scene (`detail-water-community_46a3bfbe.jpg`, `-containers_6a1dee03.jpg`, `-tanker_cee68d25.jpg`, `-well_1d910e69.jpg`, plus `challenge-water_adcdbde2.jpg` for the fifth) instead of one photo reused five times.
2. **`rawDomainPhoto`** - keyed by the _raw_ domain string (not the canonical filter bucket - see below). Every raw seed domain now has one verified photo: Water, Health, Agriculture, Mobility, Education, Waste, Livelihood, Accessibility, Safety, and Digital access.

Everything here was confirmed by actually opening the asset, not by trusting its filename - this project has at least one proven filename/content mismatch:

- `challenge-water_adcdbde2.jpg` - genuine water-point before/after.
- `challenge-health_e96d7d9c.jpg` - a community sanitation/public-health facility.
- `challenge-education_f5e0518c.jpg` - **despite its filename, this is an aerial farmland/village photo with zero connection to education.** Used for Agriculture (what it actually depicts), not Education. The genuine education photo is `education-school-access.jpg`.
- `challenge-road_5a958fd7.jpg` - a clean, undamaged highway. Reused for **Mobility only because the seeded Mobility content was written to match it** (missing footpaths/crossings/bus shelters, not pavement damage) - it would be a wrong image for a road-_damage_ story, which is exactly why it isn't used for the generic Infrastructure bucket.
- `waste-collection-point.jpg`, `livelihood-informal-work.jpg`, `accessibility-no-ramp.jpg`, `safety-unlit-road.jpg`, `digital-access-connectivity.jpg`, `education-school-access.jpg` - supplied by the project owner specifically for these domains, each verified relevant before wiring in. **`waste-collection-point.jpg` arrived as AVIF-encoded bytes saved with a `.jpg` extension** (confirmed via `file` and magic-byte inspection) and was re-encoded to a genuine JPEG in place with `sharp` before use - a static host (this project deploys to Cloudflare Workers static assets) sets `Content-Type` from the file extension, so AVIF bytes served as `image/jpeg` risk the browser refusing to render them. If another supplied asset ever fails to open as its extension implies, re-encode it the same way rather than shipping it as-is.

Every raw demo domain now resolves to a real photo; the icon-tile treatment is a defensive fallback for domain values with no entry in `rawDomainPhoto` at all (i.e. some future new raw domain), not something any current curated demo challenge should ever show. Thumbnails render at a fixed `aspect-[4/3]` with `object-cover object-center` and a subtle desaturation that lifts on hover, so source images of very different native aspect ratios (checked ranging from 1.33 to 2.62) still produce a visually consistent grid.

### The seeded demo dataset's content is real prose, not a template - keep it that way

The 50 synthetic seed challenges (`"Demo …"` titles) were originally five identical description templates copied ten times each with only the district/number changed - purely mechanical duplication. They were rewritten once into 50 distinct, individually-authored `title`/`description`/`district` combinations (still Firestore data, edited via a throwaway admin script, not hardcoded in the client). **Do not regenerate this content by templating** - if you add more seed challenges, write each one as its own specific, plausible civic problem (concrete location/context + impact), the way the current 50 are written, not `"{Domain} challenge {N}"` with a shared paragraph.

### Firestore security rules (`firestore.rules`) - read before touching

**This file is now the entire security model.** It was previously `allow read, write: if false` for everything, because a server mediated all access. That server is gone, so the rules had to be written for real.

Shape of the current rules:

- `isAdmin()` = `request.auth.token.admin == true` (the custom claim). Never derived from document data.
- **`users/{uid}`** - readable by its owner or an admin; writable only by its owner, and **`role` is constrained to `citizen|institution|industry`**, which is what blocks self-elevation to admin. Because the admin branch (`isAdmin()`) doesn't depend on `resource.data`, an admin can also run an **unfiltered collection-wide read** of `users` (not just single-doc `get()`s) - that's what `listAllUserProfiles()` / `trpc.auth.allUsers` relies on for `AdminUsers.tsx`. Don't assume "admin reads" here means "one doc at a time."
- **`organizations`** - world-readable (the UI frames orgs as public civic records). Creates must start `verificationStatus: "pending"` / `standing: "active"` and set `ownerUid` to the caller. Owners may edit their own details but **cannot** touch `verificationStatus`, `standing`, or `ownerUid`; only an admin can. This preserves the old `adminProcedure` gate on verification/standing.
- **`challenges`** and the workflow collections (`projects`, `assignments`, `projectMilestones`, ...) - world-readable, writable by any signed-in user.
- **`notifications`** and **`challengeSupports`** - **not** world-readable; scoped to `recipientEmail`/`supporterEmail` matching the caller's token email. Because rules are evaluated per document, a listing query only succeeds if it _already_ filters on that field - which is exactly why `db.ts` reads these two with `listCollectionWhere(...)` instead of fetching the whole collection. **If you change those reads to an unfiltered `listCollection`, they will fail with permission-denied.**
- **`challengeSupports`' `get` and `list` rules are deliberately different.** `list` requires `resource.data.supporterEmail == userEmail()` (as above). `get` additionally allows `resource == null` - i.e. reading a document that doesn't exist yet - because `db.upvoteChallenge()` uses a deterministic doc id (`upvote-{challengeId}-{email}`) and a Firestore transaction to atomically check-for-duplicate-then-create; a `transaction.get()` on a not-yet-created doc has `resource == null`, and the naive single `read` condition (`resource.data.supporterEmail == ...`) throws on that (`.data` of `null`) and denies the read _before the doc can ever be created_ - this was a real bug caught by an end-to-end signed-in test (Firestore emulator isn't set up, so this class of bug is otherwise invisible to `npm test`). If you add another deterministic-id-plus-transaction pattern anywhere, check `get` rules for the same trap.
- A trailing `match /{document=**} { allow read, write: if false; }` keeps anything unlisted denied by default.

Baseline worth remembering when judging this: the old tRPC API exposed nearly every mutation as a `publicProcedure`, so unauthenticated callers could already invoke them over HTTP. Requiring sign-in here is a tightening.

**Rules changes only take effect once deployed** (`npm run deploy:rules`). Editing this file locally does nothing on its own.

## Environment variables

There is **no server-side runtime configuration** - the deployed app is static files plus the public Firebase web config hardcoded in `client/src/lib/firebase.ts`. Almost nothing in `.env` reaches the browser — **except `VITE_GROQ_API_KEY`, which deliberately does** (see "AI Auto-Categorize" above): any `VITE_`-prefixed var is inlined into the client bundle by Vite at build time, which is how the Groq key ends up shipped to every visitor's browser. That's an accepted tradeoff for a hackathon demo, not an oversight.

Root `.env` (gitignored, never commit it):

| Variable                        | Purpose                                                                                                                                | Required                 | Reaches browser?                 |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | -------------------------------- |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Service-account JSON, used **only** by `scripts/grant-admin.mjs` to set admin custom claims. Still the one genuinely sensitive secret. | only to grant admin      | No                               |
| `VITE_GROQ_API_KEY`             | Groq API key for `client/src/lib/groqVision.ts`'s image auto-categorization call.                                                      | only for AI-scan feature | **Yes** — bundled into client JS |

`VITE_GROQ_API_KEY` must also be set as a **GitHub Actions repository secret** on `ankan-web/samadhan-landing` (not just the local `.env`) for the production build in `.github/workflows/deploy.yml` to bake it in — see "AI Auto-Categorize" above.

Removed and no longer read anywhere: `NODE_ENV`, `PORT`, `ADMIN_EMAILS`, `JWT_SECRET`, `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY`.

## Firebase Console configuration required

Not code — but needed for auth to function, and easy to forget when moving to a new Firebase project:

- Authentication → Sign-in method: **Email/Password** and **Google** enabled (work out of the box). **Facebook** requires a Facebook Developer app (App ID/Secret) registered separately. Apple is not configured (see above).
- Authentication → Settings → Authorized domains: must include the deploy domain (localhost is included by default).

## How the frontend reaches its data

Browser -> Firebase client SDK -> Firestore / Firebase Auth, over Google's own HTTPS endpoints. There is no first-party HTTP surface of any kind: no REST, no GraphQL, no `/api/*`.

## Commands

```bash
npm run dev           # vite dev server (plain SPA - no API process any more)
npm run build          # vite build -> dist/public
npm run preview         # serve the production build locally
npm run check            # tsc --noEmit - run this after any non-trivial change
npm test                  # vitest run - hits the real project's rules, needs no credentials
npm run deploy             # build + wrangler deploy (Cloudflare static assets)
npm run deploy:rules        # firebase deploy --only firestore:rules
npm run grant-admin -- <email>   # set the admin custom claim
npm run format               # prettier --write .
```

## Deployment (Cloudflare Workers static assets)

The app is a static SPA served by Cloudflare. `wrangler.jsonc` points at `dist/public` with `not_found_handling: "single-page-application"` so `wouter`'s client-side routes don't 404 on refresh.

**Deployment is two independent steps, and forgetting the second is the most likely way to break production:**

1. `npm run deploy` - ships the client.
2. `npm run deploy:rules` - ships `firestore.rules`.

Both CLIs are devDependencies (`wrangler`, `firebase-tools`) so neither needs a global install, and `.firebaserc` pins the project to `samadhan-sih`. The Firebase CLI needs a one-time interactive `npx firebase login` per machine.

### Two git remotes — check this before debugging any deploy

Cloudflare builds from Git, and **it is connected to the fork, not `origin`**:

| Remote   | Repo                            | Role                                            |
| -------- | ------------------------------- | ----------------------------------------------- |
| `origin` | `ankan-web/samadhan-landing`    | upstream; the owner's repo                      |
| `fork`   | `agnivachat17/samadhan-landing` | **what Cloudflare actually builds and deploys** |

Pushing only to `origin` leaves the deployed site on stale code, and the symptoms are extremely misleading: the Cloudflare build log shows build commands and dependencies that no longer exist in your working tree (e.g. `esbuild server/_core/index.ts`, `ERR_PNPM_PATCH_NOT_APPLIED`), and the live site keeps serving an old bundle that calls `/api/trpc` and 404s. **Push to both:**

```bash
git push origin main && git push fork main
```

If a Cloudflare build log disagrees with your local `package.json`, it is building a different commit — verify with
`curl -s https://api.github.com/repos/agnivachat17/samadhan-landing/commits/main | grep -m1 message` before changing any code.

### CI/CD: GitHub Actions deploys, not Cloudflare's Git integration

`.github/workflows/deploy.yml` in `ankan-web/samadhan-landing` builds and deploys on every push to `main`, running `npm run check`, `npm test`, `npm run build`, then `wrangler deploy` via `cloudflare/wrangler-action`. This exists specifically to stop depending on which repo/fork Cloudflare's dashboard Git integration is pointed at — that integration is what produced the `ERR_PNPM_PATCH_NOT_APPLIED` failures, because it auto-detects a package manager from repo signals and kept guessing pnpm. Deploying via Actions with `wrangler` directly sidesteps that detection entirely, and every run's full log (including the wrangler output) is visible in this repo's **Actions** tab — no more digging through the Cloudflare dashboard.

**Required one-time setup, not yet done as of this session:**

1. **Cloudflare API token** — `dash.cloudflare.com` → profile icon → _API Tokens_ → _Create Token_ → template **"Edit Cloudflare Workers"**, scoped to the account that owns `samadhan-landing`.
2. **Cloudflare Account ID** — Workers & Pages dashboard → right sidebar of any Worker, or the URL segment `dash.cloudflare.com/<account-id>/workers`.
3. Add both as **repository secrets** on `ankan-web/samadhan-landing` (Settings → Secrets and variables → Actions → New repository secret): `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`. This requires admin access to that repo, not just contributor/push access.
4. **Disconnect Cloudflare's own Git auto-build** for this Worker (dashboard → Workers & Pages → samadhan-landing → Settings → Build → Git → disconnect) so it stops racing the Actions-driven deploy on every push and stops re-triggering the pnpm failure.

Until step 4 is done, **two deploys will fire per push** — this workflow (which will succeed) and Cloudflare's own broken build (which will keep failing exactly as before). The failing one is harmless noise once Actions is deploying successfully, but disconnect it to stop the confusion.

Firestore rules deploy is deliberately **not** part of this workflow — `npm run deploy:rules` stays a manual step, so a bad rules edit can't auto-push to production data access.

### `vite.config.ts` no longer has any hosted-platform-specific plugins

The project used to run its local/preview dev loop inside the Manus hosted platform, which injected two dev-only Vite plugins: a runtime script (`vite-plugin-manus-runtime`, ~367 KB inlined into `index.html`) and a debug-log collector that POSTed browser console/network events to `/__manus__/logs`. Both were already excluded from production builds and have since been removed entirely (dependency uninstalled, plugin code deleted, `client/public/__manus__/` deleted) now that development happens outside that platform. `vite.config.ts` now has `react()`, `tailwindcss()`, and `VitePWA()` (USP-01 offline support) — don't add hosted-platform runtime/debug plugins back without a concrete reason.

Because the rules _are_ the backend now, a client deploy without a rules deploy leaves the app talking to whatever rules were last pushed. `npm test` is the quickest check that the live rules match this repo.

Notes:

- **Do not put a `packageManager` field or a `pnpm` block back in `package.json`.** Cloudflare's wrangler auto-configuration reads `packageManager` and shells out to pnpm, which previously failed the deploy with `ERR_PNPM_PATCH_NOT_APPLIED`. `wrangler` is a devDependency specifically so nothing has to auto-install it.
- `Cross-Origin-Opener-Policy` needs to be `same-origin-allow-popups` for Firebase's `signInWithPopup` to read `popup.closed`. On Vercel this lived in `vercel.json`; if popup sign-in starts logging `Cross-Origin-Opener-Policy policy would block the window.closed call` on Cloudflare, set that header here too.
- **Why not rehost the server:** the previous Express + `firebase-admin` backend cannot run on Workers at all (`@grpc/grpc-js` needs raw TCP/HTTP2 sockets). Removing the server rather than rehosting it was a deliberate call - see the decisions section.

## Testing

- `tests/firestore.rules.test.ts` - checks the **live** project's rules from the outside, as an anonymous caller, over the Firestore REST API. It needs **no credentials**, so `npm test` works out of the box (the old tests needed `FIREBASE_SERVICE_ACCOUNT_JSON`, which vitest never loaded).
- It asserts three things: public collections (`challenges`, `organizations`, `projects`) are anonymously readable; private ones (`notifications`, `challengeSupports`, `users`) are not; and no collection is anonymously writable.
- **A failing "allows anonymous reads" case almost always means the rules in this repo have not been deployed** - run `npm run deploy:rules`.
- Signed-in behaviour (admin claims, per-owner writes, the `verificationStatus` guard) is **not** covered. That needs the Firebase emulator or manual checking, and is the biggest remaining test gap.
- There is no automated check that a fresh clone actually installs and runs (`npm install && npm run dev`) — worth doing by hand after dependency or tooling changes, since nothing else in CI catches a broken clean-checkout setup.

## Important conventions / patterns

- **Page components are large, single-file, minimally decomposed** — most pages are one big JSX return with small helper functions below (`Field`, `SectionLabel`, etc.) in the same file, not split into many small component files. This is the existing style; match it rather than over-modularizing when editing a page.
- **The whole repo is Prettier-formatted** (`.prettierrc`: 80-char print width, double quotes, semicolons, `arrowParens: avoid`, `es5` trailing commas). Earlier in the project's history most files were hand-compressed into a handful of very long single lines per function; a full-repo `npm run format` pass reflowed everything to normal multi-line, 80-column formatting without changing any logic (verified with `tsc`, `npm test`, and a production build before and after). Run `npm run format` after making changes, and don't hand-compress new code back onto single lines — the "large single-file, minimally decomposed" convention above is about not splitting pages into many small component files, not about physical line length.
- **Every header component renders `<AccountMenu variant="light|dark" />`** for the sign-in/account area — don't hardcode a static "Sign in" link in a new header; reuse `AccountMenu`.
- **All page headers are `sticky top-0 z-50`** (`AdminHeader.tsx`, `InstituteHeader.tsx`, `IndustryHeader.tsx`, `PublicPortalHeader.tsx`, and `Home.tsx`'s own inline header) so the nav stays visible while scrolling. **Watch out:** `position: sticky` stops working the moment any ancestor between the header and the viewport has `overflow` other than `visible` (including `overflow-hidden`, even with no fixed height and no actual scrollbar) — that ancestor silently becomes sticky's containing block instead of the viewport. This bit `Home.tsx` once already: its `<main>` has `overflow-hidden` (needed to clip the mirrored hero background image), so the header was pulled out to be a sibling of `<main>` rather than a child of it. If you add a header to a new top-level layout, keep it outside of - or before - any `overflow-hidden` wrapper, not nested inside one.
- **`dashboardPathForRole` is the only place that should decide "which dashboard does this role land on."**
- Data functions in `client/src/lib/db.ts` follow a consistent pattern: `createRecord`/`getRecord`/`updateRecord`/`listCollection` generic helpers, with domain functions (`submitChallenge`, `createProject`, etc.) layered on top, often triggering a `createNotification()` side effect.
- Firestore writes must go through `omitUndefined()` (see `client/src/lib/db.ts` and `userProfile.ts`) — Firestore rejects `undefined` field values outright.
- **All test/throwaway data created while debugging in a live session must be cleaned up** (delete the Firebase Auth user + Firestore doc) — there is no automated fixture teardown for manual testing.

## Things that should NOT be changed or broken

- **`firestore.rules` is the entire security model.** There is no server to fall back on. Any new collection needs an explicit rule, or it is denied by the catch-all; any loosened rule is directly exploitable from the browser console.
- **Never let `role: "admin"` be writable from the client.** Admin is a custom claim only (`scripts/grant-admin.mjs`); the rules constrain the stored `role` field to `citizen|institution|industry`. Removing that constraint lets any user make themselves an admin in one console call.
- **Keep organization `verificationStatus` / `standing` / `ownerUid` admin-only in the rules.** This is the replacement for the old `adminProcedure` gate, and that gate was a real, previously-fixed security hole.
- **Keep `notifications` and `challengeSupports` reads filtered** (`listCollectionWhere` in `db.ts`). Rules deny unfiltered listing of those collections, so switching them to a plain `listCollection` breaks them with permission-denied - and "fixing" that by loosening the rule would expose every user's notifications.
- **Do not remove the `omitUndefined()` filtering** in `db.ts` / `userProfile.ts` - Firestore rejects `undefined` field values outright, and this exact bug already broke institution/industry signups once.
- **Keep `drizzle/schema` imports type-only** (`import type`). A value import would pull drizzle-orm and mysql2 into the browser bundle.
- **Do not add Firebase Cloud Storage back** without checking the plan — it forces a Blaze upgrade. See "File uploads".
- **Do not turn the evidence/document `where` queries back into `listCollection`**, and do not stop synthesising `fileUrl` via `storedFileUrl()` — see "File uploads" for why both break badly.
- **Do not restore Apple sign-in** without being asked (no developer account available).
- **Do not add a `packageManager` field or `pnpm` block to `package.json`** - it breaks the Cloudflare deploy (see Deployment).
- **`dashboardPathForRole` / `ProtectedRoute` role-gating logic** - several routes depend on exact behavior (e.g., unverified orgs seeing the status screen instead of a hard redirect). Changing the redirect-vs-inline-render behavior will re-break the "back button re-shows the onboarding form" bug that was deliberately fixed by making the onboarding page state-driven from `auth.me().organizationId` rather than local component state.

## Known limitations, unfinished work, and technical debt

- **No server-side validation exists any more.** The zod input schemas were deleted with the tRPC router, and `firestore.rules` validates only the few fields called out above. A malicious client can write arbitrarily shaped documents to any collection it has write access to. This is the main cost of the serverless rewrite and the most valuable thing to harden next (add field-shape assertions to the rules).
- **Signed-in rule behaviour is untested** - see Testing.
- **Any signed-in user can write to the shared workflow collections** (`projects`, `assignments`, milestones, etc.). The rules require authentication but do not check that the caller owns the project or belongs to the assigned institution. This mirrors the old API, where those procedures were `publicProcedure` (i.e. open to anyone, signed in or not), so it is not a regression - but it is weak.
- **No rate limiting / abuse protection.** Previously there was at least an API in front; now clients hit Firestore directly, so a spam loop writes straight to the database. Firebase App Check is the intended mitigation and is not set up.
- **Challenge submission now requires sign-in.** The old `/citizen/submit` flow accepted anonymous reports; an unauthenticated create rule would have let anyone write unlimited documents. If anonymous reporting must come back, enable Firebase Anonymous Auth rather than opening the rule - but note that `useAuth().user` becoming non-null would confuse `ProtectedRoute`, which currently treats "has a user" as "is logged in".
- **`AdminUsers.tsx` / `AdminUserDetail.tsx` now read the real `users/{uid}` collection** via the admin-only `auth.allUsers` procedure, rather than deriving a synthetic registry purely from `organizations`/`challenges` contact fields (that was a past limitation of this rewrite; fixed). Citizen challenge reports whose `citizenEmail` doesn't match any signed-up account are still shown, but in a clearly separate "Reported without a Samadhan account" section on `AdminUsers.tsx` rather than being merged into the account list as if they were accounts.
- **`drizzle/` is a type source only.** `drizzle.config.ts` and the `db:push` script have been deleted; `drizzle/schema.ts` remains purely so `$inferSelect`/`$inferInsert` can describe each Firestore collection's shape. There is no MySQL database.
- **`DashboardLayout.tsx` + `DashboardLayoutSkeleton.tsx` are unused** - a sidebar shell scaffold from the original template, not referenced by any route. Left in place; inert.
- **Uploads are capped at ~680 KB per file** and consume Firestore storage/bandwidth rather than object storage. Spark's free quota (1 GiB stored, 50k reads/day) is the real limit here; a few hundred compressed evidence photos is fine, a document-heavy workload is not. Blaze + real Cloud Storage is the upgrade path.
- **The client bundle is ~2.2 MB raw / ~571 KB gzipped** (includes Firestore SDK, React, Leaflet, etc.). The `tesseract.js` OCR worker is code-split into a separate 16 KB chunk; `qrcode` is code-split into a 26 KB chunk. Code-splitting the admin/institute/industry routes is the obvious next step and has not been done.
- **`docs/firebase_backend_research.md`** is stale (it says the project does not use Firebase Authentication). This CLAUDE.md supersedes it.

## USP-01 — Offline-First PWA with Background Sync

**Status:** Implemented and deployed.

Citizens in Naxal-affected / low-connectivity districts (West Singhbhum, Gumla, Latehar) can now file challenges offline. Drafts are queued in IndexedDB via `client/src/lib/offlineQueue.ts` using the `idb` library (`samadhan-offline` database, `challengeDrafts` object store). When the user comes back online and is signed in, `drainQueue()` auto-submits queued drafts through the existing `db.submitChallenge()` + `db.createChallengeEvidence()` path.

**Key files:**

- `client/src/lib/db.ts:46` — `enableIndexedDbPersistence(db)` enables Firestore offline cache for reads.
- `client/src/lib/offlineQueue.ts` — `queueChallengeDraft()`, `drainQueue()`, `queueCount()`, `getQueuedDrafts()`, `clearQueuedDraft()`.
- `client/src/pages/SubmitChallenge.tsx:33` — offline path: queues via `queueChallengeDraft()`, shows `createdId = -1` offline success state, auto-drains on `online` event.
- `client/public/manifest.json` — PWA manifest with Samadhan branding/icons.
- `vite.config.ts` — `VitePWA` plugin with Workbox runtime caching (Firestore `NetworkFirst`, OSM tiles `CacheFirst`), `maximumFileSizeToCacheInBytes: 3MB`.
- `client/src/main.tsx:14` — service worker registration via `navigator.serviceWorker.register("/sw.js")`.
- `client/index.html:14` — `<link rel="manifest" href="/manifest.json">`.

**Rules unchanged.** `firestore.rules:77 allow create if isSignedIn()` already requires sign-in; offline drafts respect this by only draining when `auth.currentUser != null`.

**Manual QA:** Chrome DevTools → Offline → fill `/citizen/submit` + photos → "Saved offline" toast → check IndexedDB `samadhan-offline > challengeDrafts` → Online → challenge appears at `/challenges`.

**Deploy:** Standard `npm run deploy` (no `deploy:rules` needed for this USP).

## USP-03 — Hash-Anchored Closeout Verifiability (NIC CoE Pattern)

**Status:** Implemented and deployed. `ledgerAnchors` rules deployed via `npm run deploy:rules`.

Append-only hash chain for `projectActivities` + `projectCloseouts` writes. Every write now computes `prevHash` + `hash = SHA-256(canonicalJSON({prevHash, ...payload}))` via browser `SubtleCrypto` and stores both alongside the doc. Admins can anchor a Merkle root to a `ledgerAnchors` doc. The `LedgerSeal` component re-computes the chain locally and shows `Verified chain ✓ (N links)` or `Tampered at #K ✗`.

**Key files:**

- `client/src/lib/ledger.ts` — `chainHash()`, `fileDataHash()`, `merkleRoot()`, `verifyChain()`. Pure `SubtleCrypto SHA-256`, no deps.
- `drizzle/schema.ts:245/295` — `prevHash`, `hash`, `fileDataHash` fields on `projectActivities` and `projectCloseouts` (type-only, schemaless in Firestore). New `ledgerAnchors` table.
- `client/src/lib/db.ts:91` — `lastHashForProject()` helper. `:500/570/753` — `addProjectMilestone`, `addProjectActivity`, `submitCloseout` now compute hash before `createRecord`. `:850` — `anchorLedger()`, `listLedgerAnchors()`, `getLedgerAnchor()`.
- `firestore.rules:97` — `ledgerAnchors`: `allow read: if true` (public verifiability), `allow create/update/delete: if isAdmin()` (admin-only anchor).
- `client/src/lib/trpc.ts:240` — `anchorLedger`, `ledgerAnchors`, `getLedgerAnchor`, `verifyLedger` procedures via `createRouterHooks`.
- `client/src/components/LedgerSeal.tsx` — verification UI with `ShieldCheck`/`ShieldX`, root preview, lazy QR via `qrcode` (code-split chunk), `Anchor now` button. Wired into `InstituteProjectWorkspace.tsx:340` and `AdminCloseoutReview.tsx:42`.
- `client/src/pages/InstituteProjectWorkspace.tsx` — LedgerSeal placed above Activity record section.
- `client/src/pages/AdminCloseoutReview.tsx` — LedgerSeal placed below heading.

**Rules deployed.** `npm run deploy:rules` was run after adding the `ledgerAnchors` rule. This is a two-step deploy — `npm run deploy` (client) + `npm run deploy:rules` (rules).

**Manual QA:** Create project → add 3 activities + 1 closeout → `LedgerSeal` shows `Verified ✓ (4 links)` → `Anchor now` → root appears → edit one `projectActivities detail` in Firebase Console → seal flips to `Tampered at #2 ✗`.

## InteractiveMap z-index fix

Leaflet's internal panes default to `z-index: 400–800`, which bleeds through the sticky header (`z-50`). Fixed by:

- `client/src/index.css` — `.samadhan-map { isolation: isolate; z-index: 0; }`, `.leaflet-pane { z-index: 1 !important; }`, `.leaflet-top/.leaflet-bottom/.leaflet-control { z-index: 5 !important; }`.
- `client/src/components/InteractiveMap.tsx:111` — wrapper gets `isolate z-0` classes.

This is a global fix — affects all maps across the app. Header at `z-50` now always wins.

## USP-05 — GIS Command Center (District Heatmap + Bottlenecks)

**Status:** Implemented. Verified end-to-end (`npm run check`, `npm run build`, `npm test` all pass) — choropleth, bottleneck alerts, charts, and CSV export are wired and rendering from real Firestore data, not just the GeoJSON fetch step.

Jharkhand district GeoJSON fetched from `cdn.jsdelivr.net/gh/udit-001/india-maps-data` and normalized to match `JHARKHAND_DISTRICTS:5` names (fixed `Sahibganj → Sahebganj`, `Saraikela-Kharsawan → Seraikela Kharsawan`). All 24 districts verified.

**Key files:**

- `client/public/geo/jharkhand.json` — 24-district FeatureCollection, ~450KB, `district` property matches `JHARKHAND_DISTRICTS` names. Fetched at runtime (`fetch("/geo/jharkhand.json")` in `AdminReports.tsx`, not statically imported) so it precaches via the `vite-plugin-pwa` service worker instead of bloating the JS bundle.
- `client/src/lib/analytics.ts` — `computeDistrictStats`, `computeTrends`, `topDomains`, `topDistricts`. Pure computation over an already-fetched `challenges` list, no Firestore calls of its own.
- `client/src/pages/AdminReports.tsx` — choropleth map (Leaflet `GeoJSON` per-feature `fillColor` scaled by count + `JHARKHAND_DISTRICTS` dot markers colored by bottleneck/count), a top-5 bottleneck (`age > 14d` && `status ∈ {submitted, under_review}`) alert banner, three `recharts` panels (top-8 districts bar, 12-week trend line, domain breakdown bar) plus a summary stat grid, and the pre-existing CSV export form/district-click-to-filter behavior, all reading from the same `trpc.workflow.challenges.useQuery()` call.

**Deploy:** Standard `npm run deploy` (no `deploy:rules` needed — `challenges`/`projects` are already `allow read: if true`).

**Known gap vs. the original `docs/USP-05-gis-command-center.md` plan:** the CSV export (`toCsv` in `AdminReports.tsx`) does not add `Bottleneck`/`AvgAgeDays` columns as the plan's step 5 suggested — it still exports the original challenge-row columns. Not required for the feature to be considered done, but worth knowing if a report consumer expects those columns.

## Bilingual (English ↔ Hindi) — Site-wide Language

**Status:** Implemented. Blocking first-visit gate + persistent switcher. Default English, easy spoken Hindi, Tiro Devanagari Hindi for all Hindi text.

- **Gate:** `client/src/components/LanguageGate.tsx` — Radix `Dialog` (portaled, so not clipped by `Home.tsx:102` `overflow-hidden`), `open={!hasChosen}`, `onEscapeKeyDown` + `onInteractOutside` `preventDefault`, no `X`. Three large `motion.button` pills (`English` / `हिंदी` / `ᱥᱟᱱᱛᱟᱲᱤ`, staggered fade-in via `framer-motion`, `grid-cols-1 sm:grid-cols-3`) each with a big glyph, name, tagline, and a large faded background watermark glyph for depth. Must pick one to continue. Above the pills is a bordered, paper-toned "translation stack" panel — one row per language (`EN`/`HI`/`SAT` mono-ui tag + the sentence in that language/script) explaining what picking a language does; the same 3-row pattern repeats, smaller, for the bottom "you can change this anytime" hint. All of the gate's own multilingual copy is `data-no-translate` (it's static/hand-verified, not meant to be run through the live-translate layer below — moot in practice since the gate only ever renders while `language` is still the default `"en"`, but kept as defensive intent). Mounted once in `client/src/App.tsx:236` inside `LanguageProvider`. Redesigned (wider `sm:max-w-[36rem]` dialog, the translation-stack panel, watermark glyphs, motion stagger) when Santali was added as a third option — the original 2-language version was a plain `grid-cols-2` with a single bilingual `<br/>`-separated subtitle, which didn't have room for a third language's copy without looking cramped.
- **Backdrop:** the gate is the one dialog in the app with a custom blurred/tinted overlay instead of the shared `ui/dialog.tsx` default (`bg-black/50`, flat, no blur). `DialogContent` now accepts an optional `overlayClassName` prop (`client/src/components/ui/dialog.tsx`) that's merged onto `DialogOverlay` via `cn()`/`twMerge`, so passing one only affects that call site — every other `Dialog` in the app (e.g. `AuthRequiredDialog`) is untouched and keeps the plain overlay. The gate passes `backdrop-blur-md bg-gradient-to-br from-black/75 via-[#132e24]/55 to-black/80`, plus two `motion.div` ambient glow blobs (ember `#c94a20` top-left, forest `#132e24` bottom-right, `blur-3xl`, looping scale/opacity via `framer-motion`) positioned inside the card behind its content (`z`-ordered under a `relative` content wrapper) for a bit of "alive" depth without being distracting. **Known interaction with the documented Leaflet z-index/compositing fix:** if the gate is ever open over a route with `InteractiveMap` in view, the map's tiles won't blur (same `backdrop-filter` compositing limitation documented under "InteractiveMap z-index fix" — GPU-composited Leaflet tile panes are excluded from `backdrop-filter` sampling by the browser). Not fixable from the overlay's side; would need the same per-element treatment `InteractiveMap.tsx` already has.
- **`overlayClassName` is new and currently only used by the gate** — if a future high-emphasis modal (a big confirmation, a celebratory success screen) wants the same blurred/tinted treatment, reuse this prop rather than duplicating `DialogOverlay` logic or hardcoding a one-off overlay.
- **Context:** `client/src/contexts/LanguageContext.tsx` — `Language = "en"|"hi"`, `STORAGE_KEY = "samadhan-language"`, `hasChosen` derived from `localStorage` presence (so default `en` is a real selection, not auto-dismiss). Sets `document.documentElement.lang/dataset.lang`, persists to `localStorage`. `t(key)` does `dict[lang][key] ?? en[key] ?? key`.
- **Dictionaries:** `client/src/lib/i18n/en.ts` + `hi.ts` (easy Hindi: `"Report a challenge" → "समस्या बताएँ"`, not shuddh `"चुनौती रिपोर्ट करें"`), `index.ts` re-export. Keys cover gate, all 5 headers, `AccountMenu`, `Home` hero/metrics/process/preview/footer, `Challenges` rail. New pages should add keys to both files; missing key falls back to English.
- **Font:** `client/src/index.css:5` adds `@import Tiro Devanagari Hindi`, defines `--font-hindi`, and `html[lang="hi"] .font-body/.font-display/.font-mono-ui { font-family: var(--font-hindi) }` so _all_ Hindi text uses Tiro without per-element logic.
- **Switcher:** `client/src/components/LanguageSwitcher.tsx` — `EN | हि` segmented pill, `variant="light"|"dark"` to match header (ember/dark). Placed immediately left of `<AccountMenu/>` in every header: `Home.tsx:26` (dark), `PublicPortalHeader.tsx:32`, `AdminHeader.tsx:32`, `InstituteHeader.tsx:14`, `IndustryHeader.tsx:13`. Also in `Home` mobile nav.
- **Headers translated:** `AdminHeader`/`InstituteHeader`/`IndustryHeader` keep `active` prop as English `key` (e.g. `"Dashboard"`), translate label via `labelKey` → avoids breaking active highlight when `t()` returns Hindi. `PublicPortalHeader` builds `publicLinks` from `t()` on each render.
- **Home translated:** hero, metrics, process steps, preview, footer all via `t()` (`Home.tsx:21`).

**Manual QA:** Incognito → any route (`/` or `/challenges`) → blocking gate appears, no scroll → pick हिंदी → `localStorage samadhan-language=hi`, `html[lang=hi]`, Tiro visible, gate gone, navigate all routes persists, header switcher toggles, reload persists, `npm run check/build/test` pass.

### Live auto-translate layer — covers everything the static dictionaries don't

The `en.ts`/`hi.ts` dictionaries above only cover ~5 hand-translated surfaces (gate, headers, `AccountMenu`, `Home`, `Challenges` rail). Every other page's English text — the other ~30 page components, challenge titles/descriptions pulled from Firestore, toast messages, anything not wrapped in `t()` — is translated **live, at runtime, with no hardcoded strings**, via a DOM-level auto-translator layered on top of the dictionary system, not replacing it.

- **`client/src/lib/liveTranslate.ts`** — `translateText(text, source, target)` calls **MyMemory** (`api.mymemory.translated.net/get`), a free, keyless, CORS-enabled translation-memory + MT API (no server, no API key, not an LLM call — chosen after the LibreTranslate public mirrors that were tried first all returned 301/405/502 and proved too unreliable to build on). Every translated string is cached forever in `localStorage` (`samadhan-translate-cache-v1`) plus an in-memory `Map`, so a given string only ever costs one network call per browser, across all sessions. `shouldTranslate(text)` gates what's worth sending: skips empty/whitespace, punctuation-or-digits-only, URLs, and — **critically** — anything with no Latin letters. That last check is what keeps this layer from re-processing text the static Hindi dictionaries (or a previous Santali pass) already produced — Devanagari and Ol Chiki both have no Latin letters, so both are always skipped — if you ever "fix" that regex to also match either script, you will re-break the restore-to-English path (this exact bug was caught and fixed once: it corrupted the cached "original" for already-Hindi text, so switching back to English left dictionary strings stuck in Hindi).
- **`client/src/components/AutoTranslate.tsx`** — mounted once in `App.tsx` wrapping `<Router/>`. Does **not** render an extra wrapper `<div>` (would risk the `overflow`/sticky-header trap documented above) — it renders `children` as a bare fragment and does all its work by walking real DOM text nodes via `document.createTreeWalker`, observing `document.body` (not just its own subtree) with a debounced `MutationObserver` so it also catches Radix/sonner **portal** content (dialogs, dropdowns, toasts) that renders outside the React tree it's mounted in. For each eligible English text node it calls `translateText(..., "en", language)` (where `language` is whatever `useLanguage()` currently reports — `"hi"` or `"sat"`) and swaps `node.textContent` in place once resolved; switching back to English restores every swapped node from a `WeakMap` of originals (`restoreAll()`).
  - **Race condition already fixed once, don't reintroduce it:** a `translateText()` promise kicked off for one target language can resolve _after_ the user has already switched to a different one (English, or the other non-English language). The resolve handler checks a module-level `currentTargetLang` (updated synchronously on every effect run) against its own `target` argument before applying the translation — without that check, a slow API response silently overwrites text the user is no longer looking at.
  - **`restoreAll()` runs on every language change, not just on switching to English** — including a direct `hi -> sat` or `sat -> hi` toggle (the 3-way switcher allows this without passing through English). Without an unconditional restore first, a node already translated to Hindi is indistinguishable from "already correctly translated" when the target becomes Santali (its `textContent` just doesn't match the _new_ target, but the "already translated, unchanged" fast-path only compares against the _old_ translated value), so it would get skipped instead of re-translated. This was caught and fixed by making every language switch restore to English first, then translate to the new target if it isn't English.
  - **Opt out of live-translation** on any element (its own text and all descendants) with `data-no-translate` — used on `LanguageSwitcher.tsx`'s `EN | हिं | SAT` toggle so the toggle labels themselves are never sent through the translator.
  - **Known limitation, not a bug:** a sentence split across multiple JSX-interpolated text nodes (e.g. `` `Showing {count} of {total} challenges` `` renders as 3+ separate text nodes around the numbers) gets translated **node-by-node independently**, since each node has no sentence context. Hindi/Santali word order differs from English, so these can render grammatically awkward (word-salad-adjacent, not wrong-language) rather than a fluent single sentence. This is inherent to any node-level DOM translator (the same category of limitation the old Google Website Translate widget had) — fixing it would require merging sibling text nodes into block-level translation units before calling the API and splitting the result back across the original nodes, which has not been built.
  - Verified end-to-end with throwaway Playwright scripts (not checked in) driving the real dev server: switching to Hindi and to Santali on `/challenges` each correctly translated the domain pills, table headers, stat cards, and challenge cards not covered by the static dictionary; switching back to English, and switching directly between Hindi and Santali, correctly restored/re-translated every one of them, including previously-broken cases (the restore race, the Devanagari-regex bug, and the hi<->sat direct-switch bug, all above).

**Do not add more keys to `en.ts`/`hi.ts` to "cover" a new page** — that dictionary is now only for a handful of performance/quality-critical surfaces (first-visit gate, headers) that benefit from instant, hand-tuned translation with zero network dependency. Everything else is covered automatically by the live layer; a new page needs no i18n work at all.

### Third language: Santali (Ol Chiki) — live-translation only, no static dictionary, no voice support

Santali was added as a third `Language` (`"en" | "hi" | "sat"` in `client/src/contexts/LanguageContext.tsx`) purely through the live-translate layer above — there is **no `sat.ts` dictionary**, and `dictionaries` is now `Partial<Record<Language, ...>>` so `t()` falls back to the English string for `"sat"`, which `AutoTranslate` then live-translates like any other English text on the page. This means every route gets Santali "for free" the same way it gets Hindi coverage on pages outside the 5 hand-translated surfaces — no i18n work needed per page.

- **Script/font:** MyMemory returns Santali in **Ol Chiki** script (Unicode block U+1C50–U+1C7F), not Devanagari or Latin — verified directly against the API, including a novel, non-templated sentence (confirms it falls back to real MT, not just a fixed phrasebook). `client/src/index.css` loads `Noto Sans Ol Chiki` from Google Fonts and defines `--font-santali`, applied globally via `html[lang="sat"] body/.font-display/.font-mono-ui/.font-body` — same pattern as the existing Hindi/Tiro rule.
- **`LanguageGate.tsx`** — third pill (see the redesigned-gate note above). All of its Santali copy — pill glyph/name/tagline, the trilingual translation-stack panel row, the header's short subtitle, the bottom hint — was fetched from MyMemory directly and pasted in verified, the same way the pre-existing Hindi copy was hand-written — **do not hand-type new Santali strings from memory**, always source them from a translation call, since Ol Chiki has essentially no representation in general text corpora and a guessed string is far more likely to be wrong than for Hindi. One phrasing lesson worth keeping: the literal sentence "Select how you want to use Samadhan." produced a garbled MyMemory result with a repeated word ("ᱮᱢ ᱮᱢ ᱮᱢ ᱮᱢ"); rephrasing to "Choose how you want to use Samadhan" (semantically equivalent, not a literal re-ask) produced a clean translation — when a fetched Santali string looks like it has a repetition/garble artifact, try a slightly reworded source sentence before accepting it, rather than shipping the glitchy output.
- **`LanguageSwitcher.tsx`** — third button labeled `SAT` (Latin abbreviation, consistent with `EN`; Ol Chiki has no established short-form abbreviation), `aria-label="Santali (Ol Chiki)"`.
- **Known MT quality gap vs. Hindi, not a bug in this repo's code:** Santali has far less translation-memory data behind MyMemory than Hindi does. Observed artifact: some UI words come back with a parenthetical English gloss appended (e.g. a "Water" domain pill rendering as `ᱫᱟᱜ (Water)`) — this is the underlying TM data, not something `liveTranslate.ts` adds or can reliably strip without risking corruption of legitimate parenthetical content elsewhere. If this becomes a real quality problem, the fix is a Santali-specific dictionary for just the highest-visibility strings (domain names, nav labels), not a change to the live-translate pipeline.
- **Voice input ("Bhasha & Bol") deliberately does NOT support Santali.** `VoiceCapture.tsx` uses the browser's `webkitSpeechRecognition`/`SpeechRecognition`, which is backed by Google's speech-recognition service — checked against Google Cloud Speech-to-Text's own supported-language list, which does not include Santali (`sat`/`sat-IN`) at all, on-device or cloud. There is no free way to add Santali speech-to-text in-browser. A real implementation would require a paid third-party STT API (e.g. Sarvam AI, which does offer Santali) and, since this project has no backend, shipping that provider's API key client-side — the same tradeoff already accepted for the Groq vision key. This was explicitly deferred (owner chose text-only Santali support) rather than half-implemented; if voice support is ever wanted, it needs its own signed-up API key and a `VITE_`-prefixed env var wired through `.github/workflows/deploy.yml` the same way `VITE_GROQ_API_KEY` is.

## AI Auto-Categorize + Duplicate Detection (`/citizen/submit`)

**Status:** Implemented. See `docs/update1.md` for the original implementation writeup.

Two client-side AI features on the challenge submission form:

1. **AI image categorization** — `client/src/lib/groqVision.ts` `analyzeImage(base64DataUrl)` sends the picked photo to the **Groq** Vision API (`qwen/qwen3.6-27b`, multimodal, Groq's free tier) and returns `{ title, description, domain }`, which `SubmitChallenge.tsx`'s `aiScanImage()` uses to fill the form fields the user hasn't already hand-edited (same non-clobbering pattern as the Bhasha & Bol / location-pick auto-fills above — never overwrites a field the user already typed). The request sends `reasoning_effort: "none"` specifically because this Qwen model emits `<think>...</think>` reasoning by default; `extractJson()` also strips any `<think>` block defensively even with that flag set. Triggered either from the dedicated "AI scan" button or automatically when a file is dropped in the evidence uploader (`SubmitChallenge.tsx:650`).
2. **Duplicate detection** — `client/src/lib/duplicateCheck.ts` `checkTitleDuplicate(district, title, existingChallenges)` runs alongside the vision call (`Promise.all`, not sequential) against the already-fetched `trpc.workflow.challenges.useQuery({})` list: same district + >60% word-overlap on title (words ≥4 chars) flags a duplicate and renders a red warning banner linking to the existing challenge. Deliberately title-based, not perceptual-hash-based — pHash would require fetching every `challengeEvidence` doc's 680 KB base64 `fileData` just to compare images, which is too heavy for a submit-time check. `client/src/lib/storage.ts`'s `pHashFromCanvas()`/`hammingDistance()` exist for this purpose but are **not yet wired in** — available for a future pHash-based pass.
3. `client/src/lib/db.ts` `incrementDuplicateCount(challengeId)` bumps a `duplicateCount` field (type-only addition to `drizzle/schema.ts`'s `challenges` table, schemaless in Firestore so old records without it just read as `undefined`/0) through the existing `omitUndefined()`-filtered `updateChallenge()`.

**Config:** `VITE_GROQ_API_KEY` in root `.env` (gitignored). Because this is a `VITE_`-prefixed var, Vite bundles it **into the client JS at build time** — it is not a server secret, it ships to the browser, which is an accepted tradeoff for this feature (documented in `docs/update1.md`; a Cloudflare Worker proxy would be the fix if this ever needs to be hidden). This has a consequence for CI: **the GitHub Actions deploy workflow (`.github/workflows/deploy.yml`) must have `VITE_GROQ_API_KEY` available as a repository secret and passed as an `env:` to the `npm run build` step**, or the production bundle silently ships without a key and `analyzeImage()` throws "Groq API key not configured" for every user. The workflow already does this (`env: VITE_GROQ_API_KEY: ${{ secrets.VITE_GROQ_API_KEY }}` on the build step) — if this secret is ever missing/rotated on `ankan-web/samadhan-landing` (Settings → Secrets and variables → Actions), the AI scan button will fail in production even though local `npm run dev`/`npm run build` (which read the root `.env` directly) work fine.

**No rules change needed** — `duplicateCount` is a normal field on `challenges`, already covered by the existing `allow write: if isSignedIn()` rule.

## Architectural decisions and why

- **Replaced the Manus OAuth cookie-session system with Firebase Authentication entirely** (not run side-by-side) — single identity system, simpler to reason about, decided explicitly with the project owner rather than assumed.
- **Citizens get real accounts too** (not just anonymous name+email submission) — enables tracking their own reports and role-based routing, also an explicit decision.
- **Kept `firestore.rules` fully locked down** even after adding client-side Firebase Auth — deliberately did not switch to client-side Firestore SDK access + auth-based security rules, to keep the "server is the only writer" architecture that predates this session's auth work.
- **Organization "verification" (initial gate) and "standing" (ongoing moderation) are separate fields/flows** — a verified organization can still be warned/suspended/terminated later; these are independent admin actions with independent UI, not a single status enum, because real moderation needs "verified but currently suspended" to be representable.
- **Route-level "pending verification" is rendered inline by `ProtectedRoute`, not a redirect** — specifically to make the state always reflect live server data (fixes a real bug where browser back-navigation could re-show a completed onboarding form because the old implementation tracked "submitted" in local component state instead of querying the account's actual linked-organization status).
- **Deleted the backend entirely rather than rehosting it** - the project moved to Cloudflare, whose Workers runtime cannot run Express + `firebase-admin` at all (`@grpc/grpc-js` needs raw TCP/HTTP2 sockets). The options were: keep a Node host somewhere, or remove the server. The owner chose removal, accepting that `firestore.rules` becomes the whole security model.
- **Kept the tRPC call shape as a shim instead of rewriting the pages** - ~37 large single-file page components call 41 procedures. Preserving `trpc.workflow.X.useQuery(...)` turned a 38-file rewrite into 4 new files, which is why the page layer is untouched and the typecheck stayed clean.
- **Admin moved from an `ADMIN_EMAILS` env var to a Firebase Auth custom claim** - an env var needs a server to evaluate it, and a Firestore field would be writable by the user it describes. A custom claim is the only role signal a browser cannot forge.
- **Uploads moved from S3-via-Forge to base64-in-Firestore** - the Forge API needs a secret key that can never ship to a browser, and the obvious replacement (Firebase Cloud Storage) requires the Blaze plan. Staying free was an explicit owner requirement, so files live in the document instead, with client-side image compression to fit the 1 MiB limit.
