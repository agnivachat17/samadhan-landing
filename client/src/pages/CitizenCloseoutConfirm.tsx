import PublicPortalHeader from "@/components/PublicPortalHeader";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";

export default function CitizenCloseoutConfirm() {
  const [, params] = useRoute("/citizen/challenges/:id/closeout");
  const challengeId = Number(params?.id ?? 0);
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
  const utils = trpc.useUtils();
  const review = trpc.workflow.updateProjectCloseout.useMutation({
    onSuccess: () => void utils.workflow.projectCloseouts.invalidate(),
  });
  return (
    <main
      className="min-h-screen bg-[#f1eadc] text-[#0c3023]"
      style={{
        backgroundImage:
          "url('/manus-storage/samadhan-paper-grain_46302c3f.jpg')",
        backgroundSize: "cover",
      }}
    >
      <PublicPortalHeader />
      <section className="px-6 py-10 sm:px-10 lg:px-[5rem]">
        <div className="mx-auto max-w-[60rem]">
          <a
            href={`/citizen/challenges/${challengeId}`}
            className="font-body text-[0.78rem] text-[#496257] hover:text-[#c64b22]"
          >
            ← Back to challenge record
          </a>
          <p className="mt-8 font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.13em] text-[#c64b22]">
            Citizen outcome confirmation
          </p>
          <h1 className="mt-4 font-display text-[4rem] leading-[0.86] tracking-[-0.04em]">
            Was the challenge addressed?
          </h1>
          {projectsQuery.isLoading || closeoutsQuery.isLoading ? (
            <Loading />
          ) : projectsQuery.isError || closeoutsQuery.isError ? (
            <Failure
              message={
                projectsQuery.error?.message ||
                closeoutsQuery.error?.message ||
                "Closeout record could not load."
              }
              retry={() => {
                void projectsQuery.refetch();
                void closeoutsQuery.refetch();
              }}
            />
          ) : (closeoutsQuery.data ?? []).length === 0 ? (
            <Empty />
          ) : (
            <div className="mt-8 space-y-6">
              {closeoutsQuery.data?.map(item => (
                <article
                  key={item.id}
                  className="border border-[#a58c6d]/55 bg-[#f8f2e8]/25 p-6"
                >
                  <p className="whitespace-pre-wrap font-body text-[0.9rem] leading-relaxed text-[#52675d]">
                    {item.outcomeSummary}
                  </p>
                  {item.evidenceUrl && (
                    <a
                      href={item.evidenceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-block font-body text-[0.76rem] font-semibold text-[#bd4a26]"
                    >
                      Open evidence →
                    </a>
                  )}
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() =>
                        review.mutate({
                          id: item.id,
                          citizenConfirmation: "confirmed",
                        })
                      }
                      className="rounded-full flex items-center justify-center gap-2 bg-[#16422f] px-4 py-3 font-mono-ui text-[0.57rem] font-semibold uppercase tracking-[0.1em] text-white"
                    >
                      <CheckCircle2 size={15} />
                      Confirm outcome
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        review.mutate({
                          id: item.id,
                          citizenConfirmation: "disputed",
                        })
                      }
                      className="rounded-full flex items-center justify-center gap-2 border border-[#bd5a38]/70 px-4 py-3 font-mono-ui text-[0.57rem] font-semibold uppercase tracking-[0.1em] text-[#a84626]"
                    >
                      <XCircle size={15} />
                      Raise concern
                    </button>
                  </div>
                  {review.isSuccess && (
                    <p className="mt-3 font-body text-[0.73rem] text-[#386548]">
                      Your confirmation has been recorded.
                    </p>
                  )}
                </article>
              ))}
            </div>
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
      No closeout has been submitted for this challenge.
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
