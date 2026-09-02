# USP-05 — GIS Command Center (Live District Heatmap + Bottlenecks)

**Problem:** `Challenges.tsx:241 districtCounts` + `InteractiveMap.tsx:97` + `AdminReports.tsx:77` exist but are disconnected. `Home.tsx:174` metrics are hard-coded `2,847/112/34`. Admin has CSV `toCsv:39` but no heat map, no `under_review >14d` alerts, no `domain`/`status` trends. DARPG Data Strategy Unit + CPGRAMS AI heat maps are 2025 govt standard — generics show Recharts bar of dummy `Mumbai` data.

**Goal:** Client-computed GIS from world-readable `challenges`/`projects` (no new collection, no server): choropleth (color = count), district drill-down, time-series, `bottleneck: age>14d && status∈{submitted,under_review}` alerts. Reuse `JHARKHAND_DISTRICTS:5` + `InteractiveMap` blurred-modal fix (see the project architecture notes) + `recharts:68` already in `package.json`.

**Stack:** `recharts` + `leaflet GeoJSON` (free `jharkhand.geojson` raw) + `supercluster` optional (density). Spark-safe, zero extra reads.

## Steps

### 1. GeoJSON (20m) — `client/public/geo/jharkhand.json`

- Fetch Jharkhand district GeoJSON (e.g., `https://raw.githubusercontent.com/india-geojson/.../jharkhand.json` or `datameet` repo). Save as `client/public/geo/jharkhand.json` (~40KB). Verify 24 `properties.DISTRICT` match `JHARKHAND_DISTRICTS:5` names (normalize `East Singhbhum` vs `East Singhbhum District`).

### 2. Analytics helper (40m) — new `client/src/lib/analytics.ts`

```ts
export type DistrictStat = {
  district: string;
  total: number;
  byStatus: Record<string, number>;
  byDomain: Record<string, number>;
  avgAgeDays: number;
  bottleneck: number;
};
export function computeDistrictStats(
  challenges: Challenge[]
): Map<string, DistrictStat> {
  const m = new Map<string, DistrictStat>();
  for (const c of challenges) {
    const s = m.get(c.district) ?? {
      district: c.district,
      total: 0,
      byStatus: {},
      byDomain: {},
      avgAgeDays: 0,
      bottleneck: 0,
    };
    s.total++;
    s.byStatus[c.status] = (s.byStatus[c.status] ?? 0) + 1;
    s.byDomain[c.domain] = (s.byDomain[c.domain] ?? 0) + 1;
    const age =
      (Date.now() - new Date((c as any).createdAt).getTime()) /
      (1000 * 60 * 60 * 24);
    s.avgAgeDays = (s.avgAgeDays * (s.total - 1) + age) / s.total;
    if ((c.status === "submitted" || c.status === "under_review") && age > 14)
      s.bottleneck++;
    m.set(c.district, s);
  }
  return m;
}
export function computeTrends(
  challenges: Challenge[]
): { week: string; count: number }[] {
  const buckets = new Map<string, number>();
  for (const c of challenges) {
    const d = new Date((c as any).createdAt);
    const wk = `${d.getFullYear()}-W${String(Math.ceil((d.getDate() + (d.getDay() || 7)) / 7)).padStart(2, "0")}`;
    buckets.set(wk, (buckets.get(wk) ?? 0) + 1);
  }
  return [...buckets.entries()]
    .map(([week, count]) => ({ week, count }))
    .sort((a, b) => a.week.localeCompare(b.week))
    .slice(-12);
}
export function topDomains(
  challenges: Challenge[]
): { domain: string; count: number }[] {
  const m = new Map<string, number>();
  for (const c of challenges) m.set(c.domain, (m.get(c.domain) ?? 0) + 1);
  return [...m.entries()]
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}
```

- No Firestore calls — derive from already-fetched `trpc.workflow.challenges.useQuery:106`.

### 3. Choropleth (60m) — enhance `AdminReports.tsx:77` + `AdminDashboard.tsx` OR new `AdminGis.tsx` at `/admin/gis`

- **Option A (preferred for SIH):** Enhance `AdminReports.tsx:77` — keep CSV form, add new `section` below `RecentRow:256`:

  ```tsx
  import { GeoJSON } from "react-leaflet";
  const stats = useMemo(() => computeDistrictStats(challenges), [challenges]);
  const maxTotal = Math.max(1, ...[...stats.values()].map(s => s.total));
  function fillColor(total: number): string {
    const t = total / maxTotal; // 0→1
    // #f1eadc (paper) → #c94a20 (ember)
    return t === 0
      ? "#e8ddd0"
      : `color-mix(in oklch, #f1eadc ${100 - t * 100}%, #c94a20)`;
  }
  // In JSX:
  <MapContainer
    center={JHARKHAND_CENTER}
    zoom={6.8}
    className="h-[28rem] border border-[#a58c6d]/40"
  >
    <TileLayer
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      attribution="&copy; OSM"
    />
    <GeoJSON
      data={jharkhandGeo}
      style={f => ({
        fillColor: fillColor(stats.get(f.properties.DISTRICT)?.total ?? 0),
        weight: 1,
        color: "#8d806b",
        fillOpacity: 0.7,
      })}
      onEachFeature={(f, layer) => {
        const s = stats.get(f.properties.DISTRICT);
        layer.bindTooltip(
          `${f.properties.DISTRICT}: ${s?.total ?? 0} (bottleneck ${s?.bottleneck ?? 0})`
        );
        layer.on("click", () => setDistrict(f.properties.DISTRICT));
      }}
    />
    {JHARKHAND_DISTRICTS.map(d => {
      const s = stats.get(d.name);
      const cnt = s?.total ?? 0;
      return (
        <Marker
          key={d.name}
          position={[d.lat, d.lng]}
          icon={dotIcon({
            id: d.name,
            lat: d.lat,
            lng: d.lng,
            size: cnt ? Math.min(28, 12 + cnt * 3) : 8,
            color: s?.bottleneck ? "#a5241a" : cnt ? "#c94a20" : "#8a9a86",
          })}
        />
      );
    })}
  </MapContainer>;
  ```

- Add `client/public/geo/jharkhand.json` import `import jharkhandGeo from "/geo/jharkhand.json"` (fetch in `useEffect` if not bundled).

- **Bottleneck banner:** `[...stats.values()].filter(s=>s.bottleneck>0).sort((a,b)=>b.avgAgeDays-a.avgAgeDays).slice(0,3).map(s=> <Alert key={s.district} className="border-[#bd5a38]/60 bg-[#f7e2d6]/35"> {s.district}: {s.bottleneck} stuck >14d, avg {s.avgAgeDays.toFixed(0)}d — needs re-assign </Alert>)`

### 4. Charts (30m) — same `AdminReports.tsx` section

Use `recharts` (`package.json:68`):

```tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
const trends = useMemo(()=>computeTrends(challenges),[challenges]);
const domains = useMemo(()=>topDomains(challenges),[challenges]);
<ResponsiveContainer width="100%" height={180}><BarChart data={[...stats.values()].sort((a,b)=>b.total-a.total).slice(0,8)}><Bar dataKey="total" fill="#c94a20" radius={[6,6,0,0]} /><XAxis dataKey="district" fontSize={10} /><YAxis fontSize={10} /><Tooltip /></BarChart></ResponsiveContainer>
<ResponsiveContainer width="100%" height={160}><LineChart data={trends}><Line dataKey="count" stroke="#16422f" strokeWidth={2} dot={false} /><XAxis dataKey="week" fontSize={9} /><YAxis fontSize={10} /><Tooltip /></LineChart></ResponsiveContainer>
```

- Keep `Home.tsx:174` hero metrics hard-coded for landing polish, but add footnote `Live: {challenges.length} challenges today` from same query (wire `trpc.workflow.challenges` in `Home.tsx` as optional).

### 5. Export (15m) — `AdminReports.tsx:39 toCsv`

Extend `toCsv` header with `Bottleneck, AvgAgeDays` via `computeDistrictStats` lookup per row, so CSV tell same story as map.

### 6. Verify

1. `npm run check && npm run build` — `recharts` already there, `jharkhand.json` must be under `public/geo` so it precaches via `vite-plugin-pwa:15 globPatterns`.
2. `AdminReports` with 50 `Demo ` challenges (seeded, see the project architecture notes) → choropleth colors Latehar/Gumla vs Ranchi correctly, `Bottleneck` banner lists `submitted >14d` districts.
3. Click district → `setDistrict` filters `visibleChallenges` (`Challenges.tsx:265` pattern) — keep parity.
4. No `permission-denied` — `challenges`/`projects` are `firestore.rules:70 allow read if true`.

### Demo script (30s)

Open `/admin/reports` → choropleth: "Latehar Water: 14 open, avg 32d, 6 bottleneck vs Ranchi 4d — needs re-assign to verified institution." Toggle domain filter → lines update.

### Risks

- GeoJSON district names mismatch `JHARKHAND_DISTRICTS:5` — normalize `toLowerCase().includes` as in `findDistrictCentroid:42`.
- Large `jharkhand.json` (~100KB) — keep under `workbox.maximumFileSizeToCacheInBytes:3MB` (`vite.config.ts:15` already 3MB).
- Don't `listCollection` evidence/documents inside GIS — only `challenges`/`projects` aggregates (like `Challenges.tsx:241`), or you'll pull base64 `fileData`.
