# SIH 2026 — Samadhan PPT Plan (maps to SIH2026-IDEA-Presentation-Format.pptx)

> 6 slides max (Slide 7 = instructions → delete before upload). All screenshots come from `scripts/sih-screenshots.mjs`.
> Run batch: `npm run dev` in one terminal, then `node scripts/sih-screenshots.mjs --sih` in another.
> Outputs land in `idea/screenshots/*.png` (1920×1080, 16:9 — matches template).

---

## How to generate screenshots

**Any single page:**
```bash
node scripts/sih-screenshots.mjs /challenges idea/screenshots/test.png
node scripts/sih-screenshots.mjs /institute/dashboard idea/screenshots/inst.png --role institute
node scripts/sih-screenshots.mjs /admin/reports idea/screenshots/gis.png --role admin --viewport 1920x1080
```

**Full SIH batch (12 shots):**
```bash
node scripts/sih-screenshots.mjs --sih
# or 16:9 crisp: node scripts/sih-screenshots.mjs --sih --viewport 1920x1080
```

**Credentials wired in:**
- `institute` → ankan1.mondal@stu.adamasuniversity.ac.in / Ankan@1234
- `admin` → agnivachat17@gmail.com / Agniva@1234
- `industry` → industry.test@samadhan.test / Industry@1234
- `citizen` (Google) → ankanmondal9280@gmail.com — **cannot automate headless** (Google anti-bot). Capture citizen dashboard manually after Google sign-in, or create password citizen.

**Dev server:** Must be running (`npm run dev` → http://localhost:5173). The script probes `baseUrl` and errors if unreachable.

---

## Slide 1 — Title Page (no footer bar, left accent bar)

**Fill from your SIH portal registration:**

| Field | Example value (replace with your actual) |
|-------|------------------------------------------|
| Problem Statement ID | `SIH250XX` — Jharkhand civic grievance / citizen-institution collaboration |
| Problem Statement Title | `Samadhan — Civic Innovation Platform for Jharkhand: Citizen → Institution → Industry → Resolution` |
| Theme | `Smart Automation` / `Blockchain` / `Smart Education` (choose the theme your PS is listed under) |
| PS Category | `Software` |
| Team ID | `XXXXX` (from SIH portal) |
| Team Name | `Your registered team name` |

**Design:** No screenshot. Left colored bar + right text. Add small Samadhan emblem (`/images/samadhan-emblem_034afe54.png`) top-right if template allows. Keep font Times New Roman bold 36pt for title line.

---

## Slide 2 — IDEA TITLE / PROPOSED SOLUTION

**Title:** `SAMADHAN — One Platform, Every Problem Seen`

**Left column — Proposed solution (3-layer pipeline):**

- **Citizens** report challenges (water, health, education, livelihood…) with district, description, photo, optional voice/handwriting via *Bhasha & Bol* — low-literacy friendly, Hindi-first, offline-capable
- **Institutions** (colleges/universities) self-enroll on open challenges, accept assignments, create delivery projects (milestones, documents, activity log) — hash-anchored ledger for verifiability
- **Industry** funds/mentors projects; **Citizen** re-verifies closeout; **Admin** anchors Merkle root — no resolution without citizen confirmation

**Right column — How it addresses the problem:**

- Closes the *report → black hole* gap: every report gets an ID, assignment, project, and public impact ledger entry
- Makes institutions accountable: standing (active/warned/suspended) + verification gate
- Gives Jharkhand gov a single command center (GIS choropleth instead of scattered complaints)

**Bottom strip — Innovation & uniqueness (4 pills):**

1. **Self-enrollment** — institutions choose challenges, not just wait for admin (new `selfEnrolled` flag on `assignments`)
2. **Bhasha & Bol** — Hindi/English voice-to-form + Tesseract.js handwriting OCR, no server
3. **Offline-first** — IndexedDB queue + `vite-plugin-pwa` Workbox; submit in Naxal/low-connectivity belts, sync later
4. **Hash-anchored ledger** — SubtleCrypto SHA-256 chain + Merkle root QR (USP-03, NIC CoE pattern)

**Screenshots (place 2 small thumbnails, 16:9 cropped):**
- `01-landing-hero.png` — hero with waterfall + "Report a challenge"
- `04-submit-challenge.png` — Submit form showing VoiceCapture mic + OCR button

**Keep it:** 4–6 bullets max, 1 diagram (see Slide 3 for flow). No paragraphs.

---

## Slide 3 — TECHNICAL APPROACH

**Title:** `ARCHITECTURE & STACK`

**Top — Tech stack (table or icon row):**

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | React 19 + Vite 7 + TypeScript, wouter, TanStack Query, Tailwind v4, Framer Motion | Fast SPA, no SSR needed |
| Auth | Firebase Auth (client SDK) — email/password + Google/Facebook | Free tier, custom claim `admin`, no server |
| Data | Cloud Firestore (direct from browser) + `firestore.rules` as sole boundary | Spark free, serverless, `idb` offline persistence |
| Files | Base64 inline in Firestore doc (`storage.ts` JPEG compress to 680 KB) — no Cloud Storage | Stays on Blaze-free Spark |
| Maps | Leaflet + OSM tiles, Workbox `CacheFirst` | District heatmap, no API key |
| PWA | `vite-plugin-pwa`, Workbox `NetworkFirst` for Firestore, `idb` queue | Offline submit in West Singhbhum/Gumla/Latehar |
| AI | Groq `qwen/qwen3.6-27b` vision (free) + `tesseract.js` (hin+eng) | Auto-categorize + handwriting |
| Ledger | SubtleCrypto SHA-256 + `qrcode` (lazy) | NIC CoE verifiability |
| Deploy | Cloudflare Workers static (`wrangler.jsonc`, SPA fallback) | Free, GitHub Actions CI |

**Center — Flow diagram (draw in PPT, or export from `client/src/lib/db.ts` flow):**

```
Citizen (Hindi voice/OCR/photo) → Firestore challenges ─┐
                                                         ├─→ assignment (admin OR self-enrolled) → project → milestones/documents/activities (hash-chained) → closeout → citizen confirm → Merkle anchor (admin) → public ledger + QR
Industry interest ───────────────────────────────────────┘                                   └→ citizen ImpactTimeline
GIS: challenges → analytics.ts → AdminReports choropleth (24 Jharkhand districts)
Offline: queueChallengeDraft (idb) → drainQueue on online
```

**Bottom — Methodology (3 sprints):**
1. **Ingest:** Submit → duplicate check (title overlap + pHash) → evidence compress
2. **Deliver:** Enroll/assign → accept → create project → milestones/activities (hashed) → documents
3. **Verify:** Before/after evidence → citizen confirm/dispute → anchor → QR

**Screenshots (1 large or 2 small):**
- `11-gis-command-center.png` — AdminReports choropleth + trends (USP-05)
- `03-challenge-detail.png` — ImpactTimeline + LedgerSeal (USP-03/07)

**Tip:** Use `client/public/geo/jharkhand.json` shape as background for diagram.

---

## Slide 4 — FEASIBILITY AND VIABILITY

**Title:** `FEASIBILITY — WHY IT SHIPS ON SPARK`

**Left — Feasibility (green checks):**

- ✅ **Zero server cost:** Browser → Firestore direct, `firestore.rules` is the backend. Spark quotas handle demo; Blaze is pay-as-you-go when scaling.
- ✅ **Deploy today:** `npm run build && wrangler deploy` + `firebase deploy --only firestore:rules` — two commands, no Docker/K8s.
- ✅ **Proven in browser:** `vite-plugin-pwa` already precaches geojson/tiles; `enableIndexedDbPersistence` keeps reads offline.
- ✅ **Low-literacy tested:** Hindi gate (Tiro font, `en/hi` toggle on every header), `Bhasha & Bol` voice, large CTAs, sonner toasts — not paragraphs.

**Right — Risks & Mitigations (table):**

| Risk | Mitigation |
|------|------------|
| No server validation (malicious writes) | Harden `firestore.rules` with field-shape checks + Firebase App Check (next) |
| 1 MiB doc limit for base64 files | JPEG recompress (1600px, stepping quality) + 680 KB cap; Blaze + Cloud Storage upgrade path documented |
| Firestore long-lived connection breaks `networkidle` screenshots | `scripts/screenshot.mjs:waitUntil domcontentloaded + waitForTimeout` already fixed |
| Free-tier abuse (spam writes) | App Check + rate-limit via rules (per-user write cap) |
| Google OAuth not automatable headless | Manual citizen capture; Playwright handles institute/admin/industry via email/password |

**Screenshots (2 small):**
- `14-language-gate.png` — blocking Hindi/English choice (first-visit)
- `07-institute-dashboard.png` — enrolled queue + Available challenges Enroll pill

**Keep it:** Table, not prose. 3–4 risks max.

---

## Slide 5 — IMPACT AND BENEFITS

**Title:** `IMPACT — FOR JHARKHAND`

**Top — Metrics (big numbers, from seeded data + GIS):**

- **24 districts** covered (choropleth, `JHARKHAND_DISTRICTS` verified)
- **50 seeded demo challenges** (distinct prose, upvoteCount baseline) + live citizen submits
- **112+ institutions** (orgs table) — self-enrollment removes admin bottleneck
- **34 → 24 heatmap scale** — bottleneck alert (`age >14d`) drives admin triage

**Middle — Stakeholder benefits (3 columns):**

| Citizens (Jharkhand, low-literacy, Naxal belts) | Institutions (colleges) | Industry (CSR/partners) | Government |
|---|---|---|---|
| Report in Hindi by voice/photo, offline, track ID → closeout, confirm fix, public ledger | Choose problems, not assigned; manage delivery as projects; earn credits & verifiable certificate (`jspdf` + QR) | Discover vetted challenges → fund/mentor via `industryInterests`; impact visible on timeline | Single GIS command center, bottleneck detection, before/after evidence, tamper-evident ledger for audits |

**Bottom — Environmental/Social/Economic:**

- **Social:** Trust — citizen confirmation loop; language — Tiro Hindi everywhere
- **Economic:** CSR fulfillment tracked; no infra cost (Cloudflare + Spark)
- **Environmental:** Paperless ledger, pHash duplicate prevents rework, GIS targets spending

**Screenshots (1 large):**
- `02-challenges-list.png` — public directory: district filter + Jharkhand map + domain pills (shows scale)
- Or `08-institute-challenges.png` — "Available challenges — Enroll" proving self-service

**Tip:** Use `02` or `08` full-width, not both — one strong visual beats two tiny.

---

## Slide 6 — RESEARCH AND REFERENCES

**Title:** `RESEARCH & REFERENCES`

**Left — Problem & domain research (3–4 refs):**

- SIH Problem Statement (ID: `SIH250XX`) — civic grievance / citizen–institution gap
- Jharkhand district maps: `udit-001/india-maps-data` (MIT) — normalized to `JHARKHAND_DISTRICTS`, `Sahibganj → Sahebganj` fix
- Firebase Spark limits & Firestore rules as security boundary — Firebase docs (auth custom claims, `allow write: if isSignedIn()`)
- PWA offline pattern — Workbox `NetworkFirst`/`CacheFirst`, `idb` queue, `vite-plugin-pwa`

**Right — Technical references (3–4 refs):**

- NIC CoE hash-anchored ledger pattern — `client/src/lib/ledger.ts` (SubtleCrypto, Merkle)
- Groq vision `qwen/qwen3.6-27b` (free tier) + `tesseract.js` `hin+eng` — auto-categorize & OCR path
- Leaflet z-index fix (`InteractiveMap.tsx:isolate z-0`, `.leaflet-pane z-1`) — sticky header overlap resolved
- Cloudflare Workers static SPA (`wrangler.jsonc`, `not_found_handling: single-page-application`) — no Express/`@grpc` (blocked on Workers)

**Footer strip — Repo & deploy:**

- GitHub: `ankan-web/samadhan-landing` (origin) + `agnivachat17/samadhan-landing` (fork, Cloudflare connected)
- Deploy: GitHub Actions `.github/workflows/deploy.yml` + `.github/workflows/sync-fork.yml` every 15m
- Rules: `tests/firestore.rules.test.ts` — 11 tests hit live project REST API, no creds

**No screenshot.** Keep as clean bulleted columns with clickable links (PDF export preserves them). Add QR to deployed site if template allows image.

**Note:** Keep to 6 slides total. Delete the template's Slide 7 (instructions) before export to PDF.

---

## Screenshot quick-reference (from `scripts/sih-screenshots.mjs --sih`)

| Slot | Route | File | Auth | Slide |
|------|-------|------|------|-------|
| 01 | `/` | `01-landing-hero.png` | public | 2 |
| 02 | `/challenges` | `02-challenges-list.png` | public | 5 (or 3) |
| 03 | `/challenges/730010` | `03-challenge-detail.png` | public | 3 |
| 04 | `/citizen/submit` | `04-submit-challenge.png` | public | 2 |
| 05 | `/login` | `05-login.png` | public | — (backup) |
| 06 | `/signup` | `06-signup.png` | public | — |
| 07 | `/institute/dashboard` | `07-institute-dashboard.png` | institute | 4 |
| 08 | `/institute/challenges` | `08-institute-challenges.png` | institute | 5 |
| 09 | `/institute/projects/1` | `09-project-workspace.png` | institute | 3/5 |
| 10 | `/admin/dashboard` | `10-admin-dashboard.png` | admin | 3 |
| 11 | `/admin/reports` | `11-gis-command-center.png` | admin | 3 |
| 12 | `/admin/projects` | `12-admin-projects.png` | admin | 3 |
| 13 | `/industry/dashboard` | `13-industry-dashboard.png` | industry | 2/3 |
| 14 | `/` (gate) | `14-language-gate.png` | public, showGate | 4 |

*Citizen dashboard is Google OAuth (ankanmondal9280@gmail.com) → screenshot manually after login, or create `citizen.test@samadhan.test` and add to `CREDS.citizen`.*

## Speaker notes (60 seconds per slide)

1. **Title:** One-line problem + Samadhan name + team
2. **Idea:** 30s on pipeline (citizen → institution → industry → citizen confirm), 30s on 4 USPs
3. **Tech:** Stack + flow diagram + why serverless (Spark + rules)
4. **Feasibility:** Free-tier proof + top 2 risks and mitigations
5. **Impact:** 24 districts + 3 stakeholder wins + social/economic line
6. **References:** Domain sources + NIC CoE ledger + deploy pipeline

## Checklist before export

- [ ] Screenshots cropped to 16:9, no language gate unless intentionally showing it (14)
- [ ] No paragraphs — bullets/diagrams/infographics only (per template Slide 7)
- [ ] Max 6 slides (delete instructions slide)
- [ ] Save as PDF (portal rejects PPT/Word)
- [ ] Footer Team Name matches portal registration

