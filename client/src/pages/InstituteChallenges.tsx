import InstituteHeader from "@/components/InstituteHeader";
import {
  BrainCircuit,
  ChevronDown,
  ChevronRight,
  Layers,
  Loader2,
  RefreshCw,
  Sparkles,
  Target,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  scoreInstitutionsForChallenge,
  type MatchResult,
} from "@/lib/matching";
import {
  rankChallengesForInstitution,
  type AiScoredItem,
} from "@/lib/aiMatching";

type ChallengesTab = "all" | "suggested";
type AiStatus = "idle" | "loading" | "success" | "error";

export default function InstituteChallenges() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<ChallengesTab>(() =>
    new URLSearchParams(search).get("tab") === "suggested" ? "suggested" : "all"
  );
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
  const openChallenges = useMemo(() => {
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
  const hasCapabilityProfile = Boolean(
    selectedInstitution?.departments || selectedInstitution?.expertise
  );
  // USP-08: fit score is personal to the selected institution. The
  // deterministic scorer below (`matching.ts`) is an *offline fallback
  // only* — it fills the grid instantly and covers AI outages, but the
  // primary, labeled source of truth is the Groq call in the effect further
  // down. Never present a fallback score as AI-ranked.
  const heuristicMatchByChallengeId = useMemo(() => {
    const map = new Map<number, MatchResult>();
    if (!selectedInstitution) return map;
    for (const challenge of openChallenges) {
      const [match] = scoreInstitutionsForChallenge(
        challenge,
        [selectedInstitution],
        assignmentsQuery.data ?? []
      );
      if (match) map.set(challenge.id, match);
    }
    return map;
  }, [openChallenges, selectedInstitution, assignmentsQuery.data]);

  const [aiMatchByChallengeId, setAiMatchByChallengeId] = useState<
    Map<number, AiScoredItem>
  >(new Map());
  const [aiStatus, setAiStatus] = useState<AiStatus>("idle");
  const aiRequestKeyRef = useRef<string | null>(null);

  const runAiMatch = useCallback(() => {
    if (!selectedInstitution || openChallenges.length === 0) return;
    const requestKey = `${selectedInstitution.id}:${openChallenges.length}`;
    aiRequestKeyRef.current = requestKey;
    setAiStatus("loading");
    rankChallengesForInstitution(selectedInstitution, openChallenges)
      .then(result => {
        if (aiRequestKeyRef.current !== requestKey) return; // stale response
        setAiMatchByChallengeId(result);
        setAiStatus("success");
      })
      .catch(err => {
        if (aiRequestKeyRef.current !== requestKey) return;
        console.error("AI challenge ranking failed", err);
        setAiStatus("error");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedInstitution?.id, openChallenges]);

  // Lazily trigger the AI call the first time the Suggested tab is opened
  // for a given institution/open-challenge set, rather than burning Groq
  // quota on every page load regardless of whether the tab is ever viewed.
  useEffect(() => {
    if (tab !== "suggested" || !selectedInstitution) return;
    const requestKey = `${selectedInstitution.id}:${openChallenges.length}`;
    if (aiRequestKeyRef.current === requestKey) return;
    runAiMatch();
  }, [tab, selectedInstitution, openChallenges.length, runAiMatch]);

  const usingAi = aiStatus === "success" && aiMatchByChallengeId.size > 0;
  const effectiveMatchByChallengeId = useMemo(() => {
    const map = new Map<number, AiScoredItem>();
    for (const challenge of openChallenges) {
      const ai = aiMatchByChallengeId.get(challenge.id);
      const fallback = heuristicMatchByChallengeId.get(challenge.id);
      const chosen = ai ?? fallback;
      if (chosen) map.set(challenge.id, chosen);
    }
    return map;
  }, [openChallenges, aiMatchByChallengeId, heuristicMatchByChallengeId]);

  function fitTierFor(challengeId: number): "strong" | "good" | null {
    if (!hasCapabilityProfile) return null;
    const match = effectiveMatchByChallengeId.get(challengeId);
    if (!match) return null;
    if (match.score >= 65) return "strong";
    if (match.score >= 35) return "good";
    return null;
  }
  const suggestedChallenges = useMemo(
    () =>
      [...openChallenges]
        .filter(challenge => fitTierFor(challenge.id) !== null)
        .sort(
          (a, b) =>
            (effectiveMatchByChallengeId.get(b.id)?.score ?? 0) -
            (effectiveMatchByChallengeId.get(a.id)?.score ?? 0)
        ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [openChallenges, effectiveMatchByChallengeId, hasCapabilityProfile]
  );
  const displayedChallenges =
    tab === "suggested" ? suggestedChallenges : openChallenges;
  const [expandedFitId, setExpandedFitId] = useState<number | null>(null);
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
                  Enrolled challenges move to your assignment queue above, where
                  you can accept and create a delivery project.
                </p>
                {!hasCapabilityProfile && selectedInstitution && (
                  <p className="mt-3 max-w-[44rem] border border-dashed border-[#c79e7a]/70 bg-[#f8f2e8]/40 px-4 py-3 font-body text-[0.76rem] text-[#8f5a2f]">
                    Add your departments and expertise on your institution
                    profile to see personalized fit scores and matches here.
                  </p>
                )}

                <div
                  role="tablist"
                  aria-label="Challenge list filter"
                  className="mt-6 flex flex-wrap items-center gap-2.5"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tab === "all"}
                    onClick={() => setTab("all")}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 font-mono-ui text-[0.58rem] font-semibold uppercase tracking-[0.08em] transition ${
                      tab === "all"
                        ? "bg-[#c94a20] text-white"
                        : "border border-[#a78e6e]/55 text-[#48684d] hover:bg-[#f8f2e8]/60"
                    }`}
                  >
                    <Layers size={13} />
                    All challenges
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[0.52rem] ${tab === "all" ? "bg-white/20" : "bg-[#e9e2d2]"}`}
                    >
                      {openChallenges.length}
                    </span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tab === "suggested"}
                    onClick={() => setTab("suggested")}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 font-mono-ui text-[0.58rem] font-semibold uppercase tracking-[0.08em] transition ${
                      tab === "suggested"
                        ? "bg-[#16422f] text-[#e9f2ea]"
                        : "border border-[#80977f]/70 text-[#3a5c41] hover:bg-[#eef1e6]"
                    }`}
                  >
                    <Target size={13} />
                    Suggested for you
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[0.52rem] ${tab === "suggested" ? "bg-white/20" : "bg-[#dbe6dc]"}`}
                    >
                      {suggestedChallenges.length}
                    </span>
                  </button>
                </div>
                {tab === "suggested" && (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="max-w-[40rem] font-body text-[0.78rem] leading-relaxed text-[#53675d]">
                      {aiStatus === "loading" ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 size={13} className="animate-spin" />
                          Groq AI is analyzing {openChallenges.length} open
                          challenges against{" "}
                          {selectedInstitution?.name || "your institution"}'s
                          academic profile…
                        </span>
                      ) : usingAi ? (
                        <span className="inline-flex items-center gap-1.5 font-semibold text-[#16422f]">
                          <BrainCircuit size={14} />
                          AI-powered matches for{" "}
                          {selectedInstitution?.name || "your institution"} —
                          ranked by academic fit, not just keywords.
                        </span>
                      ) : aiStatus === "error" ? (
                        <span className="text-[#8f5a2f]">
                          AI ranking is unavailable right now — showing an
                          offline estimate for{" "}
                          {selectedInstitution?.name || "your institution"}{" "}
                          instead.
                        </span>
                      ) : (
                        <span>
                          Offline estimate for{" "}
                          {selectedInstitution?.name || "your institution"} —
                          run AI matching for a fuller analysis.
                        </span>
                      )}
                    </p>
                    <button
                      type="button"
                      onClick={runAiMatch}
                      disabled={aiStatus === "loading"}
                      className="inline-flex shrink-0 items-center gap-1.5 border border-[#80977f]/60 px-3 py-1.5 font-mono-ui text-[0.55rem] font-semibold uppercase tracking-[0.08em] text-[#3a5c41] transition hover:bg-[#eef1e6] disabled:opacity-50"
                    >
                      <RefreshCw
                        size={11}
                        className={aiStatus === "loading" ? "animate-spin" : ""}
                      />
                      {usingAi ? "Re-run AI match" : "Run AI match"}
                    </button>
                  </div>
                )}

                <AnimatePresence mode="wait">
                  {displayedChallenges.length === 0 ? (
                    <motion.div
                      key={`empty-${tab}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="mt-6 border border-dashed border-[#a58c6d]/55 p-8 text-center"
                    >
                      {tab === "suggested" ? (
                        <>
                          <Target
                            className="mx-auto text-[#5e7966]"
                            size={24}
                          />
                          <p className="mt-3 font-display text-[1.4rem]">
                            No strong matches yet.
                          </p>
                          <p className="mx-auto mt-2 max-w-[30rem] font-body text-[0.78rem] text-[#586d63]">
                            {hasCapabilityProfile
                              ? "None of the currently open challenges closely match your departments, expertise, or location. Check All challenges to browse everything."
                              : "Add departments and expertise on your institution profile to surface personalized matches here."}
                          </p>
                          <button
                            type="button"
                            onClick={() => setTab("all")}
                            className="rounded-full mt-5 inline-flex items-center gap-1.5 border border-[#a78e6e]/60 px-5 py-2.5 font-mono-ui text-[0.58rem] font-semibold uppercase tracking-[0.09em] text-[#48684d] hover:bg-[#f8f2e8]/60"
                          >
                            View all challenges
                          </button>
                        </>
                      ) : (
                        <p className="font-body text-[0.78rem] text-[#586d63]">
                          No open challenges available to enroll — all open
                          challenges are already in your queue.
                        </p>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key={`grid-${tab}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="mt-7 grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
                    >
                      {displayedChallenges.map((challenge, index) => {
                        const isEnrolling =
                          enrollMutation.isPending &&
                          enrollingId === challenge.id;
                        const canEnroll =
                          selectedInstitution?.verificationStatus ===
                          "verified";
                        const match = effectiveMatchByChallengeId.get(
                          challenge.id
                        );
                        const matchIsAi = aiMatchByChallengeId.has(
                          challenge.id
                        );
                        const fitTier = fitTierFor(challenge.id);
                        const isExpanded = expandedFitId === challenge.id;
                        return (
                          <motion.article
                            key={challenge.id}
                            layout
                            initial={{ opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                              duration: 0.3,
                              delay: Math.min(index, 8) * 0.04,
                            }}
                            whileHover={{ y: -4 }}
                            whileTap={{ scale: 0.99 }}
                            role="link"
                            tabIndex={0}
                            aria-label={`View ${challenge.title}`}
                            onClick={() =>
                              navigate(`/challenges/${challenge.id}`)
                            }
                            onKeyDown={event => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                navigate(`/challenges/${challenge.id}`);
                              }
                            }}
                            className="group flex cursor-pointer flex-col border border-[#a78e6e]/45 bg-[#f8f2e8]/35 p-5 shadow-[0_1px_0_rgba(0,0,0,0.02)] transition-shadow hover:shadow-[0_10px_24px_-12px_rgba(60,40,10,0.35)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c94a20]"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="w-fit border border-[#80977f] px-2 py-1 font-mono-ui text-[0.53rem] uppercase tracking-[0.08em] text-[#48684d]">
                                {challenge.domain}
                              </span>
                              <span className="font-mono-ui text-[0.53rem] uppercase tracking-[0.08em] text-[#9d572e]">
                                {challenge.priority}
                              </span>
                            </div>
                            <h3 className="mt-3 font-display text-[1.3rem] leading-[1.05] transition-colors group-hover:text-[#a5401f]">
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
                            {fitTier && (
                              <div className="mt-3">
                                <button
                                  type="button"
                                  onClick={event => {
                                    event.stopPropagation();
                                    setExpandedFitId(
                                      isExpanded ? null : challenge.id
                                    );
                                  }}
                                  aria-expanded={isExpanded}
                                  className={`inline-flex w-fit items-center gap-1.5 px-2.5 py-1.5 font-mono-ui text-[0.55rem] font-semibold uppercase tracking-[0.08em] transition ${
                                    fitTier === "strong"
                                      ? "bg-[#16422f] text-[#e9f2ea] hover:bg-[#1b5238]"
                                      : "border border-[#80977f]/70 text-[#48684d] hover:bg-[#eef1e6]"
                                  }`}
                                >
                                  {matchIsAi ? (
                                    <BrainCircuit size={12} />
                                  ) : (
                                    <Target size={12} />
                                  )}
                                  {fitTier === "strong"
                                    ? "Strong fit for you"
                                    : "Good fit for you"}
                                  <ChevronDown
                                    size={11}
                                    className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
                                  />
                                </button>
                                <AnimatePresence initial={false}>
                                  {isExpanded && match!.reasons.length > 0 && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: "auto", opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.22 }}
                                      className="mt-2 overflow-hidden"
                                    >
                                      <p className="pl-0.5 font-mono-ui text-[0.5rem] font-semibold uppercase tracking-[0.08em] text-[#8a9a90]">
                                        {matchIsAi
                                          ? "AI analysis"
                                          : "Offline estimate"}
                                      </p>
                                      <ul className="mt-1 space-y-1 pl-0.5">
                                        {match!.reasons.map(reason => (
                                          <li
                                            key={reason}
                                            className="font-body text-[0.7rem] leading-snug text-[#5d7067]"
                                          >
                                            · {reason}
                                          </li>
                                        ))}
                                      </ul>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            )}
                            <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#a78e6e]/30 pt-4">
                              <span className="inline-flex items-center gap-1 font-body text-[0.72rem] text-[#8a9a90] transition-colors group-hover:text-[#b94b27]">
                                View details
                                <ChevronRight
                                  size={13}
                                  className="transition-transform group-hover:translate-x-0.5"
                                />
                              </span>
                              <motion.button
                                whileHover={canEnroll ? { scale: 1.03 } : {}}
                                whileTap={canEnroll ? { scale: 0.96 } : {}}
                                type="button"
                                disabled={
                                  enrollMutation.isPending || !canEnroll
                                }
                                onClick={event => {
                                  event.stopPropagation();
                                  handleEnroll(challenge.id);
                                }}
                                title={
                                  !canEnroll
                                    ? "Only verified institutions may enroll"
                                    : undefined
                                }
                                className="rounded-full inline-flex items-center gap-1.5 bg-[#c94a20] px-4 py-2 font-mono-ui text-[0.56rem] font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-[#b8431d] disabled:opacity-50"
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
                    </motion.div>
                  )}
                </AnimatePresence>
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
