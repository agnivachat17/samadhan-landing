/**
 * Style: Samadhan administrator institution register — formal paper ledger of persisted onboarding records.
 */
import AdminHeader from "@/components/AdminHeader";
import { ExternalLink, Loader2, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";

export default function AdminInstitutions() {
  const [query, setQuery] = useState("");
  const [verification, setVerification] = useState("all");
  const [type, setType] = useState("all");
  const [input] = useState({ kind: "institution" as const });
  const institutionsQuery = trpc.workflow.organizations.useQuery(input);
  const visible = useMemo(
    () =>
      (institutionsQuery.data ?? []).filter(item => {
        const matchesVerification =
          verification === "all" || item.verificationStatus === verification;
        const matchesType = type === "all" || item.institutionType === type;
        const text =
          `${item.name} ${item.contactEmail} ${item.location} ${item.expertise}`.toLowerCase();
        return (
          matchesVerification &&
          matchesType &&
          text.includes(query.toLowerCase())
        );
      }),
    [institutionsQuery.data, query, type, verification]
  );
  const typeOptions = Array.from(
    new Set(
      (institutionsQuery.data ?? [])
        .map(item => item.institutionType)
        .filter(Boolean)
    )
  ) as string[];

  return (
    <main
      className="min-h-screen bg-[#f1eadc] text-[#0d3024]"
      style={{
        backgroundImage: "url('/images/samadhan-paper-grain_46302c3f.jpg')",
        backgroundSize: "cover",
      }}
    >
      <AdminHeader active="Institutions" />
      <section className="px-6 py-10 sm:px-10 lg:px-[3rem] lg:py-10">
        <div className="mx-auto max-w-[96rem]">
          <h1 className="font-display text-[3.8rem] font-medium leading-[0.86] tracking-[-0.04em] sm:text-[5rem]">
            Institution Accounts
          </h1>
          <p className="mt-4 font-body text-[0.9rem] text-[#53675d]">
            Review real institution registrations and record their verification
            decisions.
          </p>
          <div className="mt-5 grid gap-5 border-b border-[#a78e6e]/45 pb-7 lg:grid-cols-[1.7fr_.8fr_.85fr]">
            <SearchField value={query} onChange={setQuery} />
            <AdminSelect
              label="Verification status"
              value={verification}
              onChange={setVerification}
              options={[
                { value: "all", label: "All statuses" },
                { value: "pending", label: "Pending" },
                { value: "verified", label: "Verified" },
                { value: "rejected", label: "Changes requested" },
              ]}
            />
            <AdminSelect
              label="Type"
              value={type}
              onChange={setType}
              options={[
                { value: "all", label: "All types" },
                ...typeOptions.map(option => ({
                  value: option,
                  label: option,
                })),
              ]}
            />
          </div>
          <div className="mt-5 hidden grid-cols-[minmax(17rem,1.65fr)_0.8fr_0.85fr_1.45fr_0.7fr_8rem] gap-5 border-b border-[#a78e6e]/40 pb-4 font-mono-ui text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-[#314a40] lg:grid">
            <span>Institution</span>
            <span>Type</span>
            <span>Verification</span>
            <span>Capabilities</span>
            <span>Registered</span>
            <span>Review</span>
          </div>
          {institutionsQuery.isLoading ? (
            <div className="mt-5 flex items-center gap-3 py-9 font-body text-[#52675d]">
              <Loader2 className="animate-spin" size={20} />
              Loading onboarding records…
            </div>
          ) : visible.length === 0 ? (
            <div className="mt-5 border border-dashed border-[#9a876c]/65 bg-[#f8f2e8]/25 px-6 py-12 text-center">
              <p className="font-display text-[2rem]">
                No institution applications match these filters.
              </p>
              <p className="mt-2 font-body text-[0.8rem] text-[#566c61]">
                New institute onboarding applications will appear here for
                review.
              </p>
            </div>
          ) : (
            <div>
              {visible.map(item => (
                <InstitutionRow key={item.id} item={item} />
              ))}
            </div>
          )}
          <p className="mt-6 font-body text-[0.76rem] text-[#425a50]">
            Showing {visible.length} persisted institution{" "}
            {visible.length === 1 ? "application" : "applications"}.
          </p>
        </div>
      </section>
    </main>
  );
}

function SearchField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex h-[3.52rem] items-center gap-3 border border-[#a58c6d]/55 bg-[#f8f2e8]/28 px-4">
      <Search size={21} strokeWidth={1.5} />
      <input
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder="Search institutions by name, email, or expertise…"
        className="min-w-0 flex-1 bg-transparent font-body text-[0.8rem] outline-none placeholder:text-[#7c8a81]"
      />
    </label>
  );
}
function AdminSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="border border-[#a58c6d]/55 bg-[#f8f2e8]/28 px-4 py-2">
      <span className="block font-mono-ui text-[0.55rem] font-semibold uppercase tracking-[0.1em]">
        {label}
      </span>
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        className="mt-1 w-full bg-transparent font-body text-[0.78rem] outline-none"
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
function InstitutionRow({ item }: { item: any }) {
  const capabilities = [item.departments, item.expertise, item.facilities]
    .filter(Boolean)
    .join(" · ");
  return (
    <article className="grid gap-4 border-b border-[#a78e6e]/40 py-4 lg:grid-cols-[minmax(17rem,1.65fr)_0.8fr_0.85fr_1.45fr_0.7fr_8rem] lg:items-center lg:gap-5 lg:px-3">
      <div>
        <h2 className="font-display text-[1.26rem] leading-none sm:text-[1.42rem]">
          {item.name}
        </h2>
        <p className="mt-2 font-body text-[0.7rem] leading-relaxed text-[#53675d]">
          {item.website || "No website provided"}
          <br />
          {item.contactEmail}
        </p>
      </div>
      <p className="font-body text-[0.75rem]">{item.institutionType || "—"}</p>
      <StatusBadge status={item.verificationStatus} />
      <p className="line-clamp-2 font-body text-[0.72rem] leading-relaxed text-[#53675d]">
        {capabilities || "No capabilities declared"}
      </p>
      <p className="font-body text-[0.75rem]">
        {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "—"}
      </p>
      <a
        href={`/admin/institutions/${item.id}/verify`}
        className="rounded-full inline-flex w-fit items-center gap-2 border border-[#bd5a38]/70 px-3 py-2 font-mono-ui text-[0.55rem] font-semibold uppercase tracking-[0.08em] text-[#ad4826] transition hover:bg-[#f7e2d6]"
      >
        Review
        <ExternalLink size={13} />
      </a>
    </article>
  );
}
function StatusBadge({
  status,
}: {
  status: "pending" | "verified" | "rejected";
}) {
  const style =
    status === "verified"
      ? "border-[#8aa084] text-[#416348]"
      : status === "rejected"
        ? "border-[#bd5a38] text-[#ab4826]"
        : "border-[#d5a55a] text-[#af7624]";
  const label = status === "rejected" ? "Changes requested" : status;
  return (
    <span
      className={`w-fit border px-2 py-1.5 font-mono-ui text-[0.56rem] font-semibold uppercase tracking-[0.09em] ${style}`}
    >
      {label}
    </span>
  );
}
