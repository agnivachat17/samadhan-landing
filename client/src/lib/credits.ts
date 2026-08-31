/**
 * USP-06: Academic credit calculation for project delivery.
 *
 * Simple formula: team members * 10 + milestones completed * 5, capped at 100.
 */

export function creditsForProject(
  teamSize: number,
  milestoneCount: number
): number {
  return Math.min(100, teamSize * 10 + milestoneCount * 5);
}
