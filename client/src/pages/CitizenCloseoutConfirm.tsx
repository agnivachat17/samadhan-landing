/**
 * USP-07: citizen-owned closeout verification. No admin gate — the citizen
 * who reported the challenge is the one who decides "fixed" or "not yet".
 * Confirming resolves the project + the public challenge record directly;
 * disputing reopens the project and asks the institution for another round.
 */
import PublicPortalHeader from "@/components/PublicPortalHeader";
import { BeforeAfterEvidence } from "@/components/BeforeAfterEvidence";
import { useAuth } from "@/hooks/useAuth";
import {
  CheckCircle2,
  Loader2,
  PartyPopper,
  RotateCcw,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  XCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";

async function hashOtp(otp: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(otp)
  );
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function CitizenCloseoutConfirm() {
  const { user } = useAuth();
  const [, params] = useRoute("/citizen/challenges/:id/closeout");
  const challengeId = Number(params?.id ?? 0);
  const challengeQuery = trpc.workflow.challengeById.useQuery(
    { id: challengeId || 1 },
    { enabled: challengeId > 0 }
  );
  const challenge = challengeQuery.data;
  const projectsInput = useMemo(
    () => ({ challengeId: challengeId || 1 }),
    [challengeId]
  );
  const projectsQuery = trpc.workflow.projects.useQuery(projectsInput, {
    enabled: challengeId > 0,
  });
  const projectId = projectsQuery.data?.[0]?.id ?? 0;
  const closeoutInput = useMemo(
    () => ({ projectId: projectId || 1 }),
    [projectId]
  );
  const closeoutsQuery = trpc.workflow.projectCloseouts.useQuery(
    closeoutInput,
    { enabled: projectId > 0 }
  );
  const documentsQuery = trpc.workflow.projectDocuments.useQuery(
    closeoutInput,
    { enabled: projectId > 0 }
  );
  const documents = documentsQuery.data ?? [];
  const sortedCloseouts = useMemo(
    () =>
      [...(closeoutsQuery.data ?? [])].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      ),
    [closeoutsQuery.data]
  );
  const latest = sortedCloseouts[sortedCloseouts.length - 1];
  const history = sortedCloseouts.slice(0, -1);

  const utils = trpc.useUtils();
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [justResolved, setJustResolved] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpChecking, setOtpChecking] = useState(false);
  const review = trpc.workflow.updateProjectCloseout.useMutation({
    onSuccess: () => void utils.workflow.projectCloseouts.invalidate(),
  });
  const updateProject = trpc.workflow.updateProject.useMutation();
  const updateChallenge = trpc.workflow.updateChallenge.useMutation({
    onSuccess: () => void utils.workflow.challenges.invalidate(),
  });

  const isAssisted =
    (challenge as any)?.submittedVia === "assisted" &&
    !!(challenge as any)?.beneficiaryPhone;
  const isOwnerSelf =
    !!user?.email &&
    !!challenge?.citizenEmail &&
    user.email.toLowerCase() === challenge.citizenEmail.toLowerCase();
  const isOwner = isAssisted ? otpVerified : isOwnerSelf;

  async function verifyOtp() {
    setOtpError("");
    const raw = otpInput.trim();
    if (!/^[0-9]{6}$/.test(raw)) {
      setOtpError("Enter the 6-digit OTP sent to the beneficiary's phone.");
      return;
    }
    const hash = (challenge as any)?.beneficiaryOtpHash as string | undefined;
    const expiresAt = (challenge as any)?.beneficiaryOtpExpiresAt as
      string | Date | undefined;
    if (!hash) {
      setOtpError(
        "No OTP found for this report — it may have been filed as self-service."
      );
      return;
    }
    if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
      setOtpError(
        "This OTP has expired. Ask the assistant to regenerate it from the challenge record."
      );
      return;
    }
    setOtpChecking(true);
    try {
      const h = await hashOtp(raw);
      if (h !== hash) {
        setOtpError(
          "Incorrect OTP. Check the SMS/code given to the beneficiary."
        );
        return;
      }
      setOtpVerified(true);
      setOtpError("");
    } finally {
      setOtpChecking(false);
    }
  }

  async function fireConfetti() {
    const confetti = (await import("canvas-confetti")).default;
    const colors = ["#c94a20", "#16422f", "#e8b66a", "#3a6b4a"];
    const end = Date.now() + 1400;
    (function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 60,
        startVelocity: 55,
        origin: { x: 0, y: 0.7 },
        colors,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 60,
        startVelocity: 55,
        origin: { x: 1, y: 0.7 },
        colors,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }

  function confirmFixed() {
    if (!latest || !challenge || !projectId) return;
    review.mutate(
      { id: latest.id, citizenConfirmation: "confirmed" },
      {
        onSuccess: () => {
          updateProject.mutate({
            id: projectId,
            status: "resolved",
            progress: 100,
          });
          updateChallenge.mutate({
            id: challenge.id,
            status: "resolved",
            resolutionSummary: latest.outcomeSummary,
          });
          setJustResolved(true);
          void fireConfetti();
        },
      }
    );
  }
  function submitDispute() {
    if (!latest || !disputeReason.trim()) return;
    review.mutate(
      {
        id: latest.id,
        citizenConfirmation: "disputed",
        citizenNotes: disputeReason.trim(),
      },
      {
        onSuccess: () => {
          if (projectId > 0)
            updateProject.mutate({
              id: projectId,
              status: "at_risk",
              riskSummary: `Citizen disputed: ${disputeReason.trim()}`,
            });
          setDisputeOpen(false);
          setDisputeReason("");
        },
      }
    );
  }

  const before = latest
    ? documents.find(doc => doc.id === latest.beforeEvidenceId)
    : undefined;
  const after = latest
    ? documents.find(doc => doc.id === latest.afterEvidenceId)
    : undefined;
  const resolved = latest?.citizenConfirmation === "confirmed" || justResolved;
  const loading =
    challengeQuery.isLoading ||
    projectsQuery.isLoading ||
    closeoutsQuery.isLoading;
  const failed =
    challengeQuery.isError || projectsQuery.isError || closeoutsQuery.isError;

  return (
    <main
      className="min-h-screen bg-[#f1eadc] text-[#0c3023]"
      style={{
        backgroundImage: "url('/images/samadhan-paper-grain_46302c3f.jpg')",
        backgroundSize: "cover",
      }}
    >
      <PublicPortalHeader />
      <section className="px-6 py-10 sm:px-10 lg:px-[5rem]">
        <div className="mx-auto max-w-[52rem]">
          <a
            href={`/challenges/${challengeId}`}
            className="font-body text-[0.78rem] text-[#496257] hover:text-[#c64b22]"
          >
            ← Back to challenge record
          </a>
          {loading ? (
            <Loading />
          ) : failed ? (
            <Failure
              message="Closeout record could not load."
              retry={() => {
                void challengeQuery.refetch();
                void projectsQuery.refetch();
                void closeoutsQuery.refetch();
              }}
            />
          ) : !latest ? (
            <>
              <p className="mt-8 font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.13em] text-[#c64b22]">
                Outcome confirmation
              </p>
              <h1 className="mt-4 font-display text-[3.4rem] leading-[0.9] tracking-[-0.04em] sm:text-[4rem]">
                Nothing to review yet.
              </h1>
              <Empty />
            </>
          ) : (
            <>
              <p className="mt-8 font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.13em] text-[#c64b22]">
                Outcome confirmation · Round {sortedCloseouts.length}
              </p>
              <h1 className="mt-4 font-display text-[3.4rem] leading-[0.9] tracking-[-0.04em] sm:text-[4.2rem]">
                {resolved ? "It's fixed. 🎉" : "Is this fixed now?"}
              </h1>
              {challenge?.title && (
                <p className="mt-3 font-body text-[0.85rem] text-[#52675d]">
                  {challenge.title}
                </p>
              )}

              <AnimatePresence mode="wait">
                {resolved ? (
                  <motion.div
                    key="resolved"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", bounce: 0.4 }}
                    className="mt-8 flex flex-col items-center gap-4 border border-[#8fa887]/60 bg-[#e6ede3]/55 p-10 text-center"
                  >
                    <motion.div
                      animate={{ rotate: [0, -8, 8, -6, 0] }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                    >
                      <PartyPopper className="text-[#3a6b4a]" size={40} />
                    </motion.div>
                    <p className="font-display text-[1.7rem] leading-tight text-[#204732]">
                      Marked resolved — thank you for confirming.
                    </p>
                    <p className="max-w-[28rem] font-body text-[0.82rem] text-[#3a6b4a]">
                      This challenge is now public as resolved, with the
                      before/after evidence attached to the record. No admin
                      review needed — your word closed it.
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="active"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-8 border border-[#a58c6d]/55 bg-[#f8f2e8]/25 p-6"
                  >
                    {isAssisted && !otpVerified ? (
                      <div className="mb-4 border border-[#a58c6d]/50 bg-[#f8f2e8]/45 p-4">
                        <p className="font-mono-ui text-[0.58rem] font-semibold uppercase tracking-[0.1em] text-[#243f34]">
                          Beneficiary verification —{" "}
                          {(challenge as any)?.beneficiaryName} ·{" "}
                          {(challenge as any)?.beneficiaryPhone}
                        </p>
                        <p className="mt-2 font-body text-[0.74rem] leading-relaxed text-[#5c6a61]">
                          This report was filed on behalf of{" "}
                          {(challenge as any)?.beneficiaryName}. Enter the
                          6-digit OTP sent to{" "}
                          {(challenge as any)?.beneficiaryPhone} to confirm on
                          their behalf. In production this OTP would be sent via
                          SMS; for this demo it was shown to the assistant at
                          submission as Demo OTP.
                        </p>
                        <div className="mt-3 flex gap-3">
                          <input
                            value={otpInput}
                            onChange={e =>
                              setOtpInput(
                                e.target.value
                                  .replace(/[^0-9]/g, "")
                                  .slice(0, 6)
                              )
                            }
                            placeholder="6-digit OTP"
                            className="citizen-input w-40 text-center tracking-[0.3em]"
                            inputMode="numeric"
                          />
                          <button
                            type="button"
                            onClick={() => void verifyOtp()}
                            disabled={otpChecking || otpInput.length !== 6}
                            className="rounded-full bg-[#16422f] px-5 py-2 font-mono-ui text-[0.6rem] font-semibold uppercase tracking-[0.08em] text-white disabled:opacity-50"
                          >
                            {otpChecking ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              "Verify OTP"
                            )}
                          </button>
                        </div>
                        {otpError && (
                          <p className="mt-2 font-body text-[0.72rem] text-[#a34b2c]">
                            {otpError}
                          </p>
                        )}
                      </div>
                    ) : !isOwner ? (
                      <p className="mb-4 flex items-center gap-2 border border-[#a58c6d]/50 bg-[#f1eadc] px-3 py-2 font-body text-[0.72rem] text-[#64776d]">
                        <Sparkles size={13} />
                        Only {challenge?.citizenName ??
                          "the reporting citizen"}{" "}
                        can confirm or dispute this outcome. You're viewing
                        their pending review.
                      </p>
                    ) : null}
                    {isAssisted && otpVerified && (
                      <p className="mb-4 flex items-center gap-2 border border-[#8fa887]/50 bg-[#e6ede3]/40 px-3 py-2 font-body text-[0.72rem] text-[#2e6849]">
                        <CheckCircle2 size={13} /> OTP verified — you can now
                        confirm or dispute on behalf of{" "}
                        {(challenge as any)?.beneficiaryName}.
                      </p>
                    )}
                    <p className="whitespace-pre-wrap font-body text-[0.9rem] leading-relaxed text-[#52675d]">
                      {latest.outcomeSummary}
                    </p>
                    {(before || after) && (
                      <BeforeAfterEvidence
                        before={before}
                        after={after}
                        className="mt-5"
                      />
                    )}

                    {isOwner && (
                      <AnimatePresence mode="wait">
                        {disputeOpen ? (
                          <motion.div
                            key="dispute-form"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-6 overflow-hidden border border-[#bd5a38]/50 bg-[#f7e2d6]/25 p-4"
                          >
                            <label className="block">
                              <span className="font-mono-ui text-[0.55rem] font-semibold uppercase tracking-[0.08em] text-[#934325]">
                                What's still wrong?
                              </span>
                              <textarea
                                required
                                autoFocus
                                value={disputeReason}
                                onChange={event =>
                                  setDisputeReason(event.target.value)
                                }
                                className="citizen-input mt-2 min-h-[6rem] resize-y"
                                placeholder="Tell the team what still needs fixing — they'll get another chance to close it."
                              />
                            </label>
                            <div className="mt-3 flex gap-3">
                              <motion.button
                                whileTap={{ scale: 0.96 }}
                                type="button"
                                disabled={
                                  !disputeReason.trim() || review.isPending
                                }
                                onClick={submitDispute}
                                className="rounded-full flex items-center gap-2 bg-[#a84626] px-4 py-2.5 font-mono-ui text-[0.55rem] font-semibold uppercase tracking-[0.08em] text-white disabled:opacity-60"
                              >
                                <RotateCcw size={14} />
                                {review.isPending
                                  ? "Sending…"
                                  : "Send back for another round"}
                              </motion.button>
                              <button
                                type="button"
                                onClick={() => setDisputeOpen(false)}
                                className="rounded-full border border-[#a58c6d]/60 px-4 py-2.5 font-mono-ui text-[0.55rem] font-semibold uppercase tracking-[0.08em] text-[#52675d]"
                              >
                                Cancel
                              </button>
                            </div>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="decide"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="mt-7 grid gap-3 sm:grid-cols-2"
                          >
                            <motion.button
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.96 }}
                              type="button"
                              disabled={review.isPending}
                              onClick={confirmFixed}
                              className="group flex flex-col items-center gap-2 border-2 border-[#16422f] bg-[#16422f] px-4 py-6 text-white transition disabled:opacity-60"
                            >
                              <ThumbsUp
                                size={26}
                                className="transition group-hover:-translate-y-0.5"
                              />
                              <span className="font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.1em]">
                                Yes, it's fixed
                              </span>
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.96 }}
                              type="button"
                              onClick={() => setDisputeOpen(true)}
                              className="group flex flex-col items-center gap-2 border-2 border-[#bd5a38]/70 px-4 py-6 text-[#a84626] transition hover:bg-[#f7e2d6]/40"
                            >
                              <ThumbsDown
                                size={26}
                                className="transition group-hover:translate-y-0.5"
                              />
                              <span className="font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.1em]">
                                Not yet
                              </span>
                            </motion.button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {history.length > 0 && (
                <div className="mt-10">
                  <p className="font-mono-ui text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-[#64776d]">
                    Earlier rounds
                  </p>
                  <ol className="relative mt-4 border-l border-[#a58c6d]/40 pl-6">
                    {history.map((item, index) => (
                      <li key={item.id} className="relative pb-5 last:pb-0">
                        <span className="absolute -left-[1.95rem] top-0.5 grid size-4 place-items-center rounded-full border-2 border-[#a84626] bg-[#a84626] text-white">
                          <XCircle size={10} />
                        </span>
                        <p className="font-mono-ui text-[0.53rem] font-semibold uppercase tracking-[0.08em] text-[#7d8b83]">
                          Round {index + 1} · disputed
                        </p>
                        <p className="mt-1 font-body text-[0.78rem] text-[#607168]">
                          {item.citizenNotes || "No reason given."}
                        </p>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}
function Loading() {
  return (
    <div className="mt-7 flex items-center gap-3 font-body text-[#52675d]">
      <Loader2 className="animate-spin" size={18} />
      Loading outcome record…
    </div>
  );
}
function Empty() {
  return (
    <div className="mt-7 border border-dashed border-[#a58c6d]/55 p-8 font-body text-[0.8rem] text-[#586d63]">
      No closeout has been submitted for this challenge yet.
    </div>
  );
}
function Failure({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div
      role="alert"
      className="mt-7 border border-[#bd5a38]/60 bg-[#f7e2d6]/35 p-5"
    >
      <p className="font-body text-[0.75rem] text-[#934325]">{message}</p>
      <button
        type="button"
        onClick={retry}
        className="rounded-full mt-3 border border-[#bd5a38]/60 px-3 py-2 font-mono-ui text-[0.53rem] font-semibold uppercase tracking-[0.08em] text-[#a54426]"
      >
        Retry
      </button>
    </div>
  );
}
