/**
 * Style: Samadhan admin reporting — centered editorial report workshop, strict form rhythm,
 * format selection, warm ember generation action, and a quiet recent-reports ledger.
 */
import AdminHeader from "@/components/AdminHeader";
import { trpc } from "@/lib/trpc";
import { JHARKHAND_DISTRICTS } from "@/lib/jharkhandDistricts";
import { Check, Download, Loader2 } from "lucide-react";
import { useState } from "react";

const DOMAINS = [
  "Water",
  "Education",
  "Health",
  "Agriculture",
  "Infrastructure",
  "Livelihoods",
];

type Challenge = {
  id: number;
  title: string;
  domain: string;
  district: string;
  status: string;
  citizenName?: string;
  citizenEmail?: string | null;
  createdAt?: Date | string | null;
};

type GeneratedReport = {
  id: number;
  name: string;
  generatedAt: Date;
  rowCount: number;
  download: () => void;
};

function toCsv(rows: Challenge[]) {
  const header = [
    "Title",
    "Domain",
    "District",
    "Status",
    "Citizen name",
    "Citizen email",
    "Reported on",
  ];
  const lines = rows.map(row =>
    [
      row.title,
      row.domain,
      row.district,
      row.status,
      row.citizenName ?? "",
      row.citizenEmail ?? "",
      row.createdAt ? new Date(row.createdAt).toISOString() : "",
    ]
      .map(value => `"${String(value).replaceAll('"', '""')}"`)
      .join(",")
  );
  return [header.join(","), ...lines].join("\n");
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function AdminReports() {
  const [input] = useState({});
  const challengesQuery = trpc.workflow.challenges.useQuery(input);
  const challenges = (challengesQuery.data ?? []) as Challenge[];

  const [domain, setDomain] = useState("All domains");
  const [district, setDistrict] = useState("All districts");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reports, setReports] = useState<GeneratedReport[]>([]);
  const [justGenerated, setJustGenerated] = useState<number | null>(null);

  function generate(event: React.FormEvent) {
    event.preventDefault();
    const filtered = challenges.filter(row => {
      if (domain !== "All domains" && row.domain !== domain) return false;
      if (district !== "All districts" && row.district !== district)
        return false;
      if (row.createdAt) {
        const created = new Date(row.createdAt);
        if (startDate && created < new Date(startDate)) return false;
        if (endDate && created > new Date(`${endDate}T23:59:59`)) return false;
      }
      return true;
    });
    const namePieces = [
      domain === "All domains" ? "All domains" : domain,
      district === "All districts" ? "All districts" : district,
    ];
    const id = Date.now();
    const report: GeneratedReport = {
      id,
      name: `Challenges – ${namePieces.join(", ")}`,
      generatedAt: new Date(),
      rowCount: filtered.length,
      download: () =>
        downloadCsv(`samadhan-challenges-${id}.csv`, toCsv(filtered)),
    };
    setReports(items => [report, ...items]);
    setJustGenerated(id);
    window.setTimeout(() => setJustGenerated(null), 2800);
  }

  return (
    <main
      className="min-h-screen bg-[#f1eadc] text-[#0d3024]"
      style={{
        backgroundImage: "url('/images/samadhan-paper-grain_46302c3f.jpg')",
        backgroundSize: "cover",
      }}
    >
      <AdminHeader active="Reports" />
      <section className="px-6 py-12 sm:px-10 lg:py-12">
        <div className="mx-auto max-w-[72rem]">
          <div className="text-center">
            <h1 className="font-display text-[4rem] font-medium leading-[0.85] tracking-[-0.04em] sm:text-[5.4rem]">
              Generate Report
            </h1>
            <span className="mx-auto mt-6 block h-[2px] w-8 bg-[#c64b22]" />
            <p className="mt-6 font-body text-[0.9rem] text-[#53675d]">
              Export the real, currently-recorded challenge data as a CSV file,
              filtered by domain, district, and date range.
            </p>
          </div>
          <form onSubmit={generate} className="mx-auto mt-7 max-w-[38rem]">
            <FormLabel label="Date range (reported on)">
              <span className="flex items-center gap-3 border border-[#a58c6d]/55 bg-[#f8f2e8]/28 px-4 py-3 font-body text-[0.84rem]">
                <input
                  type="date"
                  value={startDate}
                  onChange={event => setStartDate(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent outline-none"
                  aria-label="Start date"
                />
                <span>–</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={event => setEndDate(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent outline-none"
                  aria-label="End date"
                />
              </span>
            </FormLabel>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <FormLabel label="Domain">
                <select
                  value={domain}
                  onChange={event => setDomain(event.target.value)}
                  className="citizen-input mt-3"
                >
                  <option>All domains</option>
                  {DOMAINS.map(item => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </FormLabel>
              <FormLabel label="District">
                <select
                  value={district}
                  onChange={event => setDistrict(event.target.value)}
                  className="citizen-input mt-3"
                >
                  <option>All districts</option>
                  {JHARKHAND_DISTRICTS.map(item => (
                    <option key={item.name}>{item.name}</option>
                  ))}
                </select>
              </FormLabel>
            </div>
            <button
              type="submit"
              disabled={challengesQuery.isLoading}
              className="rounded-full mt-6 w-full bg-[#c94a20] px-6 py-4 font-mono-ui text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-white transition hover:-translate-y-0.5 hover:bg-[#dc5729] active:translate-y-0 active:scale-[0.98] disabled:opacity-70"
            >
              {challengesQuery.isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="animate-spin" size={16} /> Loading
                  challenge data…
                </span>
              ) : (
                "Generate CSV report"
              )}
            </button>
          </form>
          <section className="mt-10">
            <div className="flex items-center gap-5">
              <span className="h-px flex-1 bg-[#a78e6e]/45" />
              <p className="font-mono-ui text-[0.63rem] font-semibold uppercase tracking-[0.12em]">
                Reports generated this session
              </p>
              <span className="h-px flex-1 bg-[#a78e6e]/45" />
            </div>
            {reports.length === 0 ? (
              <p className="mt-6 text-center font-body text-[0.78rem] text-[#607168]">
                Nothing generated yet. Reports aren&apos;t saved between visits
                — download the file you need before leaving this page.
              </p>
            ) : (
              <>
                <div className="mt-6 hidden grid-cols-[1.65fr_.75fr_.35fr_2rem] gap-5 border-b border-[#a78e6e]/40 pb-3 font-mono-ui text-[0.59rem] font-semibold uppercase tracking-[0.1em] text-[#314a40] sm:grid">
                  <span>Report name</span>
                  <span>Generated</span>
                  <span>Rows</span>
                  <span>Action</span>
                </div>
                <div>
                  {reports.map(report => (
                    <RecentRow
                      key={report.id}
                      report={report}
                      justGenerated={justGenerated === report.id}
                    />
                  ))}
                </div>
              </>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
function FormLabel({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.12em]">
        {label}
      </span>
      <span className="mt-3 block">{children}</span>
    </label>
  );
}
function RecentRow({
  report,
  justGenerated,
}: {
  report: GeneratedReport;
  justGenerated: boolean;
}) {
  return (
    <article className="grid gap-2 border-b border-[#a78e6e]/40 py-4 sm:grid-cols-[1.65fr_.75fr_.35fr_2rem] sm:items-center sm:gap-5">
      <p className="font-body text-[0.79rem]">
        {report.name}
        {justGenerated && (
          <span className="ml-2 inline-flex items-center gap-1 font-mono-ui text-[0.55rem] uppercase tracking-[0.08em] text-[#3a6b4a]">
            <Check size={12} /> Ready
          </span>
        )}
      </p>
      <p className="font-body text-[0.76rem] text-[#52675d]">
        {report.generatedAt.toLocaleString()}
      </p>
      <span className="w-fit border border-[#859e85] px-2 py-1 font-mono-ui text-[0.55rem] font-semibold uppercase tracking-[0.08em] text-[#42674a]">
        {report.rowCount}
      </span>
      <button
        type="button"
        onClick={report.download}
        className="justify-self-end text-[#c64b22] transition hover:text-[#173d30]"
        aria-label={`Download ${report.name}`}
      >
        <Download size={20} />
      </button>
    </article>
  );
}
