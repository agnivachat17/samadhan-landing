# Student & Faculty Portal — Implementation Guide

## Phase 1: Data Layer (Foundation)

### 1.1 Add `memberRole` to UserProfile

**File:** `client/src/lib/userProfile.ts`

```ts
export type MemberRole = "admin" | "faculty" | "student";

export type UserProfile = {
  uid: string;
  email: string | null;
  name: string | null;
  role: UserRole;                        // "institution" for all org members
  district?: string;
  phone?: string;
  organizationId?: number;
  memberRole?: MemberRole;              // NEW — sub-role within institution
  notificationPreferences?: NotificationPreferences;
  authProvider: string;
  createdAt: Date;
  updatedAt: Date;
};
```

`loadOrCreateProfile` stays as-is — `memberRole` is `undefined` for citizens/industry/admin (they don't have it). Only set when an institution admin creates an account for a member.

`updateUserProfile` gains optional `memberRole` in its input type.

### 1.2 Add `projectForumPosts` Collection

**File:** `drizzle/schema.ts` (type-only)

```ts
export const projectForumPosts = mysqlTable("projectForumPosts", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  authorUid: varchar("authorUid", { length: 128 }).notNull(),
  authorName: varchar("authorName", { length: 255 }).notNull(),
  authorRole: varchar("authorRole", { length: 32 }).notNull(),
  content: text("content").notNull(),
  isPinned: boolean("isPinned").default(false),
  parentPostId: int("parentPostId"),     // null = top-level, set = reply (v2)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
```

### 1.3 Firestore Functions

**File:** `client/src/lib/db.ts` — add after `addProjectActivity`:

```ts
// Forum CRUD
export async function createForumPost(input: RecordShape) { ... }
export async function listForumPosts(projectId: number) { ... }
export async function updateForumPost(id: number, input: RecordShape) { ... }
export async function deleteForumPost(id: number) { ... }

// Member account creation
export async function createMemberAccount(input: {
  email: string;
  password: string;
  name: string;
  organizationId: number;
  memberRole: "faculty" | "student";
}) { ... }
```

`createMemberAccount` uses Firebase client SDK's `createUserWithEmailAndPassword` — but this requires admin SDK, which we don't have. **Workaround:** the admin manually creates the Firebase Auth account via `scripts/grant-admin.mjs` pattern, or we use a simpler approach: the admin just enters the member's email in the form, and the member self-registers with that email (the system matches them to the org on first login via an invite token).

**Revised approach (no admin SDK needed):**

1. Admin adds member to `organizationMembers` (existing flow) — status stays `"invited"`
2. Admin can optionally generate an invite link: `/signup?invite=<token>&org=<id>&role=faculty`
3. Member clicks link → signs up → system auto-links them to the org and sets `memberRole`
4. This uses existing Firebase Auth signup — no server needed

**Invite token:** a simple document in `organizationInvites` collection:
```ts
{
  organizationId: number;
  memberRole: "faculty" | "student";
  email: string;           // optional — restrict to specific email
  expiresAt: Date;
  usedBy?: string;         // uid of who consumed it
  createdAt: Date;
}
```

### 1.4 Trpc Procedures

**File:** `client/src/lib/trpc.ts` — add to `workflowProcedures`:

```ts
// Forum
createForumPost: (input) => db.createForumPost(input),
forumPosts: (input: { projectId: number }) => db.listForumPosts(input.projectId),
updateForumPost: (input: { id: number } & Record<string, unknown>) => { ... },
deleteForumPost: (input: { id: number }) => db.deleteForumPost(input.id),

// Invites
createInvite: (input) => db.createInvite(input),
validateInvite: (input: { token: string }) => db.validateInvite(input.token),
consumeInvite: (input: { token: string; uid: string }) => db.consumeInvite(input.token, input.uid),
```

### 1.5 Firestore Rules

**File:** `firestore.rules` — add:

```
match /projectForumPosts/{postId} {
  allow read: if isSignedIn() && belongsToCallerOrg(resource.data.projectId);
  allow create: if isSignedIn() && belongsToCallerOrg(request.resource.data.projectId);
  allow update: if isSignedIn() && (isAdmin() || resource.data.authorUid == request.auth.uid);
  allow delete: if isSignedIn() && (isAdmin() || resource.data.authorUid == request.auth.uid);
}

match /organizationInvites/{inviteId} {
  allow read: if isSignedIn() && isOrgAdmin(resource.data.organizationId);
  allow create: if isSignedIn() && isOrgAdmin(request.resource.data.organizationId);
  allow update: if false;  // only consumeInvite via client
  allow delete: if isSignedIn() && isOrgAdmin(resource.data.organizationId);
}
```

`belongsToCallerOrg` is a helper that checks the project belongs to the caller's org. `isOrgAdmin` checks `organizationMembers` where `memberRole == "admin"` and `organizationId` matches.

---

## Phase 2: Auth & Routing

### 2.1 Modify `ProtectedRoute`

**File:** `client/src/components/ProtectedRoute.tsx`

Add `memberRole` awareness. When `me.data.role === "institution"`, also check `me.data.memberRole`:

```ts
// Inside ProtectedRoute, after existing role check:
const memberRole = me.data?.memberRole; // "admin" | "faculty" | "student" | undefined

// Pass memberRole to children via context or props
// Pages use this to decide visibility
```

Don't redirect — let pages render with restricted views. Add a `MemberRoleContext`:

**New:** `client/src/contexts/MemberRoleContext.tsx`
```ts
export function MemberRoleProvider({ children }) {
  const me = trpc.auth.me.useQuery();
  const memberRole = me.data?.role === "institution" ? me.data.memberRole : "admin";
  return <MemberRoleContext.Provider value={memberRole}>{children}</MemberRoleContext.Provider>;
}
export function useMemberRole() { return useContext(MemberRoleContext); }
```

### 2.2 Invite Signup Flow

**New route:** `/signup?invite=<token>`

**File:** `client/src/pages/SignUp.tsx`

Add a third path: if `invite` param exists in URL, show a simplified signup form:
- Pre-filled role (faculty or student, from invite)
- Pre-selected org (from invite)
- Fields: name, email (pre-filled if invite has email), password
- On submit: `signUpWithEmail` → `bootstrapProfile` with `role: "institution"` + `memberRole` from invite → `consumeInvite` → redirect to `/institute/dashboard`

**No new route needed** — `SignUp.tsx` reads the `invite` query param and adapts.

### 2.3 Dashboard Routing by MemberRole

**File:** `client/src/lib/roles.ts`

`dashboardPathForRole` stays the same — all institution members go to `/institute/dashboard`. The dashboard page itself decides what to render based on `useMemberRole()`.

### 2.4 Invite Management in InstituteProfile

**File:** `client/src/pages/InstituteProfile.tsx`

In the `PeoplePanel` component, add:
- "Generate invite link" button next to each member row (when status is "invited")
- Copy link to clipboard
- Show invite status (pending / accepted / expired)
- Optional: "Resend invite" / "Revoke invite" buttons

---

## Phase 3: Student Dashboard

### 3.1 Page Component

**File:** `client/src/pages/InstituteDashboard.tsx`

Wrap existing content in a role check:

```ts
const memberRole = useMemberRole();

if (memberRole === "student") return <StudentDashboard />;
if (memberRole === "faculty") return <FacultyDashboard />;
// else: admin sees existing dashboard
```

### 3.2 Student Dashboard Layout

**New:** `client/src/pages/institute/StudentDashboard.tsx`

A focused, single-column layout with three sections:

**Section 1: Hero Card**
- Welcome message: "Welcome back, {name}"
- Org name badge
- Quick stats: "You're on {N} project(s)" · "Last active: {relative time}"

**Section 2: Your Projects**
- Grid of project cards (max 2-3 columns)
- Each card shows:
  - Project title (serif heading)
  - Challenge domain badge
  - Progress ring (SVG `<circle>` with `stroke-dasharray` animation via `framer-motion`)
  - Milestone status: "3/5 milestones complete"
  - Last activity: "2 hours ago — {activity title}"
  - Link to `/institute/projects/:id`
- Empty state: custom illustration + "No projects assigned yet — talk to your admin"

**Section 3: Team Activity Feed**
- Chronological list of recent activities across all assigned projects
- Each item: avatar (initials), name, role badge, action, project link, relative timestamp
- Color-coded: milestones = green, documents = blue, notes = gray
- `framer-motion` stagger animation on mount

### 3.3 Faculty Dashboard

**New:** `client/src/pages/institute/FacultyDashboard.tsx`

Similar to student but with:

**Section 1: Mentor Overview**
- "You're mentoring {N} project(s) with {M} student(s)"
- Alert cards for "needs attention" students (no activity in 7+ days)

**Section 2: Assigned Projects** (same as student, but with mentor badge)

**Section 3: Student Roster**
- Card grid of students on their projects
- Each card: avatar, name, department, project assignment, last active timestamp
- Status dot: green (active today), yellow (active this week), red (inactive 7+ days)

---

## Phase 4: Project Workspace Role Adaptation

### 4.1 Role-Based Section Visibility

**File:** `client/src/pages/InstituteProjectWorkspace.tsx`

Import `useMemberRole()` and conditionally render sections:

```ts
const memberRole = useMemberRole();
const isAdmin = memberRole === "admin" || !memberRole;
const isFaculty = memberRole === "faculty";
const isStudent = memberRole === "student";
```

**Delivery control section:**
- Admin: full edit (existing)
- Faculty: read-only (show current values, no inputs)
- Student: hidden

**Milestones section:**
- Admin: add/edit/delete (existing)
- Faculty: view + update status (existing select)
- Student: view only

**Activity record:**
- Admin/Faculty: can add notes (existing)
- Student: read-only feed

**Documents section:**
- Admin: upload (existing)
- Faculty: view/download only
- Student: view/download only

**Team record:**
- All roles: view only

**Credits section:**
- Admin: award button (existing)
- Faculty/Student: view only

### 4.2 Forum Tab

**New tab** in the project workspace: "Discussion"

Add to the existing section layout (`InstituteProjectWorkspace.tsx`), a new section after "Activity record":

```tsx
<section>
  <p className="border-b ... pb-3 font-mono-ui ...">Discussion</p>
  <ProjectForum projectId={project.id} />
</section>
```

---

## Phase 5: Forum Component

### 5.1 ProjectForum Component

**New:** `client/src/components/ProjectForum.tsx`

```
Props: { projectId: number }

State:
  - posts (from query)
  - newPostContent (string)
  - isSubmitting (boolean)

Layout:
  - Scrollable post list (newest first)
  - Sticky input bar at bottom

Post card:
  - Author avatar (initials in colored circle based on role)
  - Author name + role badge ("Student" / "Faculty" / "Admin")
  - Relative timestamp ("2 hours ago")
  - Content (plain text, rendered as paragraphs)
  - Pin indicator (if pinned)
  - Actions (if admin/faculty): pin/unpin button; if author: edit/delete

Input bar:
  - Textarea (auto-expanding)
  - "Post" button (ember color, disabled when empty)
  - Loading state while submitting

Empty state:
  - "No discussion yet — be the first to share an idea"
  - Subtle illustration
```

### 5.2 Forum Post Queries

**File:** `client/src/lib/db.ts`

```ts
export async function createForumPost(input: {
  projectId: number;
  authorUid: string;
  authorName: string;
  authorRole: string;
  content: string;
}) {
  // Create post + notify all project members
  const result = await createRecord(collectionNames.projectForumPosts, input);
  // Notify project team
  // ... (find project, find org members, create notifications)
  return result;
}

export async function listForumPosts(projectId: number) {
  const rows = await listCollectionWhere(
    collectionNames.projectForumPosts,
    "projectId",
    projectId
  );
  // Sort: pinned first, then by createdAt desc
  return rows.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}
```

---

## Phase 6: Visual Polish

### 6.1 Progress Rings

**New:** `client/src/components/ui/progress-ring.tsx`

```tsx
function ProgressRing({ progress, size = 80, strokeWidth = 6 }) {
  // SVG circle with animated stroke-dashoffset via framer-motion
  // Color: green (70+), ember (30-70), red (<30)
  // Center text: percentage
}
```

### 6.2 Activity Feed

**New:** `client/src/components/ActivityFeed.tsx`

```tsx
function ActivityFeed({ activities, projects }) {
  // Each item: avatar + name + action + project link + relative time
  // Color-coded by activity type
  // framer-motion stagger: { staggerChildren: 0.05 }
}
```

### 6.3 Forum Post Card

**New:** `client/src/components/ForumPostCard.tsx`

```tsx
function ForumPostCard({ post, onPin, onDelete, isAuthor }) {
  // Paper-textured card, avatar circle, role badge, content, actions
  // AnimatePresence for mount/unmount
}
```

### 6.4 Empty States

**New:** `client/src/components/EmptyState.tsx`

```tsx
function EmptyState({ icon, title, description, action? }) {
  // Centered, illustration + text + optional CTA button
  // Reusable across dashboard, projects, forum
}
```

### 6.5 Relative Timestamps

**New:** `client/src/lib/timeago.ts`

```ts
export function timeAgo(date: Date | string): string {
  // "just now", "2m ago", "1h ago", "3d ago", "Jan 15"
}
```

---

## Phase 7: File Summary

### New Files
| File | Purpose |
|------|---------|
| `client/src/contexts/MemberRoleContext.tsx` | MemberRole provider + `useMemberRole()` hook |
| `client/src/pages/institute/StudentDashboard.tsx` | Student-specific dashboard view |
| `client/src/pages/institute/FacultyDashboard.tsx` | Faculty-specific dashboard view |
| `client/src/components/ProjectForum.tsx` | Forum thread component |
| `client/src/components/ForumPostCard.tsx` | Individual forum post card |
| `client/src/components/ui/progress-ring.tsx` | Animated SVG progress ring |
| `client/src/components/ActivityFeed.tsx` | Project activity feed |
| `client/src/components/EmptyState.tsx` | Reusable empty state with illustration |
| `client/src/lib/timeago.ts` | Relative timestamp utility |
| `update2.md` | Documentation of all changes |

### Modified Files
| File | Change |
|------|--------|
| `drizzle/schema.ts` | Add `projectForumPosts` + `organizationInvites` tables (type-only) |
| `client/src/lib/userProfile.ts` | Add `MemberRole` type + `memberRole` field to `UserProfile` |
| `client/src/lib/db.ts` | Add forum CRUD, invite CRUD, member account helpers |
| `client/src/lib/trpc.ts` | Register new procedures |
| `client/src/App.tsx` | Wrap institute routes in `MemberRoleProvider` |
| `client/src/components/ProtectedRoute.tsx` | No change needed — role check already works |
| `client/src/pages/InstituteDashboard.tsx` | Role dispatch: student → `StudentDashboard`, faculty → `FacultyDashboard` |
| `client/src/pages/InstituteProjectWorkspace.tsx` | Add forum tab + role-based section visibility |
| `client/src/pages/InstituteProfile.tsx` | Add invite generation in PeoplePanel |
| `client/src/pages/SignUp.tsx` | Handle `?invite=` param for member signup |
| `firestore.rules` | Add `projectForumPosts` + `organizationInvites` rules |
| `client/src/lib/i18n/en.ts` + `hi.ts` | Add forum + role-related translation keys |

### NOT Changed
- `vite.config.ts`, `wrangler.jsonc`, deployment
- `main.tsx`, `InstituteHeader.tsx`, other headers
- `InstituteChallenges.tsx`, `ChallengeDetail.tsx`, `InstituteChallengeReview.tsx` (enrollment flow)
- `firestore.rules` for existing collections
- Admin/industry/citizen flows

---

## Phase 8: Verification

```bash
npm run check       # types pass
npm run build       # no regression
npm run format      # clean
npm test            # rules pass (new rules deployed separately)
npm run deploy:rules # deploy new forum/invite rules
```

### Manual QA
1. Institution admin adds faculty member with "Create account" → gets invite link → share with faculty → faculty signs up → lands on Faculty Dashboard
2. Faculty sees only their org's projects → opens project → can view milestones, add activity notes, but cannot edit delivery control
3. Faculty opens Discussion tab → posts first message → appears with "Faculty" badge, pinned option visible
4. Student signs up via invite → lands on Student Dashboard → sees assigned projects with progress rings → opens project → read-only view → opens Discussion → posts idea → appears with "Student" badge
5. Admin sees all activity including forum posts → can pin/remove posts → member activity overview shows who's active
6. Non-org user cannot see forum posts (rules check)
7. `npm run check`, `npm run build`, `npm test` all pass

---

## Design Freedom Notes

- **Colors & spacing:** All new components use the existing Samadhan palette (cream, ember, forest green) and spacing scale. But layout is open — if a forum thread feels better as a chat-style bubble layout vs. card list, do it. If progress rings feel better as horizontal bars, swap them. The spec defines *what* the user sees, not *exactly* how it's laid out.
- **Icons:** All `lucide-react` icons are available. The spec suggests some (progress ring, avatar, pin, etc.) but you can pick whichever feels right. No need to import new icon packs.
- **Animations:** `framer-motion` is already a dependency. The spec describes stagger, spring, and `AnimatePresence` patterns — but timing, easing, and duration are at the implementer's discretion. Make it feel alive, not prescribed.
- **Forum depth:** Phase 5 describes a flat thread. Threaded replies (`parentPostId`) are noted as v2 — don't build them unless there's time. A flat list that feels good is better than a threaded system that's half-done.
- **Invite delivery:** The invite link is generated on the profile page. Email delivery is intentionally omitted (Spark plan has no mail service). The admin copies and shares the link manually — this is good enough for the hackathon demo.

