/** Style: Samadhan public case record — persisted evidence, workflow timeline, and civic support. */
import PublicPortalHeader from "@/components/PublicPortalHeader";
import { AuthRequiredDialog } from "@/components/AuthRequiredDialog";
import { LedgerSeal } from "@/components/LedgerSeal";
import { BeforeAfterEvidence } from "@/components/BeforeAfterEvidence";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowLeft,
  ArrowUp,
  Bell,
  BellOff,
  Check,
  ChevronDown,
  CircleDot,
  ExternalLink,
  FileText,
  Flag,
  Loader2,
  MapPin,
  Pencil,
  ShieldCheck,
  Timer,
  UserCheck,
  XCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { useRoute } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { ChallengeLocationMap } from "@/components/ChallengeLocationMap";

export default function ChallengeDetail() {
  const { user, loading: authLoading } = useAuth();
  const [, params] = useRoute("/challenges/:id");
  const id = Number(params?.id ?? 0);
  const challengeInput = useMemo(() => ({ id: id || 1 }), [id]);
  const evidenceInput = useMemo(() => ({ challengeId: id || 1 }), [id]);
  const [organizationInput] = useState({});
  const challengeQuery = trpc.workflow.challengeById.useQuery(challengeInput, {
    enabled: id > 0,
  });
  const evidenceQuery = trpc.workflow.challengeEvidence.useQuery(
    evidenceInput,
    { enabled: id > 0 }
  );
  const organizationsQuery =
    trpc.workflow.organizations.useQuery(organizationInput);
  const assignmentsQuery = trpc.workflow.assignments.useQuery(
    { challengeId: id || 1 },
    { enabled: id > 0 }
  );
  const projectsQuery = trpc.workflow.projects.useQuery(
    { challengeId: id || 1 },
    { enabled: id > 0 }
  );
  const project = projectsQuery.data?.[0];
  const projectInput = useMemo(
    () => ({ projectId: project?.id || 1 }),
    [project?.id]
  );
  const activitiesQuery = trpc.workflow.projectActivities.useQuery(
    projectInput,
    { enabled: (project?.id ?? 0) > 0 }
  );
  const closeoutsQuery = trpc.workflow.projectCloseouts.useQuery(projectInput, {
    enabled: (project?.id ?? 0) > 0,
  });
  const documentsQuery = trpc.workflow.projectDocuments.useQuery(projectInput, {
    enabled: (project?.id ?? 0) > 0,
  });
  const utils = trpc.useUtils();
  const meQuery = trpc.auth.me.useQuery(undefined, { enabled: !!user });
  const supportsQuery = trpc.workflow.challengeSupports.useQuery(
    { supporterEmail: user?.email ?? "" },
    { enabled: !!user?.email }
  );
  const challenge = challengeQuery.data;
  const myOrganizationId = meQuery.data?.organizationId ?? null;
  const myOrganization =
    (myOrganizationId &&
      organizationsQuery.data?.find(o => o.id === myOrganizationId)) ??
    null;
  const isInstitution = meQuery.data?.role === "institution";
  const isOwner =
    !!user?.email &&
    !!challenge?.citizenEmail &&
    user.email.toLowerCase() === challenge.citizenEmail.toLowerCase();
  const myAssignment = (assignmentsQuery.data ?? []).find(
    a => a.organizationId === myOrganizationId
  );
  const enrollMutation = trpc.workflow.enrollChallenge.useMutation({
    onSuccess: () => {
      void utils.workflow.assignments.invalidate({ challengeId: id || 1 });
      toast.success("Enrolled successfully", {
        description: "Find it in your institute dashboard to start delivery.",
      });
    },
    onError: error => {
      toast.error("Couldn't enroll", { description: error.message });
    },
  });
  function handleEnroll() {
    if (!challenge || !myOrganizationId || !myOrganization) return;
    enrollMutation.mutate({
      challengeId: challenge.id,
      organizationId: myOrganizationId,
      organizationName: myOrganization.name,
    });
  }
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [optimisticUpvoted, setOptimisticUpvoted] = useState(false);
  const upvoteRecord = supportsQuery.data?.find(
    item => item.kind === "upvote" && item.challengeId === challenge?.id
  );
  const followRecord = supportsQuery.data?.find(
    item => item.kind === "follow" && item.challengeId === challenge?.id
  );
  const isUpvoted = !!upvoteRecord || optimisticUpvoted;
  const isFollowing = !!followRecord;
  const displayUpvotes =
    (challenge?.upvoteCount ?? 0) +
    (optimisticUpvoted && !upvoteRecord ? 1 : 0);

  const upvoteMutation = trpc.workflow.upvoteChallenge.useMutation({
    onSuccess: () => {
      void utils.workflow.challenges.invalidate();
      void utils.workflow.challengeSupports.invalidate({
        supporterEmail: user?.email ?? "",
      });
    },
    onError: error => {
      setOptimisticUpvoted(false);
      toast.error("Couldn't record your upvote", {
        description: error.message,
      });
    },
  });
  const unvoteMutation = trpc.workflow.unvoteChallenge.useMutation({
    onSuccess: () => {
      void utils.workflow.challenges.invalidate();
      void utils.workflow.challengeSupports.invalidate({
        supporterEmail: user?.email ?? "",
      });
    },
    onError: error => {
      setOptimisticUpvoted(true);
      toast.error("Couldn't remove your upvote", {
        description: error.message,
      });
    },
  });
  const followMutation = trpc.workflow.supportChallenge.useMutation({
    onSuccess: () =>
      void utils.workflow.challengeSupports.invalidate({
        supporterEmail: user?.email ?? "",
      }),
    onError: error =>
      toast.error("Couldn't update your follow", {
        description: error.message,
      }),
  });
  const unfollowMutation = trpc.workflow.deleteChallengeSupport.useMutation({
    onSuccess: () =>
      void utils.workflow.challengeSupports.invalidate({
        supporterEmail: user?.email ?? "",
      }),
    onError: error =>
      toast.error("Couldn't update your follow", {
        description: error.message,
      }),
  });

  function requireAuth() {
    if (authLoading) return false;
    if (!user?.email) {
      setAuthPromptOpen(true);
      return false;
    }
    return true;
  }
  function handleUpvote() {
    if (
      !challenge ||
      !requireAuth() ||
      upvoteMutation.isPending ||
      unvoteMutation.isPending
    )
      return;
    // If already upvoted, unvote
    if (isUpvoted) {
      setOptimisticUpvoted(false);
      unvoteMutation.mutate({
        challengeId: challenge.id,
        supporterEmail: user!.email!,
      });
      return;
    }
    setOptimisticUpvoted(true);
    upvoteMutation.mutate({
      challengeId: challenge.id,
      supporterEmail: user!.email!,
    });
  }
  function handleFollowToggle() {
    if (!challenge || !requireAuth()) return;
    if (followRecord) unfollowMutation.mutate({ id: followRecord.id });
    else
      followMutation.mutate({
        challengeId: challenge.id,
        supporterEmail: user!.email!,
        kind: "follow",
      });
  }
  return (
    <main
      className="min-h-screen bg-[#f1eadc] text-[#0c3023]"
      style={{
        backgroundImage: "url('/images/samadhan-paper-grain_46302c3f.jpg')",
        backgroundSize: "cover",
      }}
    >
      <PublicPortalHeader />
      {challengeQuery.isLoading ? (
        <Loading />
      ) : challengeQuery.isError ? (
        <Failure
          message={challengeQuery.error.message}
          retry={() => void challengeQuery.refetch()}
        />
      ) : !challenge ? (
        <Empty label="Challenge record not found." />
      ) : (
        <div className="lg:grid lg:grid-cols-[minmax(0,1.54fr)_minmax(25rem,0.96fr)]">
          <section className="px-6 py-9 sm:px-10 lg:min-h-[calc(100vh-84px)] lg:border-r lg:border-[#a78e6e]/45 lg:px-[3.3rem] lg:py-8">
            <div className="max-w-[51rem]">
              <a
                href="/challenges"
                className="inline-flex items-center gap-2 font-body text-[0.78rem] font-medium text-[#26483a] hover:text-[#c44822]"
              >
                <ArrowLeft size={18} />
                Back to all challenges
              </a>
              <p className="mt-10 font-mono-ui text-[0.66rem] font-semibold uppercase tracking-[0.15em] text-[#436a54]">
                {challenge.domain}
              </p>
              <h1 className="mt-5 max-w-[48rem] font-display text-[3.8rem] font-medium leading-[0.84] tracking-[-0.04em] sm:text-[5.15rem] xl:text-[5.8rem]">
                {challenge.title}
              </h1>
              <div className="mt-5 h-[2px] w-12 bg-[#c94c23]" />
              <p className="mt-6 max-w-[49rem] whitespace-pre-wrap font-body text-[0.97rem] leading-[1.7] text-[#3d544b] sm:text-[1.03rem]">
                {challenge.description}
              </p>
              <div className="mt-7 flex flex-col gap-3 border-b border-[#aa9171]/45 pb-7 font-body text-[0.8rem] text-[#455b52] sm:flex-row sm:items-center">
                <span className="inline-flex items-center gap-2 sm:pr-6">
                  <MapPin size={17} />
                  {challenge.district}
                </span>
                <span className="inline-flex items-center gap-2 sm:border-l sm:border-[#aa9171]/45 sm:px-6">
                  Submitted on{" "}
                  {challenge.createdAt
                    ? new Date(challenge.createdAt).toLocaleDateString()
                    : "—"}
                </span>
                <span className="inline-flex items-center gap-2 sm:border-l sm:border-[#aa9171]/45 sm:pl-6">
                  Record {challenge.id}
                </span>
              </div>
              <section className="mt-6 border-b border-[#aa9171]/45 pb-6">
                <ChallengeLocationMap
                  latitude={challenge.latitude}
                  longitude={challenge.longitude}
                  district={challenge.district}
                />
              </section>
              <section className="mt-6 border-b border-[#aa9171]/45 pb-6">
                <p className="font-mono-ui text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[#304c40]">
                  Evidence
                </p>
                {evidenceQuery.isLoading ? (
                  <p className="mt-4 font-body text-[0.78rem] text-[#607168]">
                    Loading evidence…
                  </p>
                ) : evidenceQuery.isError ? (
                  <Failure
                    message={evidenceQuery.error.message}
                    retry={() => void evidenceQuery.refetch()}
                  />
                ) : (evidenceQuery.data ?? []).length === 0 ? (
                  <p className="mt-4 font-body text-[0.78rem] text-[#607168]">
                    No evidence files have been attached to this report.
                  </p>
                ) : (
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {evidenceQuery.data?.map(evidence => (
                      <a
                        key={evidence.id}
                        href={evidence.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="group relative block overflow-hidden border border-[#a58c6d]/55 bg-[#ebe0cc]"
                      >
                        {evidence.mimeType?.startsWith("image/") &&
                        evidence.fileUrl ? (
                          <div className="aspect-[4/3] overflow-hidden">
                            <img
                              src={evidence.fileUrl}
                              alt={evidence.fileName}
                              loading="lazy"
                              className="size-full object-cover grayscale-[0.1] sepia-[0.08] transition duration-300 group-hover:scale-105 group-hover:grayscale-0 group-hover:sepia-0"
                            />
                          </div>
                        ) : (
                          <div className="flex aspect-[4/3] items-center justify-center bg-[#f1eadc]">
                            <FileText size={32} className="text-[#9d876a]" />
                          </div>
                        )}
                        <div className="p-3">
                          <p className="font-body text-[0.72rem] font-semibold text-[#334c41]">
                            {evidence.fileName}
                          </p>
                          <p className="mt-1 font-mono-ui text-[0.5rem] uppercase tracking-[0.08em] text-[#64776d]">
                            {evidence.mimeType || "Evidence file"}
                          </p>
                        </div>
                        <ExternalLink
                          className="absolute right-2 top-2 text-[#bd4b25] opacity-0 transition-opacity group-hover:opacity-100"
                          size={14}
                        />
                      </a>
                    ))}
                  </div>
                )}
              </section>
              <section className="mt-7 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="grid size-12 place-items-center rounded-full bg-[#163e2d] font-display text-[1.1rem] text-[#edf0db]">
                    {challenge.citizenName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-mono-ui text-[0.63rem] font-semibold uppercase tracking-[0.14em] text-[#304c40]">
                      Submitted by
                    </p>
                    <p className="mt-1 font-display text-[1.4rem] leading-none">
                      {challenge.citizenName}
                    </p>
                    <p className="mt-1 font-body text-[0.74rem] text-[#50675d]">
                      Citizen report · {challenge.district}
                    </p>
                  </div>
                </div>
                {isOwner && (
                  <motion.a
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.96 }}
                    href={`/citizen/challenges/${challenge.id}`}
                    className="rounded-full inline-flex shrink-0 items-center gap-1.5 border border-[#c94a20]/60 px-4 py-2.5 font-mono-ui text-[0.56rem] font-semibold uppercase tracking-[0.08em] text-[#bd4a26] transition hover:bg-[#f7e2d6]/50"
                  >
                    <Pencil size={13} />
                    Edit report
                  </motion.a>
                )}
              </section>
            </div>
          </section>
          <aside className="bg-[#eee5d5]/42 px-6 py-10 sm:px-10 lg:px-[3.25rem] lg:py-8">
            <div className="mx-auto max-w-[31rem]">
              <ImpactTimeline
                challenge={challenge}
                organizations={organizationsQuery.data ?? []}
                assignments={assignmentsQuery.data ?? []}
                project={project}
                activities={activitiesQuery.data ?? []}
                closeouts={closeoutsQuery.data ?? []}
                documents={documentsQuery.data ?? []}
                isOwner={isOwner}
              />
              {project && (
                <div className="mt-7">
                  <LedgerSeal projectId={project.id} />
                </div>
              )}
              <InstitutionStatusPanel
                assignments={assignmentsQuery.data ?? []}
                organizations={organizationsQuery.data ?? []}
                project={project}
                isError={assignmentsQuery.isError || organizationsQuery.isError}
                onRetry={() => {
                  void assignmentsQuery.refetch();
                  void organizationsQuery.refetch();
                }}
              />
              {isInstitution && (
                <section className="mt-7 border border-[#a58c6d]/55 bg-[#f8f2e8]/45 p-5">
                  <p className="font-mono-ui text-[0.63rem] font-semibold uppercase tracking-[0.13em] text-[#304b40]">
                    Institution enrollment
                  </p>
                  {!myOrganizationId || !myOrganization ? (
                    <p className="mt-3 font-body text-[0.76rem] text-[#934325]">
                      Complete your institution profile to enroll for
                      challenges.
                    </p>
                  ) : myAssignment ? (
                    <div className="mt-4 border border-[#7c9a7b]/60 bg-[#e7eee0]/45 p-4">
                      <p className="font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-[#3a6b4a]">
                        {myAssignment.selfEnrolled
                          ? "You enrolled"
                          : "Assigned"}{" "}
                        · {myAssignment.status.replaceAll("_", " ")}
                      </p>
                      <p className="mt-2 font-body text-[0.75rem] text-[#4f675a]">
                        {myAssignment.status === "pending"
                          ? myAssignment.selfEnrolled
                            ? "Your enrollment is pending review. You can start delivery after accepting."
                            : "Review your assignment in the institute workspace."
                          : "Continue managing your delivery project."}
                      </p>
                      <a
                        href={`/institute/challenges/${challenge.id}`}
                        className="rounded-full mt-4 inline-block bg-[#16422f] px-4 py-3 font-mono-ui text-[0.58rem] font-semibold uppercase tracking-[0.1em] text-white"
                      >
                        Open in institute workspace
                      </a>
                    </div>
                  ) : (
                    <>
                      <p className="mt-3 font-body text-[0.76rem] leading-relaxed text-[#5c7066]">
                        Enroll your institution to take up this challenge. It
                        will appear in your{" "}
                        <a
                          href="/institute/challenges"
                          className="font-semibold text-[#c94a20] hover:underline"
                        >
                          institute queue
                        </a>{" "}
                        and you can create a delivery project from the review
                        page.
                      </p>
                      {myOrganization.verificationStatus !== "verified" ? (
                        <p className="mt-4 border border-[#bd5a38]/60 bg-[#f7e2d6]/35 p-3 font-body text-[0.76rem] text-[#934325]">
                          Only verified institutions may enroll. Your profile is
                          currently {myOrganization.verificationStatus}.
                        </p>
                      ) : (
                        <button
                          type="button"
                          disabled={enrollMutation.isPending}
                          onClick={handleEnroll}
                          className="rounded-full mt-4 flex w-full items-center justify-center gap-2 bg-[#c94a20] px-4 py-3.5 font-mono-ui text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-white transition hover:bg-[#b8431d] disabled:opacity-60"
                        >
                          {enrollMutation.isPending ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <ShieldCheck size={16} />
                          )}
                          {enrollMutation.isPending
                            ? "Enrolling…"
                            : "Enroll for this challenge"}
                        </button>
                      )}
                    </>
                  )}
                </section>
              )}
              <section className="mt-7 bg-[#163e2d] p-6 text-[#f7f0e5]">
                <p className="font-mono-ui text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-[#f1c4a8]">
                  Support this challenge
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleUpvote}
                    disabled={
                      upvoteMutation.isPending || unvoteMutation.isPending
                    }
                    className={`flex items-center justify-center gap-2 border px-3 py-3.5 font-mono-ui text-[0.56rem] font-semibold uppercase tracking-[0.08em] transition ${isUpvoted ? "border-[#f1c4a8] bg-[#c94920] text-white hover:bg-[#a33a1a]" : "border-[#6e8a79] hover:bg-[#1f4e3a]"}`}
                  >
                    {upvoteMutation.isPending || unvoteMutation.isPending ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <ArrowUp size={14} />
                    )}
                    {isUpvoted ? "Unvote" : "Upvote"} · {displayUpvotes}
                  </button>
                  <button
                    type="button"
                    onClick={handleFollowToggle}
                    disabled={
                      followMutation.isPending || unfollowMutation.isPending
                    }
                    className={`flex items-center justify-center gap-2 border px-3 py-3.5 font-mono-ui text-[0.56rem] font-semibold uppercase tracking-[0.08em] transition disabled:cursor-default ${isFollowing ? "border-[#f1c4a8] bg-[#2d5f49]" : "border-[#6e8a79] hover:bg-[#1f4e3a]"}`}
                  >
                    {followMutation.isPending || unfollowMutation.isPending ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : isFollowing ? (
                      <BellOff size={14} />
                    ) : (
                      <Bell size={14} />
                    )}
                    {isFollowing ? "Following" : "Follow"}
                  </button>
                </div>
                <p className="mt-4 font-body text-[0.72rem] leading-relaxed text-[#cbd2c1]">
                  {user
                    ? "Recorded against your Samadhan account."
                    : "Sign in to upvote or follow this challenge."}
                </p>
              </section>
            </div>
          </aside>
          <AuthRequiredDialog
            open={authPromptOpen}
            onOpenChange={setAuthPromptOpen}
            description={
              challenge ? (
                <>
                  Create an account or log in to support{" "}
                  <strong className="font-semibold text-[#173d30]">
                    "{challenge.title}"
                  </strong>{" "}
                  and follow its progress.
                </>
              ) : (
                "Create an account or log in to continue."
              )
            }
          />
        </div>
      )}
    </main>
  );
}
type StatusAssignment = {
  id: number;
  organizationId: number;
  status: string;
  selfEnrolled?: boolean | null;
  createdAt: string | Date;
  updatedAt?: string | Date;
};
type StatusOrg = { id: number; name: string };
type StatusProject = {
  organizationId: number;
  progress: number;
  stage: string;
};

/**
 * Public "who's working on this" panel. Reads directly from `assignments` —
 * the real source of truth — rather than the denormalized (and, for
 * self-enrolled institutions, never-set) `challenge.assignedOrganizationId`
 * field, so it correctly reflects self-enrollment too.
 */
function InstitutionStatusPanel({
  assignments,
  organizations,
  project,
  isError,
  onRetry,
}: {
  assignments: StatusAssignment[];
  organizations: StatusOrg[];
  project?: StatusProject;
  isError: boolean;
  onRetry: () => void;
}) {
  const orgName = (id: number) =>
    organizations.find(o => o.id === id)?.name ?? "An institution";
  const accepted = assignments.filter(a => a.status === "accepted");
  const pending = assignments.filter(a => a.status === "pending");
  const leadAssignment = project
    ? (assignments.find(a => a.organizationId === project.organizationId) ??
      accepted[0])
    : accepted[0];
  const leadOrgId = project?.organizationId ?? leadAssignment?.organizationId;

  return (
    <section className="mt-7 border border-[#9e886b]/55 bg-[#f7f1e7]/45 p-5">
      <p className="font-mono-ui text-[0.63rem] font-semibold uppercase tracking-[0.13em] text-[#304b40]">
        Who's on it
      </p>
      {isError ? (
        <Failure
          message="Institution context could not load."
          retry={onRetry}
        />
      ) : (
        <AnimatePresence mode="wait">
          {leadOrgId ? (
            <motion.div
              key="active"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", bounce: 0.35 }}
              className="mt-4"
            >
              <div className="flex gap-4">
                <div className="relative grid size-[4.8rem] shrink-0 place-items-center rounded-full border border-[#547460]/60 bg-[#e2e7d0] text-[#214937]">
                  <ShieldCheck size={37} />
                  <span className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center">
                    <motion.span
                      className="absolute inline-flex size-4 rounded-full bg-[#2e6849]"
                      animate={{ scale: [1, 1.9], opacity: [0.6, 0] }}
                      transition={{
                        duration: 1.6,
                        repeat: Infinity,
                        ease: "easeOut",
                      }}
                    />
                    <span className="relative size-2.5 rounded-full border-2 border-[#f7f1e7] bg-[#2e6849]" />
                  </span>
                </div>
                <div>
                  <h2 className="font-display text-[1.55rem] leading-[0.95]">
                    {orgName(leadOrgId)}
                  </h2>
                  <span className="mt-3 inline-flex items-center gap-1.5 border border-[#7e977a] px-2 py-1 font-mono-ui text-[0.55rem] font-semibold uppercase tracking-[0.1em] text-[#395a3c]">
                    <span className="size-1.5 rounded-full bg-[#2e6849]" />
                    Actively working on it
                  </span>
                  {leadAssignment && (
                    <p className="mt-2 font-body text-[0.72rem] text-[#5c7066]">
                      Accepted{" "}
                      {leadAssignment.updatedAt
                        ? new Date(
                            leadAssignment.updatedAt
                          ).toLocaleDateString()
                        : ""}
                    </p>
                  )}
                </div>
              </div>
              {project && (
                <div className="mt-4">
                  <div className="flex items-center justify-between font-mono-ui text-[0.53rem] font-semibold uppercase tracking-[0.08em] text-[#5c7066]">
                    <span>{project.stage.replaceAll("_", " ")}</span>
                    <span>{project.progress}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#dcd1b8]">
                    <motion.div
                      className="h-full rounded-full bg-[#2e6849]"
                      initial={{ width: 0 }}
                      animate={{ width: `${project.progress}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </div>
                </div>
              )}
              {pending.length > 0 && (
                <p className="mt-3 font-body text-[0.7rem] text-[#7d8b83]">
                  +{pending.length} other institution
                  {pending.length > 1 ? "s" : ""} enrolled and waiting.
                </p>
              )}
            </motion.div>
          ) : pending.length > 0 ? (
            <motion.div
              key="pending"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4"
            >
              <p className="font-body text-[0.78rem] leading-relaxed text-[#5c7066]">
                {pending.length} institution
                {pending.length > 1 ? "s have" : " has"} enrolled and{" "}
                {pending.length > 1 ? "are" : "is"} awaiting review before
                delivery starts.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {pending.map((a, index) => (
                  <motion.span
                    key={a.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.08 }}
                    className="inline-flex items-center gap-1.5 border border-[#c79e7a]/60 bg-[#fef3e2]/60 px-2.5 py-1.5 font-mono-ui text-[0.55rem] font-semibold uppercase tracking-[0.08em] text-[#9b3e20]"
                  >
                    <Timer size={11} />
                    {orgName(a.organizationId)}
                  </motion.span>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.p
              key="none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-3 font-body text-[0.78rem] text-[#607168]"
            >
              No institution has picked this up yet — upvote or follow below to
              help it get noticed.
            </motion.p>
          )}
        </AnimatePresence>
      )}
    </section>
  );
}
type TimelineChallenge = {
  id: number;
  citizenName: string;
  status: string;
  createdAt: string | Date;
};
type TimelineOrg = { id: number; name: string };
type TimelineAssignment = {
  organizationId: number;
  adminName: string;
  status: string;
  selfEnrolled?: boolean | null;
  createdAt: string | Date;
  updatedAt?: string | Date;
};
type TimelineProject = {
  id: number;
  title: string;
  leadName: string;
  createdAt: string | Date;
};
type TimelineActivity = {
  id: number;
  type: string;
  title: string;
  actorName: string;
  createdAt: string | Date;
};
type TimelineCloseout = {
  outcomeSummary: string;
  submittedBy: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  citizenConfirmation: string;
  beforeEvidenceId?: number | null;
  afterEvidenceId?: number | null;
};
type TimelineDocument = {
  id: number;
  name: string;
  fileUrl?: string | null;
  mimeType?: string | null;
};
type TimelineEvent = {
  ts: number;
  /**
   * Position in the real workflow lifecycle (reported → enrolled/assigned →
   * accepted → project active → outcome submitted → disputed → resolved).
   * "Current status" is derived from the event with the highest `rank`, not
   * from whichever event happens to carry the numerically largest raw
   * timestamp — cross-collection timestamps (challenge vs. assignment vs.
   * project) can't be trusted to always agree on ordering (clock skew,
   * backfilled/edited records, etc.), but the workflow state itself always
   * knows what stage a challenge is really in. Same `rank` ties are broken
   * by timestamp.
   */
  rank: number;
  icon: React.ReactNode;
  label: React.ReactNode;
  sub?: string;
  tone?: "good" | "bad";
  actionHref?: string;
  actionLabel?: string;
};

/** Never let a bad/missing timestamp corrupt the chronological sort — an
 * event with an unparsable date sinks to the very start rather than
 * silently breaking Array.sort's ordering guarantees (a NaN comparator
 * result is undefined behaviour in the spec). */
function safeTs(value: string | Date | undefined | null): number {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : 0;
}

const relativeTimeFormatter = new Intl.RelativeTimeFormat("en", {
  numeric: "auto",
});
const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31536000],
  ["month", 2592000],
  ["week", 604800],
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
];
function formatRelative(ts: number): string {
  if (!ts) return "";
  const diffSeconds = Math.round((ts - Date.now()) / 1000);
  for (const [unit, secondsInUnit] of RELATIVE_UNITS) {
    if (Math.abs(diffSeconds) >= secondsInUnit) {
      return relativeTimeFormatter.format(
        Math.round(diffSeconds / secondsInUnit),
        unit
      );
    }
  }
  return relativeTimeFormatter.format(diffSeconds, "second");
}
function formatExact(ts: number): string {
  if (!ts) return "";
  return new Date(ts).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function ImpactTimeline({
  challenge,
  organizations,
  assignments,
  project,
  activities,
  closeouts,
  documents,
  isOwner,
}: {
  challenge: TimelineChallenge;
  organizations: TimelineOrg[];
  assignments: TimelineAssignment[];
  project?: TimelineProject;
  activities: TimelineActivity[];
  closeouts: TimelineCloseout[];
  documents: TimelineDocument[];
  isOwner: boolean;
}) {
  // All of `assignments`/`activities`/`closeouts` come back from `db.ts`'s
  // `listCollection` newest-first (see `sortByCreatedAtDesc`), so anything
  // that assumes array order — e.g. picking `[0]` as "the first one" — is
  // silently picking the *most recent* record instead. Every array here is
  // explicitly re-sorted ascending before use, and every event pushed below
  // carries a real timestamp; the final `events.sort()` is what actually
  // determines render order, not push order.
  const sortedCloseouts = [...closeouts].sort(
    (a, b) => safeTs(a.createdAt) - safeTs(b.createdAt)
  );
  const sortedAssignments = [...assignments].sort(
    (a, b) => safeTs(a.createdAt) - safeTs(b.createdAt)
  );
  const events: TimelineEvent[] = [
    {
      ts: safeTs(challenge.createdAt),
      rank: 0,
      icon: <Check size={12} />,
      label: "Reported",
      sub: `by ${challenge.citizenName}`,
    },
  ];
  for (const assignment of sortedAssignments) {
    const org = organizations.find(o => o.id === assignment.organizationId);
    const orgName = org?.name ?? "An institution";
    events.push({
      ts: safeTs(assignment.createdAt),
      rank: 1,
      icon: <Check size={12} />,
      label: assignment.selfEnrolled
        ? `${orgName} enrolled`
        : `Assigned to ${orgName}`,
      sub: assignment.selfEnrolled
        ? "Self-enrolled by the institution"
        : `by ${assignment.adminName}`,
    });
    if (assignment.status === "accepted" || assignment.status === "declined") {
      events.push({
        ts: safeTs(assignment.updatedAt),
        rank: assignment.status === "accepted" ? 2 : 1,
        icon:
          assignment.status === "accepted" ? (
            <UserCheck size={12} />
          ) : (
            <XCircle size={12} />
          ),
        label:
          assignment.status === "accepted"
            ? `${orgName} accepted the assignment`
            : `${orgName} declined the assignment`,
        tone: assignment.status === "accepted" ? "good" : "bad",
      });
    }
  }
  if (project) {
    events.push({
      ts: safeTs(project.createdAt),
      rank: 3,
      icon: <Flag size={12} />,
      label: `Project started: ${project.title}`,
      sub: `Led by ${project.leadName}`,
    });
  }
  for (const activity of activities.filter(a => a.type !== "closeout")) {
    events.push({
      ts: safeTs(activity.createdAt),
      rank: 3,
      icon: <CircleDot size={12} />,
      label: activity.title,
      sub: `by ${activity.actorName}`,
    });
  }
  const latestCloseout = sortedCloseouts[sortedCloseouts.length - 1];
  const before = latestCloseout
    ? documents.find(doc => doc.id === latestCloseout.beforeEvidenceId)
    : undefined;
  const after = latestCloseout
    ? documents.find(doc => doc.id === latestCloseout.afterEvidenceId)
    : undefined;
  sortedCloseouts.forEach((closeout, roundIndex) => {
    const round = roundIndex + 1;
    const roundLabel = sortedCloseouts.length > 1 ? ` (round ${round})` : "";
    const isLatestRound = roundIndex === sortedCloseouts.length - 1;
    events.push({
      ts: safeTs(closeout.createdAt),
      rank: 4,
      icon: <FileText size={12} />,
      label: `Outcome submitted${roundLabel}: ${closeout.outcomeSummary.slice(0, 70)}${closeout.outcomeSummary.length > 70 ? "…" : ""}`,
      sub: `Submitted by ${closeout.submittedBy}`,
      actionHref:
        isOwner && isLatestRound && closeout.citizenConfirmation === "pending"
          ? `/citizen/challenges/${challenge.id}/closeout`
          : undefined,
      actionLabel: "Respond to this outcome →",
    });
    if (closeout.citizenConfirmation !== "pending") {
      events.push({
        ts: safeTs(closeout.updatedAt),
        rank: closeout.citizenConfirmation === "confirmed" ? 6 : 5,
        icon:
          closeout.citizenConfirmation === "confirmed" ? (
            <UserCheck size={12} />
          ) : (
            <XCircle size={12} />
          ),
        label:
          closeout.citizenConfirmation === "confirmed"
            ? "Citizen confirmed it's fixed"
            : `Citizen said it wasn't fixed${roundLabel}`,
        tone: closeout.citizenConfirmation === "confirmed" ? "good" : "bad",
      });
    }
  });
  // The list itself always reads oldest → newest by real timestamp (a
  // faithful "what happened when" record). "Current status" below is a
  // separate computation — see the `rank` doc comment on `TimelineEvent`.
  events.sort((a, b) => a.ts - b.ts);
  const currentEvent = events.reduce<TimelineEvent | undefined>(
    (best, event) =>
      !best ||
      event.rank > best.rank ||
      (event.rank === best.rank && event.ts >= best.ts)
        ? event
        : best,
    undefined
  );

  return (
    <section>
      <div className="flex items-center justify-between">
        <p className="font-mono-ui text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[#314a40]">
          Public impact ledger
        </p>
        <span
          className={`border px-2 py-0.5 font-mono-ui text-[0.53rem] font-semibold uppercase tracking-[0.08em] ${
            challenge.status === "resolved"
              ? "border-[#8fa887]/60 bg-[#e6ede3]/50 text-[#3a6b4a]"
              : "border-[#a58c6d]/50 bg-[#f1eadc] text-[#64776d]"
          }`}
        >
          {challenge.status.replaceAll("_", " ")}
        </span>
      </div>
      {currentEvent && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-4 flex items-center gap-3 border p-3.5 ${
            currentEvent.tone === "bad"
              ? "border-[#bd5a38]/50 bg-[#f7e2d6]/35"
              : "border-[#8fa887]/55 bg-[#e6ede3]/45"
          }`}
        >
          <span className="relative grid size-3 shrink-0 place-items-center">
            <motion.span
              className={`absolute inline-flex size-3 rounded-full ${
                currentEvent.tone === "bad" ? "bg-[#a84626]" : "bg-[#2e6849]"
              }`}
              animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
            />
            <span
              className={`relative size-2 rounded-full ${
                currentEvent.tone === "bad" ? "bg-[#a84626]" : "bg-[#2e6849]"
              }`}
            />
          </span>
          <div className="min-w-0">
            <p className="font-mono-ui text-[0.5rem] font-semibold uppercase tracking-[0.08em] text-[#7d8b83]">
              Current status
            </p>
            <p className="truncate font-body text-[0.85rem] font-semibold text-[#2d443a]">
              {currentEvent.label}
            </p>
          </div>
          <span className="ml-auto shrink-0 font-mono-ui text-[0.55rem] uppercase tracking-[0.06em] text-[#7d8b83]">
            {formatRelative(currentEvent.ts)}
          </span>
        </motion.div>
      )}
      <TimelineList events={events} currentEvent={currentEvent} />
      {latestCloseout && (before || after) && (
        <div className="pl-9">
          <BeforeAfterEvidence before={before} after={after} className="mt-2" />
        </div>
      )}
    </section>
  );
}
function TimelineList({
  events,
  currentEvent,
}: {
  events: TimelineEvent[];
  currentEvent?: TimelineEvent;
}) {
  const currentIndex = currentEvent ? events.indexOf(currentEvent) : -1;
  const [expanded, setExpanded] = useState<number | null>(
    currentIndex >= 0 ? currentIndex : events.length - 1
  );
  return (
    <ol className="relative mt-6 pl-9">
      <motion.div
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{
          duration: Math.min(0.15 * events.length, 1.4),
          ease: "easeOut",
        }}
        style={{ originY: 0 }}
        className="absolute bottom-0 left-0 top-0 w-px bg-[#7e8575]/60"
      />
      {events.map((event, index) => {
        const isLatest = event === currentEvent;
        const isOpen = expanded === index;
        return (
          <motion.li
            key={index}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: index * 0.09 }}
            className="relative pb-6 last:pb-1"
          >
            <span className="absolute -left-[2.66rem] top-0 grid size-5 place-items-center">
              {isLatest && (
                <motion.span
                  className={`absolute inline-flex size-5 rounded-full ${
                    event.tone === "bad" ? "bg-[#a84626]" : "bg-[#2e6849]"
                  }`}
                  animate={{ scale: [1, 1.7], opacity: [0.55, 0] }}
                  transition={{
                    duration: 1.6,
                    repeat: Infinity,
                    ease: "easeOut",
                  }}
                />
              )}
              <span
                className={`relative grid size-5 place-items-center rounded-full border-2 text-white ${
                  event.tone === "bad"
                    ? "border-[#a84626] bg-[#a84626]"
                    : "border-[#2e6849] bg-[#2e6849]"
                }`}
              >
                {event.icon}
              </span>
            </span>
            <button
              type="button"
              onClick={() => setExpanded(isOpen ? null : index)}
              className="group flex w-full items-start justify-between gap-3 rounded-sm px-2 py-1 -ml-2 text-left transition-colors hover:bg-[#e9dfc9]/50"
            >
              <p className="font-body text-[0.92rem] font-medium text-[#2d443a]">
                {event.label}
              </p>
              <span className="mt-0.5 flex shrink-0 items-center gap-1.5 font-mono-ui text-[0.53rem] uppercase tracking-[0.06em] text-[#8a9089]">
                {formatRelative(event.ts)}
                <motion.span
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-[#a58c6d]"
                >
                  <ChevronDown size={12} />
                </motion.span>
              </span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden px-2"
                >
                  {event.sub && (
                    <p className="mt-1 font-body text-[0.75rem] text-[#607168]">
                      {event.sub}
                    </p>
                  )}
                  <p className="mt-1 font-mono-ui text-[0.52rem] uppercase tracking-[0.06em] text-[#a1998a]">
                    {formatExact(event.ts)}
                  </p>
                  {event.actionHref && (
                    <a
                      href={event.actionHref}
                      className="mt-2 inline-block font-body text-[0.76rem] font-semibold text-[#bd4a26] hover:underline"
                    >
                      {event.actionLabel}
                    </a>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.li>
        );
      })}
    </ol>
  );
}
function Loading() {
  return (
    <div className="grid min-h-[60vh] place-items-center font-body text-[#52675d]">
      <span className="flex items-center gap-3">
        <Loader2 className="animate-spin" size={20} />
        Loading challenge record…
      </span>
    </div>
  );
}
function Empty({ label }: { label: string }) {
  return (
    <div className="grid min-h-[60vh] place-items-center px-6 text-center font-display text-[2.4rem]">
      {label}
    </div>
  );
}
function Failure({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div
      role="alert"
      className="mt-5 border border-[#bd5a38]/60 bg-[#f7e2d6]/35 p-5"
    >
      <p className="font-body text-[0.76rem] text-[#934325]">{message}</p>
      <button
        type="button"
        onClick={retry}
        className="rounded-full mt-3 border border-[#bd5a38]/60 px-3 py-2 font-mono-ui text-[0.54rem] font-semibold uppercase tracking-[0.08em] text-[#a54426]"
      >
        Retry
      </button>
    </div>
  );
}
