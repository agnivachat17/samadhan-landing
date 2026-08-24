ALTER TABLE `challenges` ADD `duplicateStatus` enum('unreviewed','cleared','confirmed') DEFAULT 'unreviewed' NOT NULL;--> statement-breakpoint
ALTER TABLE `challenges` ADD `duplicateOfId` int;--> statement-breakpoint
ALTER TABLE `challenges` ADD `adminReviewNotes` text;