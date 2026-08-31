/** Style: Samadhan public case record — persisted evidence, workflow timeline, and civic support. */
import PublicPortalHeader from "@/components/PublicPortalHeader";
import { AuthRequiredDialog } from "@/components/AuthRequiredDialog";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowLeft,
  ArrowUp,
  Bell,
  BellOff,
  Check,
  CircleDot,
  ExternalLink,
  FileText,
  Loader2,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useRoute } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { ChallengeLocationMap } from "@/components/ChallengeLocationMap";

const stages = [
  "submitted",
  "under_review",
  "assigned",
  "in_progress",
  "resolved",
];
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
  const utils = trpc.useUtils();
  const supportsQuery = trpc.workflow.challengeSupports.useQuery(
    { supporterEmail: user?.email ?? "" },
    { enabled: !!user?.email }
  );
  const challenge = challengeQuery.data;
  const organization = organizationsQuery.data?.find(
    item => item.id === challenge?.assignedOrganizationId
  );
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
    if (!challenge || !requireAuth() || upvoteMutation.isPending || unvoteMutation.isPending)
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
                            <FileText
                              size={32}
                              className="text-[#9d876a]"
                            />
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
              <section className="mt-7 flex items-center gap-4">
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
              </section>
            </div>
          </section>
          <aside className="bg-[#eee5d5]/42 px-6 py-10 sm:px-10 lg:px-[3.25rem] lg:py-8">
            <div className="mx-auto max-w-[31rem]">
              <Timeline status={challenge.status} />
              <section className="mt-7 border border-[#9e886b]/55 bg-[#f7f1e7]/45 p-5">
                <p className="font-mono-ui text-[0.63rem] font-semibold uppercase tracking-[0.13em] text-[#304b40]">
                  Assigned institution
                </p>
                {organizationsQuery.isError ? (
                  <Failure
                    message="Institution context could not load."
                    retry={() => void organizationsQuery.refetch()}
                  />
                ) : organization ? (
                  <div className="mt-4 flex gap-4">
                    <div className="grid size-[4.8rem] shrink-0 place-items-center rounded-full border border-[#547460]/60 bg-[#e2e7d0] text-[#214937]">
                      <ShieldCheck size={37} />
                    </div>
                    <div>
                      <h2 className="font-display text-[1.55rem] leading-[0.95]">
                        {organization.name}
                      </h2>
                      <span className="mt-3 inline-block border border-[#7e977a] px-2 py-1 font-mono-ui text-[0.55rem] font-semibold uppercase tracking-[0.1em] text-[#395a3c]">
                        Technical partner
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 font-body text-[0.78rem] text-[#607168]">
                    An institution has not been assigned yet.
                  </p>
                )}
              </section>
              <section className="mt-7 bg-[#163e2d] p-6 text-[#f7f0e5]">
                <p className="font-mono-ui text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-[#f1c4a8]">
                  Support this challenge
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleUpvote}
                    disabled={upvoteMutation.isPending || unvoteMutation.isPending}
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
function Timeline({ status }: { status: string }) {
  const active = Math.max(0, stages.indexOf(status));
  return (
    <section>
      <p className="font-mono-ui text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[#314a40]">
        Status timeline
      </p>
      <ol className="relative mt-6 border-l border-[#7e8575]/60 pl-9">
        {stages.map((item, index) => (
          <li key={item} className="relative pb-6 last:pb-1">
            <span
              className={`absolute -left-[2.66rem] top-0 grid size-5 place-items-center rounded-full border-2 ${index < active ? "border-[#2e6849] bg-[#2e6849] text-white" : index === active ? "border-[#c64b23] bg-[#f1eadc] text-[#c64b23]" : "border-[#858b7d] bg-[#f1eadc] text-transparent"}`}
            >
              {index < active ? (
                <Check size={12} />
              ) : index === active ? (
                <CircleDot size={12} />
              ) : null}
            </span>
            <p
              className={`font-body text-[0.92rem] font-medium ${index === active ? "text-[#bd4b27]" : "text-[#2d443a]"}`}
            >
              {item.replaceAll("_", " ")}
            </p>
            <p className="mt-1 font-body text-[0.75rem] text-[#607168]">
              {index <= active ? "Recorded in the workflow" : "Pending"}
            </p>
          </li>
        ))}
      </ol>
    </section>
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
