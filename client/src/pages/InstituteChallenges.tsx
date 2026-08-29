import InstituteHeader from "@/components/InstituteHeader";
import { ChevronRight, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
        backgroundImage:
          "url('/manus-storage/samadhan-paper-grain_46302c3f.jpg')",
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
                {queue.map(({ assignment, challenge }) => (
                  <article
                    key={assignment.id}
                    className="grid gap-4 border-b border-[#a78e6e]/40 py-5 lg:grid-cols-[minmax(18rem,1.7fr)_.8fr_.65fr_.8fr_7rem] lg:items-center lg:gap-5 lg:px-3"
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
                    <span className="w-fit border border-[#c79e7a]/70 px-2 py-1 font-mono-ui text-[0.55rem] uppercase tracking-[0.08em] text-[#9d572e]">
                      {assignment.status}
                    </span>
                    <a
                      href={`/institute/challenges/${challenge?.id}`}
                      className="inline-flex w-fit items-center gap-1 font-body text-[0.76rem] font-semibold text-[#b94b27]"
                    >
                      Review <ChevronRight size={16} />
                    </a>
                  </article>
                ))}
                {queue.length === 0 && <Empty />}
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
