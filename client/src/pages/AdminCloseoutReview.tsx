/**
 * USP-07: read-only closeout oversight. Resolution is decided entirely by
 * the citizen who reported the challenge (see CitizenCloseoutConfirm.tsx) —
 * admins can watch the round-by-round history and verify the hash chain,
 * but there is nothing here to approve or reject. Keeping admin out of the
 * decision loop is deliberate: a civic platform shouldn't need a government
 * sign-off to tell a citizen their own problem got fixed.
 */
import AdminHeader from "@/components/AdminHeader";
import { LedgerSeal } from "@/components/LedgerSeal";
import { BeforeAfterEvidence } from "@/components/BeforeAfterEvidence";
import { Eye, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useMemo } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";

export default function AdminCloseoutReview() {
  const [, params] = useRoute("/admin/projects/:id/closeout");
  const projectId = Number(params?.id ?? 0);
  const input = useMemo(() => ({ projectId: projectId || 1 }), [projectId]);
  const closeoutsQuery = trpc.workflow.projectCloseouts.useQuery(input, {
    enabled: projectId > 0,
  });
  const documentsQuery = trpc.workflow.projectDocuments.useQuery(input, {
    enabled: projectId > 0,
  });
  const documents = documentsQuery.data ?? [];
  const sortedCloseouts = useMemo(
    () =>
      [...(closeoutsQuery.data ?? [])].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      ),
    [closeoutsQuery.data]
  );

  return (
    <main
      className="min-h-screen bg-[#f1eadc] text-[#0d3024]"
      style={{
        backgroundImage: "url('/images/samadhan-paper-grain_46302c3f.jpg')",
        backgroundSize: "cover",
      }}
    >
      <AdminHeader active="Projects" />
      <section className="px-6 py-9 sm:px-10 lg:px-[5rem]">
        <div className="mx-auto max-w-[70rem]">
          <a
            href={`/admin/projects/${projectId}`}
            className="font-body text-[0.78rem] text-[#496257] hover:text-[#c64b22]"
          >
            ← Back to project oversight
          </a>
          <p className="mt-8 flex items-center gap-2 font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.13em] text-[#c64b22]">
            <Eye size={13} />
            Closeout oversight
          </p>
          <h1 className="mt-4 font-display text-[4rem] leading-[0.86] tracking-[-0.04em]">
            What the citizen decided.
          </h1>
          <p className="mt-4 max-w-[42rem] font-body text-[0.82rem] leading-relaxed text-[#53675d]">
            The institution submits before/after evidence and the citizen who
            reported the problem confirms or disputes it directly — this record
            is read-only for admins by design, so resolution never waits on a
            government sign-off.
          </p>
          <div className="mt-6">
            <LedgerSeal projectId={projectId || 1} />
          </div>
          {closeoutsQuery.isLoading ? (
            <Loading />
          ) : closeoutsQuery.isError ? (
            <Failure
              message={closeoutsQuery.error.message}
              retry={() => void closeoutsQuery.refetch()}
            />
          ) : sortedCloseouts.length === 0 ? (
            <Empty />
          ) : (
            <div className="mt-8 space-y-6">
              {sortedCloseouts.map((closeout, index) => {
                const before = documents.find(
                  doc => doc.id === closeout.beforeEvidenceId
                );
                const after = documents.find(
                  doc => doc.id === closeout.afterEvidenceId
                );
                return (
                  <motion.article
                    key={closeout.id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.06 }}
                    className="border border-[#a58c6d]/55 bg-[#f8f2e8]/25 p-6"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono-ui text-[0.53rem] font-semibold uppercase tracking-[0.08em] text-[#7d8b83]">
                        Round {index + 1} of {sortedCloseouts.length}
                      </span>
                      <StatusBadge
                        label={
                          closeout.citizenConfirmation === "pending"
                            ? "Awaiting citizen"
                            : closeout.citizenConfirmation === "confirmed"
                              ? "Citizen confirmed fixed"
                              : "Citizen disputed"
                        }
                        tone={
                          closeout.citizenConfirmation === "confirmed"
                            ? "good"
                            : closeout.citizenConfirmation === "disputed"
                              ? "bad"
                              : "neutral"
                        }
                      />
                    </div>
                    <p className="mt-4 whitespace-pre-wrap font-body text-[0.86rem] leading-relaxed text-[#52675d]">
                      {closeout.outcomeSummary}
                    </p>
                    {closeout.citizenNotes && (
                      <p className="mt-3 border-l-2 border-[#bd5a38]/60 pl-3 font-body text-[0.78rem] italic text-[#934325]">
                        Citizen: “{closeout.citizenNotes}”
                      </p>
                    )}
                    {(before || after) && (
                      <BeforeAfterEvidence
                        before={before}
                        after={after}
                        className="mt-5"
                      />
                    )}
                  </motion.article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: "good" | "bad" | "neutral";
}) {
  const toneClass =
    tone === "good"
      ? "border-[#8fa887]/60 bg-[#e6ede3]/50 text-[#3a6b4a]"
      : tone === "bad"
        ? "border-[#bd5a38]/60 bg-[#f7e2d6]/35 text-[#934325]"
        : "border-[#a58c6d]/50 bg-[#f1eadc] text-[#64776d]";
  return (
    <span
      className={`inline-block border px-2.5 py-1 font-mono-ui text-[0.53rem] font-semibold uppercase tracking-[0.08em] ${toneClass}`}
    >
      {label}
    </span>
  );
}
function Loading() {
  return (
    <div className="mt-7 flex items-center gap-3 font-body text-[#52675d]">
      <Loader2 className="animate-spin" size={18} />
      Loading closeout records…
    </div>
  );
}
function Empty() {
  return (
    <div className="mt-7 border border-dashed border-[#a58c6d]/55 p-8 font-body text-[0.8rem] text-[#586d63]">
      No project closeout has been submitted.
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
