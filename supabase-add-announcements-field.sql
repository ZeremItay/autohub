-- Add is_announcement field to posts table
-- This field marks posts that only admins can create (announcements)
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS is_announcement BOOLEAN DEFAULT false;

-- Create index for better performance when filtering announcements
CREATE INDEX IF NOT EXISTS idx_posts_is_announcement ON posts(is_announcement);

