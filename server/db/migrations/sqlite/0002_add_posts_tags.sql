-- Add tags column to posts (JSON array of strings, max 5)
ALTER TABLE `posts` ADD COLUMN `tags` text;
