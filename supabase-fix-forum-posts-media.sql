-- Fix forum_posts table - Add media_url and media_type columns if they don't exist
-- Run this in Supabase SQL Editor

-- Add media_url column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'forum_posts' 
    AND column_name = 'media_url'
  ) THEN
    ALTER TABLE forum_posts ADD COLUMN media_url TEXT;
    RAISE NOTICE 'Added media_url column to forum_posts';
  ELSE
    RAISE NOTICE 'media_url column already exists in forum_posts';
  END IF;
END $$;

-- Add media_type column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'forum_posts' 
    AND column_name = 'media_type'
  ) THEN
    ALTER TABLE forum_posts ADD COLUMN media_type TEXT CHECK (media_type IN ('image', 'video') OR media_type IS NULL);
    RAISE NOTICE 'Added media_type column to forum_posts';
  ELSE
    RAISE NOTICE 'media_type column already exists in forum_posts';
  END IF;
END $$;

-- Create index for better performance (optional)
CREATE INDEX IF NOT EXISTS idx_forum_posts_media_type ON forum_posts(media_type) WHERE media_type IS NOT NULL;

-- Verify the columns were added
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name = 'forum_posts' 
  AND column_name IN ('media_url', 'media_type')
ORDER BY column_name;

