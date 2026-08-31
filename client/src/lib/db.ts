import {
  collection,
  deleteDoc,
  doc,
  enableIndexedDbPersistence,
  getDoc,
  getDocs,
  getFirestore,
  query,
  runTransaction,
  setDoc,
  Timestamp,
  where,
} from "firebase/firestore";
import { firebaseApp } from "./firebase";
import { storedFileUrl } from "./storage";
import type {
  assignments,
  challenges,
  challengeEvidence,
  challengeSupports,
  industryInterests,
  notifications,
  organizationMembers,
  organizations,
  projectActivities,
  projectCloseouts,
  projectDocuments,
  projectMilestones,
  projects,
} from "../../../drizzle/schema";

/**
 * Browser-side Firestore data layer — a direct port of the old
 * `server/workflow.ts`, which ran under the Admin SDK.
 *
 * Access control now lives entirely in `firestore.rules`. Anything enforced
 * here is convenience only; assume a hostile client can call any of these
 * functions with any arguments, and make sure the rules file is the thing that
 * actually says no.
 *
 * The drizzle imports above are `import type` on purpose: they are erased at
 * build time, so the collection shapes stay type-checked without pulling
 * drizzle-orm into the client bundle.
 */

export const db = getFirestore(firebaseApp);

// Enable offline cache so reads work without network and writes queue
// until reconnect. Expected rejections (multi-tab `failed-precondition`,
// or IndexedDB unavailable `unimplemented`) are safe to swallow.
enableIndexedDbPersistence(db).catch(error => {
  const code = (error as { code?: string }).code;
  if (code !== "failed-precondition" && code !== "unimplemented") {
    console.warn("Firestore persistence not enabled:", error);
  }
});

type RecordShape = Record<string, unknown>;
type VerificationStatus = "pending" | "verified" | "rejected";
type MemberRole = "admin" | "faculty" | "student";
type OrganizationStanding = "active" | "warned" | "suspended" | "terminated";

export const collectionNames = {
  organizations: "organizations",
  organizationMembers: "organizationMembers",
  challenges: "challenges",
  challengeEvidence: "challengeEvidence",
  assignments: "assignments",
  projects: "projects",
  projectMilestones: "projectMilestones",
  projectDocuments: "projectDocuments",
  projectActivities: "projectActivities",
  industryInterests: "industryInterests",
  challengeSupports: "challengeSupports",
  projectCloseouts: "projectCloseouts",
  notifications: "notifications",
} as const;

function createNumericId() {
  return Date.now() * 1000 + Math.floor(Math.random() * 1000);
}

function documentId(id: number) {
  return `record-${id}`;
}

// Firestore rejects `undefined` field values outright, and callers routinely
// pass optional fields as undefined. Every write must be filtered first.
function omitUndefined(input: RecordShape) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined)
  );
}

function normalizeValue(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toDate();
  if (Array.isArray(value)) return value.map(normalizeValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as RecordShape).map(([key, nested]) => [
        key,
        normalizeValue(nested),
      ])
    );
  }
  return value;
}

function normalizeRecord<T>(data: RecordShape) {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, normalizeValue(value)])
  ) as T;
}

function sortByCreatedAtDesc<T>(rows: T[]) {
  return rows.sort(
    (left, right) =>
      Number((right as { createdAt?: unknown }).createdAt ?? 0) -
      Number((left as { createdAt?: unknown }).createdAt ?? 0)
  );
}

async function createRecord<T extends RecordShape>(
  collectionName: string,
  input: T
) {
  const id = createNumericId();
  const now = new Date();
  await setDoc(doc(db, collectionName, documentId(id)), {
    ...omitUndefined(input),
    id,
    createdAt: now,
    updatedAt: now,
  });
  return { id };
}

async function getRecord<T>(collectionName: string, id: number) {
  const snapshot = await getDoc(doc(db, collectionName, documentId(id)));
  return snapshot.exists()
    ? normalizeRecord<T>(snapshot.data() as RecordShape)
    : null;
}

async function updateRecord<T>(
  collectionName: string,
  id: number,
  input: RecordShape
) {
  await setDoc(
    doc(db, collectionName, documentId(id)),
    { ...omitUndefined(input), updatedAt: new Date() },
    { merge: true }
  );
  return getRecord<T>(collectionName, id);
}

async function deleteRecord(collectionName: string, id: number) {
  await deleteDoc(doc(db, collectionName, documentId(id)));
  return { success: true as const };
}

async function listCollection<T>(collectionName: string) {
  const snapshot = await getDocs(collection(db, collectionName));
  return sortByCreatedAtDesc(
    snapshot.docs.map(entry => normalizeRecord<T>(entry.data() as RecordShape))
  );
}

/**
 * Scoped read for collections whose rules deny blanket listing. The `where`
 * clause is not an optimisation — a query missing it is rejected outright by
 * `firestore.rules`, which is what keeps one user's rows private from another.
 */
async function listCollectionWhere<T>(
  collectionName: string,
  field: string,
  value: unknown
) {
  const snapshot = await getDocs(
    query(collection(db, collectionName), where(field, "==", value))
  );
  return sortByCreatedAtDesc(
    snapshot.docs.map(entry => normalizeRecord<T>(entry.data() as RecordShape))
  );
}

// ---------------------------------------------------------------- organizations

export async function createOrganization(input: RecordShape) {
  return createRecord(collectionNames.organizations, {
    ...input,
    verificationStatus: input.verificationStatus ?? "pending",
    standing: input.standing ?? "active",
  });
}

export async function getOrganization(id: number) {
  return getRecord<typeof organizations.$inferSelect>(
    collectionNames.organizations,
    id
  );
}

export async function listOrganizations(kind?: "institution" | "industry") {
  const rows = await listCollection<typeof organizations.$inferSelect>(
    collectionNames.organizations
  );
  return kind ? rows.filter(organization => organization.kind === kind) : rows;
}

export async function updateOrganization(id: number, input: RecordShape) {
  return updateRecord<typeof organizations.$inferSelect>(
    collectionNames.organizations,
    id,
    input
  );
}

export async function setOrganizationVerification(input: {
  id: number;
  verificationStatus: VerificationStatus;
  verificationNotes?: string;
}) {
  const organization = await getOrganization(input.id);
  const result = await updateOrganization(input.id, {
    verificationStatus: input.verificationStatus,
    verificationNotes: input.verificationNotes,
  });
  if (organization) {
    await createNotification({
      recipientEmail: organization.contactEmail,
      title: `Organization verification ${input.verificationStatus}`,
      body:
        input.verificationNotes ||
        `Your ${organization.kind} profile is now ${input.verificationStatus}.`,
      href:
        organization.kind === "institution"
          ? "/institute/profile"
          : "/industry/profile",
    });
  }
  return result;
}

const standingNoticeCopy: Record<OrganizationStanding, string> = {
  active: "Your organization's standing has been restored to active.",
  warned:
    "Your organization has received a formal warning from the Samadhan administration.",
  suspended:
    "Your organization has been suspended and dashboard access is temporarily blocked.",
  terminated:
    "Your organization has been terminated from the Samadhan network.",
};

export async function setOrganizationStanding(input: {
  id: number;
  standing: OrganizationStanding;
  notes?: string;
}) {
  const organization = await getOrganization(input.id);
  const result = await updateOrganization(input.id, {
    standing: input.standing,
    standingNotes: input.notes,
    standingUpdatedAt: new Date(),
  });
  if (organization) {
    await createNotification({
      recipientEmail: organization.contactEmail,
      title: `Organization standing: ${input.standing}`,
      body: input.notes || standingNoticeCopy[input.standing],
      href:
        organization.kind === "institution"
          ? "/institute/profile"
          : "/industry/profile",
    });
  }
  return result;
}

// -------------------------------------------------------- organization members

export async function createOrganizationMember(input: RecordShape) {
  return createRecord(collectionNames.organizationMembers, {
    ...input,
    status: input.status ?? "invited",
  });
}

export async function listOrganizationMembers(
  organizationId: number,
  memberRole?: MemberRole
) {
  const rows = await listCollection<typeof organizationMembers.$inferSelect>(
    collectionNames.organizationMembers
  );
  return rows.filter(
    member =>
      member.organizationId === organizationId &&
      (!memberRole || member.memberRole === memberRole)
  );
}

export async function updateOrganizationMember(id: number, input: RecordShape) {
  return updateRecord<typeof organizationMembers.$inferSelect>(
    collectionNames.organizationMembers,
    id,
    input
  );
}

export async function deleteOrganizationMember(id: number) {
  return deleteRecord(collectionNames.organizationMembers, id);
}

// ------------------------------------------------------------------ challenges

export async function submitChallenge(input: RecordShape) {
  const result = await createRecord(collectionNames.challenges, {
    ...input,
    status: input.status ?? "submitted",
    priority: input.priority ?? "medium",
    duplicateStatus: input.duplicateStatus ?? "unreviewed",
  });
  if (input.citizenEmail) {
    await createNotification({
      recipientEmail: input.citizenEmail as string,
      title: "Challenge report received",
      body: `Your report “${input.title}” is now in the review workflow.`,
      href: `/citizen/challenges/${result.id}`,
    });
  }
  return result;
}

export async function listChallenges() {
  return listCollection<typeof challenges.$inferSelect>(
    collectionNames.challenges
  );
}

export async function getChallenge(id: number) {
  return getRecord<typeof challenges.$inferSelect>(
    collectionNames.challenges,
    id
  );
}

export async function updateChallenge(id: number, input: RecordShape) {
  return updateRecord<typeof challenges.$inferSelect>(
    collectionNames.challenges,
    id,
    input
  );
}

// ----------------------------------------------------------------- assignments

export async function assignChallenge(input: {
  challengeId: number;
  organizationId: number;
  adminName: string;
  rationale?: string;
  dueAt?: Date;
}) {
  const organization = await getOrganization(input.organizationId);
  if (
    !organization ||
    organization.kind !== "institution" ||
    organization.verificationStatus !== "verified"
  ) {
    throw new Error(
      "Challenges may only be assigned to verified institution profiles."
    );
  }
  const challenge = await getChallenge(input.challengeId);
  if (!challenge) throw new Error("The challenge record could not be found.");

  const result = await createRecord(collectionNames.assignments, {
    ...input,
    status: "pending",
  });
  await updateRecord(collectionNames.challenges, input.challengeId, {
    assignedOrganizationId: input.organizationId,
    status: "assigned",
  });
  await createNotification({
    recipientEmail: organization.contactEmail,
    title: "Challenge assignment awaiting review",
    body: `“${challenge.title}” has been assigned to your institution for response review.`,
    href: `/institute/challenges/${challenge.id}`,
  });
  return result;
}

export async function listAssignments(
  challengeId?: number,
  organizationId?: number
) {
  const rows = await listCollection<typeof assignments.$inferSelect>(
    collectionNames.assignments
  );
  return rows.filter(
    assignment =>
      (!challengeId || assignment.challengeId === challengeId) &&
      (!organizationId || assignment.organizationId === organizationId)
  );
}

export async function updateAssignment(id: number, input: RecordShape) {
  const assignment = await getRecord<typeof assignments.$inferSelect>(
    collectionNames.assignments,
    id
  );
  const result = await updateRecord<typeof assignments.$inferSelect>(
    collectionNames.assignments,
    id,
    input
  );
  if (
    assignment &&
    (input.status === "accepted" || input.status === "declined")
  ) {
    const challenge = await getChallenge(assignment.challengeId);
    if (challenge?.citizenEmail) {
      await createNotification({
        recipientEmail: challenge.citizenEmail,
        title: `Institution response ${input.status}`,
        body: `The assigned institution has ${input.status} the response assignment for “${challenge.title}”.`,
        href: `/challenges/${challenge.id}`,
      });
    }
  }
  return result;
}

// -------------------------------------------------------------------- projects

export async function createProject(
  input: RecordShape & { challengeId: number }
) {
  const result = await createRecord(collectionNames.projects, {
    ...input,
    stage: input.stage ?? "problem_identified",
    status: input.status ?? "active",
    progress: input.progress ?? 0,
  });
  await updateRecord(collectionNames.challenges, input.challengeId, {
    status: "in_progress",
  });
  const challenge = await getChallenge(input.challengeId);
  if (challenge?.citizenEmail) {
    await createNotification({
      recipientEmail: challenge.citizenEmail,
      title: "Your challenge has entered delivery",
      body: `A project has been created to address “${challenge.title}”.`,
      href: `/challenges/${challenge.id}`,
    });
  }
  return result;
}

export async function listProjects(
  organizationId?: number,
  challengeId?: number
) {
  const rows = await listCollection<typeof projects.$inferSelect>(
    collectionNames.projects
  );
  return rows.filter(
    project =>
      (!organizationId || project.organizationId === organizationId) &&
      (!challengeId || project.challengeId === challengeId)
  );
}

export async function getProject(id: number) {
  return getRecord<typeof projects.$inferSelect>(collectionNames.projects, id);
}

export async function updateProject(id: number, input: RecordShape) {
  return updateRecord<typeof projects.$inferSelect>(
    collectionNames.projects,
    id,
    input
  );
}

// ------------------------------------------------------ milestones / documents

export async function addProjectMilestone(input: RecordShape) {
  return createRecord(collectionNames.projectMilestones, {
    ...input,
    status: input.status ?? "upcoming",
    position: input.position ?? 0,
  });
}

export async function listProjectMilestones(projectId: number) {
  const rows = await listCollection<typeof projectMilestones.$inferSelect>(
    collectionNames.projectMilestones
  );
  return rows
    .filter(milestone => milestone.projectId === projectId)
    .sort((left, right) => (left.position ?? 0) - (right.position ?? 0));
}

export async function updateProjectMilestone(id: number, input: RecordShape) {
  return updateRecord<typeof projectMilestones.$inferSelect>(
    collectionNames.projectMilestones,
    id,
    input
  );
}

export async function addProjectDocument(input: RecordShape) {
  return createRecord(collectionNames.projectDocuments, input);
}

/**
 * Uploaded bytes live in a `fileData` field on the record itself (no Cloud
 * Storage on the Spark plan), so `fileUrl` is synthesised at read time as an
 * object URL. These two collections are queried with `where` rather than listed
 * whole — a blanket `listCollection` here would download every stored file in
 * the database on every page load.
 */
function withFileUrls<
  T extends { id: number; fileData?: string | null; fileUrl?: string | null },
>(collectionName: string, rows: T[]) {
  return rows.map(row =>
    row.fileData
      ? {
          ...row,
          fileUrl: storedFileUrl(`${collectionName}-${row.id}`, row.fileData),
        }
      : row
  );
}

export async function listProjectDocuments(projectId: number) {
  const rows = await listCollectionWhere<typeof projectDocuments.$inferSelect>(
    collectionNames.projectDocuments,
    "projectId",
    projectId
  );
  return withFileUrls(collectionNames.projectDocuments, rows);
}

export async function listChallengeEvidence(challengeId: number) {
  const rows = await listCollectionWhere<typeof challengeEvidence.$inferSelect>(
    collectionNames.challengeEvidence,
    "challengeId",
    challengeId
  );
  return withFileUrls(collectionNames.challengeEvidence, rows);
}

export async function createChallengeEvidence(input: RecordShape) {
  return createRecord(collectionNames.challengeEvidence, input);
}

export async function addProjectActivity(input: RecordShape) {
  return createRecord(collectionNames.projectActivities, {
    ...input,
    type: input.type ?? "note",
  });
}

export async function listProjectActivities(projectId: number) {
  const rows = await listCollection<typeof projectActivities.$inferSelect>(
    collectionNames.projectActivities
  );
  return rows.filter(activity => activity.projectId === projectId);
}

// ----------------------------------------------------------- industry interest

export async function submitIndustryInterest(
  input: RecordShape & { projectId: number }
) {
  const result = await createRecord(collectionNames.industryInterests, {
    ...input,
    status: input.status ?? "submitted",
  });
  const project = await getProject(input.projectId);
  const institution = project
    ? await getOrganization(project.organizationId)
    : undefined;
  if (institution) {
    await createNotification({
      recipientEmail: institution.contactEmail,
      title: "Industry support interest received",
      body: `${input.contactName} submitted a ${input.supportType} commitment for “${project?.title}”.`,
      href: `/institute/projects/${input.projectId}`,
    });
  }
  return result;
}

export async function listIndustryInterests(
  projectId?: number,
  organizationId?: number
) {
  const rows = await listCollection<typeof industryInterests.$inferSelect>(
    collectionNames.industryInterests
  );
  return rows.filter(
    interest =>
      (!projectId || interest.projectId === projectId) &&
      (!organizationId || interest.organizationId === organizationId)
  );
}

export async function updateIndustryInterest(id: number, input: RecordShape) {
  return updateRecord<typeof industryInterests.$inferSelect>(
    collectionNames.industryInterests,
    id,
    input
  );
}

// ---------------------------------------------------------- challenge supports

export async function supportChallenge(input: {
  challengeId: number;
  supporterEmail: string;
  kind: "upvote" | "follow";
}) {
  const records = await listCollectionWhere<
    typeof challengeSupports.$inferSelect
  >(collectionNames.challengeSupports, "supporterEmail", input.supporterEmail);
  const duplicate = records.some(
    record =>
      record.challengeId === input.challengeId && record.kind === input.kind
  );
  if (duplicate) return { duplicate: true };
  const result = await createRecord(collectionNames.challengeSupports, input);
  return { ...result, duplicate: false };
}

/** Deterministic so a Firestore transaction can `get()` it directly (transactions
 * can't run arbitrary queries) to atomically check-and-set in one round trip. */
function upvoteSupportDocId(challengeId: number, supporterEmail: string) {
  const safeEmail = supporterEmail.toLowerCase().replace(/[^a-z0-9]/g, "_");
  return `upvote-${challengeId}-${safeEmail}`;
}

/**
 * Upvotes a challenge exactly once per (challenge, email): creates a
 * `challengeSupports` record (same collection/shape `supportChallenge()`
 * uses for `kind: "follow"`, so there is one support data model, not two)
 * and atomically increments `upvoteCount` on the challenge document, in a
 * single Firestore transaction. The transaction is what makes this safe
 * under rapid double-clicks or concurrent tabs — a plain
 * read-then-write (like `supportChallenge`'s duplicate check) can race.
 */
export async function upvoteChallenge(input: {
  challengeId: number;
  supporterEmail: string;
}): Promise<{ duplicate: boolean; upvoteCount?: number }> {
  const supportRef = doc(
    db,
    collectionNames.challengeSupports,
    upvoteSupportDocId(input.challengeId, input.supporterEmail)
  );
  const challengeRef = doc(
    db,
    collectionNames.challenges,
    documentId(input.challengeId)
  );
  return runTransaction(db, async transaction => {
    const [supportSnap, challengeSnap] = await Promise.all([
      transaction.get(supportRef),
      transaction.get(challengeRef),
    ]);
    if (supportSnap.exists()) return { duplicate: true };
    const now = new Date();
    const currentCount = (challengeSnap.data()?.upvoteCount as number) || 0;
    const nextCount = currentCount + 1;
    transaction.set(supportRef, {
      id: createNumericId(),
      challengeId: input.challengeId,
      supporterEmail: input.supporterEmail,
      kind: "upvote",
      createdAt: now,
      updatedAt: now,
    });
    transaction.update(challengeRef, {
      upvoteCount: nextCount,
      updatedAt: now,
    });
    return { duplicate: false, upvoteCount: nextCount };
  });
}

export async function listChallengeSupports(supporterEmail: string) {
  return listCollectionWhere<typeof challengeSupports.$inferSelect>(
    collectionNames.challengeSupports,
    "supporterEmail",
    supporterEmail
  );
}

export async function deleteChallengeSupport(id: number) {
  return deleteRecord(collectionNames.challengeSupports, id);
}

// -------------------------------------------------------------------- closeout

export async function submitCloseout(
  input: RecordShape & { projectId: number }
) {
  const result = await createRecord(collectionNames.projectCloseouts, {
    ...input,
    citizenConfirmation: input.citizenConfirmation ?? "pending",
    adminStatus: input.adminStatus ?? "pending",
  });
  await updateRecord(collectionNames.projects, input.projectId, {
    status: "closeout_pending",
  });
  const project = await getProject(input.projectId);
  const challenge = project
    ? await getChallenge(project.challengeId)
    : undefined;
  if (challenge?.citizenEmail) {
    await createNotification({
      recipientEmail: challenge.citizenEmail,
      title: "Outcome confirmation requested",
      body: `Please review the reported outcome for “${challenge.title}”.`,
      href: `/citizen/challenges/${challenge.id}/closeout`,
    });
  }
  return result;
}

export async function listProjectCloseouts(projectId?: number) {
  const rows = await listCollection<typeof projectCloseouts.$inferSelect>(
    collectionNames.projectCloseouts
  );
  return rows.filter(
    closeout => !projectId || closeout.projectId === projectId
  );
}

export async function updateProjectCloseout(id: number, input: RecordShape) {
  const closeout = await getRecord<typeof projectCloseouts.$inferSelect>(
    collectionNames.projectCloseouts,
    id
  );
  const result = await updateRecord<typeof projectCloseouts.$inferSelect>(
    collectionNames.projectCloseouts,
    id,
    input
  );
  if (!closeout) return result;

  const project = await getProject(closeout.projectId);
  const challenge = project
    ? await getChallenge(project.challengeId)
    : undefined;
  const institution = project
    ? await getOrganization(project.organizationId)
    : undefined;

  if (input.citizenConfirmation && institution) {
    await createNotification({
      recipientEmail: institution.contactEmail,
      title: "Citizen outcome response received",
      body: `The citizen has ${input.citizenConfirmation} the proposed outcome for “${project?.title}”.`,
      href: `/institute/projects/${closeout.projectId}/closeout`,
    });
  }
  if (input.adminStatus) {
    if (institution) {
      await createNotification({
        recipientEmail: institution.contactEmail,
        title: `Closeout ${input.adminStatus}`,
        body:
          (input.adminNotes as string) ||
          `The administrator has ${input.adminStatus} the closeout for “${project?.title}”.`,
        href: `/institute/projects/${closeout.projectId}/closeout`,
      });
    }
    if (challenge?.citizenEmail) {
      await createNotification({
        recipientEmail: challenge.citizenEmail,
        title: `Challenge closeout ${input.adminStatus}`,
        body: `The administrator has ${input.adminStatus} the outcome record for “${challenge.title}”.`,
        href: `/citizen/challenges/${challenge.id}/closeout`,
      });
    }
  }
  return result;
}

// --------------------------------------------------------------- notifications

export async function createNotification(input: {
  recipientEmail: string;
  title: string;
  body: string;
  href?: string;
}) {
  return createRecord(collectionNames.notifications, { ...input });
}

export async function listNotifications(recipientEmail: string) {
  return listCollectionWhere<typeof notifications.$inferSelect>(
    collectionNames.notifications,
    "recipientEmail",
    recipientEmail
  );
}
