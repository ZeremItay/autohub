-- Fix posts table structure and RLS policies
-- Run this in Supabase SQL Editor

-- 1. Create posts table if it doesn't exist with correct structure
CREATE TABLE IF NOT EXISTS posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  media_url TEXT,
  media_type TEXT,
  is_announcement BOOLEAN DEFAULT false,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add missing columns if they don't exist
DO $$ 
BEGIN
  -- Add media_url if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'posts' 
    AND column_name = 'media_url'
  ) THEN
    ALTER TABLE posts ADD COLUMN media_url TEXT;
  END IF;

  -- Add media_type if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'posts' 
    AND column_name = 'media_type'
  ) THEN
    ALTER TABLE posts ADD COLUMN media_type TEXT;
  END IF;

  -- Add is_announcement if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'posts' 
    AND column_name = 'is_announcement'
  ) THEN
    ALTER TABLE posts ADD COLUMN is_announcement BOOLEAN DEFAULT false;
  END IF;

  -- Remove image_url if it exists (we use media_url instead)
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'posts' 
    AND column_name = 'image_url'
  ) THEN
    ALTER TABLE posts DROP COLUMN image_url;
  END IF;
END $$;

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_is_announcement ON posts(is_announcement);

-- 4. Enable Row Level Security
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view posts" ON posts;
DROP POLICY IF EXISTS "Users can create posts" ON posts;
DROP POLICY IF EXISTS "Authenticated users can create posts" ON posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON posts;

-- 6. Create RLS policies
-- Anyone can view posts
CREATE POLICY "Anyone can view posts"
  ON posts FOR SELECT
  USING (true);

-- Authenticated users can create posts (check auth.uid() matches user_id)
CREATE POLICY "Authenticated users can create posts"
  ON posts FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

-- Users can update their own posts
CREATE POLICY "Users can update their own posts"
  ON posts FOR UPDATE
  USING (auth.uid()::text = user_id::text);

-- Users can delete their own posts
CREATE POLICY "Users can delete their own posts"
  ON posts FOR DELETE
  USING (auth.uid()::text = user_id::text);

