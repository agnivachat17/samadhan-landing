/**
 * Style: Samadhan admin reporting — centered editorial report workshop, strict form rhythm,
 * format selection, warm ember generation action, and a quiet recent-reports ledger.
 */
import AdminHeader from "@/components/AdminHeader";
import { CalendarDays, Download } from "lucide-react";
import { useState } from "react";

type RecentReport = {
  id: number;
  name: string;
  date: string;
  format: "PDF" | "CSV";
};
const initialReports: RecentReport[] = [
  {
    id: 1,
    name: "Challenges Overview – April 2025",
    date: "30 Apr 2025, 10:24 AM",
    format: "PDF",
  },
  {
    id: 2,
    name: "Domain-wise Summary – Q2 2025",
    date: "28 Apr 2025, 04:15 PM",
    format: "CSV",
  },
  {
    id: 3,
    name: "Institution Participation Report",
    date: "27 Apr 2025, 11:02 AM",
    format: "PDF",
  },
  {
    id: 4,
    name: "District-wise Challenge Report",
    date: "25 Apr 2025, 09:47 AM",
    format: "CSV",
  },
  {
    id: 5,
    name: "User Activity Report – April 2025",
    date: "24 Apr 2025, 02:33 PM",
    format: "PDF",
  },
];

export default function AdminReports() {
  const [format, setFormat] = useState<"PDF" | "CSV">("PDF");
  const [domain, setDomain] = useState("All Domains");
  const [district, setDistrict] = useState("All Districts");
  const [reports, setReports] = useState(initialReports);
  const [generated, setGenerated] = useState(false);
  const generate = (event: React.FormEvent) => {
    event.preventDefault();
    setReports(items => [
      {
        id: Date.now(),
        name: `${domain === "All Domains" ? "Challenges Overview" : domain} Report`,
        date: "Today, just now",
        format,
      },
      ...items,
    ]);
    setGenerated(true);
    window.setTimeout(() => setGenerated(false), 2800);
  };
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
              Select the filters below to generate a custom report.
            </p>
          </div>
          <form onSubmit={generate} className="mx-auto mt-7 max-w-[38rem]">
            <FormLabel label="Date range">
              <span className="flex items-center gap-4 border border-[#a58c6d]/55 bg-[#f8f2e8]/28 px-4 py-4 font-body text-[0.84rem]">
                <CalendarDays size={19} />
                <input
                  defaultValue="01 Apr 2025"
                  className="min-w-0 flex-1 bg-transparent outline-none"
                  aria-label="Start date"
                />
                <span>–</span>
                <input
                  defaultValue="30 Apr 2025"
                  className="min-w-0 flex-1 bg-transparent outline-none"
                  aria-label="End date"
                />
                <span>⌄</span>
              </span>
            </FormLabel>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <FormLabel label="Domain">
                <select
                  value={domain}
                  onChange={event => setDomain(event.target.value)}
                  className="citizen-input mt-3"
                >
                  <option>All Domains</option>
                  <option>Water</option>
                  <option>Education</option>
                  <option>Healthcare</option>
                  <option>Infrastructure</option>
                </select>
              </FormLabel>
              <FormLabel label="District">
                <select
                  value={district}
                  onChange={event => setDistrict(event.target.value)}
                  className="citizen-input mt-3"
                >
                  <option>All Districts</option>
                  <option>Ranchi</option>
                  <option>Dhanbad</option>
                  <option>Dumka</option>
                  <option>Giridih</option>
                </select>
              </FormLabel>
            </div>
            <fieldset className="mt-5">
              <legend className="font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.12em]">
                Format
              </legend>
              <div className="mt-3 grid max-w-[18rem] grid-cols-2 gap-2">
                <FormatButton
                  active={format === "PDF"}
                  onClick={() => setFormat("PDF")}
                >
                  PDF
                </FormatButton>
                <FormatButton
                  active={format === "CSV"}
                  onClick={() => setFormat("CSV")}
                >
                  CSV
                </FormatButton>
              </div>
            </fieldset>
            <button
              type="submit"
              className="rounded-full mt-6 w-full bg-[#c94a20] px-6 py-5 font-mono-ui text-[0.67rem] font-semibold uppercase tracking-[0.14em] text-white transition hover:-translate-y-0.5 hover:bg-[#dc5729] active:translate-y-0 active:scale-[0.98]"
            >
              Generate report
            </button>
            {generated && (
              <p className="mt-3 text-center font-body text-[0.78rem] text-[#3a6b4a]">
                A new {format} report has been added to Recent Reports.
              </p>
            )}
          </form>
          <section className="mt-10">
            <div className="flex items-center gap-5">
              <span className="h-px flex-1 bg-[#a78e6e]/45" />
              <p className="font-mono-ui text-[0.63rem] font-semibold uppercase tracking-[0.12em]">
                Recent reports
              </p>
              <span className="h-px flex-1 bg-[#a78e6e]/45" />
            </div>
            <div className="mt-6 hidden grid-cols-[1.65fr_.75fr_.35fr_2rem] gap-5 border-b border-[#a78e6e]/40 pb-3 font-mono-ui text-[0.59rem] font-semibold uppercase tracking-[0.1em] text-[#314a40] sm:grid">
              <span>Report name</span>
              <span>Date generated</span>
              <span>Format</span>
              <span>Action</span>
            </div>
            <div>
              {reports.slice(0, 6).map(report => (
                <RecentRow key={report.id} report={report} />
              ))}
            </div>
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
function FormatButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-3 font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.1em] transition ${active ? "border-[#c64b22] text-[#b84a28]" : "border-[#809980] text-[#436649]"}`}
    >
      {children}
    </button>
  );
}
function RecentRow({ report }: { report: RecentReport }) {
  const [downloaded, setDownloaded] = useState(false);
  return (
    <article className="grid gap-2 border-b border-[#a78e6e]/40 py-4 sm:grid-cols-[1.65fr_.75fr_.35fr_2rem] sm:items-center sm:gap-5">
      <p className="font-body text-[0.79rem]">{report.name}</p>
      <p className="font-body text-[0.76rem] text-[#52675d]">{report.date}</p>
      <span
        className={`w-fit border px-2 py-1 font-mono-ui text-[0.55rem] font-semibold uppercase tracking-[0.08em] ${report.format === "PDF" ? "border-[#d0977f] text-[#b44d29]" : "border-[#859e85] text-[#42674a]"}`}
      >
        {report.format}
      </span>
      <button
        type="button"
        onClick={() => setDownloaded(true)}
        className={`justify-self-end transition ${downloaded ? "text-[#3f704d]" : "text-[#c64b22] hover:text-[#173d30]"}`}
        aria-label={`Download ${report.name}`}
      >
        <Download size={20} />
      </button>
    </article>
  );
}
