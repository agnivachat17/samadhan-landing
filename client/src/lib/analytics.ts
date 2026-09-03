/**
 * USP-05: GIS Command Center analytics helpers.
 *
 * Pure computation from already-fetched data — no Firestore calls.
 * Used by AdminReports.tsx to power choropleth, charts, and bottleneck alerts.
 *
 * USP-11: `computeEscalations` extends the bottleneck detection into an
 * actual escalation chain — staged thresholds (14-day internal, 30-day
 * external) with per-challenge escalation events that can be written to
 * the public Impact Timeline and trigger notifications.
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

// ──────────────────────────────────────────────────────────────────
// USP-11: Community Corroboration & Automated Escalation Accountability
//
// `computeEscalations` turns the passive >14-day bottleneck detection
// into an actionable escalation chain. Two thresholds:
//   - 14 days: internal notification (assigned institution + admin)
//   - 30 days: external escalation (district-level public timeline entry)
//
// Pure computation — returns escalation events. The caller
// (AdminReports.tsx) is responsible for actually calling
// `createNotification()` for any newly-crossed threshold.
// ──────────────────────────────────────────────────────────────────

type EscalationChallenge = {
  id: number;
  title: string;
  domain: string;
  district: string;
  status: string;
  createdAt?: Date | string | null;
  assignedOrganizationId?: number | null;
};

export type EscalationLevel = "warning" | "escalated";

export type EscalationEvent = {
  challengeId: number;
  level: EscalationLevel;
  /** Day threshold the challenge has crossed (14 or 30). */
  thresholdDays: number;
  /** Human-readable message for notification body / public timeline. */
  message: string;
  /** Institution contact email for the assigned org (if any). */
  institutionEmail?: string;
  /** District name (for district-level escalation). */
  district: string;
};

/**
 * Given already-fetched challenges, computes escalation events for any
 * challenge that has crossed the 14-day (internal warning) or 30-day
 * (external/public escalation) thresholds while still stuck in
 * submitted/under_review status.
 *
 * The caller should de-duplicate against already-notified challenges
 * (e.g. by checking a `lastEscalationNotifiedAt` field or a per-user
 * notification cache) before actually sending notifications.
 */
export function computeEscalations(
  challenges: EscalationChallenge[],
  organizations: { id: number; contactEmail?: string | null }[]
): EscalationEvent[] {
  const orgEmail = new Map<number, string>();
  for (const o of organizations) {
    if (o.contactEmail) orgEmail.set(o.id, o.contactEmail);
  }

  const events: EscalationEvent[] = [];
  const now = Date.now();

  for (const c of challenges) {
    if (c.status !== "submitted" && c.status !== "under_review") continue;
    const ageDays = (now - new Date(c.createdAt ?? Date.now()).getTime()) / (1000 * 60 * 60 * 24);

    if (ageDays >= 30) {
      events.push({
        challengeId: c.id,
        level: "escalated",
        thresholdDays: 30,
        message: `Escalated — no status change recorded for ${Math.floor(ageDays)} days. Challenge "${c.title}" in ${c.district} requires district-level review.`,
        district: c.district,
        institutionEmail: c.assignedOrganizationId ? orgEmail.get(c.assignedOrganizationId) ?? undefined : undefined,
      });
    } else if (ageDays >= 14) {
      events.push({
        challengeId: c.id,
        level: "warning",
        thresholdDays: 14,
        message: `Warning — no status change for ${Math.floor(ageDays)} days. Challenge "${c.title}" in ${c.district} needs attention.`,
        district: c.district,
        institutionEmail: c.assignedOrganizationId ? orgEmail.get(c.assignedOrganizationId) ?? undefined : undefined,
      });
    }
  }
  return events;
}
