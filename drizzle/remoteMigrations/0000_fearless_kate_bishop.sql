CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`image` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
