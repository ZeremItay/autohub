-- Fix RLS policies for gamification_rules to allow public read access
-- Run this in Supabase SQL Editor
-- This script works with both table structures (status/is_active and action_name/trigger_action)

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can read active gamification rules" ON gamification_rules;
DROP POLICY IF EXISTS "Anyone can view gamification rules" ON gamification_rules;
DROP POLICY IF EXISTS "Anyone can read all gamification rules" ON gamification_rules;
DROP POLICY IF EXISTS "Only admins can manage gamification rules" ON gamification_rules;
DROP POLICY IF EXISTS "Admins can manage gamification rules" ON gamification_rules;

-- Allow anyone (including unauthenticated) to read all gamification rules
-- We'll filter by active status in the application code
CREATE POLICY "Anyone can read all gamification rules"
  ON gamification_rules FOR SELECT
  USING (true);

-- Allow admins to manage gamification rules
CREATE POLICY "Admins can manage gamification rules"
  ON gamification_rules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      JOIN roles r ON p.role_id = r.id 
      WHERE p.user_id = auth.uid()
      AND r.name = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p 
      JOIN roles r ON p.role_id = r.id 
      WHERE p.user_id = auth.uid()
      AND r.name = 'admin'
    )
  );

-- Also fix points_history policies to allow system inserts
DROP POLICY IF EXISTS "System can insert points history" ON points_history;
DROP POLICY IF EXISTS "System can create points history" ON points_history;

CREATE POLICY "System can insert points history"
  ON points_history FOR INSERT
  WITH CHECK (true);

-- Allow users to view their own points history
DROP POLICY IF EXISTS "Users can view their own points history" ON points_history;

CREATE POLICY "Users can view their own points history"
  ON points_history FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid()
      AND (p.user_id = points_history.user_id OR p.id = points_history.user_id)
    )
  );
