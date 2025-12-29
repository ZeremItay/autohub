-- Create blog posts table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  featured_image_url TEXT,
  category TEXT NOT NULL,
  author_id UUID NOT NULL,
  is_featured BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT true,
  read_time_minutes INTEGER DEFAULT 5,
  views INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category);
CREATE INDEX IF NOT EXISTS idx_blog_posts_is_featured ON blog_posts(is_featured);
CREATE INDEX IF NOT EXISTS idx_blog_posts_is_published ON blog_posts(is_published);
CREATE INDEX IF NOT EXISTS idx_blog_posts_created_at ON blog_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_author_id ON blog_posts(author_id);

-- Enable Row Level Security
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view published posts" ON blog_posts;
DROP POLICY IF EXISTS "Admins can insert posts" ON blog_posts;
DROP POLICY IF EXISTS "Admins can update posts" ON blog_posts;
DROP POLICY IF EXISTS "Admins can delete posts" ON blog_posts;

-- Anyone can view published posts
CREATE POLICY "Anyone can view published posts" 
  ON blog_posts FOR SELECT 
  USING (is_published = true);

-- Admins can view all posts (including unpublished)
CREATE POLICY "Admins can view all posts" 
  ON blog_posts FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      JOIN roles r ON p.role_id = r.id 
      WHERE p.user_id = auth.uid() 
      AND r.name = 'admin'
    )
  );

-- Only admins can insert posts
CREATE POLICY "Admins can insert posts" 
  ON blog_posts FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p 
      JOIN roles r ON p.role_id = r.id 
      WHERE p.user_id = auth.uid() 
      AND r.name = 'admin'
    )
  );

-- Only admins can update posts
CREATE POLICY "Admins can update posts" 
  ON blog_posts FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      JOIN roles r ON p.role_id = r.id 
      WHERE p.user_id = auth.uid() 
      AND r.name = 'admin'
    )
  );

-- Only admins can delete posts
CREATE POLICY "Admins can delete posts" 
  ON blog_posts FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      JOIN roles r ON p.role_id = r.id 
      WHERE p.user_id = auth.uid() 
      AND r.name = 'admin'
    )
  );

