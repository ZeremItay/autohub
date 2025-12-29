-- Create missing tables for the community platform
-- Run this in Supabase SQL Editor

-- 1. Posts table
CREATE TABLE IF NOT EXISTS posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_url TEXT,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Comments table
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Gamification rules table
CREATE TABLE IF NOT EXISTS gamification_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action_name TEXT NOT NULL UNIQUE,
  point_value INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Points history table
CREATE TABLE IF NOT EXISTS points_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  action_name TEXT NOT NULL,
  points INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_points_history_user_id ON points_history(user_id);
CREATE INDEX IF NOT EXISTS idx_points_history_created_at ON points_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gamification_rules_status ON gamification_rules(status);

-- 6. Insert default gamification rules
INSERT INTO gamification_rules (action_name, point_value, status, description) VALUES
  ('כניסה יומית', 5, 'active', 'כניסה יומית לאתר'),
  ('פוסט חדש', 10, 'active', 'יצירת פוסט חדש בפורום'),
  ('תגובה לנושא', 5, 'active', 'תגובה בפורום'),
  ('לייק לפוסט', 1, 'active', 'לייק לפוסט'),
  ('שיתוף פוסט', 3, 'active', 'שיתוף פוסט'),
  ('השלמת קורס', 50, 'active', 'השלמת קורס מלא'),
  ('העלאת פרויקט', 25, 'active', 'העלאת פרויקט חדש')
ON CONFLICT (action_name) DO NOTHING;

-- 7. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 8. Create triggers for updated_at
DROP TRIGGER IF EXISTS update_posts_updated_at ON posts;
CREATE TRIGGER update_posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;
CREATE TRIGGER update_comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_gamification_rules_updated_at ON gamification_rules;
CREATE TRIGGER update_gamification_rules_updated_at
    BEFORE UPDATE ON gamification_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 9. Enable Row Level Security (RLS)
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE gamification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_history ENABLE ROW LEVEL SECURITY;

-- 10. Create basic RLS policies (adjust based on your needs)
-- Posts: Anyone can read, authenticated users can create/update their own
CREATE POLICY "Anyone can read posts"
  ON posts FOR SELECT
  USING (true);

CREATE POLICY "Users can create posts"
  ON posts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own posts"
  ON posts FOR UPDATE
  USING (auth.uid()::text = user_id::text);

-- Comments: Anyone can read, authenticated users can create
CREATE POLICY "Anyone can read comments"
  ON comments FOR SELECT
  USING (true);

CREATE POLICY "Users can create comments"
  ON comments FOR INSERT
  WITH CHECK (true);

-- Gamification rules: Anyone can read active rules
CREATE POLICY "Anyone can read active gamification rules"
  ON gamification_rules FOR SELECT
  USING (status = 'active');

-- Points history: Users can only see their own
CREATE POLICY "Users can view their own points history"
  ON points_history FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "System can insert points history"
  ON points_history FOR INSERT
  WITH CHECK (true);

