import InstituteHeader from "@/components/InstituteHeader";
import { ChevronRight, Loader2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function InstituteChallenges() {
  const [input] = useState({});
  const organizationsQuery = trpc.workflow.organizations.useQuery(input);
  const assignmentsQuery = trpc.workflow.assignments.useQuery(input);
  const challengesQuery = trpc.workflow.challenges.useQuery(input);
  const [organizationId, setOrganizationId] = useState<number | null>(null);
  const institutions = useMemo(
    () =>
      (organizationsQuery.data ?? []).filter(
        item => item.kind === "institution"
      ),
    [organizationsQuery.data]
  );
  useEffect(() => {
    if (!organizationId && institutions[0])
      setOrganizationId(institutions[0].id);
  }, [organizationId, institutions]);
  const utils = trpc.useUtils();
  const queue = useMemo(
    () =>
      (assignmentsQuery.data ?? [])
        .filter(
          assignment =>
            !organizationId || assignment.organizationId === organizationId
        )
        .map(assignment => ({
          assignment,
          challenge: (challengesQuery.data ?? []).find(
            challenge => challenge.id === assignment.challengeId
          ),
        }))
        .filter(item => item.challenge),
    [assignmentsQuery.data, challengesQuery.data, organizationId]
  );
  const queuedChallengeIds = useMemo(
    () => new Set(queue.map(item => item.challenge!.id)),
    [queue]
  );
  const availableChallenges = useMemo(() => {
    if (!organizationId) return [];
    const all = challengesQuery.data ?? [];
    return all.filter(
      challenge =>
        !queuedChallengeIds.has(challenge.id) &&
        challenge.status !== "resolved" &&
        challenge.status !== "rejected"
    );
  }, [challengesQuery.data, queuedChallengeIds, organizationId]);
  const selectedInstitution = useMemo(
    () => institutions.find(i => i.id === organizationId) ?? null,
    [institutions, organizationId]
  );
  const [enrollingId, setEnrollingId] = useState<number | null>(null);
  const enrollMutation = trpc.workflow.enrollChallenge.useMutation({
    onSuccess: () => {
      void utils.workflow.assignments.invalidate();
      toast.success("Enrolled successfully", {
        description:
          "Challenge added to your queue — open it to accept and create a project.",
      });
      setEnrollingId(null);
    },
    onError: error => {
      toast.error("Couldn't enroll", { description: error.message });
      setEnrollingId(null);
    },
  });
  function handleEnroll(challengeId: number) {
    if (!organizationId || !selectedInstitution) return;
    setEnrollingId(challengeId);
    enrollMutation.mutate({
      challengeId,
      organizationId,
      organizationName: selectedInstitution.name,
    });
  }
  const loading =
    organizationsQuery.isLoading ||
    assignmentsQuery.isLoading ||
    challengesQuery.isLoading;
  const error =
    organizationsQuery.error || assignmentsQuery.error || challengesQuery.error;
  return (
    <main
      className="min-h-screen bg-[#f1eadc] text-[#0c3023]"
      style={{
        backgroundImage: "url('/images/samadhan-paper-grain_46302c3f.jpg')",
        backgroundSize: "cover",
      }}
    >
      <InstituteHeader active="Challenges" />
      <section className="px-6 py-10 sm:px-10 lg:px-[4rem]">
        <div className="mx-auto max-w-[94rem]">
          <div className="flex flex-col justify-between gap-6 border-b border-[#a78e6e]/45 pb-8 lg:flex-row lg:items-end">
            <div>
              <p className="font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.13em] text-[#c64b22]">
                Institution response queue
              </p>
              <h1 className="mt-4 font-display text-[4.2rem] leading-[0.86] tracking-[-0.04em]">
                Challenges.
              </h1>
              <p className="mt-5 max-w-[44rem] font-body text-[0.86rem] leading-relaxed text-[#53675d]">
                Review verified assignments, confirm your response, and assemble
                the delivery team from the institution workspace.
              </p>
            </div>
            <label className="w-full max-w-[25rem]">
              <span className="font-mono-ui text-[0.56rem] font-semibold uppercase tracking-[0.1em]">
                Institution
              </span>
              <select
                value={organizationId ?? ""}
                onChange={event =>
                  setOrganizationId(Number(event.target.value))
                }
                className="citizen-input mt-2"
              >
                <option value="" disabled>
                  Select an institution
                </option>
                {institutions.map(institution => (
                  <option key={institution.id} value={institution.id}>
                    {institution.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {loading ? (
            <Loading />
          ) : error ? (
            <Failure
              message={error.message}
              retry={() => {
                void organizationsQuery.refetch();
                void assignmentsQuery.refetch();
                void challengesQuery.refetch();
              }}
            />
          ) : (
            <>
              <div className="mt-7 hidden grid-cols-[minmax(18rem,1.7fr)_.8fr_.65fr_.8fr_7rem] gap-5 border-b border-[#a78e6e]/40 pb-4 font-mono-ui text-[0.58rem] font-semibold uppercase tracking-[0.1em] text-[#314b40] lg:grid">
                <span>Challenge</span>
                <span>Domain</span>
                <span>Priority</span>
                <span>Assignment</span>
                <span>Action</span>
              </div>
              <div>
                {queue.map(({ assignment, challenge }, index) => (
                  <motion.article
                    key={assignment.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: index * 0.05 }}
                    className="group grid gap-4 border-b border-[#a78e6e]/40 py-5 transition hover:bg-[#f8f2e8]/40 lg:grid-cols-[minmax(18rem,1.7fr)_.8fr_.65fr_.8fr_7rem] lg:items-center lg:gap-5 lg:px-3"
                  >
                    <div>
                      <h2 className="font-display text-[1.48rem] leading-none sm:text-[1.7rem]">
                        {challenge?.title}
                      </h2>
                      <p className="mt-2 font-body text-[0.72rem] text-[#5d7067]">
                        {challenge?.district} · assigned{" "}
                        {assignment.createdAt
                          ? new Date(assignment.createdAt).toLocaleDateString()
                          : ""}
                      </p>
                    </div>
                    <span className="w-fit border border-[#80977f] px-2 py-1 font-mono-ui text-[0.55rem] uppercase tracking-[0.08em] text-[#48684d]">
                      {challenge?.domain}
                    </span>
                    <span className="font-body text-[0.76rem] capitalize">
                      {challenge?.priority}
                    </span>
                    <span className="inline-flex w-fit items-center gap-1.5 border border-[#c79e7a]/70 px-2 py-1 font-mono-ui text-[0.55rem] uppercase tracking-[0.08em] text-[#9d572e]">
                      {assignment.status === "pending" && (
                        <span className="relative flex size-1.5">
                          <motion.span
                            className="absolute inline-flex size-1.5 rounded-full bg-[#c94a20]"
                            animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
                            transition={{
                              duration: 1.4,
                              repeat: Infinity,
                              ease: "easeOut",
                            }}
                          />
                          <span className="relative size-1.5 rounded-full bg-[#c94a20]" />
                        </span>
                      )}
                      {assignment.status}
                      {(assignment as { selfEnrolled?: boolean }).selfEnrolled
                        ? " · self-enrolled"
                        : ""}
                    </span>
                    <a
                      href={`/institute/challenges/${challenge?.id}`}
                      className="inline-flex w-fit items-center gap-1 font-body text-[0.76rem] font-semibold text-[#b94b27] transition-transform group-hover:translate-x-0.5"
                    >
                      Review <ChevronRight size={16} />
                    </a>
                  </motion.article>
                ))}
                {queue.length === 0 && <Empty />}
              </div>

              <div className="mt-12 border-t border-[#a78e6e]/45 pt-8">
                <p className="font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.13em] text-[#c64b22]">
                  Available challenges
                </p>
                <h2 className="mt-3 font-display text-[2.2rem] leading-none">
                  Enroll for open challenges.
                </h2>
                <p className="mt-3 max-w-[44rem] font-body text-[0.82rem] leading-relaxed text-[#53675d]">
                  Browse challenges not yet in your queue and enroll. Enrolled
                  challenges move to your assignment queue above, where you can
                  accept and create a delivery project.
                </p>
                {availableChallenges.length === 0 ? (
                  <div className="mt-6 border border-dashed border-[#a58c6d]/55 p-6 text-center font-body text-[0.78rem] text-[#586d63]">
                    No open challenges available to enroll — all open challenges
                    are already in your queue.
                  </div>
                ) : (
                  <div className="mt-7 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {availableChallenges.map((challenge, index) => {
                      const isEnrolling =
                        enrollMutation.isPending &&
                        enrollingId === challenge.id;
                      const canEnroll =
                        selectedInstitution?.verificationStatus === "verified";
                      return (
                        <motion.article
                          key={challenge.id}
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: 0.35,
                            delay: Math.min(index, 8) * 0.05,
                          }}
                          whileHover={{ y: -4 }}
                          className="flex flex-col border border-[#a78e6e]/45 bg-[#f8f2e8]/35 p-5 shadow-[0_1px_0_rgba(0,0,0,0.02)] transition-shadow hover:shadow-[0_10px_24px_-12px_rgba(60,40,10,0.35)]"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="w-fit border border-[#80977f] px-2 py-1 font-mono-ui text-[0.53rem] uppercase tracking-[0.08em] text-[#48684d]">
                              {challenge.domain}
                            </span>
                            <span className="font-mono-ui text-[0.53rem] uppercase tracking-[0.08em] text-[#9d572e]">
                              {challenge.priority}
                            </span>
                          </div>
                          <h3 className="mt-3 font-display text-[1.3rem] leading-[1.05]">
                            {challenge.title}
                          </h3>
                          <p className="mt-2 font-body text-[0.72rem] text-[#5d7067]">
                            {challenge.district} ·{" "}
                            {challenge.status.replaceAll("_", " ")} ·{" "}
                            {challenge.createdAt
                              ? new Date(
                                  challenge.createdAt as string | Date
                                ).toLocaleDateString()
                              : ""}
                          </p>
                          <div className="mt-4 flex items-center gap-2 border-t border-[#a78e6e]/30 pt-4">
                            <a
                              href={`/challenges/${challenge.id}`}
                              className="font-body text-[0.72rem] text-[#5d7067] hover:text-[#b94b27] hover:underline"
                            >
                              View
                            </a>
                            <motion.button
                              whileHover={canEnroll ? { scale: 1.03 } : {}}
                              whileTap={canEnroll ? { scale: 0.96 } : {}}
                              type="button"
                              disabled={enrollMutation.isPending || !canEnroll}
                              onClick={() => handleEnroll(challenge.id)}
                              title={
                                !canEnroll
                                  ? "Only verified institutions may enroll"
                                  : undefined
                              }
                              className="rounded-full ml-auto inline-flex items-center gap-1.5 bg-[#c94a20] px-4 py-2 font-mono-ui text-[0.56rem] font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-[#b8431d] disabled:opacity-50"
                            >
                              {isEnrolling ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Sparkles size={14} />
                              )}
                              {isEnrolling ? "Enrolling…" : "Enroll"}
                            </motion.button>
                          </div>
                        </motion.article>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
function Loading() {
  return (
    <div className="mt-8 flex items-center gap-3 font-body text-[#52675d]">
      <Loader2 className="animate-spin" size={18} />
      Loading institution challenge queue…
    </div>
  );
}
function Empty() {
  return (
    <div className="mt-8 border border-dashed border-[#a58c6d]/55 p-8 text-center font-body text-[0.8rem] text-[#586d63]">
      No challenge assignments are recorded for this institution.
    </div>
  );
}
function Failure({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div
      role="alert"
      className="mt-8 border border-[#bd5a38]/60 bg-[#f7e2d6]/35 p-6"
    >
      <p className="font-body text-[0.76rem] text-[#934325]">{message}</p>
      <button
        type="button"
        onClick={retry}
        className="rounded-full mt-3 border border-[#bd5a38]/60 px-3 py-2 font-mono-ui text-[0.54rem] uppercase tracking-[0.08em] text-[#a54426]"
      >
        Retry
      </button>
    </div>
  );
}
