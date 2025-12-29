-- ============================================
-- COMPLETE DATABASE SETUP FOR AUTOHUB
-- Run this entire script in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. PROJECTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'closed')),
  budget_min DECIMAL(10, 2),
  budget_max DECIMAL(10, 2),
  budget_currency TEXT DEFAULT 'USD',
  technologies TEXT[], -- Array of technology tags
  offers_count INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PROJECT OFFERS TABLE
CREATE TABLE IF NOT EXISTS project_offers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  offer_amount DECIMAL(10, 2),
  offer_currency TEXT DEFAULT 'USD',
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. RECORDINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS recordings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  category TEXT,
  duration TEXT,
  views INTEGER DEFAULT 0,
  is_new BOOLEAN DEFAULT false,
  qa_section JSONB DEFAULT '[]'::jsonb,
  key_points JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RECORDING COMMENTS TABLE
CREATE TABLE IF NOT EXISTS recording_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recording_id UUID NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES recording_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. FORUMS TABLES
-- ============================================
CREATE TABLE IF NOT EXISTS forums (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  header_color TEXT DEFAULT 'bg-blue-900',
  logo_text TEXT,
  posts_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS forum_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  forum_id UUID NOT NULL REFERENCES forums(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  media_url TEXT,
  media_type TEXT,
  views INTEGER DEFAULT 0,
  replies_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  is_pinned BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS forum_post_replies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS forum_post_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- ============================================
-- 4. EVENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TIME NOT NULL,
  event_type TEXT DEFAULT 'other' CHECK (event_type IN ('live', 'webinar', 'workshop', 'qa', 'other')),
  location TEXT,
  instructor_name TEXT,
  instructor_title TEXT,
  instructor_avatar_url TEXT,
  learning_points TEXT[],
  about_text TEXT,
  is_recurring BOOLEAN DEFAULT false,
  recurring_pattern TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 5. COURSES TABLES
-- ============================================
CREATE TABLE IF NOT EXISTS courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  category TEXT,
  difficulty TEXT DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  duration_hours DECIMAL(5, 2),
  lessons_count INTEGER DEFAULT 0,
  is_recommended BOOLEAN DEFAULT false,
  is_new BOOLEAN DEFAULT false,
  instructor TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS course_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  progress_percentage DECIMAL(5, 2) DEFAULT 0,
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, course_id)
);

-- ============================================
-- 6. POSTS TABLE (for main feed)
-- ============================================
CREATE TABLE IF NOT EXISTS posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  media_url TEXT,
  media_type TEXT,
  is_announcement BOOLEAN DEFAULT false,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- COMMENTS TABLE (for posts)
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 7. GAMIFICATION TABLES
-- ============================================
CREATE TABLE IF NOT EXISTS gamification_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trigger_action TEXT NOT NULL UNIQUE,
  point_value INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS points_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  points INTEGER NOT NULL,
  action TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 8. LIVE LINKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS live_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 9. NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('comment', 'reply', 'mention', 'like', 'follow', 'project_offer', 'forum_reply', 'forum_mention')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  related_id UUID,
  related_type TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- ============================================
-- 10. RESOURCES TABLE
-- ============================================
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

CREATE INDEX IF NOT EXISTS idx_resources_category ON resources(category);
CREATE INDEX IF NOT EXISTS idx_resources_is_premium ON resources(is_premium);
CREATE INDEX IF NOT EXISTS idx_resources_created_at ON resources(created_at DESC);

-- ============================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE recording_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE forums ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_post_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE gamification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Projects Policies
CREATE POLICY "Anyone can view projects" ON projects FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create projects" ON projects FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own projects" ON projects FOR UPDATE USING (true);

-- Project Offers Policies
CREATE POLICY "Anyone can view project offers" ON project_offers FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create offers" ON project_offers FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own offers" ON project_offers FOR UPDATE USING (true);

-- Recordings Policies
CREATE POLICY "Anyone can view recordings" ON recordings FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create recordings" ON recordings FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update recordings" ON recordings FOR UPDATE USING (true);

-- Recording Comments Policies
CREATE POLICY "Anyone can view recording comments" ON recording_comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create comments" ON recording_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own comments" ON recording_comments FOR UPDATE USING (true);
CREATE POLICY "Users can delete their own comments" ON recording_comments FOR DELETE USING (true);

-- Forums Policies
CREATE POLICY "Anyone can view forums" ON forums FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create forums" ON forums FOR INSERT WITH CHECK (true);

-- Forum Posts Policies
CREATE POLICY "Anyone can view forum posts" ON forum_posts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create forum posts" ON forum_posts FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own forum posts" ON forum_posts FOR UPDATE USING (true);

-- Forum Post Replies Policies
CREATE POLICY "Anyone can view forum post replies" ON forum_post_replies FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create replies" ON forum_post_replies FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own replies" ON forum_post_replies FOR UPDATE USING (true);

-- Forum Post Likes Policies
CREATE POLICY "Anyone can view forum post likes" ON forum_post_likes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can like posts" ON forum_post_likes FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can unlike their own likes" ON forum_post_likes FOR DELETE USING (true);

-- Events Policies
CREATE POLICY "Anyone can view events" ON events FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create events" ON events FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update events" ON events FOR UPDATE USING (true);

-- Courses Policies
CREATE POLICY "Anyone can view courses" ON courses FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create courses" ON courses FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update courses" ON courses FOR UPDATE USING (true);

-- Course Progress Policies
CREATE POLICY "Users can view their own progress" ON course_progress FOR SELECT USING (true);
CREATE POLICY "Users can create their own progress" ON course_progress FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own progress" ON course_progress FOR UPDATE USING (true);

-- Posts Policies
CREATE POLICY "Anyone can view posts" ON posts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create posts" ON posts FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own posts" ON posts FOR UPDATE USING (true);

-- Comments Policies
CREATE POLICY "Anyone can view comments" ON comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create comments" ON comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own comments" ON comments FOR UPDATE USING (true);
CREATE POLICY "Users can delete their own comments" ON comments FOR DELETE USING (true);

-- Notifications Policies
CREATE POLICY "Users can view their own notifications" ON notifications FOR SELECT USING (true);
CREATE POLICY "Users can update their own notifications" ON notifications FOR UPDATE USING (true);
CREATE POLICY "System can create notifications" ON notifications FOR INSERT WITH CHECK (true);

-- Gamification Rules Policies
CREATE POLICY "Anyone can view gamification rules" ON gamification_rules FOR SELECT USING (true);
CREATE POLICY "Admins can manage gamification rules" ON gamification_rules FOR ALL USING (true);

-- Points History Policies
CREATE POLICY "Users can view their own points history" ON points_history FOR SELECT USING (true);
CREATE POLICY "System can create points history" ON points_history FOR INSERT WITH CHECK (true);

-- Live Links Policies
CREATE POLICY "Anyone can view live links" ON live_links FOR SELECT USING (true);
CREATE POLICY "Admins can manage live links" ON live_links FOR ALL USING (true);

-- Resources Policies
CREATE POLICY "Anyone can view resources" ON resources FOR SELECT USING (true);
CREATE POLICY "Admins can insert resources" ON resources FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update resources" ON resources FOR UPDATE USING (true);
CREATE POLICY "Admins can delete resources" ON resources FOR DELETE USING (true);

-- ============================================
-- INSERT DEFAULT DATA
-- ============================================

-- Insert default forums
INSERT INTO forums (name, display_name, description, header_color, logo_text) VALUES
  ('airtable', 'Airtable', 'פורום לדיונים על Airtable', 'bg-blue-900', 'A'),
  ('make', 'Make.com', 'פורום לדיונים על Make.com', 'bg-purple-900', 'M')
ON CONFLICT (name) DO NOTHING;

-- Insert default gamification rules
INSERT INTO gamification_rules (trigger_action, point_value, is_active, description) VALUES
  ('daily_login', 5, true, 'כניסה יומית'),
  ('create_post', 10, true, 'יצירת פוסט'),
  ('create_forum_post', 10, true, 'יצירת פוסט בפורום'),
  ('reply_to_post', 5, true, 'תגובה לפוסט'),
  ('like_post', 2, true, 'לייק לפוסט'),
  ('complete_course', 50, true, 'השלמת קורס'),
  ('create_project', 20, true, 'יצירת פרויקט'),
  ('submit_offer', 5, true, 'הגשת הצעה לפרויקט')
ON CONFLICT (trigger_action) DO NOTHING;

-- ============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_offers_project_id ON project_offers(project_id);
CREATE INDEX IF NOT EXISTS idx_project_offers_user_id ON project_offers(user_id);
CREATE INDEX IF NOT EXISTS idx_recordings_category ON recordings(category);
CREATE INDEX IF NOT EXISTS idx_recording_comments_recording_id ON recording_comments(recording_id);
CREATE INDEX IF NOT EXISTS idx_recording_comments_parent_id ON recording_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_forum_id ON forum_posts(forum_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_user_id ON forum_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_post_replies_post_id ON forum_post_replies(post_id);
CREATE INDEX IF NOT EXISTS idx_forum_post_likes_post_id ON forum_post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_forum_post_likes_user_id ON forum_post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_events_event_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category);
CREATE INDEX IF NOT EXISTS idx_course_progress_user_id ON course_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_course_progress_course_id ON course_progress(course_id);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_is_announcement ON posts(is_announcement);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_points_history_user_id ON points_history(user_id);

-- ============================================
-- UPDATE PROFILES TABLE (if needed)
-- ============================================
-- Add missing fields to profiles if they don't exist
DO $$ 
BEGIN
  -- Add first_name if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'first_name') THEN
    ALTER TABLE profiles ADD COLUMN first_name TEXT;
  END IF;

  -- Add last_name if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'last_name') THEN
    ALTER TABLE profiles ADD COLUMN last_name TEXT;
  END IF;

  -- Add how_to_address if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'how_to_address') THEN
    ALTER TABLE profiles ADD COLUMN how_to_address TEXT;
  END IF;

  -- Add nocode_experience if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'nocode_experience') THEN
    ALTER TABLE profiles ADD COLUMN nocode_experience TEXT;
  END IF;

  -- Add instagram_url if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'instagram_url') THEN
    ALTER TABLE profiles ADD COLUMN instagram_url TEXT;
  END IF;

  -- Add facebook_url if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'facebook_url') THEN
    ALTER TABLE profiles ADD COLUMN facebook_url TEXT;
  END IF;
END $$;

-- ============================================
-- COMPLETE!
-- ============================================
-- All tables, RLS policies, and indexes have been created.
-- You can now use the application with full database support.

