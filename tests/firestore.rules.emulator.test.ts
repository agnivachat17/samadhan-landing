import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, setDoc, updateDoc } from "firebase/firestore";

/**
 * Signed-in Firestore rules coverage, run against the local Firestore
 * Emulator — NOT the real project. `tests/firestore.rules.test.ts` covers the
 * anonymous boundary over the real project's REST API and needs no
 * credentials; it cannot exercise per-owner/per-role authorization at all,
 * because that requires being signed in as specific citizens/institutions/
 * admins. This file is the intentionally-deferred "still needs the Firebase
 * emulator" gap that both `CLAUDE.md` and the governance audit called out.
 *
 * Requires the Firestore emulator to be running first. Use:
 *   npm run test:rules:emulator
 * which wraps this in `firebase emulators:exec` (starts the emulator, runs
 * this file, tears the emulator down). This is deliberately NOT part of the
 * default `npm test` script — that script must keep working with no local
 * setup (no Java, no emulator binary) since it's what CI
 * (`.github/workflows/deploy.yml`) runs on every push.
 */

const projectId = "samadhan-rules-emulator-test";

// Fixture ids — arbitrary but fixed, so tests can reference each other's
// records deterministically. None of this touches the real "samadhan-sih"
// project; `projectId` above is a separate, disposable emulator project.
const ORG_A = 1001; // verified institution, owns challenge 2001's project
const ORG_B = 1002; // verified institution, unrelated to challenge 2001
const CITIZEN_1_UID = "citizen-1-uid";
const CITIZEN_1_EMAIL = "citizen1@test.samadhan";
const CITIZEN_2_UID = "citizen-2-uid";
const CITIZEN_2_EMAIL = "citizen2@test.samadhan";
const INSTITUTION_A_UID = "institution-a-owner-uid";
const INSTITUTION_B_UID = "institution-b-owner-uid";
const CHALLENGE_1 = 2001; // citizen 1's, assigned+accepted to org A
const CHALLENGE_2 = 2002; // citizen 2's, no assignment at all
const PROJECT_1 = 3001; // org A's project answering challenge 2001
const CLOSEOUT_1 = 4001; // project 3001's closeout, pending citizen decision

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });

  // Seed fixtures with rules disabled — this is the one place writes bypass
  // firestore.rules entirely, to set up a known-good starting state.
  await testEnv.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    const now = new Date();

    await setDoc(doc(db, "organizations", `record-${ORG_A}`), {
      id: ORG_A,
      ownerUid: INSTITUTION_A_UID,
      kind: "institution",
      name: "Institution A",
      contactEmail: "a@institution.test",
      verificationStatus: "verified",
      standing: "active",
      createdAt: now,
      updatedAt: now,
    });
    await setDoc(doc(db, "organizations", `record-${ORG_B}`), {
      id: ORG_B,
      ownerUid: INSTITUTION_B_UID,
      kind: "institution",
      name: "Institution B",
      contactEmail: "b@institution.test",
      verificationStatus: "verified",
      standing: "active",
      createdAt: now,
      updatedAt: now,
    });

    await setDoc(doc(db, "challenges", `record-${CHALLENGE_1}`), {
      id: CHALLENGE_1,
      citizenName: "Citizen One",
      citizenEmail: CITIZEN_1_EMAIL,
      title: "Broken hand-pump",
      description: "Original description",
      domain: "Water",
      district: "Ranchi",
      status: "in_progress",
      priority: "medium",
      assignedOrganizationId: ORG_A,
      duplicateStatus: "unreviewed",
      createdAt: now,
      updatedAt: now,
    });
    await setDoc(doc(db, "challenges", `record-${CHALLENGE_2}`), {
      id: CHALLENGE_2,
      citizenName: "Citizen Two",
      citizenEmail: CITIZEN_2_EMAIL,
      title: "Unrelated pothole report",
      description: "Original description",
      domain: "Infrastructure",
      district: "Dhanbad",
      status: "submitted",
      priority: "medium",
      duplicateStatus: "unreviewed",
      createdAt: now,
      updatedAt: now,
    });

    // Deterministic id — mirrors assignmentDocId() in db.ts.
    await setDoc(doc(db, "assignments", `assign-${CHALLENGE_1}-${ORG_A}`), {
      id: 5001,
      challengeId: CHALLENGE_1,
      organizationId: ORG_A,
      adminName: "Self-enrolled",
      status: "accepted",
      selfEnrolled: true,
      createdAt: now,
      updatedAt: now,
    });

    await setDoc(doc(db, "projects", `record-${PROJECT_1}`), {
      id: PROJECT_1,
      challengeId: CHALLENGE_1,
      organizationId: ORG_A,
      title: "Hand-pump repair project",
      overview: "Overview",
      leadName: "Faculty Lead",
      stage: "pilot_testing",
      status: "active",
      progress: 40,
      createdAt: now,
      updatedAt: now,
    });

    await setDoc(doc(db, "projectCloseouts", `record-${CLOSEOUT_1}`), {
      id: CLOSEOUT_1,
      projectId: PROJECT_1,
      submittedBy: "Faculty Lead",
      outcomeSummary: "Repaired the hand-pump and tested output.",
      citizenConfirmation: "pending",
      adminStatus: "pending",
      createdAt: now,
      updatedAt: now,
    });
  });
}, 60_000);

afterAll(async () => {
  await testEnv.cleanup();
});

function asCitizen1() {
  return testEnv
    .authenticatedContext(CITIZEN_1_UID, { email: CITIZEN_1_EMAIL })
    .firestore();
}
function asCitizen2() {
  return testEnv
    .authenticatedContext(CITIZEN_2_UID, { email: CITIZEN_2_EMAIL })
    .firestore();
}
function asInstitutionA() {
  return testEnv
    .authenticatedContext(INSTITUTION_A_UID, { email: "a@institution.test" })
    .firestore();
}
function asInstitutionB() {
  return testEnv
    .authenticatedContext(INSTITUTION_B_UID, { email: "b@institution.test" })
    .firestore();
}
function asAdmin() {
  return testEnv
    .authenticatedContext("admin-uid", {
      email: "admin@test.samadhan",
      admin: true,
    })
    .firestore();
}

describe("challenges: cross-user content protection", () => {
  it("blocks a citizen from editing another citizen's challenge", async () => {
    const db = asCitizen2();
    await assertFails(
      updateDoc(doc(db, "challenges", `record-${CHALLENGE_1}`), {
        title: "Hijacked title",
      })
    );
  });

  it("allows the owning citizen to edit their own challenge", async () => {
    const db = asCitizen1();
    await assertSucceeds(
      updateDoc(doc(db, "challenges", `record-${CHALLENGE_1}`), {
        description: "Updated by the real owner",
      })
    );
  });
});

describe("challenges: institution-authorized status transition", () => {
  it("blocks an institution with NO assignment on the challenge from flipping its status", async () => {
    const db = asInstitutionB();
    await assertFails(
      updateDoc(doc(db, "challenges", `record-${CHALLENGE_2}`), {
        status: "in_progress",
      })
    );
  });

  it("blocks an institution that is not the accepted assignee of THIS challenge, even though it owns other challenges", async () => {
    const db = asInstitutionB();
    await assertFails(
      updateDoc(doc(db, "challenges", `record-${CHALLENGE_1}`), {
        status: "assigned",
      })
    );
  });

  it("allows the institution actually holding the accepted assignment to flip status", async () => {
    const db = asInstitutionA();
    await assertSucceeds(
      updateDoc(doc(db, "challenges", `record-${CHALLENGE_1}`), {
        status: "in_progress",
      })
    );
  });
});

describe("projects: institution and citizen ownership boundaries", () => {
  it("blocks a citizen unrelated to the challenge from touching the project", async () => {
    const db = asCitizen2();
    await assertFails(
      updateDoc(doc(db, "projects", `record-${PROJECT_1}`), { progress: 99 })
    );
  });

  it("blocks the challenge owner from editing fields outside the USP-07 confirm/dispute whitelist", async () => {
    const db = asCitizen1();
    await assertFails(
      updateDoc(doc(db, "projects", `record-${PROJECT_1}`), {
        title: "Retitled by citizen",
      })
    );
  });

  it("allows the challenge owner to write the specific resolution fields USP-07 needs", async () => {
    const db = asCitizen1();
    await assertSucceeds(
      updateDoc(doc(db, "projects", `record-${PROJECT_1}`), {
        status: "resolved",
        progress: 100,
      })
    );
  });

  it("blocks a different institution from modifying another institution's project", async () => {
    const db = asInstitutionB();
    await assertFails(
      updateDoc(doc(db, "projects", `record-${PROJECT_1}`), { progress: 10 })
    );
  });

  it("allows the owning institution to modify its own project", async () => {
    const db = asInstitutionA();
    await assertSucceeds(
      updateDoc(doc(db, "projects", `record-${PROJECT_1}`), { progress: 55 })
    );
  });
});

describe("assignments: institution ownership boundaries", () => {
  it("blocks a different institution from modifying another institution's assignment", async () => {
    const db = asInstitutionB();
    await assertFails(
      updateDoc(doc(db, "assignments", `assign-${CHALLENGE_1}-${ORG_A}`), {
        status: "declined",
      })
    );
  });

  it("allows the owning institution to update its own assignment status", async () => {
    const db = asInstitutionA();
    await assertSucceeds(
      updateDoc(doc(db, "assignments", `assign-${CHALLENGE_1}-${ORG_A}`), {
        status: "accepted",
      })
    );
  });
});

describe("users: cannot self-grant an organization or role", () => {
  it("blocks a citizen from linking their profile to an organization they do not own", async () => {
    const db = asCitizen2();
    await assertFails(
      setDoc(
        doc(db, "users", CITIZEN_2_UID),
        { organizationId: ORG_A, role: "institution" },
        { merge: true }
      )
    );
  });

  it("blocks a user from self-granting the admin role field", async () => {
    const db = asCitizen2();
    await assertFails(
      setDoc(
        doc(db, "users", CITIZEN_2_UID),
        { role: "admin" },
        { merge: true }
      )
    );
  });

  it("allows the real owner of an organization to link their own profile to it", async () => {
    const db = asInstitutionA();
    await assertSucceeds(
      setDoc(
        doc(db, "users", INSTITUTION_A_UID),
        { organizationId: ORG_A, role: "institution" },
        { merge: true }
      )
    );
  });
});

describe("projectCloseouts: only the reporting citizen may confirm/dispute", () => {
  it("blocks an unrelated user from modifying the closeout", async () => {
    const db = asCitizen2();
    await assertFails(
      updateDoc(doc(db, "projectCloseouts", `record-${CLOSEOUT_1}`), {
        citizenConfirmation: "confirmed",
      })
    );
  });

  it("blocks an institution (even the owning one) from writing the citizen-decision fields", async () => {
    const db = asInstitutionA();
    await assertFails(
      updateDoc(doc(db, "projectCloseouts", `record-${CLOSEOUT_1}`), {
        citizenConfirmation: "confirmed",
      })
    );
  });

  it("allows the reporting citizen to confirm the outcome", async () => {
    const db = asCitizen1();
    await assertSucceeds(
      updateDoc(doc(db, "projectCloseouts", `record-${CLOSEOUT_1}`), {
        citizenConfirmation: "confirmed",
      })
    );
  });
});

describe("admin: retains full access", () => {
  it("allows admin to edit a challenge it doesn't own, including admin-only fields", async () => {
    const db = asAdmin();
    await assertSucceeds(
      updateDoc(doc(db, "challenges", `record-${CHALLENGE_2}`), {
        adminReviewNotes: "Reviewed by admin",
        priority: "high",
      })
    );
  });

  it("allows admin to verify an organization", async () => {
    const db = asAdmin();
    await assertSucceeds(
      updateDoc(doc(db, "organizations", `record-${ORG_B}`), {
        verificationStatus: "verified",
      })
    );
  });
});

describe("notifications: forgery and cross-recipient protection", () => {
  it("blocks a citizen from creating a self-notification claiming to be someone else's inbox", async () => {
    const db = asCitizen2();
    await assertFails(
      setDoc(doc(db, "notifications", "notif-cit2-fake-self"), {
        recipientEmail: CITIZEN_1_EMAIL, // not citizen2's own address
        title: "Fake",
        body: "Forged self-notification",
        type: "self",
      })
    );
  });

  it("blocks an institution from notifying about a project it does not own", async () => {
    const db = asInstitutionB();
    await assertFails(
      setDoc(doc(db, "notifications", "notif-instb-unrelated-project"), {
        recipientEmail: CITIZEN_1_EMAIL,
        title: "Fake project update",
        body: "Institution B has no relationship to project 1",
        type: "project_to_citizen",
        projectId: PROJECT_1,
        challengeId: CHALLENGE_1,
      })
    );
  });

  it("blocks an institution from claiming an assignment_status notice for a challenge it was never assigned", async () => {
    const db = asInstitutionA();
    await assertFails(
      setDoc(doc(db, "notifications", "notif-insta-fake-assignment"), {
        recipientEmail: CITIZEN_2_EMAIL,
        title: "Fake assignment update",
        body: "No assignments/assign-2002-1001 document exists",
        type: "assignment_status",
        challengeId: CHALLENGE_2,
        organizationId: ORG_A,
      })
    );
  });

  it("blocks a real, accepted assignee from redirecting the notification to an arbitrary recipient", async () => {
    const db = asInstitutionA();
    await assertFails(
      setDoc(doc(db, "notifications", "notif-insta-wrong-recipient"), {
        // Real assignment (challenge 1 / org A), but the challenge's actual
        // citizenEmail is CITIZEN_1_EMAIL, not this address.
        recipientEmail: "attacker@test.samadhan",
        title: "Redirected notice",
        body: "Recipient does not match the challenge's real citizenEmail",
        type: "assignment_status",
        challengeId: CHALLENGE_1,
        organizationId: ORG_A,
      })
    );
  });

  it("blocks a non-admin from forging an admin_org_notice", async () => {
    const db = asCitizen1();
    await assertFails(
      setDoc(doc(db, "notifications", "notif-citizen-fake-admin-notice"), {
        recipientEmail: "a@institution.test",
        title: "Fake verification notice",
        body: "Citizen is not admin",
        type: "admin_org_notice",
        organizationId: ORG_A,
      })
    );
  });

  it("allows the legitimate self-notification a citizen's own submission generates", async () => {
    const db = asCitizen1();
    await assertSucceeds(
      setDoc(doc(db, "notifications", "notif-citizen1-self"), {
        recipientEmail: CITIZEN_1_EMAIL,
        title: "Challenge report received",
        body: "Your report is now in the review workflow.",
        type: "self",
      })
    );
  });

  it("allows the real accepted assignee to notify the challenge's real citizen", async () => {
    const db = asInstitutionA();
    await assertSucceeds(
      setDoc(doc(db, "notifications", "notif-insta-real-assignment"), {
        recipientEmail: CITIZEN_1_EMAIL,
        title: "Institution response accepted",
        body: "The assigned institution has accepted the assignment.",
        type: "assignment_status",
        challengeId: CHALLENGE_1,
        organizationId: ORG_A,
      })
    );
  });

  it("allows admin to create any notification type/recipient", async () => {
    const db = asAdmin();
    await assertSucceeds(
      setDoc(doc(db, "notifications", "notif-admin-any"), {
        recipientEmail: CITIZEN_2_EMAIL,
        title: "Administrator notice",
        body: "Admin can notify anyone about anything.",
        type: "admin_notice",
      })
    );
  });

  it("blocks a non-admin from changing an existing notification's recipient", async () => {
    const adminDb = asAdmin();
    await assertSucceeds(
      setDoc(doc(adminDb, "notifications", "notif-recipient-change-target"), {
        recipientEmail: CITIZEN_1_EMAIL,
        title: "Original notice",
        body: "Original recipient",
        type: "self",
      })
    );
    const citizenDb = asCitizen2();
    await assertFails(
      updateDoc(
        doc(citizenDb, "notifications", "notif-recipient-change-target"),
        { recipientEmail: CITIZEN_2_EMAIL }
      )
    );
  });
});
