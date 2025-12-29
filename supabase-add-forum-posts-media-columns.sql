-- Add media_url and media_type columns to forum_posts table
-- Run this in Supabase SQL Editor

-- Check if columns exist, if not add them
DO $$ 
BEGIN
  -- Add media_url column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'forum_posts' 
    AND column_name = 'media_url'
  ) THEN
    ALTER TABLE forum_posts ADD COLUMN media_url TEXT;
  END IF;

  -- Add media_type column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'forum_posts' 
    AND column_name = 'media_type'
  ) THEN
    ALTER TABLE forum_posts ADD COLUMN media_type TEXT;
  END IF;
END $$;

-- Create index for better performance (optional)
CREATE INDEX IF NOT EXISTS idx_forum_posts_media_type ON forum_posts(media_type) WHERE media_type IS NOT NULL;
