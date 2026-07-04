CREATE TABLE `drills` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`phase` integer NOT NULL,
	`question` text NOT NULL,
	`metadata` text DEFAULT '{}',
	`user_response` text,
	`score` real,
	`completed_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `evidence` (
	`id` text PRIMARY KEY NOT NULL,
	`prediction_id` text NOT NULL,
	`source_url` text,
	`title` text,
	`reliability` text,
	`strength` text,
	`direction` text,
	`summary` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`prediction_id`) REFERENCES `predictions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `journal_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`situation` text NOT NULL,
	`decision` text NOT NULL,
	`predicted_outcome` text,
	`confidence` real,
	`stop_loss` text,
	`actual_outcome` text,
	`outcome_rating` text DEFAULT 'pending' NOT NULL,
	`lessons` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `prediction_questions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`domain` text NOT NULL,
	`question_text` text NOT NULL,
	`resolution_criteria` text,
	`opens_at` integer,
	`closes_at` integer,
	`outcome` integer,
	`resolved_at` integer,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `predictions` (
	`id` text PRIMARY KEY NOT NULL,
	`question_id` text NOT NULL,
	`user_id` text NOT NULL,
	`probability` real NOT NULL,
	`conf_lower` real,
	`conf_upper` real,
	`reasoning` text,
	`baseline_rate` real,
	`baseline_notes` text,
	`source_grades` text,
	`bias_notes` text,
	`brier_score` real,
	`version` integer DEFAULT 1 NOT NULL,
	`is_final` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`question_id`) REFERENCES `prediction_questions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text,
	`name` text,
	`phase` integer DEFAULT 1 NOT NULL,
	`phase_started_at` integer,
	`is_anonymous` integer DEFAULT false NOT NULL,
	`settings` text DEFAULT '{}',
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);