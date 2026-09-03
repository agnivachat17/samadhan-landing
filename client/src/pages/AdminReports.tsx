/**
 * Style: Samadhan admin reporting — choropleth heatmap, bottleneck alerts,
 * recharts charts, and CSV export.
 */
import AdminHeader from "@/components/AdminHeader";
import {
  JHARKHAND_CENTER,
  JHARKHAND_DISTRICTS,
} from "@/lib/jharkhandDistricts";
import { trpc } from "@/lib/trpc";
import {
  computeDistrictStats,
  computeEscalations,
  computeTrends,
  topDomains,
  topDistricts,
} from "@/lib/analytics";
import { AlertTriangle, Check, Download, Loader2, MapPin } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createNotification } from "@/lib/db";
import {
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MapContainer, GeoJSON, Marker, TileLayer } from "react-leaflet";
import L from "leaflet";

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

function dotIcon(size: number, color: string) {
  return L.divIcon({
    className: "samadhan-marker",
    html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:9999px;background:${color};border:2px solid #f7f1e7;box-shadow:0 2px 6px rgba(13,48,36,0.35);"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

const EMBER = "#c94a20";
const PAPER = "#e8ddd0";
const DANGER = "#a5241a";
const SAGE = "#8a9a86";

function fillColor(count: number, max: number): string {
  if (max === 0 || count === 0) return PAPER;
  const t = Math.min(count / max, 1);
  const r = Math.round(232 + (201 - 232) * t);
  const g = Math.round(221 + (74 - 221) * t);
  const b = Math.round(208 + (32 - 208) * t);
  return `rgb(${r},${g},${b})`;
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
  const [mapDistrict, setMapDistrict] = useState<string | null>(null);

  const stats = useMemo(() => computeDistrictStats(challenges), [challenges]);
  const maxTotal = useMemo(
    () => Math.max(1, ...Array.from(stats.values()).map(s => s.total)),
    [stats]
  );
  const trends = useMemo(() => computeTrends(challenges), [challenges]);
  const domains = useMemo(() => topDomains(challenges), [challenges]);
  const topDists = useMemo(() => topDistricts(challenges), [challenges]);

  const bottleneckAlerts = useMemo(
    () =>
      Array.from(stats.values())
        .filter(s => s.bottleneck > 0)
        .sort((a, b) => b.avgAgeDays - a.avgAgeDays)
        .slice(0, 5),
    [stats]
  );

  // USP-11: Compute escalation events for challenges stuck >14 or >30 days
  const organizationsQuery = trpc.workflow.organizations.useQuery(input);
  const organizations = (organizationsQuery.data ?? []) as { id: number; contactEmail?: string | null }[];
  const escalationEvents = useMemo(
    () => computeEscalations(challenges, organizations),
    [challenges, organizations]
  );
  const escalatedChallenges = useMemo(
    () => new Set(escalationEvents.map(e => e.challengeId)),
    [escalationEvents]
  );
  // Fire escalation notifications once per session for each threshold level
  const notifiedRef = useMemo(() => new Set<string>(), []);
  useEffect(() => {
    if (escalationEvents.length === 0) return;
    for (const evt of escalationEvents) {
      const key = `${evt.challengeId}-${evt.level}`;
      if (notifiedRef.has(key)) continue;
      notifiedRef.add(key);
      const orgEmail = evt.institutionEmail;
      if (orgEmail) {
        // Fire-and-forget — notification is a side-effect, failures are non-critical
        createNotification({
          recipientEmail: orgEmail,
          title: `Challenge escalation: ${evt.level}`,
          body: evt.message,
          href: `/challenges/${evt.challengeId}`,
          type: "admin_notice",
        }).catch(() => {});
      }
    }
  }, [escalationEvents]);

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

  // Load jharkhand.json at runtime (fetch, not import)
  const [jharkhandGeo, setJharkhandGeo] = useState<unknown | null>(null);
  useState(() => {
    fetch("/geo/jharkhand.json")
      .then(r => r.json())
      .then(setJharkhandGeo)
      .catch(() => {});
  });

  const filteredChallenges = useMemo(() => {
    return challenges.filter(c => {
      if (domain !== "All domains" && c.domain !== domain) return false;
      if (district !== "All districts" && c.district !== district) return false;
      if (mapDistrict && c.district !== mapDistrict) return false;
      return true;
    });
  }, [challenges, domain, district, mapDistrict]);

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
              GIS Command Center
            </h1>
            <span className="mx-auto mt-6 block h-[2px] w-8 bg-[#c64b22]" />
            <p className="mt-6 font-body text-[0.9rem] text-[#53675d]">
              Live district heatmap, bottleneck alerts, and CSV export — all
              computed from real challenge data.
            </p>
          </div>

          {/* Bottleneck Alerts + Escalation Banner */}
          {(bottleneckAlerts.length > 0 || escalationEvents.length > 0) && (
            <div className="mx-auto mt-8 max-w-[72rem] space-y-2">
              {/* Escalation events — staged 14-day/30-day thresholds */}
              {escalationEvents.map(evt => (
                <div
                  key={`${evt.challengeId}-${evt.level}`}
                  className={`flex items-center justify-between gap-4 rounded-lg border px-5 py-3 ${
                    evt.level === "escalated"
                      ? "border-[#9b2c1c]/60 bg-[#f7e2d6]/50"
                      : "border-[#bd5a38]/50 bg-[#fef3e2]/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle
                      size={16}
                      className={evt.level === "escalated" ? "text-[#9b2c1c]" : "text-[#a54426]"}
                    />
                    <span className="font-body text-[0.82rem] font-semibold text-[#934325]">
                      {evt.district}
                    </span>
                    <span className="font-body text-[0.78rem] text-[#934325]">
                      — {evt.message}
                    </span>
                  </div>
                  <span className={`font-mono-ui text-[0.58rem] uppercase tracking-[0.08em] ${evt.level === "escalated" ? "text-[#9b2c1c]" : "text-[#934325]"}`}>
                    {evt.level === "escalated" ? "Escalated" : "Notified"}
                  </span>
                </div>
              ))}
              {/* Legacy bottleneck alerts */}
              {bottleneckAlerts.map(s => (
                <div
                  key={s.district}
                  className="flex items-center justify-between gap-4 rounded-lg border border-[#bd5a38]/50 bg-[#f7e2d6]/40 px-5 py-3"
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle size={16} className="text-[#a54426]" />
                    <span className="font-body text-[0.82rem] font-semibold text-[#934325]">
                      {s.district}
                    </span>
                    <span className="font-body text-[0.78rem] text-[#934325]">
                      — {s.bottleneck} stuck &gt;14d, avg{" "}
                      {s.avgAgeDays.toFixed(0)}d
                    </span>
                  </div>
                  <span className="font-mono-ui text-[0.58rem] uppercase tracking-[0.08em] text-[#934325]">
                    Needs re-assign
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Choropleth Map */}
          <div className="mx-auto mt-10 max-w-[72rem]">
            <div className="flex items-center gap-5">
              <span className="h-px flex-1 bg-[#a78e6e]/45" />
              <p className="font-mono-ui text-[0.63rem] font-semibold uppercase tracking-[0.12em]">
                District heatmap
              </p>
              <span className="h-px flex-1 bg-[#a78e6e]/45" />
            </div>
            <div className="mt-5 h-[28rem] overflow-hidden border border-[#a58c6d]/40">
              {jharkhandGeo ? (
                <MapContainer
                  center={JHARKHAND_CENTER}
                  zoom={6.8}
                  className="h-full w-full"
                  scrollWheelZoom={false}
                  zoomControl={false}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {jharkhandGeo &&
                    (jharkhandGeo as GeoJSON.FeatureCollection).features.map(
                      (f: GeoJSON.Feature) => {
                        const name = (f.properties as Record<string, unknown>)
                          ?.district as string;
                        const s = stats.get(name);
                        const total = s?.total ?? 0;
                        return (
                          <GeoJSON
                            key={name}
                            data={f as unknown as GeoJSON.GeoJsonObject}
                            style={() => ({
                              fillColor: fillColor(total, maxTotal),
                              weight: 1,
                              color: "#8d806b",
                              fillOpacity: 0.7,
                            })}
                            onEachFeature={(_feat, layer) => {
                              layer.bindTooltip(
                                `${name}: ${total} challenges${(s?.bottleneck ?? 0) > 0 ? ` (${s?.bottleneck} bottleneck)` : ""}`
                              );
                              layer.on("click", () => {
                                setMapDistrict(prev =>
                                  prev === name ? null : name
                                );
                              });
                            }}
                          />
                        );
                      }
                    )}
                  {JHARKHAND_DISTRICTS.map(d => {
                    const s = stats.get(d.name);
                    const cnt = s?.total ?? 0;
                    const color =
                      (s?.bottleneck ?? 0) > 0
                        ? DANGER
                        : cnt > 0
                          ? EMBER
                          : SAGE;
                    const size = cnt > 0 ? Math.min(28, 12 + cnt * 3) : 8;
                    return (
                      <Marker
                        key={d.name}
                        position={[d.lat, d.lng]}
                        icon={dotIcon(size, color)}
                      />
                    );
                  })}
                </MapContainer>
              ) : (
                <div className="flex h-full items-center justify-center bg-[#f1eadc]">
                  <Loader2 className="animate-spin" size={20} />
                </div>
              )}
            </div>
            {mapDistrict && (
              <div className="mt-3 flex items-center gap-3">
                <MapPin size={14} className="text-[#c64b22]" />
                <span className="font-body text-[0.82rem] text-[#314a40]">
                  Filtering: <strong>{mapDistrict}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setMapDistrict(null)}
                  className="font-mono-ui text-[0.6rem] uppercase tracking-[0.08em] text-[#c64b22] underline underline-offset-2"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* Charts */}
          <div className="mx-auto mt-10 max-w-[72rem]">
            <div className="flex items-center gap-5">
              <span className="h-px flex-1 bg-[#a78e6e]/45" />
              <p className="font-mono-ui text-[0.63rem] font-semibold uppercase tracking-[0.12em]">
                Analytics
              </p>
              <span className="h-px flex-1 bg-[#a78e6e]/45" />
            </div>
            <div className="mt-5 grid gap-6 lg:grid-cols-2">
              {/* Top Districts Bar Chart */}
              <div className="border border-[#a58c6d]/40 bg-[#f8f2e8]/25 p-5">
                <p className="font-mono-ui text-[0.58rem] font-semibold uppercase tracking-[0.1em] text-[#314a40]">
                  Challenges by district (top 8)
                </p>
                <div className="mt-4 h-[14rem]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topDists}>
                      <XAxis
                        dataKey="district"
                        fontSize={9}
                        tick={{ fill: "#314a40" }}
                        interval={0}
                        angle={-35}
                        textAnchor="end"
                        height={50}
                      />
                      <YAxis fontSize={10} tick={{ fill: "#52675d" }} />
                      <Tooltip />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {topDists.map((_, i) => (
                          <Cell key={i} fill={EMBER} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Weekly Trends Line Chart */}
              <div className="border border-[#a58c6d]/40 bg-[#f8f2e8]/25 p-5">
                <p className="font-mono-ui text-[0.58rem] font-semibold uppercase tracking-[0.1em] text-[#314a40]">
                  Weekly trends (last 12 weeks)
                </p>
                <div className="mt-4 h-[14rem]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trends}>
                      <XAxis
                        dataKey="week"
                        fontSize={9}
                        tick={{ fill: "#314a40" }}
                      />
                      <YAxis fontSize={10} tick={{ fill: "#52675d" }} />
                      <Tooltip />
                      <Line
                        dataKey="count"
                        stroke="#16422f"
                        strokeWidth={2}
                        dot={{ fill: "#c94a20", r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Domain Breakdown Bar Chart */}
              <div className="border border-[#a58c6d]/40 bg-[#f8f2e8]/25 p-5">
                <p className="font-mono-ui text-[0.58rem] font-semibold uppercase tracking-[0.1em] text-[#314a40]">
                  Challenges by domain
                </p>
                <div className="mt-4 h-[14rem]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={domains}>
                      <XAxis
                        dataKey="domain"
                        fontSize={9}
                        tick={{ fill: "#314a40" }}
                        interval={0}
                      />
                      <YAxis fontSize={10} tick={{ fill: "#52675d" }} />
                      <Tooltip />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {domains.map((_, i) => (
                          <Cell
                            key={i}
                            fill={
                              [
                                "#2877a4",
                                "#b88119",
                                "#b14e2d",
                                "#5b854a",
                                "#7a6a4c",
                                "#6a5a9c",
                              ][i % 6]
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="border border-[#a58c6d]/40 bg-[#f8f2e8]/25 p-5">
                <p className="font-mono-ui text-[0.58rem] font-semibold uppercase tracking-[0.1em] text-[#314a40]">
                  Summary
                </p>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="font-body text-[2.2rem] font-extrabold leading-none tracking-[-0.02em] tabular-nums text-[#0d3024]">
                      {challenges.length}
                    </p>
                    <p className="mt-1 font-mono-ui text-[0.58rem] uppercase tracking-[0.1em] text-[#53675d]">
                      Total challenges
                    </p>
                  </div>
                  <div>
                    <p className="font-body text-[2.2rem] font-extrabold leading-none tracking-[-0.02em] tabular-nums text-[#c94a20]">
                      {Array.from(stats.values()).reduce(
                        (sum, s) => sum + s.bottleneck,
                        0
                      )}
                    </p>
                    <p className="mt-1 font-mono-ui text-[0.58rem] uppercase tracking-[0.1em] text-[#53675d]">
                      Bottlenecks (&gt;14d)
                    </p>
                  </div>
                  <div>
                    <p className="font-body text-[2.2rem] font-extrabold leading-none tracking-[-0.02em] tabular-nums text-[#3a6b4a]">
                      {new Set(challenges.map(c => c.district)).size}
                    </p>
                    <p className="mt-1 font-mono-ui text-[0.58rem] uppercase tracking-[0.1em] text-[#53675d]">
                      Districts active
                    </p>
                  </div>
                  <div>
                    <p className="font-body text-[2.2rem] font-extrabold leading-none tracking-[-0.02em] tabular-nums text-[#16422f]">
                      {new Set(challenges.map(c => c.domain)).size}
                    </p>
                    <p className="mt-1 font-mono-ui text-[0.58rem] uppercase tracking-[0.1em] text-[#53675d]">
                      Domains covered
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CSV Export Form */}
          <div className="mx-auto mt-10 max-w-[72rem]">
            <div className="flex items-center gap-5">
              <span className="h-px flex-1 bg-[#a78e6e]/45" />
              <p className="font-mono-ui text-[0.63rem] font-semibold uppercase tracking-[0.12em]">
                CSV Export
              </p>
              <span className="h-px flex-1 bg-[#a78e6e]/45" />
            </div>
            <form onSubmit={generate} className="mx-auto mt-5 max-w-[38rem]">
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
          </div>

          {/* Recent Reports */}
          <section className="mx-auto mt-10 max-w-[72rem]">
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
