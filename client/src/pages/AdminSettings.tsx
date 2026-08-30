/** Style: Samadhan governance settings — admin account controls plus an operational audit readout. */
import AdminHeader from "@/components/AdminHeader";
import { useAuth } from "@/hooks/useAuth";
import { Check, Database, Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";

function AccountSection() {
  const { user } = useAuth();
  const me = trpc.auth.me.useQuery(undefined, { enabled: !!user });
  const utils = trpc.useUtils();
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);
  const mutation = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      void utils.auth.me.invalidate();
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2600);
    },
  });

  useEffect(() => {
    setName(me.data?.name ?? "");
  }, [me.data?.name]);

  if (!user || me.isLoading) {
    return (
      <div className="mt-8 flex items-center gap-3 border border-[#a58c6d]/55 bg-[#f8f2e8]/25 px-5 py-6 font-body text-[0.82rem] text-[#52675d]">
        <Loader2 className="animate-spin" size={18} />
        Loading your account…
      </div>
    );
  }

  return (
    <section className="mt-8 border border-[#a58c6d]/55 bg-[#f8f2e8]/25 p-6">
      <p className="font-mono-ui text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-[#c64b22]">
        Your account
      </p>
      <form
        onSubmit={event => {
          event.preventDefault();
          mutation.mutate({ name: name.trim() });
        }}
        className="mt-5 grid gap-5 sm:grid-cols-[minmax(0,22rem)_minmax(0,22rem)_auto] sm:items-end"
      >
        <label className="block">
          <span className="font-mono-ui text-[0.58rem] font-semibold uppercase tracking-[0.1em] text-[#4a6257]">
            Full name
          </span>
          <input
            value={name}
            onChange={event => setName(event.target.value)}
            placeholder="Add your name"
            className="citizen-input mt-2"
          />
        </label>
        <label className="block">
          <span className="font-mono-ui text-[0.58rem] font-semibold uppercase tracking-[0.1em] text-[#4a6257]">
            Email address
          </span>
          <input
            value={me.data?.email ?? ""}
            readOnly
            disabled
            className="citizen-input mt-2 cursor-not-allowed opacity-60"
          />
        </label>
        <div className="flex items-center gap-3">
          <button
            disabled={mutation.isPending}
            type="submit"
            className="rounded-full bg-[#16422f] px-6 py-3 font-mono-ui text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-white transition hover:bg-[#275d3f] disabled:opacity-70"
          >
            {mutation.isPending ? "Saving…" : "Save"}
          </button>
          {saved && (
            <span className="inline-flex items-center gap-1.5 font-body text-[0.72rem] text-[#3d6e4c]">
              <Check size={14} /> Saved
            </span>
          )}
        </div>
      </form>
    </section>
  );
}

export default function AdminSettings() {
  const [input] = useState({});
  const organizationsQuery = trpc.workflow.organizations.useQuery(input);
  const challengesQuery = trpc.workflow.challenges.useQuery(input);
  const projectsQuery = trpc.workflow.projects.useQuery(input);
  const closeoutsQuery = trpc.workflow.projectCloseouts.useQuery(input);
  const loading =
    organizationsQuery.isLoading ||
    challengesQuery.isLoading ||
    projectsQuery.isLoading ||
    closeoutsQuery.isLoading;
  const error =
    organizationsQuery.error ||
    challengesQuery.error ||
    projectsQuery.error ||
    closeoutsQuery.error;
  const audit = useMemo(
    () =>
      [
        ...(organizationsQuery.data ?? []).map(item => ({
          id: `org-${item.id}`,
          date: item.updatedAt ?? item.createdAt,
          kind: "Organization",
          title: item.name,
          detail: `Verification: ${item.verificationStatus}`,
        })),
        ...(challengesQuery.data ?? []).map(item => ({
          id: `challenge-${item.id}`,
          date: item.updatedAt ?? item.createdAt,
          kind: "Challenge",
          title: item.title,
          detail: `Status: ${item.status}`,
        })),
        ...(projectsQuery.data ?? []).map(item => ({
          id: `project-${item.id}`,
          date: item.updatedAt ?? item.createdAt,
          kind: "Project",
          title: item.title,
          detail: `Status: ${item.status}`,
        })),
        ...(closeoutsQuery.data ?? []).map(item => ({
          id: `closeout-${item.id}`,
          date: item.updatedAt ?? item.createdAt,
          kind: "Closeout",
          title: `Project ${item.projectId}`,
          detail: `Citizen: ${item.citizenConfirmation}; admin: ${item.adminStatus}`,
        })),
      ]
        .sort(
          (a, b) =>
            new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime()
        )
        .slice(0, 18),
    [
      organizationsQuery.data,
      challengesQuery.data,
      projectsQuery.data,
      closeoutsQuery.data,
    ]
  );
  return (
    <main
      className="min-h-screen bg-[#f1eadc] text-[#0d3024]"
      style={{
        backgroundImage: "url('/images/samadhan-paper-grain_46302c3f.jpg')",
        backgroundSize: "cover",
      }}
    >
      <AdminHeader active="Settings" />
      <section className="px-6 py-10 sm:px-10 lg:px-[4rem]">
        <div className="mx-auto max-w-[90rem]">
          <p className="font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.13em] text-[#c64b22]">
            Governance settings & audit
          </p>
          <h1 className="mt-4 font-display text-[4.2rem] leading-[0.86] tracking-[-0.04em]">
            Workflow control room.
          </h1>
          <p className="mt-5 max-w-[54rem] font-body text-[0.88rem] leading-relaxed text-[#53675d]">
            Manage your own administrator account below, and review the
            persisted workflow state and audit events across the platform.
          </p>
          <AccountSection />
          {loading ? (
            <Loading />
          ) : error ? (
            <Failure
              message={error.message}
              retry={() => {
                void organizationsQuery.refetch();
                void challengesQuery.refetch();
                void projectsQuery.refetch();
                void closeoutsQuery.refetch();
              }}
            />
          ) : (
            <>
              <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                <Card
                  label="Pending institution reviews"
                  value={
                    (organizationsQuery.data ?? []).filter(
                      item =>
                        item.kind === "institution" &&
                        item.verificationStatus === "pending"
                    ).length
                  }
                />
                <Card
                  label="Challenges in review"
                  value={
                    (challengesQuery.data ?? []).filter(
                      item => item.status === "under_review"
                    ).length
                  }
                />
                <Card
                  label="Projects at risk"
                  value={
                    (projectsQuery.data ?? []).filter(
                      item => item.status === "at_risk"
                    ).length
                  }
                />
                <Card
                  label="Closeouts awaiting decision"
                  value={
                    (closeoutsQuery.data ?? []).filter(
                      item => item.adminStatus === "pending"
                    ).length
                  }
                />
              </div>
              <div className="mt-8 grid gap-7 xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,.55fr)]">
                <section>
                  <p className="border-b border-[#a78e6e]/45 pb-3 font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.12em]">
                    Recent audit events
                  </p>
                  <div className="mt-5 space-y-3">
                    {audit.map(event => (
                      <article
                        key={event.id}
                        className="border-l-2 border-[#8fa887] bg-[#f8f2e8]/20 p-4"
                      >
                        <p className="font-mono-ui text-[0.52rem] uppercase tracking-[0.08em] text-[#64776d]">
                          {event.kind} ·{" "}
                          {event.date
                            ? new Date(event.date).toLocaleString()
                            : ""}
                        </p>
                        <h2 className="mt-2 font-display text-[1.4rem] leading-none">
                          {event.title}
                        </h2>
                        <p className="mt-2 font-body text-[0.74rem] text-[#53675d]">
                          {event.detail}
                        </p>
                      </article>
                    ))}
                    {audit.length === 0 && (
                      <p className="font-body text-[0.78rem] text-[#607168]">
                        No persisted audit events are available yet.
                      </p>
                    )}
                  </div>
                </section>
                <aside className="space-y-5">
                  <section className="border border-[#a58c6d]/55 bg-[#f8f2e8]/25 p-6">
                    <ShieldCheck className="text-[#315947]" size={26} />
                    <p className="mt-4 font-mono-ui text-[0.58rem] font-semibold uppercase tracking-[0.1em]">
                      Data-access boundary
                    </p>
                    <p className="mt-3 font-body text-[0.78rem] leading-relaxed text-[#53675d]">
                      There is no server in front of this data. The browser
                      talks to Firestore directly, and{" "}
                      <code className="font-mono-ui text-[0.72rem]">
                        firestore.rules
                      </code>{" "}
                      is the entire access boundary. Admin actions are
                      authorized by the Firebase Auth <code>admin</code> custom
                      claim, never by a client-supplied role.
                    </p>
                  </section>
                  <section className="border border-[#a58c6d]/55 bg-[#f8f2e8]/25 p-6">
                    <Database className="text-[#c94a20]" size={26} />
                    <p className="mt-4 font-mono-ui text-[0.58rem] font-semibold uppercase tracking-[0.1em]">
                      Platform scope
                    </p>
                    <p className="mt-3 font-body text-[0.78rem] leading-relaxed text-[#53675d]">
                      Samadhan runs on Firebase Authentication and Cloud
                      Firestore under the free Spark tier. File uploads are
                      stored inline in Firestore documents rather than Cloud
                      Storage, which requires the paid Blaze plan.
                    </p>
                  </section>
                </aside>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
function Card({ label, value }: { label: string; value: number }) {
  return (
    <article className="border border-[#a58c6d]/55 px-6 py-7">
      <p className="font-body text-[3.6rem] font-extrabold leading-none tabular-nums text-[#153e2d]">
        {String(value).padStart(2, "0")}
      </p>
      <p className="mt-5 font-mono-ui text-[0.58rem] font-semibold uppercase tracking-[0.1em] text-[#53675d]">
        {label}
      </p>
    </article>
  );
}
function Loading() {
  return (
    <div className="mt-8 flex items-center gap-3 font-body text-[#52675d]">
      <Loader2 className="animate-spin" size={18} />
      Loading governance records…
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
