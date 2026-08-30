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
  updateAssignment: (input: { id: number } & Record<string, unknown>) => {
    const { id, ...details } = input;
    return db.updateAssignment(id, details);
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

  createNotification: (input: {
    recipientEmail: string;
    title: string;
    body: string;
    href?: string;
  }) => db.createNotification(input),
  notifications: (input: { recipientEmail: string }) =>
    db.listNotifications(input.recipientEmail),
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
