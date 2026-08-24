ALTER TABLE `organizationMembers` ADD `expertise` text;--> statement-breakpoint
ALTER TABLE `organizationMembers` ADD `mentorAvailable` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `organizationMembers` ADD `program` varchar(255);--> statement-breakpoint
ALTER TABLE `organizationMembers` ADD `academicYear` varchar(64);--> statement-breakpoint
ALTER TABLE `organizationMembers` ADD `skills` text;--> statement-breakpoint
ALTER TABLE `organizationMembers` ADD `assignedProject` varchar(255);