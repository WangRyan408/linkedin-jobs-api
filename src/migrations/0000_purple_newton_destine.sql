CREATE TABLE `jobs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`job_url` text NOT NULL,
	`job_base_url` text NOT NULL,
	`position` text NOT NULL,
	`company` text NOT NULL,
	`location` text NOT NULL,
	`date` text NOT NULL,
	`salary` text NOT NULL,
	`company_logo` text NOT NULL,
	`ago_time` text NOT NULL,
	`first_seen` integer DEFAULT (unixepoch()) NOT NULL,
	`last_seen` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `jobs_job_base_url_unique` ON `jobs` (`job_base_url`);