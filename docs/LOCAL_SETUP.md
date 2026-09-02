# Run Samadhan Locally

This repository is a **React 19 + Vite 7 + TypeScript** single-page app. There is no backend process: the browser talks directly to **Cloud Firestore** and **Firebase Authentication** via the Firebase client SDK, and `firestore.rules` is the entire access-control boundary. See the project architecture notes for the full architecture.

## 1. Prerequisites

Node.js 20+ and npm.

```bash
node --version
npm --version
```

## 2. Install packages

```bash
git clone <this repo>
cd samadhan-landing
npm install
```

Image assets (`client/public/images/`) are committed to the repository, so no separate asset download is required.

## 3. Start the app

```bash
npm run dev
```

This starts the Vite dev server only — there is no API process to run alongside it. Open the URL it prints (normally <http://localhost:5173>).

The Firebase project's public web config is already hardcoded in `client/src/lib/firebase.ts` (this is expected — Firebase web config is not a secret). Authentication, Firestore reads/writes, and file uploads (stored as base64 inside Firestore documents, see `client/src/lib/storage.ts`) all work out of the box against the live `samadhan-sih` Firebase project.

| Command                          | Purpose                                                             |
| -------------------------------- | ------------------------------------------------------------------- |
| `npm run dev`                    | Vite dev server                                                     |
| `npm run check`                  | `tsc --noEmit`                                                      |
| `npm test`                       | Vitest — checks the live project's Firestore rules boundary         |
| `npm run build`                  | Production build (`dist/public`)                                    |
| `npm run preview`                | Serve the production build locally                                  |
| `npm run deploy`                 | Build and deploy to Cloudflare Workers                              |
| `npm run deploy:rules`           | Deploy `firestore.rules` to Firebase                                |
| `npm run grant-admin -- <email>` | Grant the `admin` custom claim (needs a service-account credential) |

## 4. Granting yourself admin access (optional)

`npm run grant-admin` is the only local tool that needs a secret. Create a Firebase service-account JSON for the `samadhan-sih` project (Firebase Console → Project Settings → Service Accounts), then set it in a local `.env` file (gitignored, never commit it):

```bash
FIREBASE_SERVICE_ACCOUNT_JSON='<paste the service-account JSON as a single line>'
```

```bash
npm run grant-admin -- someone@example.com
```

The user must sign out and back in for the `admin` claim to land in their ID token.

## Troubleshooting

| Symptom                                                                      | Resolution                                                                                                                      |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `npm test` says a collection is anonymously unreadable that should be public | The deployed Firestore rules don't match this repo's `firestore.rules` — run `npm run deploy:rules`.                            |
| Google/Facebook popup sign-in silently does nothing                          | Check the browser console for a `Cross-Origin-Opener-Policy` warning — see the Deployment section of the project architecture notes.               |
| `npm run grant-admin` fails                                                  | Confirm `.env` has a valid, single-line `FIREBASE_SERVICE_ACCOUNT_JSON` for a service account with Firestore/Auth admin access. |
