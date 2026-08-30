import AdminHeader from "@/components/AdminHeader";
import { ChevronRight, Loader2, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";

const ROLE_LABEL: Record<string, string> = {
  citizen: "Citizen",
  institution: "Institution",
  industry: "Industry",
  admin: "Administrator",
};

export default function AdminUsers() {
  const [tab, setTab] = useState("All");
  const [query, setQuery] = useState("");
  const usersQuery = trpc.auth.allUsers.useQuery();
  const [input] = useState({});
  const organizationsQuery = trpc.workflow.organizations.useQuery(input);
  const challengesQuery = trpc.workflow.challenges.useQuery(input);

  const organizations = organizationsQuery.data ?? [];
  const accounts = usersQuery.data ?? [];

  const rows = useMemo(
    () =>
      accounts
        .map(account => ({
          uid: account.uid,
          email: account.email,
          name: account.name,
          role: ROLE_LABEL[account.role] ?? account.role,
          joined: account.createdAt,
          organization: account.organizationId
            ? organizations.find(org => org.id === account.organizationId)
            : undefined,
        }))
        .sort(
          (a, b) =>
            new Date(b.joined ?? 0).getTime() -
            new Date(a.joined ?? 0).getTime()
        ),
    [accounts, organizations]
  );
  const knownEmails = useMemo(
    () => new Set(accounts.map(a => a.email?.toLowerCase()).filter(Boolean)),
    [accounts]
  );
  const unlinkedReports = useMemo(() => {
    const byEmail = new Map<
      string,
      {
        name: string;
        email: string;
        count: number;
        latest: Date | string | null;
      }
    >();
    for (const challenge of challengesQuery.data ?? []) {
      const email = challenge.citizenEmail?.toLowerCase();
      if (!email || knownEmails.has(email)) continue;
      const existing = byEmail.get(email);
      if (existing) {
        existing.count += 1;
        if (
          challenge.createdAt &&
          (!existing.latest ||
            new Date(challenge.createdAt) > new Date(existing.latest))
        )
          existing.latest = challenge.createdAt;
      } else {
        byEmail.set(email, {
          name: challenge.citizenName,
          email: challenge.citizenEmail!,
          count: 1,
          latest: challenge.createdAt ?? null,
        });
      }
    }
    return Array.from(byEmail.values());
  }, [challengesQuery.data, knownEmails]);

  const visible = rows.filter(
    row =>
      (tab === "All" || row.role === tab) &&
      `${row.name ?? ""} ${row.email ?? ""}`
        .toLowerCase()
        .includes(query.toLowerCase())
  );
  const loading =
    usersQuery.isLoading ||
    organizationsQuery.isLoading ||
    challengesQuery.isLoading;
  const error =
    usersQuery.error || organizationsQuery.error || challengesQuery.error;

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
                Every signed-up Samadhan account, by role.
              </p>
              <div className="mt-6 flex gap-6">
                {[
                  "All",
                  "Citizen",
                  "Institution",
                  "Industry",
                  "Administrator",
                ].map(item => (
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
          {loading ? (
            <Loading />
          ) : error ? (
            <Failure
              message={error.message}
              retry={() => {
                void usersQuery.refetch();
                void organizationsQuery.refetch();
                void challengesQuery.refetch();
              }}
            />
          ) : (
            <>
              <p className="mt-5 font-body text-[0.8rem]">
                Showing {visible.length} of {rows.length} accounts
              </p>
              <div className="mt-4 hidden grid-cols-[1.25fr_1.15fr_.72fr_.7fr_.68fr] gap-5 border-y border-[#a78e6e]/40 py-4 font-mono-ui text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-[#314a40] lg:grid">
                <span>Name</span>
                <span>Email</span>
                <span>Role</span>
                <span>Joined</span>
                <span>Workspace</span>
              </div>
              <div>
                {visible.map(row => (
                  <article
                    key={row.uid}
                    className="grid gap-3 border-b border-[#a78e6e]/40 py-4 lg:grid-cols-[1.25fr_1.15fr_.72fr_.7fr_.68fr] lg:items-center lg:gap-5 lg:px-3"
                  >
                    <h2 className="font-display text-[1.23rem] leading-none sm:text-[1.38rem]">
                      {row.name || (
                        <span className="font-body text-[0.85rem] italic text-[#8a9a90]">
                          Not provided
                        </span>
                      )}
                    </h2>
                    <p className="font-body text-[0.77rem] text-[#354f43]">
                      {row.email}
                    </p>
                    <span className="w-fit border border-[#849b83] px-2 py-1.5 font-mono-ui text-[0.56rem] uppercase tracking-[0.09em] text-[#416348]">
                      {row.role}
                    </span>
                    <p className="font-body text-[0.76rem]">
                      {row.joined
                        ? new Date(row.joined).toLocaleDateString()
                        : "—"}
                    </p>
                    <a
                      href={`/admin/users/${row.uid}`}
                      className="inline-flex items-center gap-1 font-body text-[0.75rem] font-semibold text-[#b94b27]"
                    >
                      Open profile <ChevronRight size={16} />
                    </a>
                  </article>
                ))}
                {visible.length === 0 && <Empty />}
              </div>
              {unlinkedReports.length > 0 && (
                <section className="mt-12 border-t border-[#a78e6e]/40 pt-6">
                  <p className="font-mono-ui text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-[#7a6a4c]">
                    Reported without a Samadhan account
                  </p>
                  <p className="mt-2 max-w-[54rem] font-body text-[0.78rem] text-[#607168]">
                    These challenge submissions list a citizen email that
                    doesn&apos;t match any signed-up account — usually a report
                    filed before the reporter created one.
                  </p>
                  <div className="mt-4 space-y-2">
                    {unlinkedReports.map(item => (
                      <div
                        key={item.email}
                        className="flex flex-wrap items-center justify-between gap-3 border border-dashed border-[#a58c6d]/45 px-4 py-3"
                      >
                        <span className="font-body text-[0.8rem]">
                          {item.name} · {item.email}
                        </span>
                        <span className="font-mono-ui text-[0.58rem] uppercase tracking-[0.08em] text-[#8a7a5c]">
                          {item.count} {item.count === 1 ? "report" : "reports"}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
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
