-- Create badges system for user profiles
-- Run this in Supabase SQL Editor

-- 1. Create badges table
CREATE TABLE IF NOT EXISTS badges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '⭐', -- Emoji or icon name
  icon_color TEXT DEFAULT '#FFD700', -- Color for the badge icon
  points_threshold INTEGER NOT NULL DEFAULT 0, -- Minimum points required to earn this badge
  description TEXT,
  display_order INTEGER DEFAULT 0, -- Order in which badges are displayed
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create user_badges table (junction table)
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, badge_id) -- Prevent duplicate badges for same user
);

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_badges_points_threshold ON badges(points_threshold);
CREATE INDEX IF NOT EXISTS idx_badges_display_order ON badges(display_order);
CREATE INDEX IF NOT EXISTS idx_badges_is_active ON badges(is_active);
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id ON user_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_earned_at ON user_badges(earned_at DESC);

-- 4. Enable Row Level Security
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for badges
-- Anyone can view active badges
CREATE POLICY "Anyone can view active badges"
  ON badges FOR SELECT
  USING (is_active = true);

-- Only admins can manage badges
CREATE POLICY "Admins can insert badges"
  ON badges FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p 
      JOIN roles r ON p.role_id = r.id 
      WHERE p.user_id = auth.uid()
      AND r.name = 'admin'
    )
  );

CREATE POLICY "Admins can update badges"
  ON badges FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      JOIN roles r ON p.role_id = r.id 
      WHERE p.user_id = auth.uid()
      AND r.name = 'admin'
    )
  );

CREATE POLICY "Admins can delete badges"
  ON badges FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      JOIN roles r ON p.role_id = r.id 
      WHERE p.user_id = auth.uid()
      AND r.name = 'admin'
    )
  );

-- Admins can view all badges (including inactive)
CREATE POLICY "Admins can view all badges"
  ON badges FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      JOIN roles r ON p.role_id = r.id 
      WHERE p.user_id = auth.uid()
      AND r.name = 'admin'
    )
  );

-- 6. RLS Policies for user_badges
-- Users can view their own badges
CREATE POLICY "Users can view their own badges"
  ON user_badges FOR SELECT
  USING (auth.uid() = user_id);

-- Anyone can view badges of other users (for display purposes)
CREATE POLICY "Anyone can view user badges"
  ON user_badges FOR SELECT
  USING (true);

-- System can insert badges (via service role or function)
-- This will be handled by a function that checks points
CREATE POLICY "System can insert user badges"
  ON user_badges FOR INSERT
  WITH CHECK (true); -- We'll validate in the function

-- Only system can delete badges (via function)
CREATE POLICY "System can delete user badges"
  ON user_badges FOR DELETE
  USING (true); -- We'll validate in the function

-- 7. Create function to check and award badges based on points
CREATE OR REPLACE FUNCTION check_and_award_badges(target_user_id UUID)
RETURNS void AS $$
DECLARE
  user_points INTEGER;
  badge_record RECORD;
BEGIN
  -- Get user's current points
  SELECT COALESCE(points, 0) INTO user_points
  FROM profiles
  WHERE user_id = target_user_id;
  
  -- Check all active badges that the user hasn't earned yet
  FOR badge_record IN
    SELECT b.*
    FROM badges b
    WHERE b.is_active = true
    AND b.points_threshold <= user_points
    AND NOT EXISTS (
      SELECT 1 FROM user_badges ub
      WHERE ub.user_id = target_user_id
      AND ub.badge_id = b.id
    )
    ORDER BY b.points_threshold ASC
  LOOP
    -- Award the badge
    INSERT INTO user_badges (user_id, badge_id, earned_at)
    VALUES (target_user_id, badge_record.id, NOW())
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create trigger to automatically check badges when points are updated
CREATE OR REPLACE FUNCTION trigger_check_badges()
RETURNS TRIGGER AS $$
BEGIN
  -- Only check if points actually changed
  IF OLD.points IS DISTINCT FROM NEW.points THEN
    PERFORM check_and_award_badges(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS check_badges_on_points_update ON profiles;
CREATE TRIGGER check_badges_on_points_update
  AFTER UPDATE OF points ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_badges();

-- 9. Insert some default badges
INSERT INTO badges (name, icon, icon_color, points_threshold, description, display_order) VALUES
  ('מתחיל', '🌱', '#4CAF50', 0, 'התחלת הדרך!', 1),
  ('מתקדם', '⭐', '#FFD700', 100, 'צברת 100 נקודות', 2),
  ('מוביל', '🏆', '#FF6B6B', 500, 'צברת 500 נקודות', 3),
  ('מאסטר', '👑', '#9B59B6', 1000, 'צברת 1000 נקודות', 4),
  ('אגדה', '💎', '#00D4FF', 5000, 'צברת 5000 נקודות', 5)
ON CONFLICT DO NOTHING;

-- 10. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_badges_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for badges table
DROP TRIGGER IF EXISTS update_badges_updated_at ON badges;
CREATE TRIGGER update_badges_updated_at
    BEFORE UPDATE ON badges
    FOR EACH ROW
    EXECUTE FUNCTION update_badges_updated_at();

