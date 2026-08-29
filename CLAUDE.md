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

**MANDATORY CLAUDE.md MAINTENANCE RULE:** Whenever Claude Code reads this file and performs work in this repository based on its instructions, it MUST update `CLAUDE.md` before finishing that work/session whenever there is any new information, change, decision, convention, architectural detail, deployment detail, configuration change, discovered issue, resolved issue, or other project knowledge that would be useful for a future Claude Code session. Do not wait for the user to explicitly ask for `CLAUDE.md` to be updated — treat keeping it current as a required part of every work session, the same as running `npm run check`. Never remove existing useful documentation just because it is inconvenient to update; instead, edit it carefully so the file stays an accurate description of the *current* repository, correcting anything that has become outdated rather than leaving stale claims alongside new ones. Do not turn this file into a chronological diary of every small action taken in a session — keep entries as durable facts about the codebase's current state and hard-won lessons, not a changelog.

## Tech stack

- **Frontend**: React 19 + Vite 7 + TypeScript, `wouter` for routing (not react-router), TanStack Query, Tailwind CSS v4, shadcn/ui-style components (`client/src/components/ui`), Framer Motion for animation, `sonner` for toasts.
- **API layer**: **none — there is no backend.** The browser talks to Firestore directly via the Firebase client SDK. `client/src/lib/trpc.ts` is a _shim_ that preserves the old tRPC call shape (see "Client-side data layer" below); it is not tRPC and there is no server to call.
- **Backend runtime**: **none.** The app is a pure static SPA. `server/`, `api/`, Express, tRPC, and `firebase-admin`-in-a-request-path have all been deleted.
- **Primary datastore**: **Cloud Firestore**, accessed **directly from the browser** with the Firebase client SDK. All application records (organizations, challenges, projects, users, notifications, etc.) live in Firestore, and `firestore.rules` is the sole access-control boundary.
- **File storage**: **none — files are stored as base64 inside the Firestore record that references them** (`client/src/lib/storage.ts`). Firebase Cloud Storage requires the Blaze plan; this project stays on **Spark (free)**, so it is deliberately not used.
- **Authentication**: **Firebase Authentication** (client SDK `firebase/auth` only — there is no server left to verify tokens). See the dedicated Authentication section below.
- **Legacy/unused**: `drizzle-orm` (`drizzle/schema.ts`) — a **type source only**, never a live database. Import it with `import type` so it stays out of the bundle.
- **Testing**: Vitest (`npm test`). `tests/firestore.rules.test.ts` checks the real project's rules boundary over the REST API as an anonymous caller — **no credentials needed**, and it is now the primary safety net for access control.

## Project / folder structure

```
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
                       - one header per "realm"; all render <AccountMenu/> for the sign-in/account area
                     DashboardLayout.tsx     - a sidebar shell that is NOT currently used by any route (dead/scaffold code, left as-is)
                     ui/                    - shadcn-style primitives (button, dialog, sonner toaster, etc.)
  hooks/
    useAuth.tsx     - React context wrapping Firebase's onAuthStateChanged (see Auth section)
  lib/
    firebase.ts     - Firebase client SDK init + auth helper functions
    roles.ts        - Role type + dashboardPathForRole() (single source of truth for "where does this user land")
    trpc.ts         - the API shim: preserves the tRPC call shape over direct Firestore calls
    db.ts            - Firestore data layer (port of the old server/workflow.ts)
    userProfile.ts    - users/{uid} profile CRUD + admin-claim role resolution
    storage.ts         - inline file storage: image compression + base64/object-URL handling
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
                          grant-admin.mjs (sets the `admin` custom claim — the only way to create an admin)
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
- The Firebase project's public client config (`apiKey`, `authDomain`, `projectId`, etc.) is hardcoded in `client/src/lib/firebase.ts`. This is **not a secret** — Firebase web config is meant to be public; access control is enforced by Firestore rules + server-side ID token verification, not by hiding this config.

### How auth state is maintained (client)

- `client/src/hooks/useAuth.tsx` (`AuthProvider`) wraps the whole app in `main.tsx` and subscribes to `onAuthStateChanged`, exposing `{ user, loading, logout }` via `useAuth()`.
- The tRPC client (`main.tsx`) attaches the Firebase ID token to **every** request:
  ```ts
  async headers() {
    const idToken = await auth.currentUser?.getIdToken();
    return idToken ? { Authorization: `Bearer ${idToken}` } : {};
  }
  ```
  There is no session cookie anymore — auth is entirely Bearer-token based, token fetched fresh (and auto-refreshed by the Firebase SDK) on every request.

### How roles are resolved (no server)

- `client/src/lib/userProfile.ts` `loadOrCreateProfile(user)` loads `users/{uid}`, creating it on first sight. This is the browser-side replacement for what `server/_core/context.ts` used to do per request.
- **`admin` is a Firebase Auth custom claim, never a Firestore field.** `resolveRole()` reads `getIdTokenResult().claims.admin`. It deliberately ignores any `role: "admin"` stored in the document, and `firestore.rules` additionally refuses to persist that value - because the user can write their own profile document.
- The old `ADMIN_EMAILS` env var is gone; there is no server to evaluate it.

### User profile / role data (Firestore, not MySQL)

- Collection: `users`, **document ID = Firebase Auth `uid`** (not an auto-generated numeric ID like other collections).
- Shape (`client/src/lib/userProfile.ts` `UserProfile`): `{ uid, email, name, role: "citizen"|"institution"|"industry"|"admin", district?, organizationId?, authProvider, createdAt, updatedAt }`. Note the stored document never contains `role: "admin"` - that value is resolved from the custom claim at read time.
- **`auth.bootstrapProfile`** (now a shim mutation, not an API call) still runs right after `signUpWithEmail`/social sign-in to record the chosen role (`citizen`/`institution`/`industry`) and name/district. It cannot set `role: "admin"` - its input type excludes it and `firestore.rules` rejects it.
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

### Firestore security rules (`firestore.rules`) - read before touching

**This file is now the entire security model.** It was previously `allow read, write: if false` for everything, because a server mediated all access. That server is gone, so the rules had to be written for real.

Shape of the current rules:

- `isAdmin()` = `request.auth.token.admin == true` (the custom claim). Never derived from document data.
- **`users/{uid}`** - readable by its owner or an admin; writable only by its owner, and **`role` is constrained to `citizen|institution|industry`**, which is what blocks self-elevation to admin.
- **`organizations`** - world-readable (the UI frames orgs as public civic records). Creates must start `verificationStatus: "pending"` / `standing: "active"` and set `ownerUid` to the caller. Owners may edit their own details but **cannot** touch `verificationStatus`, `standing`, or `ownerUid`; only an admin can. This preserves the old `adminProcedure` gate on verification/standing.
- **`challenges`** and the workflow collections (`projects`, `assignments`, `projectMilestones`, ...) - world-readable, writable by any signed-in user.
- **`notifications`** and **`challengeSupports`** - **not** world-readable; scoped to `recipientEmail`/`supporterEmail` matching the caller's token email. Because rules are evaluated per document, a listing query only succeeds if it _already_ filters on that field - which is exactly why `db.ts` reads these two with `listCollectionWhere(...)` instead of fetching the whole collection. **If you change those reads to an unfiltered `listCollection`, they will fail with permission-denied.**
- A trailing `match /{document=**} { allow read, write: if false; }` keeps anything unlisted denied by default.

Baseline worth remembering when judging this: the old tRPC API exposed nearly every mutation as a `publicProcedure`, so unauthenticated callers could already invoke them over HTTP. Requiring sign-in here is a tightening.

**Rules changes only take effect once deployed** (`npm run deploy:rules`). Editing this file locally does nothing on its own.

## Environment variables

There is **no runtime configuration left** - the deployed app is static files plus the public Firebase web config hardcoded in `client/src/lib/firebase.ts`. Nothing in `.env` reaches the browser.

Root `.env` (gitignored, never commit it) is now only used by local tooling:

| Variable                        | Purpose                                                                                                                                | Required            |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Service-account JSON, used **only** by `scripts/grant-admin.mjs` to set admin custom claims. Still the one genuinely sensitive secret. | only to grant admin |

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

### Vite plugins are dev-only

`vitePluginManusRuntime` and `vitePluginManusDebugCollector` are excluded from production builds (`command === "serve"` in `vite.config.ts`). Previously they shipped: a **367 KB** inlined `manus-runtime` script in `index.html`, and a debug collector POSTing to `/__manus__/logs`, which only exists in the Vite dev server and returned 405 on every page load in production. Excluding them took `index.html` from 367.88 KB to 0.74 KB. Don't add them back to the build.

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
- **`AdminUsers.tsx` / `AdminUserDetail.tsx` do not read the `users/{uid}` collection at all.** They derive a "user registry" view purely from `organizations` and `challenges` - admins cannot see real signed-up accounts or roles from that page. Predates this rewrite.
- **`drizzle/` is a type source only.** `drizzle.config.ts` and the `db:push` script have been deleted; `drizzle/schema.ts` remains purely so `$inferSelect`/`$inferInsert` can describe each Firestore collection's shape. There is no MySQL database.
- **`DashboardLayout.tsx` + `DashboardLayoutSkeleton.tsx` are unused** - a sidebar shell scaffold from the original template, not referenced by any route. Left in place; inert.
- **Uploads are capped at ~680 KB per file** and consume Firestore storage/bandwidth rather than object storage. Spark's free quota (1 GiB stored, 50k reads/day) is the real limit here; a few hundred compressed evidence photos is fine, a document-heavy workload is not. Blaze + real Cloud Storage is the upgrade path.
- **The client bundle roughly doubled** (~1.07 MB -> ~1.96 MB raw, ~509 KB gzipped) because the Firestore SDK now ships to the browser. Code-splitting the admin/institute/industry routes is the obvious fix and has not been done.
- **`docs/firebase_backend_research.md`** is stale (it says the project does not use Firebase Authentication). This CLAUDE.md supersedes it.

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
