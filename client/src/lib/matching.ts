/**
 * USP-08: Intelligent problem-to-institution matching.
 *
 * Pure computation over already-fetched `organizations`/`assignments` data —
 * no Firestore calls of its own, same pattern as `client/src/lib/analytics.ts`.
 * Advisory only: this ranks and explains, it never gates `enrollChallenge()`/
 * `assignChallenge()`.
 */
import { findDistrictCentroid } from "@/lib/jharkhandDistricts";

type Challenge = {
  domain: string;
  description: string;
  district: string;
};

type Organization = {
  id: number;
  kind: string;
  verificationStatus: string;
  departments?: string | null;
  expertise?: string | null;
  priorityDomains?: string | null;
  location?: string | null;
};

type Assignment = {
  organizationId: number;
  status: string;
};

export type MatchResult = {
  organizationId: number;
  /** 0-100, higher is a better fit. */
  score: number;
  /** Human-readable, e.g. "Matches expertise in water" — not debug output. */
  reasons: string[];
};

const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "this",
  "that",
  "have",
  "into",
  "near",
  "district",
]);

function tokenize(text: string | null | undefined): Set<string> {
  if (!text) return new Set();
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(word => word.length > 3 && !STOPWORDS.has(word))
  );
}

function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const ACTIVE_ASSIGNMENT_STATUSES = new Set(["pending", "accepted"]);

/**
 * Scores every verified institution in `organizations` for how well it fits
 * `challenge`, combining four signals (weighted, 0-100 total):
 *  - domain/expertise keyword overlap (0-55) — the strongest signal, per the
 *    problem statement's own emphasis on "academic disciplines... faculty
 *    specialization".
 *  - geographic proximity (0-25), capped so a strong keyword match from a
 *    distant institution can still outrank a poorly-matched nearby one —
 *    deliberately counteracts Ranchi's outsized share of university capacity.
 *  - current active-assignment load (0-15, dampened as load rises) — throttles
 *    one popular institution from absorbing every well-matched challenge.
 *  - having any profile signal at all (0-5) — a small, non-punitive nudge so
 *    a fully blank profile doesn't tie with a thoughtfully filled one.
 * Missing/empty profile fields contribute 0 to their signal, never a penalty
 * (an institution that never filled in `expertise` is unranked, not excluded).
 */
export function scoreInstitutionsForChallenge(
  challenge: Challenge,
  organizations: Organization[],
  assignments: Assignment[]
): MatchResult[] {
  const challengeWords = new Set([
    ...Array.from(tokenize(challenge.domain)),
    ...Array.from(tokenize(challenge.description)),
  ]);
  const challengeCentroid = findDistrictCentroid(challenge.district);

  const loadByOrg = new Map<number, number>();
  for (const assignment of assignments) {
    if (!ACTIVE_ASSIGNMENT_STATUSES.has(assignment.status)) continue;
    loadByOrg.set(
      assignment.organizationId,
      (loadByOrg.get(assignment.organizationId) ?? 0) + 1
    );
  }

  const results: MatchResult[] = [];

  for (const org of organizations) {
    if (org.kind !== "institution" || org.verificationStatus !== "verified") {
      continue;
    }

    const reasons: string[] = [];
    let score = 0;

    const orgWords = new Set([
      ...Array.from(tokenize(org.departments)),
      ...Array.from(tokenize(org.expertise)),
      ...Array.from(tokenize(org.priorityDomains)),
    ]);
    const overlap = Array.from(challengeWords).filter(word =>
      orgWords.has(word)
    );
    if (overlap.length > 0) {
      const overlapScore = Math.min(55, overlap.length * 18 + 10);
      score += overlapScore;
      reasons.push(
        `Matches stated expertise: ${overlap.slice(0, 3).join(", ")}`
      );
    }

    const orgCentroid = findDistrictCentroid(org.location);
    if (challengeCentroid && orgCentroid) {
      const km = haversineKm(challengeCentroid, orgCentroid);
      if (km < 40) {
        score += 25;
        reasons.push("Based near this challenge's district");
      } else if (km < 150) {
        score += 15;
        reasons.push("Reasonably close to this challenge's district");
      } else if (km < 300) {
        score += 6;
      }
    }

    const load = loadByOrg.get(org.id) ?? 0;
    if (load === 0) {
      score += 15;
    } else if (load <= 2) {
      score += 9;
    } else if (load <= 5) {
      score += 3;
    } else {
      reasons.push("Currently has a full caseload");
    }

    if (orgWords.size > 0 || org.location) {
      score += 5;
    } else {
      reasons.push("Institution hasn't completed its capability profile");
    }

    results.push({
      organizationId: org.id,
      score: Math.round(Math.min(100, score)),
      reasons,
    });
  }

  return results.sort((a, b) => b.score - a.score);
}
