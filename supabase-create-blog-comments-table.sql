-- Create blog comments table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS blog_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  blog_post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES blog_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_blog_comments_blog_post_id ON blog_comments(blog_post_id);
CREATE INDEX IF NOT EXISTS idx_blog_comments_user_id ON blog_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_blog_comments_parent_id ON blog_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_blog_comments_created_at ON blog_comments(created_at DESC);

-- Enable Row Level Security
ALTER TABLE blog_comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access to blog comments" ON blog_comments;
DROP POLICY IF EXISTS "Allow authenticated users to insert blog comments" ON blog_comments;
DROP POLICY IF EXISTS "Allow users to update own blog comments" ON blog_comments;
DROP POLICY IF EXISTS "Allow users to delete own blog comments" ON blog_comments;

-- Create policy to allow all users to read comments
CREATE POLICY "Allow public read access to blog comments"
  ON blog_comments FOR SELECT
  USING (true);

-- Create policy to allow authenticated users to insert comments
CREATE POLICY "Allow authenticated users to insert blog comments"
  ON blog_comments FOR INSERT
  WITH CHECK (true);

-- Create policy to allow users to update their own comments
CREATE POLICY "Allow users to update own blog comments"
  ON blog_comments FOR UPDATE
  USING (true);

-- Create policy to allow users to delete their own comments
CREATE POLICY "Allow users to delete own blog comments"
  ON blog_comments FOR DELETE
  USING (true);

