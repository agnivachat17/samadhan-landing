import { afterEach, describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { getFirebaseFirestore } from "./firebase";

const created: { collection: string; id: number }[] = [];

afterEach(async () => {
  await Promise.all(created.splice(0).map(record => getFirebaseFirestore().collection(record.collection).doc(`record-${record.id}`).delete()));
});

describe("Firestore workflow adapter", () => {
  it("persists an institution onboarding record, verifies it, and manages a faculty member through tRPC", async () => {
    const caller = appRouter.createCaller({
      user: {
        uid: "integration-test-admin",
        email: "integration-admin@example.invalid",
        name: "Integration Administrator",
        role: "admin",
        authProvider: "password",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    } as never);
    const suffix = Date.now().toString();
    const organization = await caller.workflow.organizationOnboard({
      kind: "institution",
      name: `Integration Institute ${suffix}`,
      contactName: "Integration Contact",
      contactEmail: `contact-${suffix}@example.invalid`,
      contactPhone: "9000000000",
      website: "https://example.invalid",
      institutionType: "Technical institute",
      registrationNumber: `TEST-${suffix}`,
      location: "Ranchi, Jharkhand",
      overview: "A temporary Firestore integration-test institution record.",
      departments: "Computer Science",
      expertise: "Data analysis",
      facilities: "Prototype laboratory",
      supportModes: "Faculty mentorship",
      priorityDomains: "Water",
      complianceAccepted: true,
    });
    created.push({ collection: "organizations", id: organization.id });

    const stored = await caller.workflow.organizationById({ id: organization.id });
    expect(stored?.name).toBe(`Integration Institute ${suffix}`);
    expect(stored?.verificationStatus).toBe("pending");

    const member = await caller.workflow.addOrganizationMember({
      organizationId: organization.id,
      memberRole: "faculty",
      fullName: "Integration Faculty",
      email: `faculty-${suffix}@example.invalid`,
      department: "Computer Science",
      designation: "Assistant Professor",
      expertise: "Civic data systems",
      mentorAvailable: true,
    });
    created.push({ collection: "organizationMembers", id: member.id });

    const faculties = await caller.workflow.organizationMembers({ organizationId: organization.id, memberRole: "faculty" });
    expect(faculties).toHaveLength(1);
    expect(faculties[0]?.mentorAvailable).toBe(true);

    const updatedMember = await caller.workflow.updateOrganizationMember({
      id: member.id,
      status: "active",
      expertise: "Civic data systems and water analytics",
    });
    expect(updatedMember?.status).toBe("active");
    expect(updatedMember?.expertise).toContain("water analytics");

    const verified = await caller.workflow.verifyOrganization({
      id: organization.id,
      verificationStatus: "verified",
      verificationNotes: "Temporary integration-test verification.",
    });
    expect(verified?.verificationStatus).toBe("verified");

    const challenge = await caller.workflow.submitChallenge({
      citizenName: "Integration Citizen",
      citizenEmail: `citizen-${suffix}@example.invalid`,
      title: "Integration water access challenge",
      description: "A temporary challenge used to verify assignment and duplicate-review persistence.",
      domain: "Water",
      district: "Ranchi",
    });
    created.push({ collection: "challenges", id: challenge.id });

    const reviewed = await caller.workflow.updateChallenge({
      id: challenge.id,
      duplicateStatus: "cleared",
      adminReviewNotes: "Temporary integration-test duplicate review.",
      status: "under_review",
    });
    expect(reviewed?.duplicateStatus).toBe("cleared");
    const citizenEdited = await caller.workflow.updateChallenge({
      id: challenge.id,
      title: "Integration water access challenge — clarified",
      description: "A temporary challenge used to verify assignment, duplicate review, and citizen-side record corrections.",
      domain: "Water",
      district: "Ranchi",
    });
    expect(citizenEdited?.title).toContain("clarified");
    const support = await caller.workflow.supportChallenge({ challengeId: challenge.id, supporterEmail: `supporter-${suffix}@example.invalid`, kind: "follow" });
    created.push({ collection: "challengeSupports", id: support.id });
    const following = await caller.workflow.challengeSupports({ supporterEmail: `supporter-${suffix}@example.invalid` });
    expect(following).toHaveLength(1);
    await caller.workflow.deleteChallengeSupport({ id: support.id });
    const afterUnfollow = await caller.workflow.challengeSupports({ supporterEmail: `supporter-${suffix}@example.invalid` });
    expect(afterUnfollow).toHaveLength(0);

    const assignment = await caller.workflow.assignChallenge({
      challengeId: challenge.id,
      organizationId: organization.id,
      adminName: "Integration Administrator",
      rationale: "Verified technical institute match.",
    });
    created.push({ collection: "assignments", id: assignment.id });
    const assignments = await caller.workflow.assignments({ challengeId: challenge.id });
    expect(assignments).toHaveLength(1);
    expect(assignments[0]?.organizationId).toBe(organization.id);
    await expect(caller.workflow.assignChallenge({
      challengeId: challenge.id,
      organizationId: organization.id + 999,
      adminName: "Integration Administrator",
    })).rejects.toThrow("verified institution profiles");

    const acceptedAssignment = await caller.workflow.updateAssignment({ id: assignment.id, status: "accepted" });
    expect(acceptedAssignment?.status).toBe("accepted");
    const project = await caller.workflow.createProject({
      challengeId: challenge.id,
      organizationId: organization.id,
      title: "Integration delivery project",
      overview: "A temporary project that verifies institute delivery workspace persistence.",
      leadName: "Integration Faculty",
      teamMembers: "Integration Faculty, Integration Student",
    });
    created.push({ collection: "projects", id: project.id });
    const projects = await caller.workflow.projects({ organizationId: organization.id, challengeId: challenge.id });
    expect(projects).toHaveLength(1);

    const milestone = await caller.workflow.addMilestone({ projectId: project.id, title: "Prototype plan", description: "Define implementation plan.", position: 1 });
    created.push({ collection: "projectMilestones", id: milestone.id });
    const completedMilestone = await caller.workflow.updateMilestone({ id: milestone.id, status: "complete" });
    expect(completedMilestone?.status).toBe("complete");

    const document = await caller.workflow.addProjectDocument({ projectId: project.id, uploaderName: "Integration Faculty", name: "brief.txt", documentType: "Brief", fileUrl: "https://example.invalid/brief.txt" });
    created.push({ collection: "projectDocuments", id: document.id });
    const activity = await caller.workflow.addActivity({ projectId: project.id, actorName: "Integration Faculty", actorRole: "Mentor", type: "note", title: "Delivery update", detail: "Temporary integration-test activity." });
    created.push({ collection: "projectActivities", id: activity.id });
    const updatedProject = await caller.workflow.updateProject({ id: project.id, stage: "prototype_development", progress: 35 });
    expect(updatedProject?.progress).toBe(35);

    const industry = await caller.workflow.organizationOnboard({
      kind: "industry",
      name: `Integration Industry ${suffix}`,
      contactName: "Integration Partner",
      contactEmail: `partner-${suffix}@example.invalid`,
      contactPhone: "9000000001",
      website: "https://example.invalid",
      sector: "Civic technology",
      location: "Ranchi, Jharkhand",
      overview: "A temporary industry onboarding record.",
      expertise: "IoT and data systems",
      supportModes: "Technical support, mentorship",
      priorityDomains: "Water, Health",
      capacityBand: "Hackathon pilot",
      complianceAccepted: true,
    });
    created.push({ collection: "organizations", id: industry.id });
    const interest = await caller.workflow.expressInterest({
      projectId: project.id,
      organizationId: industry.id,
      contactName: "Integration Partner",
      contactEmail: `partner-${suffix}@example.invalid`,
      supportType: "Technical support",
      commitmentSummary: "Temporary integration-test commitment.",
    });
    created.push({ collection: "industryInterests", id: interest.id });
    const acceptedInterest = await caller.workflow.updateIndustryInterest({ id: interest.id, status: "accepted" });
    expect(acceptedInterest?.status).toBe("accepted");

    const closeout = await caller.workflow.submitCloseout({
      projectId: project.id,
      submittedBy: "Integration Faculty",
      outcomeSummary: "A temporary outcome summary proving the institute closeout, citizen confirmation, and administrator resolution handoff.",
      evidenceUrl: "https://example.invalid/outcome.txt",
    });
    created.push({ collection: "projectCloseouts", id: closeout.id });
    const confirmedCloseout = await caller.workflow.updateProjectCloseout({ id: closeout.id, citizenConfirmation: "confirmed" });
    expect(confirmedCloseout?.citizenConfirmation).toBe("confirmed");
    const approvedCloseout = await caller.workflow.updateProjectCloseout({ id: closeout.id, adminStatus: "approved", adminNotes: "Temporary integration-test approval." });
    expect(approvedCloseout?.adminStatus).toBe("approved");

    const citizenEmail = `citizen-${suffix}@example.invalid`;
    const institutionEmail = `contact-${suffix}@example.invalid`;
    const citizenNotifications = await caller.workflow.notifications({ recipientEmail: citizenEmail });
    expect(citizenNotifications.some(notification => notification.title.includes("Challenge report received"))).toBe(true);
    expect(citizenNotifications.some(notification => notification.title.includes("Institution response accepted"))).toBe(true);
    expect(citizenNotifications.some(notification => notification.title.includes("Challenge closeout approved"))).toBe(true);
    const institutionNotifications = await caller.workflow.notifications({ recipientEmail: institutionEmail });
    expect(institutionNotifications.some(notification => notification.title.includes("Organization verification verified"))).toBe(true);
    expect(institutionNotifications.some(notification => notification.title.includes("Citizen outcome response received"))).toBe(true);

    for (const email of [citizenEmail, institutionEmail]) {
      const notifications = await caller.workflow.notifications({ recipientEmail: email });
      notifications.forEach(notification => created.push({ collection: "notifications", id: notification.id }));
    }

    await caller.workflow.deleteOrganizationMember({ id: member.id });
    const afterRemoval = await caller.workflow.organizationMembers({ organizationId: organization.id, memberRole: "faculty" });
    expect(afterRemoval).toHaveLength(0);
  }, 60_000);
});
