CREATE TABLE `activity_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`type` text NOT NULL,
	`message` text NOT NULL,
	`metadata` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `activity_events_user_id_idx` ON `activity_events` (`user_id`);--> statement-breakpoint
CREATE INDEX `activity_events_created_at_idx` ON `activity_events` (`created_at`);--> statement-breakpoint
CREATE TABLE `crime_definitions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`min_level` integer DEFAULT 1 NOT NULL,
	`turn_cost` integer NOT NULL,
	`stat_used` text NOT NULL,
	`base_difficulty` integer NOT NULL,
	`reward_min` integer NOT NULL,
	`reward_max` integer NOT NULL,
	`risk_level` text NOT NULL,
	`cooldown_minutes` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `crime_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`crime_id` integer NOT NULL,
	`success` integer NOT NULL,
	`reward` integer NOT NULL,
	`xp_gained` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`crime_id`) REFERENCES `crime_definitions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `drug_news` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`headline` text NOT NULL,
	`body` text NOT NULL,
	`drug_item_id` integer,
	`effect_type` text NOT NULL,
	`effect_magnitude` real DEFAULT 0.1 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`expires_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `drug_price_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_id` integer NOT NULL,
	`price` integer NOT NULL,
	`recorded_at` text NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `drug_price_history_item_idx` ON `drug_price_history` (`item_id`);--> statement-breakpoint
CREATE TABLE `gang_active_operations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`gang_id` integer NOT NULL,
	`operation_def_id` integer NOT NULL,
	`level` integer DEFAULT 1 NOT NULL,
	`started_at` text NOT NULL,
	`last_payout_at` text,
	FOREIGN KEY (`gang_id`) REFERENCES `gangs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`operation_def_id`) REFERENCES `gang_operation_defs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gang_active_operations_gang_id_unique` ON `gang_active_operations` (`gang_id`);--> statement-breakpoint
CREATE INDEX `active_op_gang_idx` ON `gang_active_operations` (`gang_id`);--> statement-breakpoint
CREATE TABLE `gang_arsenal` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`gang_id` integer NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`durability` integer DEFAULT 100 NOT NULL,
	`max_durability` integer DEFAULT 100 NOT NULL,
	`pvp_power` integer NOT NULL,
	`crime_bonus` integer DEFAULT 0 NOT NULL,
	`purchase_price` integer NOT NULL,
	`purchased_at` text NOT NULL,
	`last_repair_at` text,
	`equipped_by` integer,
	FOREIGN KEY (`gang_id`) REFERENCES `gangs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`equipped_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `arsenal_gang_idx` ON `gang_arsenal` (`gang_id`);--> statement-breakpoint
CREATE INDEX `arsenal_equipped_idx` ON `gang_arsenal` (`equipped_by`);--> statement-breakpoint
CREATE TABLE `gang_arsenal_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`arsenal_id` integer NOT NULL,
	`gang_id` integer NOT NULL,
	`action` text NOT NULL,
	`user_id` integer NOT NULL,
	`details` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`arsenal_id`) REFERENCES `gang_arsenal`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`gang_id`) REFERENCES `gangs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `arsenal_log_gang_idx` ON `gang_arsenal_log` (`gang_id`);--> statement-breakpoint
CREATE INDEX `arsenal_log_arsenal_idx` ON `gang_arsenal_log` (`arsenal_id`);--> statement-breakpoint
CREATE TABLE `gang_daily_tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`gang_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`operation_def_id` integer NOT NULL,
	`task_date` text NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`verified_at` text,
	FOREIGN KEY (`gang_id`) REFERENCES `gangs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`operation_def_id`) REFERENCES `gang_operation_defs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `daily_task_user_date_idx` ON `gang_daily_tasks` (`user_id`,`task_date`);--> statement-breakpoint
CREATE INDEX `daily_task_gang_date_idx` ON `gang_daily_tasks` (`gang_id`,`task_date`);--> statement-breakpoint
CREATE UNIQUE INDEX `daily_task_unique` ON `gang_daily_tasks` (`user_id`,`operation_def_id`,`task_date`);--> statement-breakpoint
CREATE TABLE `gang_invites` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`gang_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`invited_by` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`gang_id`) REFERENCES `gangs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`invited_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `gang_invites_gang_idx` ON `gang_invites` (`gang_id`);--> statement-breakpoint
CREATE INDEX `gang_invites_user_idx` ON `gang_invites` (`user_id`);--> statement-breakpoint
CREATE TABLE `gang_members` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`gang_id` integer NOT NULL,
	`role` text NOT NULL,
	`joined_at` text NOT NULL,
	`last_respect_payout` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`gang_id`) REFERENCES `gangs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gang_members_user_id_unique` ON `gang_members` (`user_id`);--> statement-breakpoint
CREATE INDEX `gang_members_gang_id_idx` ON `gang_members` (`gang_id`);--> statement-breakpoint
CREATE TABLE `gang_operation_defs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`skill_id` integer NOT NULL,
	`min_skill_level` integer NOT NULL,
	`daily_task_type` text NOT NULL,
	`daily_task_description` text NOT NULL,
	`income_per_member_l1` integer NOT NULL,
	`min_skill_level_l2` integer NOT NULL,
	`income_per_member_l2` integer NOT NULL,
	`upgrade_cost_l1_to_l2` integer NOT NULL,
	`min_skill_level_l3` integer NOT NULL,
	`income_per_member_l3` integer NOT NULL,
	`upgrade_cost_l2_to_l3` integer NOT NULL,
	FOREIGN KEY (`skill_id`) REFERENCES `skill_definitions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `gang_operation_payouts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`gang_id` integer NOT NULL,
	`operation_def_id` integer NOT NULL,
	`level` integer NOT NULL,
	`amount_per_member` integer NOT NULL,
	`total_payout` integer NOT NULL,
	`eligible_member_count` integer NOT NULL,
	`paid_at` text NOT NULL,
	FOREIGN KEY (`gang_id`) REFERENCES `gangs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`operation_def_id`) REFERENCES `gang_operation_defs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `payouts_gang_idx` ON `gang_operation_payouts` (`gang_id`);--> statement-breakpoint
CREATE INDEX `payouts_paid_at_idx` ON `gang_operation_payouts` (`paid_at`);--> statement-breakpoint
CREATE TABLE `gang_turf` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`gang_id` integer NOT NULL,
	`district_id` integer NOT NULL,
	`claimed_at` text NOT NULL,
	`challenged_by` integer,
	`challenge_expires_at` text,
	FOREIGN KEY (`gang_id`) REFERENCES `gangs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`district_id`) REFERENCES `turf_districts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`challenged_by`) REFERENCES `gangs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gang_turf_district_id_unique` ON `gang_turf` (`district_id`);--> statement-breakpoint
CREATE INDEX `turf_gang_idx` ON `gang_turf` (`gang_id`);--> statement-breakpoint
CREATE TABLE `gangs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`tag` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`level` integer DEFAULT 1 NOT NULL,
	`max_members` integer DEFAULT 10 NOT NULL,
	`leader_id` integer NOT NULL,
	`vault` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`leader_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gangs_name_unique` ON `gangs` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `gangs_tag_unique` ON `gangs` (`tag`);--> statement-breakpoint
CREATE TABLE `items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`description` text NOT NULL,
	`buy_price` integer NOT NULL,
	`sell_price` integer DEFAULT 0 NOT NULL,
	`min_level` integer DEFAULT 1 NOT NULL,
	`min_respect` integer DEFAULT 0 NOT NULL,
	`effects` text NOT NULL,
	`slot` text,
	`base_price` integer,
	`current_price` integer,
	`previous_price` integer,
	`price_volatility` integer,
	`last_price_update` text
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`read` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `player_stats` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`crimes_committed` integer DEFAULT 0 NOT NULL,
	`pvp_wins` integer DEFAULT 0 NOT NULL,
	`pvp_losses` integer DEFAULT 0 NOT NULL,
	`total_money_earned` integer DEFAULT 0 NOT NULL,
	`total_money_lost` integer DEFAULT 0 NOT NULL,
	`times_arrested` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `player_stats_user_id_unique` ON `player_stats` (`user_id`);--> statement-breakpoint
CREATE TABLE `pvp_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`attacker_id` integer NOT NULL,
	`defender_id` integer NOT NULL,
	`attack_type` text NOT NULL,
	`attacker_win` integer NOT NULL,
	`loot_cash` integer,
	`respect_change` integer DEFAULT 0 NOT NULL,
	`damage_dealt` integer DEFAULT 0 NOT NULL,
	`damage_taken` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`attacker_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`defender_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `retaliation_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`original_attacker_id` integer NOT NULL,
	`defender_id` integer NOT NULL,
	`free_attacks_remaining` integer DEFAULT 3 NOT NULL,
	`created_at` text NOT NULL,
	`expires_at` text NOT NULL,
	FOREIGN KEY (`original_attacker_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`defender_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `retaliation_pair_idx` ON `retaliation_log` (`original_attacker_id`,`defender_id`);--> statement-breakpoint
CREATE TABLE `skill_definitions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`stat_used` text NOT NULL,
	`base_xp_per_train` integer NOT NULL,
	`turn_cost` integer DEFAULT 3 NOT NULL,
	`max_level` integer DEFAULT 100 NOT NULL,
	`difficulty` real DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `turf_districts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`claim_cost` integer NOT NULL,
	`crime_bonus` real DEFAULT 0 NOT NULL,
	`pvp_bonus` real DEFAULT 0 NOT NULL,
	`income_bonus` real DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `turf_districts_name_unique` ON `turf_districts` (`name`);--> statement-breakpoint
CREATE TABLE `user_inventory` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`item_id` integer NOT NULL,
	`equipped` integer DEFAULT false NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`acquired_at` text NOT NULL,
	`avg_purchase_price` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_inv_user_id` ON `user_inventory` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_inv_item_id` ON `user_inventory` (`item_id`);--> statement-breakpoint
CREATE INDEX `idx_inv_equipped` ON `user_inventory` (`equipped`);--> statement-breakpoint
CREATE INDEX `idx_inv_user_item` ON `user_inventory` (`user_id`,`item_id`);--> statement-breakpoint
CREATE INDEX `idx_inv_user_equipped` ON `user_inventory` (`user_id`,`equipped`);--> statement-breakpoint
CREATE TABLE `user_skills` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`skill_id` integer NOT NULL,
	`level` integer DEFAULT 0 NOT NULL,
	`xp` integer DEFAULT 0 NOT NULL,
	`last_trained_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`skill_id`) REFERENCES `skill_definitions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `user_skills_user_skill_idx` ON `user_skills` (`user_id`,`skill_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_skills_unique` ON `user_skills` (`user_id`,`skill_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`level` integer DEFAULT 1 NOT NULL,
	`xp` integer DEFAULT 0 NOT NULL,
	`turns` integer DEFAULT 100 NOT NULL,
	`last_turn_regen` text NOT NULL,
	`cash` integer DEFAULT 2000 NOT NULL,
	`respect` integer DEFAULT 0 NOT NULL,
	`hp` integer DEFAULT 100 NOT NULL,
	`max_hp` integer DEFAULT 100 NOT NULL,
	`stat_points` integer DEFAULT 1 NOT NULL,
	`strength` integer DEFAULT 5 NOT NULL,
	`agility` integer DEFAULT 5 NOT NULL,
	`intelligence` integer DEFAULT 5 NOT NULL,
	`charisma` integer DEFAULT 5 NOT NULL,
	`endurance` integer DEFAULT 5 NOT NULL,
	`specialization` text,
	`jail_until` text,
	`jail_phonecall_used` integer DEFAULT 0 NOT NULL,
	`hospital_until` text,
	`bank` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`last_active` text NOT NULL,
	`avatar_url` text,
	`highest_net_worth` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);