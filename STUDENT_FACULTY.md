# Student & Faculty Portal — Vision & Architecture

## The Problem

Today, an institution is a single blob on Samadhan. The institution admin signs up, fills the profile, adds students/faculty as Firestore records (no login), and does everything alone — enroll, create projects, manage milestones. Students and faculty are names on a list, not participants.

**That's not how real institutions work.** A dean doesn't upload project documents. A student doesn't approve budgets. The work is distributed, and the platform should reflect that.

## The Vision

Every institution member — admin, faculty, student — has their own account. They log in. They see exactly what matters to them. Nothing more, nothing less. The experience is **personal, interactive, and alive** — not a static dashboard.

### What a Student Sees

When a student logs in, they land on a **Student Dashboard** — a clean, focused view:

- **"Your Projects"** — the projects they're assigned to, with progress rings, milestone timelines, and activity feeds. No admin controls. No other institutions' data. Just their work.
- **"Team Activity"** — a live feed of what teammates are doing: new milestones, uploaded documents, activity notes. Like a project social stream.
- **"Project Forum"** — each project has a discussion thread. Students post ideas, share links, comment on approaches. Faculty and admins can respond. This is where innovation happens — a student in Ranchi thinks of something, a faculty member in Jamshedpur builds on it.
- **"My Skills"** — a simple profile card showing their department, skills, academic year. They can update it themselves.

What they **cannot** do:
- Enroll for challenges (admin only)
- Create projects (admin only)
- Edit milestones or upload delivery documents (unless explicitly given access — future extension)
- See other institutions' data
- See financial or administrative fields

### What a Faculty Member Sees

Faculty land on a **Faculty Dashboard**:

- **"Assigned Projects"** — projects where they're the mentor or a team member. Full activity timeline, milestone progress, document access.
- **"Student Oversight"** — a card for each student on their projects, with status indicators (active, idle, needs attention).
- **"Project Forum"** — same as student, but with mentor privileges (pin posts, mark answers).
- **"Challenge Queue"** (read-only) — they can browse their institution's enrolled challenges and review details, but cannot enroll or create projects themselves.
- **"Mentor Profile"** — expertise, availability, past projects.

What they **cannot** do:
- Enroll for challenges
- Create projects
- Edit org profile or manage members
- See industry partner details or funding information

### What the Institution Admin Sees (unchanged, enhanced)

Admins keep full access. Their dashboard is enhanced with:
- **Member Activity Overview** — who's active, who's idle, per-project breakdown
- **Forum Moderation** — pin, remove, or highlight posts in project forums
- Still the only one who can enroll, create projects, and manage the org

## The Architecture

### Account Model

```
Firebase Auth accounts (users/{uid}):
  role: "institution"           ← same top-level role for all institution members
  organizationId: <org id>      ← links to their institution
  memberRole: "admin"|"faculty"|"student"   ← NEW field on UserProfile
```

The `organizationMembers` table stays as the **directory** (source of truth for department, skills, designation, etc.), but the `users/{uid}` profile now carries `memberRole` so the auth layer can make visibility decisions without a second query.

**How accounts are created:**
1. Institution admin goes to Profile → Faculties/Students tab (existing `PeoplePanel`)
2. Clicks "Add faculty" or "Add student" (existing form)
3. **New:** the form now includes a "Create login account" checkbox (default: checked)
4. When checked, the system:
   - Creates a Firebase Auth account (email + temp password)
   - Links it to the org via `memberRole` on the user profile
   - Generates a temporary password or magic link
   - Shows the credentials to the admin (who shares them with the member)
5. Member logs in with those credentials → lands on their role-specific dashboard

**Why not self-registration?** Institutions are verified organizations. Students/faculty joining without admin approval would break the trust model. The admin is the gatekeeper.

### Data Scoping

Every data query for faculty/students is scoped by `organizationId`:

- **Challenges:** Only challenges assigned to or enrolled by their org (via `assignments`)
- **Projects:** Only projects belonging to their org (via `projects.organizationId`)
- **Members:** Only members of their org (via `organizationMembers.organizationId`)
- **Forum posts:** Only posts for projects in their org
- **Notifications:** Only their own (already scoped by `recipientEmail`)

This is enforced at two levels:
1. **Client-side:** `ProtectedRoute` checks `organizationId` matches; UI filters data
2. **Server-side:** `firestore.rules` already enforces `organizationId` scoping for `organizationMembers` reads

### The Forum System

Each project gets a discussion thread — a new `projectForumPosts` collection:

```
projectForumPosts/{id}:
  projectId: number
  authorUid: string          ← Firebase Auth uid of poster
  authorName: string         ← denormalized display name
  authorRole: "admin"|"faculty"|"student"
  content: string            ← markdown or plain text
  isPinned: boolean          ← admin/faculty can pin
  parentPostId?: number      ← for threaded replies (v2)
  createdAt: Date
  updatedAt: Date
```

**Rules:**
- Anyone in the same org can read forum posts for their org's projects
- Anyone signed in can create posts on projects they're assigned to
- Only admin and faculty can pin posts
- Only the author or admin can edit/delete

**UI:** A real-time-feeling thread. Each post is a card with author avatar, role badge, timestamp, and content. New posts animate in (Framer Motion `AnimatePresence`). Pinned posts float to top with a subtle highlight. The input box is a clean textarea at the bottom, submit on Enter (Shift+Enter for newline). Posts load with infinite scroll (newest first, load-more on scroll up).

### Route Structure

No new top-level routes. Everything stays under `/institute/*` but pages adapt based on `memberRole`:

```
/institute/dashboard        → Student Dashboard / Faculty Dashboard / Admin Dashboard (same route, different views)
/institute/projects         → filtered by role (all org / assigned only)
/institute/projects/:id     → workspace with role-based controls
/institute/projects/:id/forum  → NEW: project discussion thread
/institute/profile          → admin: full edit; faculty/student: view-only own info
/institute/challenges       → admin: full; faculty: read-only; student: hidden
/institute/challenges/:id   → admin: full; faculty: read-only; student: redirect to projects
```

### Visual Design Language

The existing Samadhan aesthetic carries through — paper textures, ember accents, serif headings. But student/faculty views get:

- **Progress rings** (SVG animated) instead of raw percentages
- **Timeline cards** with connecting lines and status dots (like `ChallengeDetail.tsx`'s `ImpactTimeline` but horizontal for projects)
- **Activity feed** with avatar stacks, relative timestamps ("2 hours ago"), and color-coded event types
- **Forum thread** with threaded card layout, subtle paper texture per post, typing indicator animation
- **Skill badges** as rounded chips with category colors
- **Empty states** with custom illustrations (line-art of a book, a lab, a team) — not just "No data"
- **Motion:** `framer-motion` stagger on list items, `AnimatePresence` on forum posts, spring animations on progress rings, hover micro-interactions on cards

### Notification Enrichment

When a new forum post is created, all project members get a notification:
```
"New post on {project title} by {author name}: {first 60 chars}..."
```
This uses the existing `createNotification()` in `db.ts` — no rules change needed.

## What This Does NOT Change

- `firestore.rules` — no new rules needed; existing `organizationMembers` and `projects` rules already scope by `organizationId`
- `vite.config.ts`, `wrangler.jsonc`, deployment — no changes
- Admin/industry/citizen flows — untouched
- `instituteGuarded` route wrapper — still checks `role: ["institution", "admin"]`; `memberRole` is a sub-check inside pages
- `organizationMembers` table shape — stays as-is; the new `memberRole` field on `UserProfile` is a separate, parallel signal

## What This Unlocks (Future)

- **Per-member project assignment:** Students/faculty can be assigned to specific projects, not just listed in the org
- **Milestone ownership:** Individual milestones can have an owner (student or faculty) who gets notified
- **Credit distribution:** `awardCredits` already distributes to all org members; with per-project assignment, credits can go to specific contributors
- **Performance tracking:** Faculty can see student engagement metrics across projects
- **Cross-institution collaboration:** Faculty from different institutions on the same challenge can share a forum (v2)
