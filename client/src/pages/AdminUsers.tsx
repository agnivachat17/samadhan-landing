import AdminHeader from "@/components/AdminHeader";
import { ChevronRight, Loader2, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";

type RegistryUser = {
  email: string;
  name: string;
  role: "Citizen" | "Institution" | "Industry";
  joined?: Date | string | null;
  status: string;
};
export default function AdminUsers() {
  const [tab, setTab] = useState("All");
  const [query, setQuery] = useState("");
  const [input] = useState({});
  const organizationsQuery = trpc.workflow.organizations.useQuery(input);
  const challengesQuery = trpc.workflow.challenges.useQuery(input);
  const users = useMemo<RegistryUser[]>(() => {
    const organizations = (organizationsQuery.data ?? []).map(org => ({
      email: org.contactEmail,
      name: org.name,
      role:
        org.kind === "institution"
          ? ("Institution" as const)
          : ("Industry" as const),
      joined: org.createdAt,
      status: org.verificationStatus,
    }));
    const known = new Set(organizations.map(user => user.email.toLowerCase()));
    const citizens = (challengesQuery.data ?? [])
      .filter(
        challenge =>
          challenge.citizenEmail &&
          !known.has(challenge.citizenEmail.toLowerCase())
      )
      .map(challenge => ({
        email: challenge.citizenEmail!,
        name: challenge.citizenName,
        role: "Citizen" as const,
        joined: challenge.createdAt,
        status: "active",
      }));
    return [...organizations, ...citizens].sort(
      (a, b) =>
        new Date(b.joined ?? 0).getTime() - new Date(a.joined ?? 0).getTime()
    );
  }, [organizationsQuery.data, challengesQuery.data]);
  const visible = users.filter(
    user =>
      (tab === "All" ||
        `${user.role}s` === tab ||
        (tab === "Institutions" && user.role === "Institution")) &&
      `${user.name} ${user.email}`.toLowerCase().includes(query.toLowerCase())
  );
  return (
    <main
      className="min-h-screen bg-[#f1eadc] text-[#0d3024]"
      style={{
        backgroundImage: "url('/images/samadhan-paper-grain_46302c3f.jpg')",
        backgroundSize: "cover",
      }}
    >
      <AdminHeader active="Users" />
      <section className="px-6 py-10 sm:px-10 lg:px-[3rem]">
        <div className="mx-auto max-w-[96rem]">
          <div className="flex flex-col justify-between gap-6 border-b border-[#a78e6e]/45 pb-6 lg:flex-row lg:items-end">
            <div>
              <h1 className="font-display text-[3.8rem] font-medium leading-[0.86] tracking-[-0.04em] sm:text-[5rem]">
                User Accounts
              </h1>
              <p className="mt-4 font-body text-[0.9rem] text-[#53675d]">
                Review the persisted citizen and organization contacts taking
                part in the workflow.
              </p>
              <div className="mt-6 flex gap-6">
                {["All", "Citizens", "Institutions", "Industry"].map(item => (
                  <button
                    type="button"
                    key={item}
                    onClick={() => setTab(item)}
                    className={`border-b-2 pb-4 font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.09em] ${tab === item ? "border-[#c64b22] text-[#c04a27]" : "border-transparent"}`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex h-[3.3rem] w-full max-w-[19rem] items-center gap-3 border border-[#a58c6d]/55 bg-[#f8f2e8]/28 px-4">
              <Search size={20} />
              <input
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Search name or email…"
                className="min-w-0 flex-1 bg-transparent font-body text-[0.78rem] outline-none"
              />
            </label>
          </div>
          {organizationsQuery.isLoading || challengesQuery.isLoading ? (
            <Loading />
          ) : organizationsQuery.isError || challengesQuery.isError ? (
            <Failure
              message={
                organizationsQuery.error?.message ||
                challengesQuery.error?.message ||
                "User records could not load."
              }
              retry={() => {
                void organizationsQuery.refetch();
                void challengesQuery.refetch();
              }}
            />
          ) : (
            <>
              <p className="mt-5 font-body text-[0.8rem]">
                Showing {visible.length} persisted user contacts
              </p>
              <div className="mt-4 hidden grid-cols-[1.25fr_1.15fr_.72fr_.7fr_.68fr] gap-5 border-y border-[#a78e6e]/40 py-4 font-mono-ui text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-[#314a40] lg:grid">
                <span>Name</span>
                <span>Email</span>
                <span>Role</span>
                <span>Joined</span>
                <span>Workspace</span>
              </div>
              <div>
                {visible.map(user => (
                  <article
                    key={`${user.role}-${user.email}`}
                    className="grid gap-3 border-b border-[#a78e6e]/40 py-4 lg:grid-cols-[1.25fr_1.15fr_.72fr_.7fr_.68fr] lg:items-center lg:gap-5 lg:px-3"
                  >
                    <h2 className="font-display text-[1.23rem] leading-none sm:text-[1.38rem]">
                      {user.name}
                    </h2>
                    <p className="font-body text-[0.77rem] text-[#354f43]">
                      {user.email}
                    </p>
                    <span className="w-fit border border-[#849b83] px-2 py-1.5 font-mono-ui text-[0.56rem] uppercase tracking-[0.09em] text-[#416348]">
                      {user.role}
                    </span>
                    <p className="font-body text-[0.76rem]">
                      {user.joined
                        ? new Date(user.joined).toLocaleDateString()
                        : "—"}
                    </p>
                    <a
                      href={`/admin/users/${encodeURIComponent(user.email)}`}
                      className="inline-flex items-center gap-1 font-body text-[0.75rem] font-semibold text-[#b94b27]"
                    >
                      Open profile <ChevronRight size={16} />
                    </a>
                  </article>
                ))}
                {visible.length === 0 && <Empty />}
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
    <div className="mt-7 flex items-center gap-3 font-body text-[#52675d]">
      <Loader2 className="animate-spin" size={18} />
      Loading persisted user records…
    </div>
  );
}
function Empty() {
  return (
    <div className="mt-7 border border-dashed border-[#a58c6d]/55 p-8 text-center font-body text-[0.8rem] text-[#586d63]">
      No user records match this view.
    </div>
  );
}
function Failure({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div
      role="alert"
      className="mt-7 border border-[#bd5a38]/60 bg-[#f7e2d6]/35 p-6"
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
