-- Create news table for carousel on home page
-- Run this in Supabase SQL Editor

-- 1. Create news table
CREATE TABLE IF NOT EXISTS news (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  image_url TEXT,
  link_url TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_news_is_active ON news(is_active);
CREATE INDEX IF NOT EXISTS idx_news_display_order ON news(display_order);
CREATE INDEX IF NOT EXISTS idx_news_created_at ON news(created_at DESC);

-- 3. Enable Row Level Security
ALTER TABLE news ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
-- Anyone can view active news
CREATE POLICY "Anyone can view active news"
  ON news FOR SELECT
  USING (is_active = true);

-- Only admins can manage news
CREATE POLICY "Admins can insert news"
  ON news FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p 
      JOIN roles r ON p.role_id = r.id 
      WHERE p.user_id = auth.uid()
      AND r.name = 'admin'
    )
  );

CREATE POLICY "Admins can update news"
  ON news FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      JOIN roles r ON p.role_id = r.id 
      WHERE p.user_id = auth.uid()
      AND r.name = 'admin'
    )
  );

CREATE POLICY "Admins can delete news"
  ON news FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      JOIN roles r ON p.role_id = r.id 
      WHERE p.user_id = auth.uid()
      AND r.name = 'admin'
    )
  );

-- 5. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_news_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. Create trigger for news table
DROP TRIGGER IF EXISTS update_news_updated_at ON news;
CREATE TRIGGER update_news_updated_at
    BEFORE UPDATE ON news
    FOR EACH ROW
    EXECUTE FUNCTION update_news_updated_at();

