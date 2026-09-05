/**
 * Duplicate challenge detection — title + description similarity.
 *
 * Compares a new challenge against existing ones using:
 * 1. Same district + same domain (pre-filter — cross-domain ≠ duplicate)
 * 2. Title word-overlap similarity (primary signal)
 * 3. Description word-overlap second-pass when title is borderline (0.4–0.6)
 * 4. Filters out resolved/rejected challenges (only flags open ones)
 */

export type DuplicateChallenge = {
  id: number;
  title: string;
  description: string;
  district: string;
  domain: string;
  status: string;
};

export type DuplicateResult = {
  isDuplicate: boolean;
  matchId: number | null;
  matchTitle: string;
  matchDescription: string;
  matchDistrict: string;
  matchDomain: string;
  similarity: number;
};

const STOPWORDS = new Set([
  "the", "and", "for", "with", "from", "this", "that",
  "have", "into", "near", "district", "been", "was",
  "are", "not", "but", "will", "can", "has", "its",
]);

function tokenizeWords(text: string | null | undefined): Set<string> {
  if (!text) return new Set();
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(w => w.length > 3 && !STOPWORDS.has(w))
  );
}

function wordOverlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let common = 0;
  for (const word of Array.from(a)) {
    if (b.has(word)) common++;
  }
  return common / Math.max(a.size, 1);
}

const RESOLVED_STATUSES = new Set(["resolved", "rejected"]);

/**
 * Checks if a new challenge is likely a duplicate of an existing one.
 *
 * Pre-filters by district + domain + open status, then scores text similarity.
 * When title similarity is borderline (0.4–0.6), a second-pass description
 * check reduces false negatives (generic titles like "Water problem" that
 * differ in the details).
 */
export function checkTitleDuplicate(
  district: string,
  title: string,
  existingChallenges: DuplicateChallenge[],
  newDescription?: string,
  newDomain?: string
): DuplicateResult {
  const empty: DuplicateResult = {
    isDuplicate: false,
    matchId: null,
    matchTitle: "",
    matchDescription: "",
    matchDistrict: "",
    matchDomain: "",
    similarity: 0,
  };

  const normalizedTitle = title.toLowerCase().trim();
  if (!normalizedTitle || normalizedTitle.length < 5) return empty;

  const newTitleWords = tokenizeWords(title);
  let bestMatch: DuplicateResult | null = null;

  for (const challenge of existingChallenges) {
    // Skip resolved/rejected — only flag open challenges
    if (RESOLVED_STATUSES.has(challenge.status)) continue;

    // Must be same district
    if (challenge.district.toLowerCase() !== district.toLowerCase()) continue;

    // Must be same domain (if both have one set)
    if (newDomain && challenge.domain &&
        newDomain.toLowerCase() !== challenge.domain.toLowerCase()) continue;

    const existingTitleWords = tokenizeWords(challenge.title);
    const titleSim = wordOverlap(newTitleWords, existingTitleWords);

    let finalSim = titleSim;

    // Second-pass: if title is borderline (0.4–0.6), check description too
    if (titleSim >= 0.4 && titleSim < 0.6 && newDescription) {
      const newDescWords = tokenizeWords(newDescription);
      const existingDescWords = tokenizeWords(challenge.description);
      const descSim = wordOverlap(newDescWords, existingDescWords);
      finalSim = titleSim * 0.6 + descSim * 0.4;
    }

    if (finalSim >= 0.5) {
      if (!bestMatch || finalSim > bestMatch.similarity) {
        bestMatch = {
          isDuplicate: true,
          matchId: challenge.id,
          matchTitle: challenge.title,
          matchDescription: challenge.description.slice(0, 150),
          matchDistrict: challenge.district,
          matchDomain: challenge.domain,
          similarity: Math.round(finalSim * 100),
        };
      }
    }
  }

  return bestMatch ?? empty;
}
