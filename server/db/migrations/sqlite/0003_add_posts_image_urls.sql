-- Add imageUrls column (JSON array of URLs, max 4)
ALTER TABLE `posts` ADD COLUMN `imageUrls` text;
