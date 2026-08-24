CREATE TABLE `organizationMembers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`fullName` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(64),
	`memberRole` enum('admin','faculty','student') NOT NULL,
	`department` varchar(255),
	`designation` varchar(255),
	`status` enum('invited','active','inactive') NOT NULL DEFAULT 'invited',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organizationMembers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `organizations` ADD `sector` varchar(128);--> statement-breakpoint
ALTER TABLE `organizations` ADD `registrationNumber` varchar(128);--> statement-breakpoint
ALTER TABLE `organizations` ADD `impactLeadName` varchar(255);--> statement-breakpoint
ALTER TABLE `organizations` ADD `impactLeadEmail` varchar(320);--> statement-breakpoint
ALTER TABLE `organizations` ADD `supportModes` text;--> statement-breakpoint
ALTER TABLE `organizations` ADD `priorityDomains` text;--> statement-breakpoint
ALTER TABLE `organizations` ADD `geographyFocus` text;--> statement-breakpoint
ALTER TABLE `organizations` ADD `capacityBand` varchar(128);--> statement-breakpoint
ALTER TABLE `organizations` ADD `preferredStage` varchar(128);--> statement-breakpoint
ALTER TABLE `organizations` ADD `csrPolicyUrl` varchar(500);--> statement-breakpoint
ALTER TABLE `organizations` ADD `complianceAcceptedAt` timestamp;