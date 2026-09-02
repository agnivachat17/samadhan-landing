import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult,
} from "@tanstack/react-query";
import { UNAUTHED_ERR_MSG } from "@shared/const";
import { useAuth } from "@/hooks/useAuth";
import * as db from "./db";
import { auth } from "./firebase";
import { prepareStoredFile, sanitizeFileName } from "./storage";
import {
  linkOrganizationOwner,
  listAllUserProfiles,
  loadOrCreateProfile,
  updateUserProfile,
  type NotificationPreferences,
  type SelfAssignableRole,
  type UserProfile,
} from "./userProfile";
import { updateDisplayName } from "./firebase";
import { chainHash } from "./ledger";

/**
 * Drop-in replacement for the old tRPC React client.
 *
 * The server this used to talk to is gone — every call now runs against
 * Firestore directly from the browser, with `firestore.rules` as the only
 * enforcement boundary. The `trpc.<router>.<procedure>.useQuery/useMutation`
 * and `trpc.useUtils()` surface is preserved verbatim so that the ~37 page
 * components did not have to change.
 *
 * When adding a procedure here, remember there is no server-side validation
 * left: zod input schemas were dropped along with the router, so the rules file
 * must be the thing that rejects bad or malicious writes.
 */

type Resolver = (input: any) => Promise<any>;

function requireUser() {
  const user = auth.currentUser;
  if (!user) throw new Error(UNAUTHED_ERR_MSG);
  return user;
}

// ------------------------------------------------------------ procedure tables

const workflowProcedures = {
  organizationOnboard: async (input: {
    kind: "institution" | "industry";
    complianceAccepted?: boolean;
    [key: string]: unknown;
  }) => {
    const { complianceAccepted, ...organization } = input;
    const user = auth.currentUser;
    const result = await db.createOrganization({
      ...organization,
      complianceAcceptedAt: complianceAccepted ? new Date() : undefined,
      ownerUid: user?.uid,
    });
    if (user) {
      const profile = await loadOrCreateProfile(user);
      if (profile.role !== "admin")
        await linkOrganizationOwner(user, result.id, input.kind);
    }
    return result;
  },
  organizationById: (input: { id: number }) => db.getOrganization(input.id),
  organizations: (input: { kind?: "institution" | "industry" } | undefined) =>
    db.listOrganizations(input?.kind),
  updateOrganization: (input: {
    id: number;
    details: Record<string, unknown>;
  }) => db.updateOrganization(input.id, input.details),
  verifyOrganization: (input: {
    id: number;
    verificationStatus: "pending" | "verified" | "rejected";
    verificationNotes?: string;
  }) => db.setOrganizationVerification(input),
  updateOrganizationStanding: (input: {
    id: number;
    standing: "active" | "warned" | "suspended" | "terminated";
    notes?: string;
  }) => db.setOrganizationStanding(input),

  organizationMembers: (input: {
    organizationId: number;
    memberRole?: "admin" | "faculty" | "student";
  }) => db.listOrganizationMembers(input.organizationId, input.memberRole),
  addOrganizationMember: (input: Record<string, unknown>) =>
    db.createOrganizationMember(input),
  updateOrganizationMember: (
    input: { id: number } & Record<string, unknown>
  ) => {
    const { id, ...details } = input;
    return db.updateOrganizationMember(id, details);
  },
  deleteOrganizationMember: (input: { id: number }) =>
    db.deleteOrganizationMember(input.id),

  submitChallenge: (input: Record<string, unknown>) =>
    db.submitChallenge(input),
  challenges: (_input?: Record<string, never>) => db.listChallenges(),
  challengeById: (input: { id: number }) => db.getChallenge(input.id),
  updateChallenge: (input: { id: number } & Record<string, unknown>) => {
    const { id, ...details } = input;
    return db.updateChallenge(id, details);
  },
  deleteChallenge: (input: { id: number }) => db.deleteChallenge(input.id),
  assignChallenge: (input: {
    challengeId: number;
    organizationId: number;
    adminName: string;
    rationale?: string;
    dueAt?: Date;
  }) => db.assignChallenge(input),
  assignments: (
    input: { challengeId?: number; organizationId?: number } | undefined
  ) => db.listAssignments(input?.challengeId, input?.organizationId),
  enrollChallenge: (input: {
    challengeId: number;
    organizationId: number;
    organizationName?: string;
  }) => db.enrollChallenge(input),
  updateAssignment: (
    input: { challengeId: number; organizationId: number } & Record<
      string,
      unknown
    >
  ) => {
    const { challengeId, organizationId, ...details } = input;
    return db.updateAssignment(challengeId, organizationId, details);
  },

  createProject: (input: Record<string, unknown> & { challengeId: number }) =>
    db.createProject(input),
  projects: (
    input: { organizationId?: number; challengeId?: number } | undefined
  ) => db.listProjects(input?.organizationId, input?.challengeId),
  projectById: (input: { id: number }) => db.getProject(input.id),
  updateProject: (input: { id: number } & Record<string, unknown>) => {
    const { id, ...details } = input;
    return db.updateProject(id, details);
  },

  addMilestone: (input: Record<string, unknown>) =>
    db.addProjectMilestone(input),
  projectMilestones: (input: { projectId: number }) =>
    db.listProjectMilestones(input.projectId),
  updateMilestone: (input: { id: number } & Record<string, unknown>) => {
    const { id, ...details } = input;
    return db.updateProjectMilestone(id, details);
  },

  addProjectDocument: (input: Record<string, unknown>) =>
    db.addProjectDocument(input),
  projectDocuments: (input: { projectId: number }) =>
    db.listProjectDocuments(input.projectId),
  uploadProjectDocument: async (input: {
    projectId: number;
    uploaderName: string;
    name: string;
    documentType: string;
    mimeType: string;
    base64: string;
  }) => {
    requireUser();
    const stored = await prepareStoredFile({
      base64: input.base64,
      mimeType: input.mimeType,
    });
    return db.addProjectDocument({
      projectId: input.projectId,
      uploaderName: input.uploaderName,
      name: sanitizeFileName(input.name, "document"),
      documentType: input.documentType,
      fileData: stored.fileData,
      mimeType: stored.mimeType,
    });
  },

  challengeEvidence: (input: { challengeId: number }) =>
    db.listChallengeEvidence(input.challengeId),
  firstEvidencePerChallenge: (input: { challengeIds: number[] }) =>
    db.listFirstEvidencePerChallenge(input.challengeIds),
  uploadChallengeEvidence: async (input: {
    challengeId: number;
    uploaderName: string;
    fileName: string;
    mimeType: string;
    base64: string;
  }) => {
    requireUser();
    const stored = await prepareStoredFile({
      base64: input.base64,
      mimeType: input.mimeType,
    });
    return db.createChallengeEvidence({
      challengeId: input.challengeId,
      uploaderName: input.uploaderName,
      fileName: sanitizeFileName(input.fileName, "evidence"),
      fileData: stored.fileData,
      mimeType: stored.mimeType,
    });
  },

  addActivity: (input: Record<string, unknown>) => db.addProjectActivity(input),
  projectActivities: (input: { projectId: number }) =>
    db.listProjectActivities(input.projectId),

  expressInterest: (input: Record<string, unknown> & { projectId: number }) =>
    db.submitIndustryInterest(input),
  industryInterests: (
    input: { projectId?: number; organizationId?: number } | undefined
  ) => db.listIndustryInterests(input?.projectId, input?.organizationId),
  updateIndustryInterest: (input: { id: number } & Record<string, unknown>) => {
    const { id, ...details } = input;
    return db.updateIndustryInterest(id, details);
  },

  supportChallenge: (input: {
    challengeId: number;
    supporterEmail: string;
    kind: "upvote" | "follow";
  }) => db.supportChallenge(input),
  upvoteChallenge: (input: { challengeId: number; supporterEmail: string }) =>
    db.upvoteChallenge(input),
  unvoteChallenge: (input: { challengeId: number; supporterEmail: string }) =>
    db.unvoteChallenge(input),
  challengeSupports: (input: { supporterEmail: string }) =>
    db.listChallengeSupports(input.supporterEmail),
  deleteChallengeSupport: (input: { id: number }) =>
    db.deleteChallengeSupport(input.id),

  submitCloseout: (input: Record<string, unknown> & { projectId: number }) =>
    db.submitCloseout(input),
  projectCloseouts: (input: { projectId?: number } | undefined) =>
    db.listProjectCloseouts(input?.projectId),
  updateProjectCloseout: (input: { id: number } & Record<string, unknown>) => {
    const { id, ...details } = input;
    return db.updateProjectCloseout(id, details);
  },

  // Deliberately no generic `createNotification` passthrough here: every
  // legitimate notification is a side effect of a specific workflow action
  // (see the `type`-tagged calls inside `db.ts`), each carrying the
  // challenge/project/organization context `firestore.rules` checks the
  // write against. A generic "create any notification" procedure had no UI
  // caller (verified unused) and would just be a convenient way to construct
  // an unauthorized write shape — removed rather than re-typed.
  notifications: (input: { recipientEmail: string }) =>
    db.listNotifications(input.recipientEmail),

  // USP-03: hash-anchored ledger
  anchorLedger: (input: { projectId: number }) =>
    db.anchorLedger(input.projectId),
  ledgerAnchors: (input: { projectId: number }) =>
    db.listLedgerAnchors(input.projectId),
  getLedgerAnchor: (input: { id: number }) => db.getLedgerAnchor(input.id),
  verifyLedger: async (input: { projectId: number }) => {
    const acts = await db.listProjectActivities(input.projectId);
    const closes = await db.listProjectCloseouts(input.projectId);
    const entries = [...acts, ...closes]
      .filter(
        (r): r is typeof r & { hash: string; prevHash: string } =>
          typeof (r as Record<string, unknown>).hash === "string" &&
          typeof (r as Record<string, unknown>).prevHash === "string" &&
          (r as Record<string, unknown>).hash !== "" &&
          (r as Record<string, unknown>).prevHash !== ""
      )
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i]! as Record<string, unknown>;
      const isCloseout = "outcomeSummary" in e;
      const payload: Record<string, unknown> = {
        projectId: e.projectId,
        ts: new Date(e.createdAt as Date).toISOString(),
      };
      if (isCloseout) {
        payload.submittedBy = e.submittedBy;
        payload.outcomeSummary = e.outcomeSummary;
      } else {
        payload.actorName = e.actorName;
        payload.actorRole = e.actorRole;
        payload.type = e.type ?? "note";
        payload.title = e.title;
        payload.detail = e.detail ?? "";
        payload.fileDataHash = e.fileDataHash ?? "";
      }
      const expected = await chainHash(e.prevHash as string, payload);
      if (expected !== (e.hash as string))
        return { valid: false, tamperAt: i, root: null };
    }
    const anchors = await db.listLedgerAnchors(input.projectId);
    return { valid: true, tamperAt: null, root: anchors[0]?.root ?? null };
  },

  // Forum (Phase 5)
  createForumPost: (input: Record<string, unknown>) =>
    db.createForumPost(input),
  forumPosts: (input: { projectId: number }) =>
    db.listForumPosts(input.projectId),
  updateForumPost: (input: { id: number } & Record<string, unknown>) => {
    const { id, ...details } = input;
    return db.updateForumPost(id, details);
  },
  deleteForumPost: (input: { id: number }) => db.deleteForumPost(input.id),

  // Invites (Phase 2.3)
  createInvite: (input: {
    organizationId: number;
    memberRole: "faculty" | "student";
    email?: string;
    expiresInDays?: number;
  }) => db.createInvite(input),
  getInviteByToken: (input: { token: string }) =>
    db.getInviteByToken(input.token),
  validateInvite: (input: { token: string }) => db.validateInvite(input.token),
  consumeInvite: (input: { token: string; uid: string }) =>
    db.consumeInvite(input.token, input.uid),

  // USP-06: academic credits + certificate
  awardCredits: (input: { projectId: number }) =>
    db.awardCredits(input.projectId),
  generateCertificate: async (input: { projectId: number }) => {
    const project = await db.getProject(input.projectId);
    if (!project) throw new Error("Project not found");
    const institution = project
      ? await db.getOrganization(project.organizationId)
      : null;
    const members = project
      ? await db.listOrganizationMembers(project.organizationId)
      : [];
    const anchors = await db.listLedgerAnchors(input.projectId);
    const root = anchors[0]?.root ?? "NO-ANCHOR-YET";
    const { generateCertificate } = await import("./certificate");
    return generateCertificate({
      projectTitle: project.title,
      institutionName: institution?.name ?? "",
      team: members.map(
        (m: Record<string, unknown>) => (m.fullName as string) ?? ""
      ),
      leadName: project.leadName,
      credits: (project.creditsAwarded as number) ?? 0,
      anchorRoot: root as string,
      date: new Date(),
    });
  },
} satisfies Record<string, Resolver>;

// ------------------------------------------------------------------- shim core

type ProcedureTable = Record<string, Resolver>;

type QueryHook<T extends Resolver> = (
  input?: Parameters<T>[0],
  options?: Omit<
    UseQueryOptions<Awaited<ReturnType<T>>, Error>,
    "queryKey" | "queryFn"
  >
) => UseQueryResult<Awaited<ReturnType<T>>, Error>;

type MutationHook<T extends Resolver> = (
  options?: Omit<
    UseMutationOptions<Awaited<ReturnType<T>>, Error, Parameters<T>[0]>,
    "mutationFn"
  >
) => UseMutationResult<Awaited<ReturnType<T>>, Error, Parameters<T>[0]>;

type RouterHooks<T extends ProcedureTable> = {
  [K in keyof T]: {
    useQuery: QueryHook<T[K]>;
    useMutation: MutationHook<T[K]>;
  };
};

function createRouterHooks<T extends ProcedureTable>(
  namespace: string,
  procedures: T
) {
  return Object.fromEntries(
    Object.entries(procedures).map(([name, resolve]) => [
      name,
      {
        useQuery(input?: unknown, options?: Record<string, unknown>) {
          return useQuery({
            queryKey: [namespace, name, input ?? null],
            queryFn: () => resolve(input),
            ...options,
          });
        },
        useMutation(options?: Record<string, unknown>) {
          return useMutation({
            mutationFn: (input: unknown) => resolve(input),
            ...options,
          });
        },
      },
    ])
  ) as RouterHooks<T>;
}

type RouterUtils<T extends ProcedureTable> = {
  [K in keyof T]: {
    /** Omit `input` to invalidate every cached call of this procedure. */
    invalidate: (input?: Parameters<T[K]>[0]) => Promise<void>;
    fetch: (input?: Parameters<T[K]>[0]) => Promise<Awaited<ReturnType<T[K]>>>;
  };
};

function createRouterUtils<T extends ProcedureTable>(
  queryClient: QueryClient,
  namespace: string,
  procedures: T
) {
  return Object.fromEntries(
    Object.entries(procedures).map(([name, resolve]) => [
      name,
      {
        invalidate: (input?: unknown) =>
          queryClient.invalidateQueries({
            queryKey:
              input === undefined
                ? [namespace, name]
                : [namespace, name, input],
          }),
        fetch: (input?: unknown) =>
          queryClient.fetchQuery({
            queryKey: [namespace, name, input ?? null],
            queryFn: () => resolve(input),
          }),
      },
    ])
  ) as RouterUtils<T>;
}

// ----------------------------------------------------------------- auth router

async function resolveMe(): Promise<UserProfile | null> {
  return auth.currentUser ? loadOrCreateProfile(auth.currentUser) : null;
}

const authRouter = {
  me: {
    /**
     * Keyed on the signed-in uid so the profile is refetched on sign-in and
     * dropped on sign-out. The old tRPC client got this for free because
     * `auth.me` was an HTTP call carrying a bearer token; here the identity has
     * to be part of the cache key explicitly.
     */
    useQuery(
      _input?: undefined,
      options?: Omit<
        UseQueryOptions<UserProfile | null, Error>,
        "queryKey" | "queryFn"
      >
    ) {
      const { user } = useAuth();
      return useQuery({
        queryKey: ["auth", "me", user?.uid ?? null],
        queryFn: resolveMe,
        ...options,
      });
    },
  },
  bootstrapProfile: {
    useMutation(
      options?: Omit<
        UseMutationOptions<
          UserProfile | null,
          Error,
          { role: SelfAssignableRole; name?: string; district?: string }
        >,
        "mutationFn"
      >
    ) {
      return useMutation({
        mutationFn: (input: {
          role: SelfAssignableRole;
          name?: string;
          district?: string;
        }) => {
          const user = requireUser();
          return updateUserProfile(user, input);
        },
        ...options,
      });
    },
  },
  /**
   * For the settings/account pages: updates the account's own profile fields.
   * Keeps Firebase Auth's `displayName` in sync with the Firestore `name`
   * field whenever the caller updates it, since AccountMenu and other UI
   * read the Firebase Auth user object directly for the avatar/name.
   */
  updateProfile: {
    useMutation(
      options?: Omit<
        UseMutationOptions<
          UserProfile | null,
          Error,
          {
            name?: string;
            phone?: string;
            district?: string;
            notificationPreferences?: NotificationPreferences;
          }
        >,
        "mutationFn"
      >
    ) {
      return useMutation({
        mutationFn: async (input: {
          name?: string;
          phone?: string;
          district?: string;
          notificationPreferences?: NotificationPreferences;
        }) => {
          const user = requireUser();
          if (input.name !== undefined)
            await updateDisplayName(user, input.name);
          return updateUserProfile(user, input);
        },
        ...options,
      });
    },
  },
  /**
   * The real, signed-up `users/{uid}` accounts. Only resolves for the admin
   * custom claim — `firestore.rules` rejects an unfiltered read of this
   * collection for anyone else, so this must stay behind an admin-only route.
   */
  allUsers: {
    useQuery(
      _input?: undefined,
      options?: Omit<
        UseQueryOptions<UserProfile[], Error>,
        "queryKey" | "queryFn"
      >
    ) {
      const { user } = useAuth();
      return useQuery({
        queryKey: ["auth", "allUsers", user?.uid ?? null],
        queryFn: listAllUserProfiles,
        enabled: !!user,
        ...options,
      });
    },
  },
};

// --------------------------------------------------------------- public client

const workflowRouter = createRouterHooks("workflow", workflowProcedures);

export const trpc = {
  workflow: workflowRouter,
  auth: authRouter,
  useUtils() {
    const queryClient = useQueryClient();
    return {
      workflow: createRouterUtils(queryClient, "workflow", workflowProcedures),
      auth: {
        me: {
          invalidate: () =>
            queryClient.invalidateQueries({ queryKey: ["auth", "me"] }),
          fetch: () =>
            queryClient.fetchQuery({
              queryKey: ["auth", "me", auth.currentUser?.uid ?? null],
              queryFn: resolveMe,
            }),
        },
      },
    };
  },
};
