/**
 * Style: Samadhan public admin analytics — disciplined paper data wall, oversized civic metrics,
 * warm domain bars, a district overview, and a fine-line completion trend.
 */
import AdminHeader from "@/components/AdminHeader";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { InteractiveMap, type MapMarker } from "@/components/InteractiveMap";
import {
  JHARKHAND_CENTER,
  JHARKHAND_DISTRICTS,
} from "@/lib/jharkhandDistricts";

const domainData = [
  { label: "Water", value: 32.6, color: "#c65022" },
  { label: "Education", value: 22.1, color: "#94a48d" },
  { label: "Healthcare", value: 17.8, color: "#d5a23c" },
  { label: "Infrastructure", value: 13.4, color: "#afb08a" },
  { label: "Agriculture", value: 8.7, color: "#c8c5a7" },
  { label: "Other", value: 5.4, color: "#d5d2bd" },
];
const trend = [42, 45, 47, 51, 53, 55, 57, 59, 60, 61, 61, 61];
const months = [
  "May ’24",
  "Jun ’24",
  "Jul ’24",
  "Aug ’24",
  "Sep ’24",
  "Oct ’24",
  "Nov ’24",
  "Dec ’24",
  "Jan ’25",
  "Feb ’25",
  "Mar ’25",
  "Apr ’25",
];

export default function AdminDashboard() {
  return (
    <main
      className="min-h-screen bg-[#f1eadc] text-[#0d3024]"
      style={{
        backgroundImage:
          "url('/manus-storage/samadhan-paper-grain_46302c3f.jpg')",
        backgroundSize: "cover",
      }}
    >
      <AdminHeader active="Dashboard" />
      <section className="px-6 py-8 sm:px-10 lg:px-[3rem] lg:py-8">
        <div className="mx-auto max-w-[96rem]">
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Total challenges"
              value="8,742"
              note="Across Jharkhand"
            />
            <MetricCard
              label="Active institutions"
              value="126"
              note="Universities & Organizations"
            />
            <MetricCard
              label="Completion rate"
              value="61.3%"
              note="Challenges Resolved"
            />
            <MetricCard
              label="Districts covered"
              value="24"
              note="Out of 24 Districts"
            />
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-[1.55fr_.95fr]">
            <DistrictPanel />
            <DomainPanel />
          </div>
          <TrendPanel />
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

function DistrictPanel() {
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
  const challengesQuery = trpc.workflow.challenges.useQuery({});
  const countsByDistrict = useMemo(() => {
    const counts = new Map<string, number>();
    for (const challenge of challengesQuery.data ?? []) {
      const key = challenge.district;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [challengesQuery.data]);
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
function DomainPanel() {
  return (
    <article className="border border-[#a58c6d]/45 bg-[#f7f1e7]/28 p-6">
      <p className="font-mono-ui text-[0.65rem] font-semibold uppercase tracking-[0.13em]">
        Challenges by domain
      </p>
      <p className="mt-2 font-body text-[0.76rem] text-[#566a60]">
        % of total challenges
      </p>
      <div className="mt-8 space-y-6">
        {domainData.map(domain => (
          <div
            key={domain.label}
            className="grid grid-cols-[5.8rem_1fr_3rem] items-center gap-3"
          >
            <span className="font-body text-[0.79rem]">{domain.label}</span>
            <span className="h-6 bg-[#e7e1d4]">
              <span
                className="block h-full"
                style={{
                  width: `${(domain.value / 40) * 100}%`,
                  backgroundColor: domain.color,
                }}
              />
            </span>
            <span className="font-body text-[0.76rem]">{domain.value}%</span>
          </div>
        ))}
      </div>
      <div className="mt-8 flex justify-between border-t border-[#a58c6d]/35 pt-3 font-body text-[0.68rem] text-[#5d7067]">
        <span>0</span>
        <span>10%</span>
        <span>20%</span>
        <span>30%</span>
        <span>40%</span>
      </div>
    </article>
  );
}
function TrendPanel() {
  const points = trend.map((value, index) => ({
    x: 60 + index * (1080 / (trend.length - 1)),
    y: 132 - value * 0.9,
  }));
  const polyline = points.map(point => `${point.x},${point.y}`).join(" ");
  return (
    <article className="mt-4 border border-[#a58c6d]/45 bg-[#f7f1e7]/28 p-6">
      <p className="font-mono-ui text-[0.65rem] font-semibold uppercase tracking-[0.13em]">
        Completion rate over time
      </p>
      <p className="mt-2 font-body text-[0.76rem] text-[#566a60]">
        Monthly completion rate (%)
      </p>
      <div className="mt-5 h-[10.5rem] w-full">
        <svg
          viewBox="0 0 1200 160"
          preserveAspectRatio="none"
          className="size-full overflow-visible"
          role="img"
          aria-label="Completion rate rises from 42 percent to 61 percent"
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
          {points.map((point, index) => (
            <g key={months[index]}>
              <circle cx={point.x} cy={point.y} r="4" fill="#c64b22" />
              <text
                className="hidden sm:block"
                x={point.x}
                y={point.y - 12}
                textAnchor="middle"
                fontSize="13"
                fill="#183b2d"
              >
                {trend[index]}%
              </text>
              <text
                className="hidden sm:block"
                x={point.x}
                y="153"
                textAnchor="middle"
                fontSize="10"
                fill="#53675d"
              >
                {months[index]}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </article>
  );
}
