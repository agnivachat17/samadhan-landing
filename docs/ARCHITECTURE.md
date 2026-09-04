# Samadhan — Full Project Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BROWSER (SPA)                                │
│  React 19 + Vite 7 + TypeScript + Tailwind CSS v4 + Framer Motion  │
│                                                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  ┌───────────┐ │
│  │  wouter      │  │ TanStack     │  │ shadcn/ui  │  │ sonner    │ │
│  │  Router      │  │ Query        │  │ components │  │ toasts    │ │
│  └──────┬───────┘  └──────┬───────┘  └────────────┘  └───────────┘ │
│         │                 │                                          │
│  ┌──────┴─────────────────┴──────────────────────────────────────┐  │
│  │                    Client Data Layer                           │  │
│  │  lib/trpc.ts (shim)  →  lib/db.ts  →  lib/userProfile.ts     │  │
│  │  preserves old tRPC call shape over direct Firestore calls    │  │
│  └──────────────────────────┬─────────────────────────────────────┘  │
└─────────────────────────────┼────────────────────────────────────────┘
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     FIREBASE (Google Cloud)                          │
│                                                                     │
│  ┌──────────────────────┐    ┌──────────────────────────────────┐  │
│  │  Firebase Auth        │    │  Cloud Firestore                 │  │
│  │  • Email/Password     │    │  • 15+ collections               │  │
│  │  • Google OAuth       │    │  • firestore.rules = THE backend │  │
│  │  • Facebook OAuth     │    │  • reads/writes from browser     │  │
│  │  • Custom claims:     │    │  • offline persistence enabled   │  │
│  │    admin (bool)       │    │                                  │  │
│  └──────────────────────┘    └──────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Cloudflare Workers (worker/index.ts)                        │  │
│  │  • /api/send-invite → Resend API (email delivery)            │  │
│  │  • Static asset serving (SPA fallback)                       │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

## User Roles & Routing

```
                        ┌──────────┐
                        │  VISITOR │
                        │ (public) │
                        └────┬─────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                     ▼
  ┌───────────┐      ┌────────────┐        ┌───────────┐
  │  CITIZEN  │      │ INSTITUTION│        │  INDUSTRY │
  │           │      │            │        │           │
  │ /citizen/ │      │ Admin:     │        │ /industry/│
  │ dashboard │      │ /institute/│        │ dashboard │
  │ submit    │      │ dashboard  │        │ profile   │
  │ settings  │      │ challenges │        │ projects  │
  │ challenges│      │ projects   │        └───────────┘
  └───────────┘      │ profile    │
                     │            │
                     ├────────────┤
                     │  Faculty:  │
                     │ /institute/│
                     │ dashboard  │
                     │ /faculty/  │
                     │ profile    │
                     │            │
                     ├────────────┤
                     │  Student:  │
                     │ /institute/│
                     │ dashboard  │
                     │ /student/  │
                     │ onboarding │
                     │ profile    │
                     └────────────┘
                             │
                        ┌────┴─────┐
                        │  ADMIN   │
                        │          │
                        │ /admin/  │
                        │ dashboard│
                        │ challenges│
                        │ institutions│
                        │ projects │
                        │ users    │
                        │ reports  │
                        │ settings │
                        └──────────┘
```

## Data Model (Firestore Collections)

```
firestore.rules ← THE ONLY ACCESS CONTROL BOUNDARY (no backend server)

┌─────────────────────────────────────────────────────────────────────┐
│                          COLLECTIONS                                 │
│                                                                     │
│  users/{uid}              ← Firebase Auth UID, role, orgId,         │
│                              studentProfile, facultyProfile          │
│                                                                     │
│  organizations/{record-N} ← Org details, verification, standing     │
│  organizationMembers/{record-N} ← Roster (name, email, role, dept)  │
│  organizationInvites/{record-N} ← Token-based invite links          │
│                                                                     │
│  challenges/{record-N}    ← Citizen reports (title, domain, district)│
│  challengeEvidence/{record-N} ← Base64 inline files (no Cloud Storage)│
│  challengeSupports/{record-N} ← Upvotes, follows, corroboration     │
│                                                                     │
│  assignments/{assign-C-O} ← Admin/self-enrolled (deterministic IDs) │
│  projects/{record-N}      ← Delivery workspaces                     │
│  projectMilestones/{record-N} ← Milestone tracking                  │
│  projectDocuments/{record-N}  ← Document uploads (base64 inline)    │
│  projectActivities/{record-N} ← Activity log (hash-chained USP-03)  │
│  projectCloseouts/{record-N}  ← Closeout rounds (citizen confirms)  │
│  projectForumPosts/{record-N} ← Discussion threads                  │
│                                                                     │
│  industryInterests/{record-N} ← Industry partnership offers         │
│  notifications/{record-N}    ← Per-user notifications               │
│  ledgerAnchors/{record-N}    ← Admin-signed Merkle roots (USP-03)   │
└─────────────────────────────────────────────────────────────────────┘
```

## Key USPs Implemented

```
┌─────────────────────────────────────────────────────────────────────┐
│  USP-01  Offline-First PWA                                          │
│          IndexedDB queue → auto-submit on reconnect                 │
│          Service Worker + Workbox runtime caching                   │
│                                                                     │
│  USP-02  Bhasha & Bol — Hindi/English Voice + OCR                  │
│          Web Speech API (mic button) + tesseract.js (handwriting)   │
│          Auto-fills title/description/domain/district               │
│                                                                     │
│  USP-03  Hash-Anchored Closeout Verifiability                      │
│          SubtleCrypto SHA-256 chain on activities/closeouts         │
│          Admin Merkle anchors + QR verification                    │
│                                                                     │
│  USP-05  GIS Command Center (District Heatmap)                     │
│          Leaflet choropleth, bottleneck alerts, recharts            │
│                                                                     │
│  USP-07  Citizen Re-Verify Closeout                                │
│          Institution submits → citizen confirms/disputes → resolved │
│          Zero admin action required                                 │
│                                                                     │
│  USP-08  Intelligent Problem-to-Institution Matching               │
│          Pure algorithm: domain + expertise + location + load       │
│          Score 0-100, confidence badges on challenge cards          │
│                                                                     │
│  USP-09  Assisted (Delegated) Reporting                            │
│          CSC/Panchayat operator files on behalf of citizen          │
│          OTP-verified beneficiary confirmation                      │
│                                                                     │
│  USP-10  Confidential Safety Reporting                              │
│          visibilityTier: public / restricted / confidential         │
│          Firestore-enforced read scoping                            │
│                                                                     │
│  USP-11  Community Verification + Escalation                        │
│          Upvote/corroborate/dispute signals on challenges           │
│          Auto-escalation notifications                              │
└─────────────────────────────────────────────────────────────────────┘
```

## Key Flows

### Citizen Report Flow
```
/citizen/submit → AI scan (Groq Vision) + duplicate check
                → voice/OCR auto-fill (Bhasha & Bol)
                → save (offline queue if no network)
                → /challenges (public ledger)
                → institution self-enrolls or admin assigns
                → project created → milestones → activities
                → closeout submitted → citizen confirms/disputes
                → resolved ✓
```

### Institution Invite Flow
```
Admin /institute/profile → Students tab → "Add student" (name + email)
  → creates organizationMembers + organizationInvites (token)
  → Resend API sends email with signup link

Student clicks link → /signup?invite=TOKEN
  → creates Firebase Auth account
  → localStorage stores invite info
  → redirected to /student/onboarding (or /faculty/onboarding)

Onboarding page → reads localStorage → links org via updateUserProfile
  → saves studentProfile (dept/programme/year/skills/GitHub)
  → syncs to organizationMembers
  → redirected to /institute/dashboard (student/faculty view)

Admin sees updated Directory card with student's details
```

### Faculty Flow
```
Admin invites → faculty signup → /faculty/onboarding
  → fills: department, designation, expertise, mentorAvailable
  → saves → /institute/dashboard (Faculty workspace)
  → nav: Dashboard + Profile only
  → blocked from: Challenges, Projects, Institute Profile
```

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 7, TypeScript, Tailwind CSS v4, Framer Motion |
| Routing | wouter (not react-router) |
| State | TanStack Query + React Context |
| UI | shadcn/ui-style components, Lucide icons |
| Auth | Firebase Auth (Email/Password, Google, Facebook) |
| Database | Cloud Firestore (direct browser access) |
| Security | firestore.rules (sole access control) |
| Email | Resend API via Cloudflare Worker |
| Offline | IndexedDB (idb), Service Worker (Workbox) |
| AI | Groq Vision API (image categorization) |
| Voice | Web Speech API + tesseract.js (OCR) |
| Maps | Leaflet (GIS, choropleth) |
| Charts | Recharts |
| Hash chain | SubtleCrypto SHA-256 |
| Deployment | Cloudflare Workers (static assets) |
| PWA | vite-plugin-pwa |

## Project Structure

```
client/src/
├── App.tsx              ← Route table (wouter Switch)
├── main.tsx             ← React root, providers
├── pages/               ← One file per route (~37 pages)
│   ├── Home.tsx
│   ├── Challenges.tsx
│   ├── ChallengeDetail.tsx
│   ├── SubmitChallenge.tsx
│   ├── Login.tsx / SignUp.tsx
│   ├── CitizenDashboard.tsx / CitizenSettings.tsx
│   ├── InstituteDashboard.tsx
│   │   └── institute/StudentDashboard.tsx
│   │   └── institute/FacultyDashboard.tsx
│   ├── InstituteChallenges.tsx
│   ├── InstituteProjects.tsx
│   ├── InstituteProjectWorkspace.tsx
│   ├── InstituteProfile.tsx
│   ├── StudentOnboarding.tsx / StudentProfile.tsx
│   ├── FacultyOnboarding.tsx / FacultyProfile.tsx
│   ├── IndustryDashboard.tsx / IndustryProfile.tsx
│   ├── AdminDashboard.tsx / AdminChallenges.tsx / ...
│   ├── AdminReports.tsx (GIS Command Center)
│   └── AdminCloseoutReview.tsx
├── components/
│   ├── InstituteHeader.tsx (role-scoped nav)
│   ├── AccountMenu.tsx
│   ├── ProtectedRoute.tsx
│   ├── InteractiveMap.tsx
│   ├── LedgerSeal.tsx
│   ├── VoiceCapture.tsx
│   ├── AutoTranslate.tsx
│   └── ui/ (shadcn primitives)
├── lib/
│   ├── firebase.ts       ← Auth helpers
│   ├── db.ts             ← Firestore data layer
│   ├── trpc.ts           ← Call-shape shim (no server)
│   ├── userProfile.ts    ← users/{uid} CRUD
│   ├── matching.ts       ← USP-08 algorithm
│   ├── analytics.ts      ← USP-05 district stats
│   ├── ledger.ts         ← USP-03 hash chain
│   ├── offlineQueue.ts   ← USP-01 IndexedDB queue
│   ├── bhasha.ts         ← USP-02 keyword parser
│   ├── groqVision.ts     ← AI image categorization
│   ├── duplicateCheck.ts ← Duplicate detection
│   ├── i18n/en.ts / hi.ts ← Bilingual dictionaries
│   └── storage.ts        ← Base64 inline files
├── hooks/useAuth.tsx
├── contexts/
│   ├── ThemeContext.tsx
│   ├── LanguageContext.tsx
│   └── MemberRoleContext.tsx
└── index.css             ← Tailwind + custom palette

worker/index.ts           ← Cloudflare Worker (/api/send-invite)
firestore.rules           ← THE security model
shared/workflow.ts        ← Shared enums + route constants
drizzle/schema.ts         ← Type source only (no database)
tests/                    ← Vitest: rules boundary tests
scripts/                  ← grant-admin, screenshot, deploy
```

## Security Model

```
┌─────────────────────────────────────────────────────────────────────┐
│  firestore.rules = THE ENTIRE SECURITY MODEL                       │
│  (no backend server — browser talks directly to Firestore)          │
│                                                                     │
│  isAdmin()     = request.auth.token.admin == true (custom claim)    │
│  isOrgOwner()  = organizations.ownerUid == request.auth.uid         │
│  isChallengeOwner() = challenges.citizenEmail == userEmail()        │
│                                                                     │
│  Key rules:                                                         │
│  • users/{uid}: owner read/write, admin read-all                    │
│  • organizations: world-readable, owner-edit, admin-verify          │
│  • challenges: world-readable, citizen-edit-own, assignee-status    │
│  • assignments: deterministic IDs (assign-C-O), owner-scoped       │
│  • notifications: recipient-scoped, type-authorized                 │
│  • organizationInvites: token-based, public-read, owner-create      │
│  • organizationMembers: world-read, owner-write, self-update        │
│                                                                     │
│  catch-all: allow read, write: if false                             │
└─────────────────────────────────────────────────────────────────────┘
```
