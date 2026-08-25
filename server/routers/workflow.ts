import { adminProcedure, router, publicProcedure } from "../_core/trpc";
import {
  addProjectActivity,
  addProjectDocument,
  addProjectMilestone,
  assignChallenge,
  createNotification,
  createOrganization,
  createOrganizationMember,
  createProject,
  deleteChallengeSupport,
  deleteOrganizationMember,
  getChallenge,
  getOrganization,
  getProject,
  listAssignments,
  listChallengeEvidence,
  listChallengeSupports,
  listChallenges,
  listIndustryInterests,
  listNotifications,
  listOrganizationMembers,
  listOrganizations,
  listProjectActivities,
  listProjectCloseouts,
  listProjectDocuments,
  listProjectMilestones,
  listProjects,
  setOrganizationVerification,
  submitChallenge,
  submitCloseout,
  submitIndustryInterest,
  supportChallenge,
  updateAssignment,
  updateChallenge,
  updateIndustryInterest,
  updateOrganization,
  updateOrganizationMember,
  updateProject,
  updateProjectCloseout,
  updateProjectMilestone,
  uploadChallengeEvidence,
  uploadProjectDocument,
  setOrganizationStanding,
} from "../workflow";
import { linkOrganizationOwner } from "../users";
import { z } from "zod";

const optionalText = z.string().trim().max(10_000).optional();
const optionalDate = z.coerce.date().optional();
const organizationDetailsInput = z.object({
  name: z.string().trim().min(2).max(255), contactName: z.string().trim().min(2).max(255), contactEmail: z.string().email(), contactPhone: z.string().trim().max(64).optional(), website: z.string().url().optional(), institutionType: z.string().trim().max(128).optional(), sector: z.string().trim().max(128).optional(), registrationNumber: z.string().trim().max(128).optional(), location: z.string().trim().max(255).optional(), overview: optionalText, departments: optionalText, expertise: optionalText, facilities: optionalText, impactLeadName: z.string().trim().max(255).optional(), impactLeadEmail: z.string().email().optional(), supportModes: optionalText, priorityDomains: optionalText, geographyFocus: optionalText, capacityBand: z.string().trim().max(128).optional(), preferredStage: z.string().trim().max(128).optional(), csrPolicyUrl: z.string().url().optional(),
});
const challengeStatus = z.enum(["submitted", "under_review", "assigned", "in_progress", "resolved", "rejected"]);
const projectStage = z.enum(["problem_identified", "solution_design", "prototype_development", "pilot_testing", "closeout"]);
const projectStatus = z.enum(["active", "at_risk", "on_hold", "closeout_pending", "resolved"]);

export const workflowRouter = router({
  organizationOnboard: publicProcedure.input(z.object({ kind: z.enum(["institution", "industry"]), complianceAccepted: z.boolean().optional() }).extend(organizationDetailsInput.shape)).mutation(async ({ input, ctx }) => {
    const { complianceAccepted, ...organization } = input;
    const result = await createOrganization({ ...organization, complianceAcceptedAt: complianceAccepted ? new Date() : undefined, ownerUid: ctx.user?.uid });
    if (ctx.user && ctx.user.role !== "admin") await linkOrganizationOwner(ctx.user.uid, result.id, input.kind);
    return result;
  }),
  organizationById: publicProcedure.input(z.object({ id: z.number().int().positive() })).query(({ input }) => getOrganization(input.id)),
  organizations: publicProcedure.input(z.object({ kind: z.enum(["institution", "industry"]).optional() })).query(({ input }) => listOrganizations(input.kind)),
  updateOrganization: publicProcedure.input(z.object({ id: z.number().int().positive(), details: organizationDetailsInput.partial() })).mutation(({ input }) => updateOrganization(input.id, input.details)),
  verifyOrganization: adminProcedure.input(z.object({ id: z.number().int().positive(), verificationStatus: z.enum(["pending", "verified", "rejected"]), verificationNotes: optionalText })).mutation(({ input }) => setOrganizationVerification(input)),
  updateOrganizationStanding: adminProcedure.input(z.object({ id: z.number().int().positive(), standing: z.enum(["active", "warned", "suspended", "terminated"]), notes: optionalText })).mutation(({ input }) => setOrganizationStanding(input)),

  organizationMembers: publicProcedure.input(z.object({ organizationId: z.number().int().positive(), memberRole: z.enum(["admin", "faculty", "student"]).optional() })).query(({ input }) => listOrganizationMembers(input.organizationId, input.memberRole)),
  addOrganizationMember: publicProcedure.input(z.object({ organizationId: z.number().int().positive(), fullName: z.string().trim().min(2).max(255), email: z.string().email(), phone: z.string().trim().max(64).optional(), memberRole: z.enum(["admin", "faculty", "student"]), department: z.string().trim().max(255).optional(), designation: z.string().trim().max(255).optional(), expertise: optionalText, mentorAvailable: z.boolean().optional(), program: z.string().trim().max(255).optional(), academicYear: z.string().trim().max(64).optional(), skills: optionalText, assignedProject: z.string().trim().max(255).optional() })).mutation(({ input }) => createOrganizationMember(input)),
  updateOrganizationMember: publicProcedure.input(z.object({ id: z.number().int().positive(), fullName: z.string().trim().min(2).max(255).optional(), email: z.string().email().optional(), phone: z.string().trim().max(64).optional(), department: z.string().trim().max(255).optional(), designation: z.string().trim().max(255).optional(), expertise: optionalText, mentorAvailable: z.boolean().optional(), program: z.string().trim().max(255).optional(), academicYear: z.string().trim().max(64).optional(), skills: optionalText, assignedProject: z.string().trim().max(255).optional(), status: z.enum(["invited", "active", "inactive"]).optional() })).mutation(({ input }) => { const { id, ...details } = input; return updateOrganizationMember(id, details); }),
  deleteOrganizationMember: publicProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => deleteOrganizationMember(input.id)),

  submitChallenge: publicProcedure.input(z.object({ citizenName: z.string().trim().min(2).max(255), citizenEmail: z.string().email().optional(), citizenPhone: z.string().trim().max(64).optional(), title: z.string().trim().min(8).max(500), description: z.string().trim().min(20).max(10_000), domain: z.string().trim().min(2).max(128), district: z.string().trim().min(2).max(128), latitude: z.string().trim().max(32).optional(), longitude: z.string().trim().max(32).optional() })).mutation(({ input }) => submitChallenge(input)),
  challenges: publicProcedure.input(z.object({})).query(() => listChallenges()),
  challengeById: publicProcedure.input(z.object({ id: z.number().int().positive() })).query(({ input }) => getChallenge(input.id)),
  updateChallenge: publicProcedure.input(z.object({ id: z.number().int().positive(), citizenName: z.string().trim().min(2).max(255).optional(), citizenEmail: z.string().email().optional(), citizenPhone: z.string().trim().max(64).optional(), title: z.string().trim().min(8).max(500).optional(), description: z.string().trim().min(20).max(10_000).optional(), domain: z.string().trim().min(2).max(128).optional(), district: z.string().trim().min(2).max(128).optional(), latitude: z.string().trim().max(32).optional(), longitude: z.string().trim().max(32).optional(), status: challengeStatus.optional(), priority: z.enum(["low", "medium", "high"]).optional(), assignedOrganizationId: z.number().int().positive().optional(), duplicateStatus: z.enum(["unreviewed", "cleared", "confirmed"]).optional(), duplicateOfId: z.number().int().positive().optional(), adminReviewNotes: optionalText, resolutionSummary: optionalText })).mutation(({ input }) => { const { id, ...details } = input; return updateChallenge(id, details); }),
  assignChallenge: publicProcedure.input(z.object({ challengeId: z.number().int().positive(), organizationId: z.number().int().positive(), adminName: z.string().trim().min(2).max(255), rationale: optionalText, dueAt: optionalDate })).mutation(({ input }) => assignChallenge(input)),
  assignments: publicProcedure.input(z.object({ challengeId: z.number().int().positive().optional(), organizationId: z.number().int().positive().optional() })).query(({ input }) => listAssignments(input.challengeId, input.organizationId)),
  updateAssignment: publicProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["pending", "accepted", "declined", "cancelled"]).optional(), rationale: optionalText, dueAt: optionalDate })).mutation(({ input }) => { const { id, ...details } = input; return updateAssignment(id, details); }),

  createProject: publicProcedure.input(z.object({ challengeId: z.number().int().positive(), organizationId: z.number().int().positive(), title: z.string().trim().min(8).max(500), overview: z.string().trim().min(20).max(10_000), leadName: z.string().trim().min(2).max(255), teamMembers: optionalText, targetCompletionAt: optionalDate })).mutation(({ input }) => createProject(input)),
  projects: publicProcedure.input(z.object({ organizationId: z.number().int().positive().optional(), challengeId: z.number().int().positive().optional() })).query(({ input }) => listProjects(input.organizationId, input.challengeId)),
  projectById: publicProcedure.input(z.object({ id: z.number().int().positive() })).query(({ input }) => getProject(input.id)),
  updateProject: publicProcedure.input(z.object({ id: z.number().int().positive(), stage: projectStage.optional(), status: projectStatus.optional(), progress: z.number().int().min(0).max(100).optional(), riskSummary: optionalText, targetCompletionAt: optionalDate })).mutation(({ input }) => { const { id, ...details } = input; return updateProject(id, details); }),
  addMilestone: publicProcedure.input(z.object({ projectId: z.number().int().positive(), title: z.string().trim().min(3).max(255), description: optionalText, position: z.number().int().min(0).default(0), status: z.enum(["upcoming", "in_progress", "complete", "blocked"]).default("upcoming"), dueAt: optionalDate })).mutation(({ input }) => addProjectMilestone(input)),
  projectMilestones: publicProcedure.input(z.object({ projectId: z.number().int().positive() })).query(({ input }) => listProjectMilestones(input.projectId)),
  updateMilestone: publicProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["upcoming", "in_progress", "complete", "blocked"]).optional(), title: z.string().trim().min(3).max(255).optional(), description: optionalText, dueAt: optionalDate })).mutation(({ input }) => { const { id, ...details } = input; return updateProjectMilestone(id, details); }),
  addProjectDocument: publicProcedure.input(z.object({ projectId: z.number().int().positive(), uploaderName: z.string().trim().min(2).max(255), name: z.string().trim().min(2).max(500), documentType: z.string().trim().min(2).max(128), fileUrl: z.string().url(), storageKey: z.string().max(1000).optional() })).mutation(({ input }) => addProjectDocument(input)),
  uploadProjectDocument: publicProcedure.input(z.object({ projectId: z.number().int().positive(), uploaderName: z.string().trim().min(2).max(255), name: z.string().trim().min(2).max(500), documentType: z.string().trim().min(2).max(128), mimeType: z.string().trim().min(3).max(128), base64: z.string().min(10).max(7_000_000) })).mutation(({ input }) => uploadProjectDocument(input)),
  projectDocuments: publicProcedure.input(z.object({ projectId: z.number().int().positive() })).query(({ input }) => listProjectDocuments(input.projectId)),
  addActivity: publicProcedure.input(z.object({ projectId: z.number().int().positive(), actorName: z.string().trim().min(2).max(255), actorRole: z.string().trim().min(2).max(128), type: z.enum(["note", "milestone", "document", "assignment", "risk", "closeout", "system"]).default("note"), title: z.string().trim().min(3).max(500), detail: optionalText })).mutation(({ input }) => addProjectActivity(input)),
  projectActivities: publicProcedure.input(z.object({ projectId: z.number().int().positive() })).query(({ input }) => listProjectActivities(input.projectId)),
  challengeEvidence: publicProcedure.input(z.object({ challengeId: z.number().int().positive() })).query(({ input }) => listChallengeEvidence(input.challengeId)),
  uploadChallengeEvidence: publicProcedure.input(z.object({ challengeId: z.number().int().positive(), uploaderName: z.string().trim().min(2).max(255), fileName: z.string().trim().min(2).max(500), mimeType: z.string().trim().min(3).max(128), base64: z.string().min(10).max(7_000_000) })).mutation(({ input }) => uploadChallengeEvidence(input)),

  expressInterest: publicProcedure.input(z.object({ projectId: z.number().int().positive(), organizationId: z.number().int().positive().optional(), contactName: z.string().trim().min(2).max(255), contactEmail: z.string().email(), supportType: z.string().trim().min(2).max(128), commitmentSummary: optionalText, message: optionalText })).mutation(({ input }) => submitIndustryInterest(input)),
  industryInterests: publicProcedure.input(z.object({ projectId: z.number().int().positive().optional(), organizationId: z.number().int().positive().optional() })).query(({ input }) => listIndustryInterests(input.projectId, input.organizationId)),
  updateIndustryInterest: publicProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["submitted", "accepted", "declined", "withdrawn"]).optional(), commitmentSummary: optionalText, message: optionalText })).mutation(({ input }) => { const { id, ...details } = input; return updateIndustryInterest(id, details); }),

  supportChallenge: publicProcedure.input(z.object({ challengeId: z.number().int().positive(), supporterEmail: z.string().email(), kind: z.enum(["upvote", "follow"]) })).mutation(({ input }) => supportChallenge(input)),
  challengeSupports: publicProcedure.input(z.object({ supporterEmail: z.string().email() })).query(({ input }) => listChallengeSupports(input.supporterEmail)),
  deleteChallengeSupport: publicProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => deleteChallengeSupport(input.id)),
  submitCloseout: publicProcedure.input(z.object({ projectId: z.number().int().positive(), submittedBy: z.string().trim().min(2).max(255), outcomeSummary: z.string().trim().min(20).max(10_000), evidenceUrl: z.string().url().optional() })).mutation(({ input }) => submitCloseout(input)),
  projectCloseouts: publicProcedure.input(z.object({ projectId: z.number().int().positive().optional() })).query(({ input }) => listProjectCloseouts(input.projectId)),
  updateProjectCloseout: publicProcedure.input(z.object({ id: z.number().int().positive(), citizenConfirmation: z.enum(["pending", "confirmed", "disputed"]).optional(), adminStatus: z.enum(["pending", "approved", "rejected"]).optional(), adminNotes: optionalText })).mutation(({ input }) => { const { id, ...details } = input; return updateProjectCloseout(id, details); }),

  createNotification: publicProcedure.input(z.object({ recipientEmail: z.string().email(), title: z.string().trim().min(3).max(255), body: z.string().trim().min(3).max(10_000), href: z.string().max(500).optional() })).mutation(({ input }) => createNotification(input)),
  notifications: publicProcedure.input(z.object({ recipientEmail: z.string().email() })).query(({ input }) => listNotifications(input.recipientEmail)),
});
