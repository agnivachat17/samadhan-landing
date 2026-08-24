/**
 * Shared Samadhan workflow vocabulary. These states are intentionally role-neutral so
 * the same record can move from citizen report to institutional delivery and public outcome.
 */
export const challengeStatuses = ["submitted", "under_review", "assigned", "in_progress", "resolved", "rejected"] as const;
export const projectStages = ["problem_identified", "solution_design", "prototype_development", "pilot_testing", "closeout"] as const;
export const projectStatuses = ["active", "at_risk", "on_hold", "closeout_pending", "resolved"] as const;
export const organizationKinds = ["institution", "industry"] as const;
export const verificationStatuses = ["pending", "verified", "rejected"] as const;
export const assignmentStatuses = ["pending", "accepted", "declined", "cancelled"] as const;
export const interestStatuses = ["submitted", "accepted", "declined", "withdrawn"] as const;

export type ChallengeStatus = (typeof challengeStatuses)[number];
export type ProjectStage = (typeof projectStages)[number];
export type ProjectStatus = (typeof projectStatuses)[number];
export type OrganizationKind = (typeof organizationKinds)[number];

export const workflowRoutes = {
  citizenRecord: (id: number) => `/citizen/challenges/${id}`,
  adminAssignment: (id: number) => `/admin/challenges/${id}/assign`,
  instituteCreateProject: (id: number) => `/institute/challenges/${id}/create-project`,
  instituteWorkspace: (id: number) => `/institute/projects/${id}/workspace`,
  industryProfile: "/industry/profile",
  industryInterests: "/industry/interests",
  adminCloseout: (id: number) => `/admin/projects/${id}/closeout`,
  notifications: "/notifications",
} as const;
