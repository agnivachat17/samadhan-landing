# CLAUDE.md

Guidance for Claude Code (or any future engineer) working in this repository. This file reflects the **actual current implementation**, verified by reading the code — not aspirational design. Where something is genuinely ambiguous, it's marked `UNCLEAR` rather than guessed.

## Project overview

**Samadhan** is a civic-innovation platform (built for a Jharkhand government hackathon / SIH-style submission) that connects three kinds of participants around local civic problems:

- **Citizens** report challenges (water, health, safety, digital access, etc.) with location, description, and district.
- **Institutions** (colleges, universities, research centers) apply to join, get verified by an admin, and turn assigned challenges into delivery **projects** (milestones, documents, team members).
- **Industry partners** apply similarly and back institution-led projects with funding/expertise/CSR support (`industryInterests`).
- **Admins** verify/moderate organizations, assign challenges to verified institutions, review project closeouts, and oversee the whole workflow.

The data model (see `shared/workflow.ts`) is intentionally a single pipeline: `challenge → assignment → project → closeout`, with citizen confirmation and admin approval as the final steps.

## Tech stack

- **Frontend**: React 19 + Vite 7 + TypeScript, `wouter` for routing (not react-router), TanStack Query, Tailwind CSS v4, shadcn/ui-style components (`client/src/components/ui`), Framer Motion for animation, `sonner` for toasts.
- **API layer**: tRPC v11 (`@trpc/server` + `@trpc/client` + `@trpc/react-query`), served over Express under `/api/trpc`, with `superjson` as the transformer (so `Date` objects survive the wire).
- **Backend runtime**: Node.js + Express, run via `tsx watch` in dev, bundled with `esbuild` for production.
- **Primary datastore**: **Cloud Firestore** (via `firebase-admin`), accessed **only from the server**. All actual application records (organizations, challenges, projects, users, notifications, etc.) live in Firestore.
- **Authentication**: **Firebase Authentication** (client SDK `firebase/auth` + server verification via `firebase-admin/auth`). See the dedicated Authentication section below — this is new since the last major session of work and is the most important thing to understand correctly.
- **Legacy/unused**: `drizzle-orm` + MySQL (`drizzle/schema.ts`, `drizzle.config.ts`) — **no longer a live database**. See "Drizzle/MySQL" note below.
- **File storage**: S3-backed, proxied through a "Forge" API (`server/storage.ts`, `server/_core/storageProxy.ts`) — part of the Manus WebDev platform template this project was scaffolded from.
- **Testing**: Vitest (`npm test`), a handful of unit tests plus two integration tests that hit the **real** Firestore project.

## Project / folder structure

```
client/src/
  pages/          One file per route (see "Routing" below). Mostly self-contained,
                   large single-return JSX with local sub-components at the bottom.
  components/      Shared UI. Notably:
                     AccountMenu.tsx        - auth-aware header widget (Sign in/up vs. name+Dashboard+Sign out)
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
    trpc.ts         - createTRPCReact<AppRouter>() instance (thin; the actual link config is in main.tsx)
  contexts/ThemeContext.tsx
  App.tsx           - route table (wouter <Switch>), wraps routes in ProtectedRoute where needed
  main.tsx          - React root, AuthProvider, QueryClientProvider, tRPC httpBatchLink (attaches Firebase ID token)

server/
  _core/
    index.ts        - Express app entrypoint (also used by the dev tsx-watch script and the prod build)
    context.ts       - tRPC context: verifies the Firebase ID token, loads/creates the Firestore user profile
    trpc.ts           - tRPC instance + publicProcedure/protectedProcedure/adminProcedure middleware
    env.ts            - process.env wrapper (see Environment variables below)
    systemRouter.ts   - health check + notifyOwner (admin-only, calls the Manus notification service)
    storageProxy.ts   - serves /manus-storage/* local dev assets
    vite.ts            - dev-mode Vite middleware / prod static file serving
    heartbeat.ts, llm.ts, imageGeneration.ts, voiceTranscription.ts, dataApi.ts, map.ts
                        - Manus WebDev platform scaffold helpers (cron jobs, LLM calls, image gen,
                          speech-to-text, generic "data API" proxy, Google Maps proxy). NOT wired into
                          any router currently — unused by the app's actual features. Left in place as
                          available infra, not dead code to delete blindly.
  firebase.ts        - firebase-admin app init; exports getFirebaseFirestore(), getFirebaseAuth(), verifyFirebaseIdToken()
  users.ts            - Firestore `users/{uid}` profile CRUD (role, org link, standing) — see Auth section
  workflow.ts          - all Firestore read/write logic for the actual app data (organizations, challenges,
                          projects, milestones, documents, activities, interests, closeouts, notifications)
  routers.ts            - root tRPC router: `system`, `auth`, `workflow`
  routers/workflow.ts    - tRPC procedure definitions (zod input validation) that call into workflow.ts
  storage.ts             - S3-via-Forge upload/download helpers
  *.test.ts              - Vitest tests (see Testing below)

shared/
  workflow.ts        - shared status/stage enums + route-path constants, used by both client and server
  types.ts            - re-exports drizzle schema types + shared/_core/errors
  const.ts             - UNAUTHED_ERR_MSG / NOT_ADMIN_ERR_MSG (tRPC error message constants)
  _core/errors.ts       - HttpError + BadRequestError/UnauthorizedError/etc. constructors

drizzle/
  schema.ts           - MySQL table definitions — used ONLY as a TypeScript type source now (see below),
                         not a connected database.

firestore.rules       - denies ALL direct client Firestore access (see Firestore section)
firebase.json          - points Firebase CLI at firestore.rules

docs/                   - all non-CLAUDE.md project documentation (research notes, verification logs,
                          setup notes, todo/ideas lists, asset manifests, a plain-text route list).
                          CLAUDE.md itself stays at the repo root (Claude Code looks for it there).
scripts/                - one-off dev tooling: screenshot.mjs (Playwright page screenshots for visual QA)
```

## Frontend architecture

- **Routing**: `wouter`, defined entirely in `client/src/App.tsx` as a flat `<Switch>`. No nested layouts/route trees.
- **Data fetching**: tRPC + React Query. Every page calls `trpc.<router>.<procedure>.useQuery/useMutation` directly; there is no separate "API client" abstraction beyond the generated tRPC hooks.
- **Styling**: Tailwind v4, custom CSS variables in `client/src/index.css` define the site's actual palette (`--background`, `--primary`, etc., all `oklch()`), with `--radius-*: 0px` — the whole app deliberately uses **square corners** ("civic editorial paper" aesthetic: cream backgrounds, ember/orange accents `#c94a20`-ish, forest green text, `font-display` serif for headings, `font-mono-ui` for labels/buttons, `font-body` for prose). Match this aesthetic when adding UI — do not default to shadcn's rounded-corner defaults.
- **Toasts**: `client/src/components/ui/sonner.tsx` is customized (not stock shadcn) — `richColors` + custom `classNames` to match the paper aesthetic and guarantee contrast. Don't revert this to the stock config; a past version of it was nearly unreadable (near-white text on near-white background).
- **No global state library** beyond React Query's cache and the two React Contexts (`AuthProvider`, `ThemeProvider`).

## Backend / API architecture

- Single Express app (`server/_core/index.ts`) mounts:
  1. `registerStorageProxy(app)` — local asset serving
  2. tRPC middleware at `/api/trpc` (`createExpressMiddleware`)
  3. Vite dev middleware (dev) or static file serving (prod)
- **tRPC router shape** (`server/routers.ts`):
  - `system.health`, `system.notifyOwner` (admin-only)
  - `auth.me` (public — returns `null` if not authenticated), `auth.bootstrapProfile` (protected)
  - `workflow.*` — the entire app's business logic (organizations, challenges, assignments, projects, milestones, documents, activities, industry interests, challenge support/follow, closeouts, notifications)
- Procedures are **mostly `publicProcedure`** by design (citizens submit challenges without an account; organization data is publicly viewable per the "public-review" civic-transparency framing baked into the UI copy). The two procedures that mutate an organization's official status are `adminProcedure`-gated: `workflow.verifyOrganization` and `workflow.updateOrganizationStanding`. If you add more admin-only actions, use `adminProcedure`, not a client-side-only check — a past bug had `verifyOrganization` as `publicProcedure`, meaning anyone could call it directly via a raw HTTP request regardless of what the UI showed. This was fixed; don't reintroduce it.

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

### How auth is verified (server)
- `server/firebase.ts`: `verifyFirebaseIdToken(idToken)` wraps `firebase-admin`'s `getAuth().verifyIdToken()`.
- `server/_core/context.ts` (`createContext`): reads the `Authorization: Bearer <token>` header, verifies it, and loads (or auto-creates on first sight) a Firestore `users/{uid}` profile via `server/users.ts`. Verification failures are swallowed to `user: null` (not thrown) so public procedures keep working for anonymous callers.
- **First-time profile creation** sets `role: "admin"` automatically if the token's email is in `ENV.adminEmails` (from `ADMIN_EMAILS` env var, comma-separated, lowercase-compared); otherwise defaults to `role: "citizen"`.
- `server/_core/trpc.ts`: `protectedProcedure` requires `ctx.user` truthy; `adminProcedure` additionally requires `ctx.user.role === "admin"`.

### User profile / role data (Firestore, not MySQL)
- Collection: `users`, **document ID = Firebase Auth `uid`** (not an auto-generated numeric ID like other collections).
- Shape (`server/users.ts` `UserProfile`): `{ uid, email, name, role: "citizen"|"institution"|"industry"|"admin", district?, organizationId?, authProvider, createdAt, updatedAt }`.
- **`auth.bootstrapProfile`** (protected mutation) is called by the client right after `signUpWithEmail`/social sign-in to record the chosen role (`citizen`/`institution`/`industry`) and name/district. It can never set `role: "admin"` — that's server-enforced only via `ADMIN_EMAILS`.
- When an institution/industry account completes `workflow.organizationOnboard`, the server stamps `ownerUid` on the new `organizations/{id}` Firestore doc and calls `linkOrganizationOwner(uid, organizationId, kind)`, which sets `organizationId` + `role` back onto the user's profile.
- **Firestore write gotcha (already hit and fixed once)**: the Admin SDK throws on any `undefined` field value in a `.set()`. `server/users.ts` wraps every write in an `omitUndefined()` filter — **do not bypass this** by writing to the `users` collection directly elsewhere without the same filtering, or you'll silently break profile updates for any role that omits an optional field (this exact bug caused institution/industry signups to fail after account creation while leaving the Firebase Auth account behind).

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
There is no signup UI for admins. To become an admin: sign up normally (any role) with an email listed in the `ADMIN_EMAILS` env var — the server overrides the role to `admin` on first authenticated request. Changing `ADMIN_EMAILS` requires restarting the dev server (env vars load once at process start via `dotenv/config`).

## Firestore data model

All real application data lives in Firestore, written exclusively through `server/workflow.ts` (never from the client directly — see Firestore rules below). Collections (see `collectionNames` in `workflow.ts`): `organizations`, `organizationMembers`, `challenges`, `challengeEvidence`, `assignments`, `projects`, `projectMilestones`, `projectDocuments`, `projectActivities`, `industryInterests`, `challengeSupports`, `projectCloseouts`, `notifications`, plus `users` (auth profiles, keyed differently — see above).

Except for `users`, every collection uses a synthetic numeric ID (`Date.now() * 1000 + random`) stored as Firestore document `record-{id}`, generated by `createRecord()` in `workflow.ts`. The `drizzle/schema.ts` MySQL table definitions are used **only for `typeof table.$inferInsert` / `$inferSelect` TypeScript types** — they document each collection's shape and give zod/tRPC input types something to reference, but **no MySQL database is actually connected or written to**. `server/db.ts` (the old MySQL client) was deleted this session. `drizzle.config.ts` and the `db:push` npm script still exist but are not part of the live app; running them would require a `DATABASE_URL` that nothing else in the app uses.

### Firestore security rules (`firestore.rules`)
Denies **all** direct client reads/writes (`allow read, write: if false` for every document), intentionally. All access goes through server-side tRPC procedures using the Firebase Admin SDK (which bypasses these rules via IAM, not client auth). **Do not loosen these rules to enable client-side Firestore SDK usage** — the architecture assumes server-mediated access only; Firebase Auth is used purely for identity, not as a basis for client-side Firestore security rules.

## Environment variables

Root `.env` (gitignored, never commit it):

| Variable | Purpose | Required |
|---|---|---|
| `NODE_ENV` | `development` / `production` | yes |
| `PORT` | Express port (auto-increments if busy, see `_core/index.ts`) | yes |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Full Firebase service-account JSON (as a single-line string) — used by `firebase-admin` for **both** Firestore and Auth verification server-side. **This is the one truly sensitive secret in this project.** | yes |
| `ADMIN_EMAILS` | Comma-separated list of emails that get `role: "admin"` on first sign-in | yes, for any admin access |
| `JWT_SECRET` | Present in `.env` but **no longer used anywhere in the codebase** (leftover from the deleted Manus OAuth cookie-session system) | no — dead |
| `BUILT_IN_FORGE_API_URL` / `BUILT_IN_FORGE_API_KEY` | Manus platform "Forge" API — powers `storage.ts` (S3 uploads), `notification.ts`, `heartbeat.ts` cron jobs | only if those features are used |

Client-side: **no `VITE_FIREBASE_*` env vars** — the Firebase web config is hardcoded in `client/src/lib/firebase.ts` (see Auth section for why that's fine). `vite.config.ts` sets `envDir` to the repo root, so any `VITE_*` var in root `.env` would be exposed to the client bundle if added later.

`.env` is gitignored (confirmed via `git check-ignore`) and has never been committed — good.

## Firebase Console configuration required

Not code — but needed for auth to function, and easy to forget when moving to a new Firebase project:
- Authentication → Sign-in method: **Email/Password** and **Google** enabled (work out of the box). **Facebook** requires a Facebook Developer app (App ID/Secret) registered separately. Apple is not configured (see above).
- Authentication → Settings → Authorized domains: must include the deploy domain (localhost is included by default).

## How frontend and backend communicate

Exclusively via tRPC over HTTP at `/api/trpc`, batched (`httpBatchLink`), `superjson`-serialized. No REST endpoints, no GraphQL. The only non-tRPC HTTP surface is the storage proxy (`/manus-storage/*`) for local dev assets.

## Commands

```bash
npm run dev        # tsx watch server/_core/index.ts — single process serves API + Vite dev middleware
npm run build       # vite build (client) + esbuild bundle of the server → dist/
npm run vercel-build  # vite build (client) + esbuild bundle of the Vercel function → api/_server.js
npm run start        # node dist/index.js (production, after build)
npm run check         # tsc --noEmit — run this after any non-trivial change
npm test               # vitest run — see Testing below, two tests need real Firestore credentials
npm run format           # prettier --write .
npm run seed:demo         # BROKEN — see Known issues
npm run db:push            # drizzle-kit generate/migrate — not meaningful currently, no live MySQL DB
```

There's no separate lint script in `package.json`; `npm run check` (tsc) is the closest thing to a gate.

## Deployment (Vercel)

The app is deployed to Vercel as a static client + **one** Node serverless function.

- `vercel.json` sets `buildCommand: npm run vercel-build`, `outputDirectory: dist/public`, and rewrites `/api/*` and `/manus-storage/*` to the function while sending everything else to `index.html` (SPA fallback for `wouter`).
- **The function entrypoint is `api/index.ts`, but it contains no real code** — it is a one-line `export { default } from "./_server.js"`. The actual Express app lives in **`server/vercelApp.ts`** and is bundled by esbuild into `api/_server.js` (gitignored, produced by `npm run vercel-build`).
- **Why the indirection (this was a real, total outage — don't undo it):** Vercel's Node builder *transpiles TypeScript per-file rather than bundling it*. It does not resolve this repo's tsconfig path aliases (`@shared/*`, `@/*`) and does not resolve the extensionless relative imports used throughout `server/`. When `api/index.ts` imported `../server/...` directly, **every single API request** — not just one endpoint — died with `FUNCTION_INVOCATION_FAILED` (an HTML/plain-text 500, which surfaces client-side as `TRPCClientError: Unexpected token 'A', "A server e"... is not valid JSON`). Pre-bundling with esbuild removes that entire class of failure. Filenames in `api/` starting with `_` are not treated as routes by Vercel, so `api/_server.js` doesn't become its own endpoint.
- `server/_core/index.ts` (the local dev / `npm start` server) is unchanged and separate; `server/vercelApp.ts` is the same Express wiring minus the Vite middleware and `listen()`.
- **Keep `server/` free of path aliases.** `server/_core/trpc.ts` used to import `@shared/const`; it now uses a relative path. Any new alias import inside the server tree would still bundle fine today, but keeping it relative keeps the tree portable to transpile-only runtimes. Client code (`client/src`) keeps using `@/` and `@shared/` normally — Vite resolves those.
- The tRPC Express middleware in `server/vercelApp.ts` has an `onError` handler that `console.error`s failures so they appear in Vercel's function logs. Without it, server errors reach the browser only as unparseable non-JSON.
- **Env vars must be set in the Vercel project settings** (Vercel does not read `.env`): at minimum `FIREBASE_SERVICE_ACCOUNT_JSON` and `ADMIN_EMAILS`. If `FIREBASE_SERVICE_ACCOUNT_JSON` is missing, the function no longer crashes — `createContext` swallows the verification failure and every `protectedProcedure` returns `UNAUTHORIZED` instead, which looks like "signup silently fails" rather than a 500. Check that first when auth misbehaves in production.
- The deploy domain must be listed under Firebase Console → Authentication → Settings → Authorized domains, or `signInWithPopup` rejects.
- **Harmless console noise on the deployed site**, not bugs: `Cross-Origin-Opener-Policy policy would block the window.closed call` (Firebase's popup poller under Vercel's COOP header — the popup flow still completes) and `[Violation] Permissions policy violation: unload is not allowed`.

## Testing

- `server/workflow.test.ts`, `server/_core/storageProxy.test.ts` — pure unit tests, no network, always safe to run.
- `server/workflow.firestore.test.ts`, `server/firestore.rules.test.ts`, `server/firebase.connection.test.ts` — **integration tests that hit the real Firestore project** (`samadhan-sih`) and clean up after themselves via `afterEach`. They require `FIREBASE_SERVICE_ACCOUNT_JSON` in the environment, which **vitest does not load automatically** (no dotenv setup in the test runner) — running `npx vitest run` directly will fail these with "must be configured" unless you inject env vars yourself (e.g. run through a wrapper that loads `.env`, or export the var in your shell first). This is a pre-existing gap, not something introduced this session.
- `workflow.firestore.test.ts` authenticates its tRPC caller as a fake `role: "admin"` user (required since `verifyOrganization` became `adminProcedure`-gated this session — update this test's fixture if you change admin-gating again).

## Important conventions / patterns

- **Page components are large, single-file, minimally decomposed** — most pages are one big JSX return with small helper functions below (`Field`, `SectionLabel`, etc.) in the same file, not split into many small component files. This is the existing style; match it rather than over-modularizing when editing a page.
- **Every header component renders `<AccountMenu variant="light|dark" />`** for the sign-in/account area — don't hardcode a static "Sign in" link in a new header; reuse `AccountMenu`.
- **`dashboardPathForRole` is the only place that should decide "which dashboard does this role land on."**
- Server mutation functions in `workflow.ts` follow a consistent pattern: `createRecord`/`getRecord`/`updateRecord`/`listCollection` generic helpers, with domain functions (`submitChallenge`, `createProject`, etc.) layered on top, often triggering a `createNotification()` side effect.
- Firestore writes must go through `omitUndefined()` (see `server/users.ts`, and the equivalent pattern already present in `workflow.ts`) — the Admin SDK rejects `undefined` field values outright.
- **All test/throwaway data created while debugging in a live session must be cleaned up** (delete the Firebase Auth user + Firestore doc) — this was done consistently this session using small one-off scripts; there is no automated fixture teardown for manual API testing.

## Things that should NOT be changed or broken

- **Do not make `firestore.rules` client-writable.** The whole backend architecture assumes Firestore is only ever touched by the Admin SDK server-side.
- **Do not remove the `omitUndefined()` filtering** in `server/users.ts` (or add a new Firestore write path without it) — this exact bug already broke institution/industry signups once.
- **Do not restore Apple sign-in** without being asked (no developer account available).
- **Do not put `VITE_FIREBASE_*` secrets or any real password in `.env`** — Firebase web config is meant to be public and is already inline in `lib/firebase.ts`; there is no mechanism (and shouldn't be) for `.env` to hold a user's login password. `ADMIN_EMAILS` only grants a role to whichever account authenticates with that email — it is not a credential itself.
- **Do not reintroduce a `publicProcedure` for organization verification/standing mutations** — this was a real, fixed security hole.
- **Do not move the Express app back into `api/index.ts`, and do not add path-alias imports to `server/`** — see the Deployment section. This took the entire production API down (every request returned `FUNCTION_INVOCATION_FAILED`).
- **`dashboardPathForRole` / `ProtectedRoute` role-gating logic** — several routes depend on exact behavior (e.g., unverified orgs seeing the status screen instead of a hard redirect). Changing the redirect-vs-inline-render behavior will re-break the "back button re-shows the onboarding form" bug that was deliberately fixed by making the onboarding page state-driven from `auth.me().organizationId` rather than local component state.

## Known limitations, unfinished work, and technical debt

- **`npm run seed:demo` is broken** — `scripts/seed-demo-data.mjs` has been deleted (shows as a pending deletion in `git status`) but `package.json` still references it.
- **`AdminUsers.tsx` / `AdminUserDetail.tsx` do not read the new `users/{uid}` Firebase Auth profile collection at all.** They derive a "user registry" view purely from `organizations` (institution/industry contacts) and `challenges` (citizen emails) — i.e., admins currently cannot see real signed-up accounts, roles, or standing from this page. This predates the auth rework and was not in scope to fix; worth flagging if asked to improve admin user management.
- **`InstituteProfile.tsx` / `IndustryProfile.tsx`**: non-admin users are now correctly scoped to their own organization (fixed this session — they previously showed every organization of that kind, a real data-exposure bug). Admins still see the full list via a picker.
- **`drizzle/` + `drizzle.config.ts` + `db:push` are vestigial.** The schema file is a useful reference for each Firestore collection's shape (via TS type inference) but implies a live MySQL database that no longer exists. A future cleanup could either delete this entirely in favor of plain Firestore-shape types, or clearly re-document it as "type source only" — right now it's easy to mistake for a real, connected database.
- **`JWT_SECRET` in `.env` is dead** (no code reads it) — leftover from the deleted cookie-session system.
- **Vitest doesn't auto-load `.env`**, so the Firestore-integration tests fail out of the box unless you inject env vars manually before running `vitest`.
- **`DashboardLayout.tsx` + `DashboardLayoutSkeleton.tsx` are unused** — a sidebar shell scaffold from the original template, not referenced by any route. Left in place; safe to delete or repurpose but currently inert.
- **`server/_core/{llm,imageGeneration,voiceTranscription,dataApi,map,heartbeat}.ts`** are Manus WebDev platform scaffold utilities, not wired into any tRPC router. They're available infrastructure (LLM calls, image gen, speech-to-text, a generic data-API proxy, Google Maps proxy, cron jobs) but currently unused by any actual Samadhan feature.
- **No rate limiting / abuse protection** was added on any public mutation (e.g., `submitChallenge`, `organizationOnboard` are both open to anonymous callers by design, but there's no throttling).
- **`docs/firebase_backend_research.md`** is a leftover research note that explicitly says "does not use Firebase Authentication" — that's **no longer true** as of this session's work. Treat that file as historical/stale, not authoritative; this CLAUDE.md supersedes it for auth-related decisions.

## Architectural decisions and why (this session)

- **Replaced the Manus OAuth cookie-session system with Firebase Authentication entirely** (not run side-by-side) — single identity system, simpler to reason about, decided explicitly with the project owner rather than assumed.
- **Citizens get real accounts too** (not just anonymous name+email submission) — enables tracking their own reports and role-based routing, also an explicit decision.
- **Kept `firestore.rules` fully locked down** even after adding client-side Firebase Auth — deliberately did not switch to client-side Firestore SDK access + auth-based security rules, to keep the "server is the only writer" architecture that predates this session's auth work.
- **Organization "verification" (initial gate) and "standing" (ongoing moderation) are separate fields/flows** — a verified organization can still be warned/suspended/terminated later; these are independent admin actions with independent UI, not a single status enum, because real moderation needs "verified but currently suspended" to be representable.
- **Route-level "pending verification" is rendered inline by `ProtectedRoute`, not a redirect** — specifically to make the state always reflect live server data (fixes a real bug where browser back-navigation could re-show a completed onboarding form because the old implementation tracked "submitted" in local component state instead of querying the account's actual linked-organization status).
