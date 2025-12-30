-- Create reports table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  user_id UUID NOT NULL,
  views INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE table_name = 'reports' 
    AND constraint_name = 'reports_user_id_fkey'
    AND constraint_type = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE reports 
    ADD CONSTRAINT reports_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_is_published ON reports(is_published);
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);

-- Enable Row Level Security
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view published reports" ON reports;
DROP POLICY IF EXISTS "Admins can view all reports" ON reports;
DROP POLICY IF EXISTS "Admins can insert reports" ON reports;
DROP POLICY IF EXISTS "Admins can update reports" ON reports;
DROP POLICY IF EXISTS "Admins can delete reports" ON reports;

-- Anyone can view published reports
CREATE POLICY "Anyone can view published reports" 
  ON reports FOR SELECT 
  USING (is_published = true);

-- Admins can view all reports (including unpublished)
CREATE POLICY "Admins can view all reports" 
  ON reports FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      JOIN roles r ON p.role_id = r.id 
      WHERE p.user_id = auth.uid() 
      AND r.name = 'admin'
    )
  );

-- Only admins can insert reports
CREATE POLICY "Admins can insert reports" 
  ON reports FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p 
      JOIN roles r ON p.role_id = r.id 
      WHERE p.user_id = auth.uid() 
      AND r.name = 'admin'
    )
  );

-- Only admins can update reports
CREATE POLICY "Admins can update reports" 
  ON reports FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      JOIN roles r ON p.role_id = r.id 
      WHERE p.user_id = auth.uid() 
      AND r.name = 'admin'
    )
  );

-- Only admins can delete reports
CREATE POLICY "Admins can delete reports" 
  ON reports FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      JOIN roles r ON p.role_id = r.id 
      WHERE p.user_id = auth.uid() 
      AND r.name = 'admin'
    )
  );

