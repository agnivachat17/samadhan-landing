# Run Samadhan Locally on Debian

This repository is a **React/Vite + Express/tRPC + Firestore** application. It runs the full public-review workflow locally without Firebase Authentication. The browser Firebase configuration is already present in the source; the server still needs a Firebase Admin service-account credential to query Firestore.

> The `@builder.io/vite-plugin-jsx-loc` development plugin was removed because version `0.1.1` only declares Vite 4/5 peer support, while this project uses Vite 7. Do not use `--force` or `--legacy-peer-deps` for this issue.

## 1. Install Debian prerequisites

The project is tested with **Node.js 22**. Install Node, Git, `jq`, and OpenSSL if they are not already available.

```bash
sudo apt update
sudo apt install -y curl git jq openssl build-essential
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

node --version
npm --version
```

The Node version should begin with `v22`.

## 2. Get the corrected code and install packages

Download the latest project archive/checkpoint, extract it, and enter the project folder.

```bash
cd ~/samadhan-sih
rm -rf node_modules package-lock.json
npm install
```

The resolved package manifest now installs with npm. The dependency tree was also checked with `npm install --package-lock-only --ignore-scripts` after the incompatible plugin was removed.

## 2A. Install the visual asset pack

The source code refers to project images through paths beginning with `/manus-storage/`. Those paths work in the hosted review environment but are **not part of the ZIP source tree** by default. Download the accompanying `samadhan-local-assets.zip` file, then extract it into `client/public`:

```bash
cd ~/samadhan-sih
unzip ~/Downloads/samadhan-local-assets.zip -d client/public

# Confirm that this file exists before starting the app:
test -f client/public/manus-storage/lodh-waterfalls-ranchi-jharkhand-3-attr-hero_3a3477cd.jpeg && echo "Assets installed"
```

This creates `client/public/manus-storage/`, which mirrors the paths already used by the application. It includes the waterfall hero image, paper and contour textures, five challenge images, the Jharkhand challenge map, the district choropleth, and the official Jharkhand Government SVG seal. No code changes or environment variables are required after extraction.

> Do not rename the asset files or the `manus-storage` folder. The generated filenames match the existing image references in the application.

### If you are using the older ZIP you already downloaded

Before running `npm install`, make these three edits manually:

1. Delete `@builder.io/vite-plugin-jsx-loc` from `devDependencies` in `package.json`.
2. Delete `import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";` from `vite.config.ts`.
3. Remove `jsxLocPlugin(),` from the `plugins` array in `vite.config.ts`.

Then remove the incomplete installation and retry:

```bash
rm -rf node_modules package-lock.json
npm install
```

Do not start with `npm uninstall @builder.io/vite-plugin-jsx-loc`; npm has to resolve the old incompatible tree before it can uninstall the package. Editing the three lines above is the reliable recovery path.

### Optional: use pnpm instead

The repository also contains a refreshed `pnpm-lock.yaml` and declares pnpm as its preferred package manager.

```bash
corepack enable
corepack prepare pnpm@10.4.1 --activate
pnpm install --frozen-lockfile
```

Use **one** package manager per checkout. If you choose pnpm, remove `package-lock.json`; if you choose npm, do not commit the generated lockfile unless you intentionally standardize the project on npm.

## 3. Create the local environment file

Create a Firebase service-account JSON file in the Firebase/Google Cloud console for the `samadhan-sih` project. Its service account needs the **Cloud Datastore User** role and the Firestore API must be enabled.

Create `.env` from the following command. Replace the path after `SERVICE_ACCOUNT_JSON=` with the path to your downloaded Firebase Admin SDK JSON file.

```bash
SERVICE_ACCOUNT_JSON="$HOME/Downloads/samadhan-sih-service-account.json"

cat > .env <<EOF
NODE_ENV=development
PORT=3000
JWT_SECRET=$(openssl rand -hex 32)
FIREBASE_SERVICE_ACCOUNT_JSON='$(jq -c . "$SERVICE_ACCOUNT_JSON")'
EOF
```

Keep `.env` private. It contains the Firebase private key and must never be committed, uploaded, or pasted into source files.

## 4. Start the application

Load the environment variables into your current shell and start the combined Express/Vite server.

```bash
set -a
source .env
set +a
npm run dev
```

Open the URL printed by the terminal, normally <http://localhost:3000>.

| Command | Purpose |
|---|---|
| `npm run dev` | Runs the Express/tRPC server and Vite development UI together. |
| `npm run check` | Runs TypeScript validation. |
| `npm test` | Runs the unit, Firestore connection, rule-boundary, and workflow tests. |
| `npm run build` | Creates the production frontend/server build. |
| `npm run seed:demo` | Writes the idempotent synthetic Firestore demo dataset. |

## 5. Populate the demo data

After Firestore access works, load the review dataset:

```bash
set -a
source .env
set +a
npm run seed:demo
```

This creates deterministic, clearly synthetic records in Firestore: **50 citizen contacts, 8 institutions, 7 industries, 50 challenges, 20 projects, and linked workflow records**. Re-running the command updates the same deterministic record IDs instead of creating duplicates.

Useful demo identity for the notification center:

```text
demo.citizen.01@samadhan.demo
```

## 6. Configure Firestore security rules

In **Firebase Console → Firestore Database → Rules**, retain the deny-by-default rule used by the project:

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

The browser does not talk to Firestore directly. The local Express/tRPC server uses the Firebase Admin credential, so it can read/write Firestore while direct browser access remains blocked.

## 7. What works locally and what needs an additional integration

Public routes, Firestore-backed onboarding, assignments, dashboards, projects, closeouts, notifications, and demo seeding work with the Firebase service account described above.

The project deliberately does **not** use Firebase Authentication. Manus OAuth login and the current file-upload storage helper rely on Manus-provided OAuth/Forge environment variables. Those integrations will not have full local parity until you either provide their service credentials or replace them with your own authentication and storage provider, such as Firebase Auth and Firebase Storage.

## Troubleshooting

| Symptom | Resolution |
|---|---|
| `ERESOLVE` mentioning `@builder.io/vite-plugin-jsx-loc` | Download the corrected version, or apply the three manual removals in Step 2, then delete `node_modules` and retry `npm install`. |
| `Firebase server credentials are not configured` | Confirm `.env` exists, contains a one-line `FIREBASE_SERVICE_ACCOUNT_JSON`, and was loaded with `set -a; source .env; set +a`. |
| Firestore `403` or permission error | Enable the Cloud Firestore API and grant the service account the **Cloud Datastore User** role. |
| Dashboards contain no records | Run `npm run seed:demo` in a shell where the Firebase credential is loaded. |
| `EADDRINUSE` for port 3000 | Set a free port before starting: `PORT=3001 npm run dev`. |
| File upload fails locally | This repository’s current upload helper uses Manus storage. Configure equivalent local storage or replace that adapter before relying on uploads outside Manus. |
