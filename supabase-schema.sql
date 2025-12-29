-- Gamification System Schema for Supabase
-- Run this SQL in your Supabase SQL Editor

-- 1. Add gamification fields to profiles table (if they don't exist)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS rank INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS nickname TEXT,
ADD COLUMN IF NOT EXISTS how_to_address TEXT,
ADD COLUMN IF NOT EXISTS nocode_experience TEXT,
ADD COLUMN IF NOT EXISTS birthdate DATE,
ADD COLUMN IF NOT EXISTS instagram_url TEXT,
ADD COLUMN IF NOT EXISTS facebook_url TEXT;

-- 2. Create gamification_rules table
CREATE TABLE IF NOT EXISTS gamification_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action_name TEXT NOT NULL UNIQUE,
  point_value INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create points_history table
CREATE TABLE IF NOT EXISTS points_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action_name TEXT NOT NULL,
  points INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Insert default gamification rules
INSERT INTO gamification_rules (action_name, point_value, status, description) VALUES
  ('כניסה יומית', 5, 'active', 'כניסה יומית לאתר'),
  ('פוסט חדש', 10, 'active', 'יצירת פוסט חדש בפורום'),
  ('תגובה לנושא', 5, 'active', 'תגובה בפורום'),
  ('לייק לפוסט', 1, 'active', 'לייק לפוסט'),
  ('שיתוף פוסט', 3, 'active', 'שיתוף פוסט'),
  ('השלמת קורס', 50, 'active', 'השלמת קורס מלא'),
  ('העלאת פרויקט', 25, 'active', 'העלאת פרויקט חדש')
ON CONFLICT (action_name) DO NOTHING;

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_points_history_user_id ON points_history(user_id);
CREATE INDEX IF NOT EXISTS idx_points_history_created_at ON points_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gamification_rules_status ON gamification_rules(status);
CREATE INDEX IF NOT EXISTS idx_profiles_points ON profiles(points DESC);

-- 6. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 7. Create trigger for gamification_rules
DROP TRIGGER IF EXISTS update_gamification_rules_updated_at ON gamification_rules;
CREATE TRIGGER update_gamification_rules_updated_at
    BEFORE UPDATE ON gamification_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 8. Enable Row Level Security (RLS)
ALTER TABLE gamification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_history ENABLE ROW LEVEL SECURITY;

-- 9. Create policies for gamification_rules (read-only for authenticated users)
CREATE POLICY "Anyone can read active gamification rules"
  ON gamification_rules FOR SELECT
  USING (status = 'active');

CREATE POLICY "Only admins can manage gamification rules"
  ON gamification_rules FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

-- 10. Create policies for points_history (users can only see their own)
CREATE POLICY "Users can view their own points history"
  ON points_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert points history"
  ON points_history FOR INSERT
  WITH CHECK (true);

-- Note: Adjust the admin policy based on your authentication setup
-- You may need to create a custom role check or use a different method
