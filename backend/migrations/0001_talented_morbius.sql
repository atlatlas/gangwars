CREATE TABLE `gang_contract_contributors` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`contract_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`contribution` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`contract_id`) REFERENCES `gang_contracts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contributor_unique_idx` ON `gang_contract_contributors` (`contract_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `gang_contracts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`gang_id` integer NOT NULL,
	`contract_type` text NOT NULL,
	`target` integer NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`week_start` text NOT NULL,
	`deadline` text NOT NULL,
	`completed` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`gang_id`) REFERENCES `gangs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gang_contracts_gang_id_unique` ON `gang_contracts` (`gang_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `contract_gang_idx` ON `gang_contracts` (`gang_id`);--> statement-breakpoint
CREATE TABLE `gang_join_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`gang_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`gang_id`) REFERENCES `gangs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `join_req_gang_idx` ON `gang_join_requests` (`gang_id`);--> statement-breakpoint
CREATE INDEX `join_req_user_idx` ON `gang_join_requests` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `join_req_unique` ON `gang_join_requests` (`gang_id`,`user_id`,`status`);--> statement-breakpoint
CREATE TABLE `gang_operation_reqs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`operation_def_id` integer NOT NULL,
	`skill_id` integer NOT NULL,
	`min_level` integer NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`operation_def_id`) REFERENCES `gang_operation_defs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`skill_id`) REFERENCES `skill_definitions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `op_reqs_def_idx` ON `gang_operation_reqs` (`operation_def_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `skill_crime_definitions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`min_level` integer DEFAULT 1 NOT NULL,
	`turn_cost` integer NOT NULL,
	`reward_min` integer NOT NULL,
	`reward_max` integer NOT NULL,
	`timing_speed` real NOT NULL
);
--> statement-breakpoint
CREATE TABLE `skill_crime_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`crime_id` integer NOT NULL,
	`accuracy` real NOT NULL,
	`reward` integer NOT NULL,
	`xp_gained` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`crime_id`) REFERENCES `skill_crime_definitions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `gangs` ADD `reputation` integer DEFAULT 0 NOT NULL;