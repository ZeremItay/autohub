-- Add likes_count column to forum_posts table if it doesn't exist
-- Run this in Supabase SQL Editor

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'forum_posts' 
    AND column_name = 'likes_count'
  ) THEN
    ALTER TABLE forum_posts ADD COLUMN likes_count INTEGER DEFAULT 0;
    RAISE NOTICE 'Added likes_count column to forum_posts';
  ELSE
    RAISE NOTICE 'likes_count column already exists in forum_posts';
  END IF;
END $$;

-- Initialize likes_count from forum_post_likes table if the column was just added
-- This ensures existing posts have the correct count
UPDATE forum_posts
SET likes_count = (
  SELECT COUNT(*) 
  FROM forum_post_likes 
  WHERE forum_post_likes.post_id = forum_posts.id
)
WHERE likes_count IS NULL OR likes_count = 0;

-- Verify the column was added
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name = 'forum_posts' 
  AND column_name = 'likes_count';
