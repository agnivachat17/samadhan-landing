import {
  boolean,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

/** Legacy identity table shape, kept as a type source only (see CLAUDE.md). Workflow roles are represented in membership data. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const organizations = mysqlTable("organizations", {
  id: int("id").autoincrement().primaryKey(),
  ownerUid: varchar("ownerUid", { length: 128 }),
  kind: mysqlEnum("kind", ["institution", "industry"]).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  contactName: varchar("contactName", { length: 255 }).notNull(),
  contactEmail: varchar("contactEmail", { length: 320 }).notNull(),
  contactPhone: varchar("contactPhone", { length: 64 }),
  website: varchar("website", { length: 500 }),
  institutionType: varchar("institutionType", { length: 128 }),
  sector: varchar("sector", { length: 128 }),
  registrationNumber: varchar("registrationNumber", { length: 128 }),
  location: varchar("location", { length: 255 }),
  overview: text("overview"),
  departments: text("departments"),
  expertise: text("expertise"),
  facilities: text("facilities"),
  impactLeadName: varchar("impactLeadName", { length: 255 }),
  impactLeadEmail: varchar("impactLeadEmail", { length: 320 }),
  supportModes: text("supportModes"),
  priorityDomains: text("priorityDomains"),
  geographyFocus: text("geographyFocus"),
  capacityBand: varchar("capacityBand", { length: 128 }),
  preferredStage: varchar("preferredStage", { length: 128 }),
  csrPolicyUrl: varchar("csrPolicyUrl", { length: 500 }),
  complianceAcceptedAt: timestamp("complianceAcceptedAt"),
  verificationStatus: mysqlEnum("verificationStatus", [
    "pending",
    "verified",
    "rejected",
  ])
    .default("pending")
    .notNull(),
  verificationNotes: text("verificationNotes"),
  standing: mysqlEnum("standing", [
    "active",
    "warned",
    "suspended",
    "terminated",
  ])
    .default("active")
    .notNull(),
  standingNotes: text("standingNotes"),
  standingUpdatedAt: timestamp("standingUpdatedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const organizationMembers = mysqlTable("organizationMembers", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  fullName: varchar("fullName", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 64 }),
  memberRole: mysqlEnum("memberRole", [
    "admin",
    "faculty",
    "student",
  ]).notNull(),
  department: varchar("department", { length: 255 }),
  designation: varchar("designation", { length: 255 }),
  expertise: text("expertise"),
  mentorAvailable: boolean("mentorAvailable").default(false).notNull(),
  program: varchar("program", { length: 255 }),
  academicYear: varchar("academicYear", { length: 64 }),
  skills: text("skills"),
  assignedProject: varchar("assignedProject", { length: 255 }),
  status: mysqlEnum("status", ["invited", "active", "inactive"])
    .default("invited")
    .notNull(),
  // USP-06: academic credits earned from project delivery
  creditsEarned: int("creditsEarned").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const challenges = mysqlTable("challenges", {
  id: int("id").autoincrement().primaryKey(),
  citizenName: varchar("citizenName", { length: 255 }).notNull(),
  citizenEmail: varchar("citizenEmail", { length: 320 }),
  citizenPhone: varchar("citizenPhone", { length: 64 }),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description").notNull(),
  domain: varchar("domain", { length: 128 }).notNull(),
  district: varchar("district", { length: 128 }).notNull(),
  latitude: varchar("latitude", { length: 32 }),
  longitude: varchar("longitude", { length: 32 }),
  status: mysqlEnum("status", [
    "submitted",
    "under_review",
    "assigned",
    "in_progress",
    "resolved",
    "rejected",
  ])
    .default("submitted")
    .notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high"])
    .default("medium")
    .notNull(),
  assignedOrganizationId: int("assignedOrganizationId"),
  duplicateStatus: mysqlEnum("duplicateStatus", [
    "unreviewed",
    "cleared",
    "confirmed",
  ])
    .default("unreviewed")
    .notNull(),
  duplicateOfId: int("duplicateOfId"),
  adminReviewNotes: text("adminReviewNotes"),
  resolutionSummary: text("resolutionSummary"),
  // Denormalized count of `challengeSupports` records with kind "upvote" for
  // this challenge, incremented atomically by `db.upvoteChallenge()`. Not
  // present on older records — treat missing/undefined as 0.
  upvoteCount: int("upvoteCount"),
  // Denormalized count of duplicate reports merged into this challenge.
  // Incremented when a new report with the same district + pHash is found.
  duplicateCount: int("duplicateCount"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const challengeEvidence = mysqlTable("challengeEvidence", {
  id: int("id").autoincrement().primaryKey(),
  challengeId: int("challengeId").notNull(),
  uploaderName: varchar("uploaderName", { length: 255 }).notNull(),
  fileName: varchar("fileName", { length: 500 }).notNull(),
  // Base64 payload stored inline (no Cloud Storage on the Spark plan). `fileUrl`
  // is synthesised from this at read time; legacy records instead carry a real
  // S3 URL here and no fileData, and still resolve correctly.
  fileData: text("fileData"),
  fileUrl: varchar("fileUrl", { length: 1000 }).notNull(),
  storageKey: varchar("storageKey", { length: 1000 }),
  mimeType: varchar("mimeType", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const assignments = mysqlTable("assignments", {
  id: int("id").autoincrement().primaryKey(),
  challengeId: int("challengeId").notNull(),
  organizationId: int("organizationId").notNull(),
  adminName: varchar("adminName", { length: 255 }).notNull(),
  rationale: text("rationale"),
  dueAt: timestamp("dueAt"),
  status: mysqlEnum("status", ["pending", "accepted", "declined", "cancelled"])
    .default("pending")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  challengeId: int("challengeId").notNull(),
  organizationId: int("organizationId").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  overview: text("overview").notNull(),
  leadName: varchar("leadName", { length: 255 }).notNull(),
  teamMembers: text("teamMembers"),
  stage: mysqlEnum("stage", [
    "problem_identified",
    "solution_design",
    "prototype_development",
    "pilot_testing",
    "closeout",
  ])
    .default("problem_identified")
    .notNull(),
  status: mysqlEnum("status", [
    "active",
    "at_risk",
    "on_hold",
    "closeout_pending",
    "resolved",
  ])
    .default("active")
    .notNull(),
  progress: int("progress").default(0).notNull(),
  targetCompletionAt: timestamp("targetCompletionAt"),
  riskSummary: text("riskSummary"),
  // USP-06: academic credits awarded on project completion + certificate hash
  creditsAwarded: int("creditsAwarded"),
  certificateHash: text("certificateHash"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const projectMilestones = mysqlTable("projectMilestones", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  position: int("position").default(0).notNull(),
  status: mysqlEnum("status", [
    "upcoming",
    "in_progress",
    "complete",
    "blocked",
  ])
    .default("upcoming")
    .notNull(),
  dueAt: timestamp("dueAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const projectDocuments = mysqlTable("projectDocuments", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  uploaderName: varchar("uploaderName", { length: 255 }).notNull(),
  name: varchar("name", { length: 500 }).notNull(),
  documentType: varchar("documentType", { length: 128 }).notNull(),
  // See challengeEvidence.fileData.
  fileData: text("fileData"),
  mimeType: varchar("mimeType", { length: 128 }),
  fileUrl: varchar("fileUrl", { length: 1000 }).notNull(),
  storageKey: varchar("storageKey", { length: 1000 }),
  version: int("version").default(1).notNull(),
  approvalStatus: mysqlEnum("approvalStatus", [
    "pending",
    "approved",
    "rejected",
  ])
    .default("pending")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const projectActivities = mysqlTable("projectActivities", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  actorName: varchar("actorName", { length: 255 }).notNull(),
  actorRole: varchar("actorRole", { length: 128 }).notNull(),
  type: mysqlEnum("type", [
    "note",
    "milestone",
    "document",
    "assignment",
    "risk",
    "closeout",
    "system",
  ])
    .default("note")
    .notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  detail: text("detail"),
  // Hash-chain fields for USP-03 tamper evidence (type-only, schemaless in Firestore)
  prevHash: text("prevHash"),
  hash: text("hash"),
  fileDataHash: text("fileDataHash"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const industryInterests = mysqlTable("industryInterests", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  organizationId: int("organizationId"),
  contactName: varchar("contactName", { length: 255 }).notNull(),
  contactEmail: varchar("contactEmail", { length: 320 }).notNull(),
  supportType: varchar("supportType", { length: 128 }).notNull(),
  commitmentSummary: text("commitmentSummary"),
  message: text("message"),
  status: mysqlEnum("status", [
    "submitted",
    "accepted",
    "declined",
    "withdrawn",
  ])
    .default("submitted")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const challengeSupports = mysqlTable("challengeSupports", {
  id: int("id").autoincrement().primaryKey(),
  challengeId: int("challengeId").notNull(),
  supporterEmail: varchar("supporterEmail", { length: 320 }).notNull(),
  kind: mysqlEnum("kind", ["upvote", "follow"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const projectCloseouts = mysqlTable("projectCloseouts", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  submittedBy: varchar("submittedBy", { length: 255 }).notNull(),
  outcomeSummary: text("outcomeSummary").notNull(),
  evidenceUrl: varchar("evidenceUrl", { length: 1000 }),
  citizenConfirmation: mysqlEnum("citizenConfirmation", [
    "pending",
    "confirmed",
    "disputed",
  ])
    .default("pending")
    .notNull(),
  adminStatus: mysqlEnum("adminStatus", ["pending", "approved", "rejected"])
    .default("pending")
    .notNull(),
  adminNotes: text("adminNotes"),
  // USP-07: required before/after evidence pair (projectDocuments ids) + citizen dispute reason
  beforeEvidenceId: int("beforeEvidenceId"),
  afterEvidenceId: int("afterEvidenceId"),
  citizenNotes: text("citizenNotes"),
  // Hash-chain fields for USP-03 tamper evidence (type-only, schemaless in Firestore)
  prevHash: text("prevHash"),
  hash: text("hash"),
  fileDataHash: text("fileDataHash"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  recipientEmail: varchar("recipientEmail", { length: 320 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  href: varchar("href", { length: 500 }),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// USP-03: hash-anchored ledger — admin-signed Merkle root for a project's activity chain
export const ledgerAnchors = mysqlTable("ledgerAnchors", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  root: text("root").notNull(),
  hashCount: int("hashCount").notNull(),
  anchoredBy: varchar("anchoredBy", { length: 128 }),
  anchoredAt: timestamp("anchoredAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
