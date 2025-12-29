-- Add parent_id column to forum_post_replies table for nested replies
-- This allows replies to replies (threading)

-- Add parent_id column if it doesn't exist
ALTER TABLE forum_post_replies 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES forum_post_replies(id) ON DELETE CASCADE;

-- Create index for better performance when querying nested replies
CREATE INDEX IF NOT EXISTS idx_forum_post_replies_parent_id ON forum_post_replies(parent_id);

-- This allows:
-- 1. Replies to the main post (parent_id is NULL)
-- 2. Replies to other replies (parent_id points to the reply being replied to)
-- 3. Threaded/nested conversation structure

