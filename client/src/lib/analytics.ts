/**
 * USP-05: GIS Command Center analytics helpers.
 *
 * Pure computation from already-fetched data — no Firestore calls.
 * Used by AdminReports.tsx to power choropleth, charts, and bottleneck alerts.
 */

type Challenge = {
  id: number;
  title: string;
  domain: string;
  district: string;
  status: string;
  createdAt?: Date | string | null;
};

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
  const map = new Map<string, DistrictStat>();
  for (const c of challenges) {
    const existing = map.get(c.district) ?? {
      district: c.district,
      total: 0,
      byStatus: {},
      byDomain: {},
      avgAgeDays: 0,
      bottleneck: 0,
    };
    existing.total += 1;
    existing.byStatus[c.status] = (existing.byStatus[c.status] ?? 0) + 1;
    existing.byDomain[c.domain] = (existing.byDomain[c.domain] ?? 0) + 1;
    const ageDays =
      (Date.now() - new Date(c.createdAt ?? Date.now()).getTime()) /
      (1000 * 60 * 60 * 24);
    existing.avgAgeDays =
      (existing.avgAgeDays * (existing.total - 1) + ageDays) / existing.total;
    if (
      (c.status === "submitted" || c.status === "under_review") &&
      ageDays > 14
    ) {
      existing.bottleneck += 1;
    }
    map.set(c.district, existing);
  }
  return map;
}

export function computeTrends(
  challenges: Challenge[]
): { week: string; count: number }[] {
  const buckets = new Map<string, number>();
  for (const c of challenges) {
    const d = new Date(c.createdAt ?? Date.now());
    const startOfYear = new Date(d.getFullYear(), 0, 1);
    const weekNum = Math.ceil(
      ((d.getTime() - startOfYear.getTime()) / 86400000 +
        startOfYear.getDay() +
        1) /
        7
    );
    const key = `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return Array.from(buckets.entries())
    .map(([week, count]) => ({ week, count }))
    .sort((a, b) => a.week.localeCompare(b.week))
    .slice(-12);
}

export function topDomains(
  challenges: Challenge[]
): { domain: string; count: number }[] {
  const map = new Map<string, number>();
  for (const c of challenges) {
    map.set(c.domain, (map.get(c.domain) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

export function topDistricts(
  challenges: Challenge[]
): { district: string; count: number }[] {
  const map = new Map<string, number>();
  for (const c of challenges) {
    map.set(c.district, (map.get(c.district) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([district, count]) => ({ district, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}
