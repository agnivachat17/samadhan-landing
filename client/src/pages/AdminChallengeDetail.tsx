/** Style: Samadhan admin challenge review with persisted duplicate resolution and institution assignment. */
import AdminHeader from "@/components/AdminHeader";
import {
  CheckCircle2,
  GitCompareArrows,
  Loader2,
  Send,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { ChallengeLocationMap } from "@/components/ChallengeLocationMap";

export default function AdminChallengeDetail() {
  const [, params] = useRoute("/admin/challenges/:id");
  const [, setLocation] = useLocation();
  const id = Number(params?.id ?? 0);
  const challengeInput = useMemo(() => ({ id: id || 1 }), [id]);
  const assignmentInput = useMemo(() => ({ challengeId: id || 1 }), [id]);
  const [emptyInput] = useState({});
  const [institutionInput] = useState({ kind: "institution" as const });
  const challengeQuery = trpc.workflow.challengeById.useQuery(challengeInput, {
    enabled: id > 0,
  });
  const challengesQuery = trpc.workflow.challenges.useQuery(emptyInput);
  const institutionsQuery =
    trpc.workflow.organizations.useQuery(institutionInput);
  const assignmentsQuery = trpc.workflow.assignments.useQuery(assignmentInput, {
    enabled: id > 0,
  });
  const utils = trpc.useUtils();
  const [organizationId, setOrganizationId] = useState("");
  const [rationale, setRationale] = useState("");
  const [adminName, setAdminName] = useState("Samadhan Administrator");
  const [duplicateOfId, setDuplicateOfId] = useState("");
  const [notes, setNotes] = useState("");
  const refresh = () => {
    void utils.workflow.challengeById.invalidate();
    void utils.workflow.challenges.invalidate();
    void utils.workflow.assignments.invalidate();
  };
  const assignMutation = trpc.workflow.assignChallenge.useMutation({
    onSuccess: refresh,
  });
  const updateChallenge = trpc.workflow.updateChallenge.useMutation({
    onSuccess: refresh,
  });
  const challenge = challengeQuery.data;
  const candidates = (challengesQuery.data ?? []).filter(
    item => item.id !== id
  );
  const institutions = (institutionsQuery.data ?? []).filter(
    item => item.verificationStatus === "verified"
  );

  function assign(event: React.FormEvent) {
    event.preventDefault();
    if (!organizationId) return;
    assignMutation.mutate({
      challengeId: id,
      organizationId: Number(organizationId),
      adminName,
      rationale: rationale || undefined,
    });
  }
  function resolveDuplicate(duplicateStatus: "cleared" | "confirmed") {
    if (!challenge) return;
    updateChallenge.mutate({
      id: challenge.id,
      duplicateStatus,
      duplicateOfId:
        duplicateStatus === "confirmed" ? Number(duplicateOfId) : undefined,
      adminReviewNotes: notes || undefined,
      status: duplicateStatus === "confirmed" ? "rejected" : "under_review",
    });
  }

  return (
    <main
      className="min-h-screen bg-[#f1eadc] text-[#0d3024]"
      style={{
        backgroundImage:
          "url('/manus-storage/samadhan-paper-grain_46302c3f.jpg')",
        backgroundSize: "cover",
      }}
    >
      <AdminHeader active="Challenges" />
      <section className="px-6 py-8 sm:px-10 lg:px-[5rem] lg:py-10">
        <div className="mx-auto max-w-[76rem]">
          <button
            type="button"
            onClick={() => setLocation("/admin/challenges")}
            className="font-body text-[0.78rem] text-[#496257] hover:text-[#c64b22]"
          >
            ← Back to Challenge Ledger
          </button>
          {challengeQuery.isLoading ? (
            <Loading />
          ) : challengeQuery.isError ? (
            <ErrorPanel
              message={challengeQuery.error.message}
              onRetry={() => void challengeQuery.refetch()}
            />
          ) : !challenge ? (
            <Empty />
          ) : (
            <div className="mt-8 grid gap-10 xl:grid-cols-[minmax(0,1.15fr)_minmax(23rem,.85fr)]">
              <article>
                <p className="font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.13em] text-[#c64b22]">
                  Challenge review · {challenge.status.replaceAll("_", " ")}
                </p>
                <h1 className="mt-4 font-display text-[3.6rem] leading-[0.86] tracking-[-0.04em] sm:text-[4.6rem]">
                  {challenge.title}
                </h1>
                <p className="mt-6 whitespace-pre-wrap font-body text-[0.92rem] leading-relaxed text-[#52675d]">
                  {challenge.description}
                </p>
                <dl className="mt-8 grid gap-4 border-y border-[#a78e6e]/45 py-5 sm:grid-cols-3">
                  <Meta label="Domain" value={challenge.domain} />
                  <Meta label="District" value={challenge.district} />
                  <Meta
                    label="Citizen contact"
                    value={
                      challenge.citizenEmail ||
                      challenge.citizenPhone ||
                      "Not provided"
                    }
                  />
                </dl>
                <section className="mt-8">
                  <ChallengeLocationMap
                    latitude={challenge.latitude}
                    longitude={challenge.longitude}
                    district={challenge.district}
                  />
                </section>
                <section className="mt-8">
                  <p className="border-b border-[#a78e6e]/45 pb-3 font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.12em]">
                    Assignment history
                  </p>
                  {assignmentsQuery.isLoading ? (
                    <p className="mt-4 font-body text-[0.8rem] text-[#586d63]">
                      Loading assignment history…
                    </p>
                  ) : assignmentsQuery.isError ? (
                    <DependencyError
                      message="Assignment history could not load."
                      onRetry={() => void assignmentsQuery.refetch()}
                    />
                  ) : (assignmentsQuery.data ?? []).length === 0 ? (
                    <p className="mt-4 font-body text-[0.8rem] text-[#586d63]">
                      No institution has been assigned yet.
                    </p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {assignmentsQuery.data?.map(item => (
                        <div
                          key={item.id}
                          className="border border-[#a58c6d]/45 p-4 font-body text-[0.8rem]"
                        >
                          <p className="font-semibold">
                            Institution ID {item.organizationId} · {item.status}
                          </p>
                          <p className="mt-1 text-[#596d63]">
                            {item.rationale || "No rationale recorded"}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </article>
              <aside className="space-y-6">
                <form
                  onSubmit={assign}
                  className="border border-[#a58c6d]/55 bg-[#f8f2e8]/25 p-6"
                >
                  <p className="font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.13em]">
                    Assign a verified institution
                  </p>
                  {institutionsQuery.isLoading ? (
                    <p className="mt-4 font-body text-[0.78rem] text-[#586d63]">
                      Loading verified institutions…
                    </p>
                  ) : institutionsQuery.isError ? (
                    <DependencyError
                      message="Verified institution profiles could not load."
                      onRetry={() => void institutionsQuery.refetch()}
                    />
                  ) : (
                    <>
                      <label className="mt-5 block">
                        <span className="font-body text-[0.78rem]">
                          Institution
                        </span>
                        <select
                          required
                          value={organizationId}
                          onChange={event =>
                            setOrganizationId(event.target.value)
                          }
                          className="citizen-input mt-2"
                        >
                          <option value="">Select verified institution</option>
                          {institutions.map(item => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      {institutions.length === 0 && (
                        <p className="mt-3 font-body text-[0.7rem] text-[#a34b2c]">
                          No verified institution profiles are available yet.
                        </p>
                      )}
                    </>
                  )}
                  <label className="mt-4 block">
                    <span className="font-body text-[0.78rem]">
                      Administrator name
                    </span>
                    <input
                      value={adminName}
                      onChange={event => setAdminName(event.target.value)}
                      className="citizen-input mt-2"
                      required
                    />
                  </label>
                  <label className="mt-4 block">
                    <span className="font-body text-[0.78rem]">
                      Assignment rationale
                    </span>
                    <textarea
                      value={rationale}
                      onChange={event => setRationale(event.target.value)}
                      className="citizen-input mt-2 min-h-[6rem] resize-y"
                      placeholder="Explain the expertise, location, or facilities match…"
                    />
                  </label>
                  <button
                    disabled={
                      assignMutation.isPending ||
                      institutionsQuery.isLoading ||
                      institutionsQuery.isError ||
                      institutions.length === 0
                    }
                    className="rounded-full mt-5 flex w-full items-center justify-center gap-2 bg-[#c94a20] px-5 py-4 font-mono-ui text-[0.61rem] font-semibold uppercase tracking-[0.1em] text-white disabled:opacity-70"
                  >
                    <Send size={16} />
                    {assignMutation.isPending
                      ? "Assigning…"
                      : "Assign challenge"}
                  </button>
                  {assignMutation.isError && (
                    <p
                      role="alert"
                      className="mt-3 font-body text-[0.72rem] text-[#a34b2c]"
                    >
                      {assignMutation.error.message}
                    </p>
                  )}
                  {assignMutation.isSuccess && (
                    <p className="mt-3 font-body text-[0.72rem] text-[#386548]">
                      Assignment recorded. The institute can now review this
                      challenge.
                    </p>
                  )}
                </form>
                <section className="border border-[#a58c6d]/55 bg-[#f8f2e8]/25 p-6">
                  <p className="flex items-center gap-2 font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.13em]">
                    <GitCompareArrows size={17} />
                    Duplicate resolution
                  </p>
                  {challengesQuery.isLoading ? (
                    <p className="mt-4 font-body text-[0.78rem] text-[#586d63]">
                      Loading possible matches…
                    </p>
                  ) : challengesQuery.isError ? (
                    <DependencyError
                      message="Potential duplicate challenges could not load."
                      onRetry={() => void challengesQuery.refetch()}
                    />
                  ) : (
                    <label className="mt-5 block">
                      <span className="font-body text-[0.78rem]">
                        Potential matching challenge
                      </span>
                      <select
                        value={duplicateOfId}
                        onChange={event => setDuplicateOfId(event.target.value)}
                        className="citizen-input mt-2"
                      >
                        <option value="">
                          Select only if confirming duplicate
                        </option>
                        {candidates.map(item => (
                          <option key={item.id} value={item.id}>
                            {item.title}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <label className="mt-4 block">
                    <span className="font-body text-[0.78rem]">
                      Review notes
                    </span>
                    <textarea
                      value={notes}
                      onChange={event => setNotes(event.target.value)}
                      className="citizen-input mt-2 min-h-[6rem] resize-y"
                      placeholder="Record the evidence used in this duplicate decision…"
                    />
                  </label>
                  <div className="mt-5 grid gap-3">
                    <button
                      type="button"
                      disabled={
                        updateChallenge.isPending || challengesQuery.isError
                      }
                      onClick={() => resolveDuplicate("cleared")}
                      className="rounded-full flex items-center justify-center gap-2 bg-[#16422f] px-4 py-3 font-mono-ui text-[0.58rem] font-semibold uppercase tracking-[0.09em] text-white disabled:opacity-60"
                    >
                      <CheckCircle2 size={15} />
                      Clear as unique
                    </button>
                    <button
                      type="button"
                      disabled={
                        updateChallenge.isPending ||
                        challengesQuery.isError ||
                        !duplicateOfId
                      }
                      onClick={() => resolveDuplicate("confirmed")}
                      className="rounded-full flex items-center justify-center gap-2 border border-[#bd5a38]/70 px-4 py-3 font-mono-ui text-[0.58rem] font-semibold uppercase tracking-[0.09em] text-[#ab4826] disabled:opacity-50"
                    >
                      <XCircle size={15} />
                      Confirm duplicate
                    </button>
                  </div>
                  {updateChallenge.isError && (
                    <p
                      role="alert"
                      className="mt-4 font-body text-[0.74rem] text-[#a34b2c]"
                    >
                      {updateChallenge.error.message}
                    </p>
                  )}
                  {updateChallenge.isSuccess && (
                    <p className="mt-4 font-body text-[0.74rem] text-[#386548]">
                      Duplicate review has been recorded.
                    </p>
                  )}
                </section>
              </aside>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono-ui text-[0.54rem] font-semibold uppercase tracking-[0.1em] text-[#687a70]">
        {label}
      </dt>
      <dd className="mt-1 font-body text-[0.8rem]">{value}</dd>
    </div>
  );
}
function Loading() {
  return (
    <div className="mt-8 flex items-center gap-3 border border-[#a58c6d]/55 bg-[#f8f2e8]/25 p-7 font-body text-[#52675d]">
      <Loader2 className="animate-spin" size={20} />
      Loading challenge review…
    </div>
  );
}
function Empty() {
  return (
    <div className="mt-8 border border-dashed border-[#9a876c]/65 bg-[#f8f2e8]/25 p-8 text-center">
      <p className="font-display text-[2rem]">Challenge record not found.</p>
    </div>
  );
}
function ErrorPanel({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="mt-8 border border-[#bd5a38]/60 bg-[#f7e2d6]/35 p-7"
    >
      <p className="font-display text-[1.8rem]">
        The challenge review could not load.
      </p>
      <p className="mt-2 font-body text-[0.78rem] text-[#8f442b]">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-full mt-4 border border-[#bd5a38]/60 px-4 py-2 font-mono-ui text-[0.55rem] font-semibold uppercase tracking-[0.09em] text-[#a54426]"
      >
        Retry
      </button>
    </div>
  );
}
function DependencyError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <p role="alert" className="mt-4 font-body text-[0.74rem] text-[#a34b2c]">
      {message}{" "}
      <button type="button" onClick={onRetry} className="underline">
        Retry
      </button>
    </p>
  );
}
