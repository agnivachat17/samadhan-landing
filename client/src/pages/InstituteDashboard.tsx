/** Style: Samadhan institute dashboard — live paper-ledger review queue with functional controls. */
import InstituteHeader from "@/components/InstituteHeader";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";

const PAGE_SIZE = 8;

export default function InstituteDashboard() {
  const [domain, setDomain] = useState("all");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [page, setPage] = useState(1);
  const [input] = useState({});
  const challengesQuery = trpc.workflow.challenges.useQuery(input);
  const assignmentsQuery = trpc.workflow.assignments.useQuery(input);
  const challenges = challengesQuery.data ?? [];
  const domains = useMemo(
    () => Array.from(new Set(challenges.map(item => item.domain))).sort(),
    [challenges]
  );
  const statuses = useMemo(
    () => Array.from(new Set(challenges.map(item => item.status))).sort(),
    [challenges]
  );
  const filtered = useMemo(
    () =>
      challenges.filter(
        challenge =>
          (domain === "all" || challenge.domain === domain) &&
          (status === "all" || challenge.status === status) &&
          (priority === "all" || challenge.priority === priority)
      ),
    [challenges, domain, status, priority]
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );
  const assigned = (assignmentsQuery.data ?? []).filter(
    item => item.status === "pending" || item.status === "accepted"
  ).length;
  const inProgress = challenges.filter(
    item => item.status === "in_progress"
  ).length;
  useEffect(() => setPage(1), [domain, status, priority]);
  const loading = challengesQuery.isLoading || assignmentsQuery.isLoading;
  const error = challengesQuery.error || assignmentsQuery.error;
  return (
    <main
      className="min-h-screen bg-[#f1eadc] text-[#0c3023]"
      style={{
        backgroundImage:
          "url('/manus-storage/samadhan-paper-grain_46302c3f.jpg')",
        backgroundSize: "cover",
      }}
    >
      <InstituteHeader active="Dashboard" />
      <section className="px-6 py-12 sm:px-10 lg:px-[3rem] lg:py-12">
        <div className="mx-auto max-w-[94rem]">
          <div className="grid gap-8 border-b border-[#a78e6e]/45 pb-10 xl:grid-cols-[minmax(0,1fr)_27rem] xl:items-center">
            <div className="grid gap-5 sm:grid-cols-3">
              <FilterSelect
                label="Domain"
                value={domain}
                onChange={setDomain}
                options={[
                  { value: "all", label: "All domains" },
                  ...domains.map(value => ({ value, label: value })),
                ]}
              />
              <FilterSelect
                label="Status"
                value={status}
                onChange={setStatus}
                options={[
                  { value: "all", label: "All statuses" },
                  ...statuses.map(value => ({ value, label: labelize(value) })),
                ]}
              />
              <FilterSelect
                label="Priority"
                value={priority}
                onChange={setPriority}
                options={[
                  { value: "all", label: "All priorities" },
                  ...["high", "medium", "low"].map(value => ({
                    value,
                    label: labelize(value),
                  })),
                ]}
              />
            </div>
            <div className="grid grid-cols-2 divide-x divide-[#a78e6e]/45">
              <Metric value={assigned} label="Active assignments" />
              <Metric value={inProgress} label="In progress" dot />
            </div>
          </div>
          {loading ? (
            <Loading />
          ) : error ? (
            <Failure
              message={error.message}
              retry={() => {
                void challengesQuery.refetch();
                void assignmentsQuery.refetch();
              }}
            />
          ) : (
            <>
              <div className="mt-7 hidden grid-cols-[minmax(26rem,2fr)_0.75fr_0.65fr_0.9fr_7rem] gap-5 border-b border-[#a78e6e]/40 pb-5 font-mono-ui text-[0.63rem] font-semibold uppercase tracking-[0.11em] text-[#314b40] lg:grid">
                <span>Title</span>
                <span>Domain</span>
                <span>Priority</span>
                <span>Status</span>
                <span>Action</span>
              </div>
              <div>
                {visible.map(challenge => (
                  <DashboardRow key={challenge.id} challenge={challenge} />
                ))}
                {visible.length === 0 && <Empty />}
              </div>
              <Pagination
                page={safePage}
                pageCount={pageCount}
                total={filtered.length}
                setPage={setPage}
              />
            </>
          )}
        </div>
      </section>
    </main>
  );
}
function FilterSelect({
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
    <label>
      <span className="font-mono-ui text-[0.63rem] font-semibold uppercase tracking-[0.13em] text-[#304a40]">
        {label}
      </span>
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        className="citizen-input mt-3 text-[0.84rem]"
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
function Metric({
  value,
  label,
  dot,
}: {
  value: number;
  label: string;
  dot?: boolean;
}) {
  return (
    <div className="px-6 text-center first:pl-0 last:pr-0">
      <p className="font-body text-[2.75rem] font-bold leading-none tracking-[-0.03em] tabular-nums">
        {String(value).padStart(2, "0")}
        {dot && (
          <span className="ml-6 inline-block size-2 rounded-full bg-[#c64b22] align-middle" />
        )}
      </p>
      <p className="mt-3 font-mono-ui text-[0.63rem] font-semibold uppercase tracking-[0.13em]">
        {label}
      </p>
    </div>
  );
}
function DashboardRow({
  challenge,
}: {
  challenge: {
    id: number;
    title: string;
    domain: string;
    priority: string;
    status: string;
    district: string;
  };
}) {
  const statusStyle =
    challenge.status === "assigned"
      ? "bg-[#e1e7d6] text-[#557148]"
      : challenge.status === "under_review"
        ? "bg-[#f5e9c8] text-[#a77521]"
        : challenge.status === "in_progress"
          ? "bg-[#f9e4d9] text-[#af522f]"
          : "bg-[#e7e3d9] text-[#5e6c63]";
  const priorityDot =
    challenge.priority === "high"
      ? "bg-[#bc4c24]"
      : challenge.priority === "medium"
        ? "bg-[#e18a21]"
        : "bg-[#4e8058]";
  return (
    <article className="grid gap-4 border-b border-[#a78e6e]/40 py-5 lg:grid-cols-[minmax(26rem,2fr)_0.75fr_0.65fr_0.9fr_7rem] lg:items-center lg:gap-5 lg:px-3">
      <div>
        <h2 className="font-display text-[1.45rem] leading-none sm:text-[1.65rem]">
          {challenge.title}
        </h2>
        <p className="mt-2 font-body text-[0.7rem] text-[#5d7067]">
          {challenge.district}
        </p>
      </div>
      <span className="w-fit rounded border border-[#80977f] px-2 py-1 font-mono-ui text-[0.57rem] font-semibold uppercase tracking-[0.09em] text-[#48684d]">
        {challenge.domain}
      </span>
      <p className="font-body text-[0.85rem]">
        <span
          className={`mr-3 inline-block size-3 rounded-full ${priorityDot}`}
        />
        {labelize(challenge.priority)}
      </p>
      <span
        className={`w-fit px-3 py-2 font-mono-ui text-[0.57rem] font-semibold uppercase tracking-[0.1em] ${statusStyle}`}
      >
        {labelize(challenge.status)}
      </span>
      <a
        href={`/institute/challenges/${challenge.id}`}
        className="w-fit border border-[#bd5a38]/70 px-5 py-2.5 font-mono-ui text-[0.61rem] font-semibold uppercase tracking-[0.1em] text-[#ab4826] transition hover:bg-[#c94a20] hover:text-white"
      >
        Review
      </a>
    </article>
  );
}
function Pagination({
  page,
  pageCount,
  total,
  setPage,
}: {
  page: number;
  pageCount: number;
  total: number;
  setPage: (page: number) => void;
}) {
  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1);
  return (
    <div className="mt-7 flex flex-col justify-between gap-5 font-body text-[0.79rem] text-[#3e564b] sm:flex-row sm:items-center">
      <span>
        Showing {start} to {end} of {total} challenges
      </span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
          className="transition hover:text-[#c64b22] disabled:cursor-not-allowed disabled:opacity-35"
          aria-label="Previous page"
        >
          <ChevronLeft size={19} />
        </button>
        {pages.map(value => (
          <button
            type="button"
            key={value}
            onClick={() => setPage(value)}
            className={`grid size-8 place-items-center ${value === page ? "bg-[#143e2b] text-white" : "hover:text-[#c64b22]"}`}
            aria-label={`Page ${value}`}
            aria-current={value === page ? "page" : undefined}
          >
            {value}
          </button>
        ))}
        <button
          type="button"
          disabled={page === pageCount}
          onClick={() => setPage(page + 1)}
          className="transition hover:text-[#c64b22] disabled:cursor-not-allowed disabled:opacity-35"
          aria-label="Next page"
        >
          <ChevronRight size={19} />
        </button>
      </div>
    </div>
  );
}
function Loading() {
  return (
    <div className="mt-8 flex items-center gap-3 font-body text-[#52675d]">
      <Loader2 className="animate-spin" size={18} />
      Loading persisted challenge records…
    </div>
  );
}
function Empty() {
  return (
    <p className="py-20 text-center font-display text-3xl">
      No matching challenges.
    </p>
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
        className="mt-3 border border-[#bd5a38]/60 px-3 py-2 font-mono-ui text-[0.54rem] uppercase tracking-[0.08em] text-[#a54426]"
      >
        Retry
      </button>
    </div>
  );
}
function labelize(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, character => character.toUpperCase());
}
