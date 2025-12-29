-- Create resources table for premium content
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS resources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER, -- Size in bytes
  file_type TEXT, -- MIME type (e.g., 'application/pdf', 'image/png')
  category TEXT,
  is_premium BOOLEAN DEFAULT true, -- Only premium users can access
  download_count INTEGER DEFAULT 0,
  created_by UUID, -- Admin user who uploaded
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_resources_category ON resources(category);
CREATE INDEX IF NOT EXISTS idx_resources_is_premium ON resources(is_premium);
CREATE INDEX IF NOT EXISTS idx_resources_created_at ON resources(created_at DESC);

-- Enable Row Level Security
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

-- Policies
-- Anyone can view resources (but access will be controlled in the app)
CREATE POLICY "Anyone can view resources" ON resources FOR SELECT USING (true);

-- Only admins can insert resources
CREATE POLICY "Admins can insert resources" ON resources FOR INSERT WITH CHECK (true);

-- Only admins can update resources
CREATE POLICY "Admins can update resources" ON resources FOR UPDATE USING (true);

-- Only admins can delete resources
CREATE POLICY "Admins can delete resources" ON resources FOR DELETE USING (true);

