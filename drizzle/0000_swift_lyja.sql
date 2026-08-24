CREATE TABLE `assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`challengeId` int NOT NULL,
	`organizationId` int NOT NULL,
	`adminName` varchar(255) NOT NULL,
	`rationale` text,
	`dueAt` timestamp,
	`status` enum('pending','accepted','declined','cancelled') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `challengeEvidence` (
	`id` int AUTO_INCREMENT NOT NULL,
	`challengeId` int NOT NULL,
	`uploaderName` varchar(255) NOT NULL,
	`fileName` varchar(500) NOT NULL,
	`fileUrl` varchar(1000) NOT NULL,
	`storageKey` varchar(1000),
	`mimeType` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `challengeEvidence_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `challengeSupports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`challengeId` int NOT NULL,
	`supporterEmail` varchar(320) NOT NULL,
	`kind` enum('upvote','follow') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `challengeSupports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `challenges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`citizenName` varchar(255) NOT NULL,
	`citizenEmail` varchar(320),
	`citizenPhone` varchar(64),
	`title` varchar(500) NOT NULL,
	`description` text NOT NULL,
	`domain` varchar(128) NOT NULL,
	`district` varchar(128) NOT NULL,
	`latitude` varchar(32),
	`longitude` varchar(32),
	`status` enum('submitted','under_review','assigned','in_progress','resolved','rejected') NOT NULL DEFAULT 'submitted',
	`priority` enum('low','medium','high') NOT NULL DEFAULT 'medium',
	`assignedOrganizationId` int,
	`resolutionSummary` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `challenges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `industryInterests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`organizationId` int,
	`contactName` varchar(255) NOT NULL,
	`contactEmail` varchar(320) NOT NULL,
	`supportType` varchar(128) NOT NULL,
	`commitmentSummary` text,
	`message` text,
	`status` enum('submitted','accepted','declined','withdrawn') NOT NULL DEFAULT 'submitted',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `industryInterests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recipientEmail` varchar(320) NOT NULL,
	`title` varchar(255) NOT NULL,
	`body` text NOT NULL,
	`href` varchar(500),
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kind` enum('institution','industry') NOT NULL,
	`name` varchar(255) NOT NULL,
	`contactName` varchar(255) NOT NULL,
	`contactEmail` varchar(320) NOT NULL,
	`contactPhone` varchar(64),
	`website` varchar(500),
	`institutionType` varchar(128),
	`location` varchar(255),
	`overview` text,
	`departments` text,
	`expertise` text,
	`facilities` text,
	`verificationStatus` enum('pending','verified','rejected') NOT NULL DEFAULT 'pending',
	`verificationNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organizations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projectActivities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`actorName` varchar(255) NOT NULL,
	`actorRole` varchar(128) NOT NULL,
	`type` enum('note','milestone','document','assignment','risk','closeout','system') NOT NULL DEFAULT 'note',
	`title` varchar(500) NOT NULL,
	`detail` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `projectActivities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projectCloseouts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`submittedBy` varchar(255) NOT NULL,
	`outcomeSummary` text NOT NULL,
	`evidenceUrl` varchar(1000),
	`citizenConfirmation` enum('pending','confirmed','disputed') NOT NULL DEFAULT 'pending',
	`adminStatus` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`adminNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projectCloseouts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projectDocuments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`uploaderName` varchar(255) NOT NULL,
	`name` varchar(500) NOT NULL,
	`documentType` varchar(128) NOT NULL,
	`fileUrl` varchar(1000) NOT NULL,
	`storageKey` varchar(1000),
	`version` int NOT NULL DEFAULT 1,
	`approvalStatus` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `projectDocuments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projectMilestones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`position` int NOT NULL DEFAULT 0,
	`status` enum('upcoming','in_progress','complete','blocked') NOT NULL DEFAULT 'upcoming',
	`dueAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projectMilestones_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`challengeId` int NOT NULL,
	`organizationId` int NOT NULL,
	`title` varchar(500) NOT NULL,
	`overview` text NOT NULL,
	`leadName` varchar(255) NOT NULL,
	`teamMembers` text,
	`stage` enum('problem_identified','solution_design','prototype_development','pilot_testing','closeout') NOT NULL DEFAULT 'problem_identified',
	`status` enum('active','at_risk','on_hold','closeout_pending','resolved') NOT NULL DEFAULT 'active',
	`progress` int NOT NULL DEFAULT 0,
	`targetCompletionAt` timestamp,
	`riskSummary` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
