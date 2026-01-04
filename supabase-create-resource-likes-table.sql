-- Create resource_likes table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS resource_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(resource_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_resource_likes_resource_id ON resource_likes(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_likes_user_id ON resource_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_resource_likes_created_at ON resource_likes(created_at DESC);

-- Enable Row Level Security
ALTER TABLE resource_likes ENABLE ROW LEVEL SECURITY;

-- Policies
-- Anyone can view likes
DROP POLICY IF EXISTS "Anyone can view resource likes" ON resource_likes;
CREATE POLICY "Anyone can view resource likes"
  ON resource_likes FOR SELECT
  USING (true);

-- Authenticated users can insert their own likes
DROP POLICY IF EXISTS "Users can like resources" ON resource_likes;
CREATE POLICY "Users can like resources"
  ON resource_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own likes
DROP POLICY IF EXISTS "Users can unlike resources" ON resource_likes;
CREATE POLICY "Users can unlike resources"
  ON resource_likes FOR DELETE
  USING (auth.uid() = user_id);

