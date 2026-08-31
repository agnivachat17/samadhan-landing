/**
 * Duplicate challenge detection — title + district matching.
 *
 * Compares a new challenge's title against existing challenges
 * in the same district. If a match is found (title similarity > 60%), warns the user.
 */

export type DuplicateResult = {
  isDuplicate: boolean;
  matchId: number | null;
  matchTitle: string;
  distance: number;
};

/**
 * Lightweight duplicate check: same district + similar title keywords.
 * Uses word-overlap similarity (no external API needed).
 */
export function checkTitleDuplicate(
  district: string,
  title: string,
  existingChallenges: Array<{ district: string; title: string; id: number }>
): DuplicateResult {
  const normalizedTitle = title.toLowerCase().trim();
  if (!normalizedTitle || normalizedTitle.length < 5) {
    return { isDuplicate: false, matchId: null, matchTitle: "", distance: Infinity };
  }

  const titleWords = new Set(
    normalizedTitle.split(/\s+/).filter(w => w.length > 3)
  );

  for (const challenge of existingChallenges) {
    if (
      challenge.district.toLowerCase() !== district.toLowerCase()
    ) {
      continue;
    }

    const existingWords = new Set(
      challenge.title.toLowerCase().split(/\s+/).filter(w => w.length > 3)
    );

    let commonWords = 0;
    for (const word of Array.from(titleWords)) {
      if (existingWords.has(word)) commonWords++;
    }

    const similarity = commonWords / Math.max(titleWords.size, 1);
    if (similarity > 0.6) {
      return {
        isDuplicate: true,
        matchId: challenge.id,
        matchTitle: challenge.title,
        distance: Math.round((1 - similarity) * 100),
      };
    }
  }

  return { isDuplicate: false, matchId: null, matchTitle: "", distance: Infinity };
}
