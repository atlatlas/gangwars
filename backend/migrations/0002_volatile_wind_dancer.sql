CREATE TABLE `gang_operation_assignments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`gang_id` integer NOT NULL,
	`active_operation_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`assigned_at` text NOT NULL,
	FOREIGN KEY (`gang_id`) REFERENCES `gangs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`active_operation_id`) REFERENCES `gang_active_operations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `assign_op_idx` ON `gang_operation_assignments` (`active_operation_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `assign_user_unique` ON `gang_operation_assignments` (`gang_id`,`user_id`);--> statement-breakpoint
DROP INDEX IF EXISTS `gang_active_operations_gang_id_unique`;--> statement-breakpoint
ALTER TABLE `gang_arsenal` ADD `assigned_turf_id` integer REFERENCES turf_districts(id);