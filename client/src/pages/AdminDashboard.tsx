/**
 * Style: Samadhan public admin analytics — disciplined paper data wall, oversized civic metrics,
 * warm domain bars, a district overview, and a fine-line completion trend.
 */
import AdminHeader from "@/components/AdminHeader";
import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { InteractiveMap, type MapMarker } from "@/components/InteractiveMap";
import {
  JHARKHAND_CENTER,
  JHARKHAND_DISTRICTS,
} from "@/lib/jharkhandDistricts";

const DOMAIN_PALETTE = [
  "#c65022",
  "#94a48d",
  "#d5a23c",
  "#afb08a",
  "#c8c5a7",
  "#d5d2bd",
  "#8fa887",
  "#b98a5c",
];

type Challenge = {
  domain: string;
  district: string;
  status: string;
  createdAt?: Date | string | null;
};
type Organization = { kind: string; verificationStatus: string };

export default function AdminDashboard() {
  const [input] = useState({});
  const challengesQuery = trpc.workflow.challenges.useQuery(input);
  const organizationsQuery = trpc.workflow.organizations.useQuery(input);
  const challenges = (challengesQuery.data ?? []) as Challenge[];
  const organizations = (organizationsQuery.data ?? []) as Organization[];
  const loading = challengesQuery.isLoading || organizationsQuery.isLoading;

  const resolvedCount = challenges.filter(c => c.status === "resolved").length;
  const completionRate = challenges.length
    ? (resolvedCount / challenges.length) * 100
    : 0;
  const activeInstitutions = organizations.filter(
    o => o.verificationStatus === "verified"
  ).length;
  const districtsCovered = new Set(challenges.map(c => c.district)).size;

  return (
    <main
      className="min-h-screen bg-[#f1eadc] text-[#0d3024]"
      style={{
        backgroundImage: "url('/images/samadhan-paper-grain_46302c3f.jpg')",
        backgroundSize: "cover",
      }}
    >
      <AdminHeader active="Dashboard" />
      <section className="px-6 py-8 sm:px-10 lg:px-[3rem] lg:py-8">
        <div className="mx-auto max-w-[96rem]">
          {loading ? (
            <div className="flex items-center gap-3 border border-[#a58c6d]/45 bg-[#f7f1e7]/28 px-6 py-8 font-body text-[0.82rem] text-[#52675d]">
              <Loader2 className="animate-spin" size={18} />
              Loading platform analytics…
            </div>
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  label="Total challenges"
                  value={challenges.length.toLocaleString()}
                  note="Reported across Jharkhand"
                />
                <MetricCard
                  label="Verified organizations"
                  value={activeInstitutions.toLocaleString()}
                  note="Institutions & industry partners"
                />
                <MetricCard
                  label="Completion rate"
                  value={`${completionRate.toFixed(1)}%`}
                  note="Challenges resolved"
                />
                <MetricCard
                  label="Districts covered"
                  value={String(districtsCovered)}
                  note={`Out of ${JHARKHAND_DISTRICTS.length} districts`}
                />
              </div>
              <div className="mt-4 grid gap-4 xl:grid-cols-[1.55fr_.95fr]">
                <DistrictPanel challenges={challenges} />
                <DomainPanel challenges={challenges} />
              </div>
              <TrendPanel challenges={challenges} />
            </>
          )}
        </div>
      </section>
    </main>
  );
}
function MetricCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <article className="border border-[#a58c6d]/45 bg-[#f7f1e7]/28 px-6 py-7">
      <p className="font-mono-ui text-[0.63rem] font-semibold uppercase tracking-[0.13em]">
        {label}
      </p>
      <p className="mt-5 font-body text-[3.1rem] font-bold leading-none tracking-[-0.03em] tabular-nums">
        {value}
      </p>
      <p className="mt-3 font-body text-[0.8rem] text-[#53675d]">{note}</p>
    </article>
  );
}
const DISTRICT_BUCKETS: [number, string][] = [
  [500, "#c64b22"],
  [200, "#dd7b3b"],
  [100, "#e7a96a"],
  [50, "#efc394"],
  [10, "#eadbc2"],
  [0, "#c9c2ac"],
];
function bucketColor(count: number) {
  return DISTRICT_BUCKETS.find(([min]) => count >= min)?.[1] ?? "#c9c2ac";
}
function bucketSize(count: number) {
  return Math.min(34, 14 + Math.sqrt(count) * 3);
}

function DistrictPanel({ challenges }: { challenges: Challenge[] }) {
  const legend = [
    ["#c64b22", "500+"],
    ["#dd7b3b", "200 – 500"],
    ["#e7a96a", "100 – 200"],
    ["#efc394", "50 – 100"],
    ["#eadbc2", "10 – 50"],
    ["#c9c2ac", "< 10"],
  ];
  const [, setLocationPath] = useLocation();
  const [selected, setSelected] = useState<string | null>(null);
  const countsByDistrict = useMemo(() => {
    const counts = new Map<string, number>();
    for (const challenge of challenges) {
      const key = challenge.district;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [challenges]);
  const markers: MapMarker[] = useMemo(
    () =>
      JHARKHAND_DISTRICTS.map(district => {
        const count = countsByDistrict.get(district.name) ?? 0;
        return {
          id: district.name,
          lat: district.lat,
          lng: district.lng,
          label: district.name,
          color: bucketColor(count),
          size: bucketSize(count),
          active: selected === district.name,
          onClick: () => setSelected(district.name),
        };
      }),
    [countsByDistrict, selected]
  );
  const selectedCount = selected ? (countsByDistrict.get(selected) ?? 0) : 0;

  return (
    <article className="relative min-h-[26.5rem] overflow-hidden border border-[#a58c6d]/45 bg-[#f7f1e7]/28 p-6">
      <p className="relative z-10 font-mono-ui text-[0.65rem] font-semibold uppercase tracking-[0.13em]">
        Challenges by district
      </p>
      <p className="relative z-10 mt-2 font-body text-[0.76rem] text-[#566a60]">
        Click on a district to view details
      </p>
      <div className="relative z-10 mt-4 h-[19.5rem] w-full border border-[#a58c6d]/35">
        <InteractiveMap
          center={JHARKHAND_CENTER}
          zoom={7}
          markers={markers}
          className="h-full w-full"
        />
      </div>
      {selected && (
        <div className="relative z-10 mt-4 flex items-center justify-between border border-[#a58c6d]/45 bg-[#f7f1e7]/80 px-4 py-3">
          <p className="font-body text-[0.8rem]">
            <span className="font-semibold">{selected}</span> · {selectedCount}{" "}
            {selectedCount === 1 ? "challenge" : "challenges"}
          </p>
          <button
            type="button"
            onClick={() =>
              setLocationPath(
                `/admin/challenges?district=${encodeURIComponent(selected)}`
              )
            }
            className="font-mono-ui text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-[#c64b22] hover:underline"
          >
            View district →
          </button>
        </div>
      )}
      <div className="relative z-10 mt-4 flex flex-wrap gap-x-5 gap-y-2 bg-[#f7f1e7]/60 p-3">
        <p className="w-full font-mono-ui text-[0.57rem] font-semibold uppercase tracking-[0.1em]">
          Challenges
        </p>
        {legend.map(([color, label]) => (
          <p
            key={label}
            className="flex items-center gap-2 font-body text-[0.7rem]"
          >
            <span
              className="size-3.5 rounded-full border border-[#b9aa93]/30"
              style={{ backgroundColor: color }}
            />
            {label}
          </p>
        ))}
      </div>
    </article>
  );
}
function DomainPanel({ challenges }: { challenges: Challenge[] }) {
  const domains = useMemo(() => {
    const counts = new Map<string, number>();
    for (const challenge of challenges) {
      counts.set(challenge.domain, (counts.get(challenge.domain) ?? 0) + 1);
    }
    const total = challenges.length || 1;
    return Array.from(counts.entries())
      .map(([label, count], index) => ({
        label,
        value: (count / total) * 100,
        color: DOMAIN_PALETTE[index % DOMAIN_PALETTE.length]!,
      }))
      .sort((a, b) => b.value - a.value);
  }, [challenges]);
  const maxValue = Math.max(10, ...domains.map(domain => domain.value));

  return (
    <article className="border border-[#a58c6d]/45 bg-[#f7f1e7]/28 p-6">
      <p className="font-mono-ui text-[0.65rem] font-semibold uppercase tracking-[0.13em]">
        Challenges by domain
      </p>
      <p className="mt-2 font-body text-[0.76rem] text-[#566a60]">
        % of total challenges
      </p>
      {domains.length === 0 ? (
        <p className="mt-8 font-body text-[0.78rem] text-[#607168]">
          No challenges have been reported yet.
        </p>
      ) : (
        <div className="mt-8 space-y-6">
          {domains.map(domain => (
            <div
              key={domain.label}
              className="grid grid-cols-[5.8rem_1fr_3rem] items-center gap-3"
            >
              <span className="truncate font-body text-[0.79rem]">
                {domain.label}
              </span>
              <span className="h-6 bg-[#e7e1d4]">
                <span
                  className="block h-full"
                  style={{
                    width: `${(domain.value / maxValue) * 100}%`,
                    backgroundColor: domain.color,
                  }}
                />
              </span>
              <span className="font-body text-[0.76rem]">
                {domain.value.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
function TrendPanel({ challenges }: { challenges: Challenge[] }) {
  const months = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      return {
        date,
        label: date.toLocaleDateString(undefined, {
          month: "short",
          year: "2-digit",
        }),
      };
    });
  }, []);
  const trend = useMemo(
    () =>
      months.map(({ date }) => {
        const cutoff = new Date(date.getFullYear(), date.getMonth() + 1, 1);
        const upToMonth = challenges.filter(challenge => {
          if (!challenge.createdAt) return false;
          return new Date(challenge.createdAt) < cutoff;
        });
        if (upToMonth.length === 0) return null;
        const resolved = upToMonth.filter(c => c.status === "resolved").length;
        return (resolved / upToMonth.length) * 100;
      }),
    [months, challenges]
  );
  const hasData = trend.some(value => value !== null);

  return (
    <article className="mt-4 border border-[#a58c6d]/45 bg-[#f7f1e7]/28 p-6">
      <p className="font-mono-ui text-[0.65rem] font-semibold uppercase tracking-[0.13em]">
        Completion rate over time
      </p>
      <p className="mt-2 font-body text-[0.76rem] text-[#566a60]">
        Monthly completion rate (%), last 6 months
      </p>
      {!hasData ? (
        <p className="mt-8 font-body text-[0.78rem] text-[#607168]">
          Not enough history yet to chart a trend.
        </p>
      ) : (
        <TrendChart months={months.map(m => m.label)} trend={trend} />
      )}
    </article>
  );
}
function TrendChart({
  months,
  trend,
}: {
  months: string[];
  trend: (number | null)[];
}) {
  const known = trend
    .map((value, index) => (value === null ? null : { value, index }))
    .filter(
      (entry): entry is { value: number; index: number } => entry !== null
    );
  const points = known.map(({ value, index }) => ({
    x: 60 + index * (1080 / (trend.length - 1)),
    y: 132 - value * 0.9,
    index,
  }));
  const polyline = points.map(point => `${point.x},${point.y}`).join(" ");
  return (
    <div className="mt-5 h-[10.5rem] w-full">
      <svg
        viewBox="0 0 1200 160"
        preserveAspectRatio="none"
        className="size-full overflow-visible"
        role="img"
        aria-label="Monthly completion rate trend"
      >
        <g stroke="#b8ad99" strokeDasharray="4 4" strokeWidth="1">
          {[25, 50, 75, 100, 125].map(y => (
            <line key={y} x1="60" x2="1140" y1={y} y2={y} />
          ))}
        </g>
        <polyline
          points={polyline}
          fill="none"
          stroke="#c64b22"
          strokeWidth="2.4"
        />
        {points.map(point => (
          <g key={point.index}>
            <circle cx={point.x} cy={point.y} r="4" fill="#c64b22" />
            <text
              className="hidden sm:block"
              x={point.x}
              y={point.y - 12}
              textAnchor="middle"
              fontSize="13"
              fill="#183b2d"
            >
              {trend[point.index]!.toFixed(0)}%
            </text>
          </g>
        ))}
        {months.map((label, index) => (
          <text
            key={label}
            className="hidden sm:block"
            x={60 + index * (1080 / (trend.length - 1))}
            y="153"
            textAnchor="middle"
            fontSize="10"
            fill="#53675d"
          >
            {label}
          </text>
        ))}
      </svg>
    </div>
  );
}
