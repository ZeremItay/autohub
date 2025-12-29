-- Create forums table
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

-- Create forum_posts table (posts within forums)
CREATE TABLE IF NOT EXISTS forum_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  forum_id UUID NOT NULL REFERENCES forums(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, -- References profiles.user_id (not a foreign key constraint due to Supabase auth structure)
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  views INTEGER DEFAULT 0,
  replies_count INTEGER DEFAULT 0,
  is_pinned BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create forum_post_replies table (replies to forum posts)
CREATE TABLE IF NOT EXISTS forum_post_replies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, -- References profiles.user_id (not a foreign key constraint due to Supabase auth structure)
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_forum_posts_forum_id ON forum_posts(forum_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_user_id ON forum_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_created_at ON forum_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_posts_is_pinned ON forum_posts(is_pinned DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_post_replies_post_id ON forum_post_replies(post_id);
CREATE INDEX IF NOT EXISTS idx_forum_post_replies_user_id ON forum_post_replies(user_id);

-- Enable Row Level Security
ALTER TABLE forums ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_post_replies ENABLE ROW LEVEL SECURITY;

-- Create policies for forums
CREATE POLICY "Allow public read access to forums"
  ON forums FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated users to insert forums"
  ON forums FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update forums"
  ON forums FOR UPDATE
  USING (true);

-- Create policies for forum_posts
CREATE POLICY "Allow public read access to forum posts"
  ON forum_posts FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated users to insert forum posts"
  ON forum_posts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update own forum posts"
  ON forum_posts FOR UPDATE
  USING (true);

CREATE POLICY "Allow authenticated users to delete own forum posts"
  ON forum_posts FOR DELETE
  USING (true);

-- Create policies for forum_post_replies
CREATE POLICY "Allow public read access to forum post replies"
  ON forum_post_replies FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated users to insert forum post replies"
  ON forum_post_replies FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update own forum post replies"
  ON forum_post_replies FOR UPDATE
  USING (true);

CREATE POLICY "Allow authenticated users to delete own forum post replies"
  ON forum_post_replies FOR DELETE
  USING (true);

-- Insert default forums
INSERT INTO forums (name, display_name, description, header_color, logo_text) VALUES
  ('airtable', 'פורום Airtable', 'פורום לדיונים על Airtable, אוטומציות, ופתרונות No Code', 'bg-blue-900', 'AIRTABLE'),
  ('make', 'פורום Make', 'פורום לדיונים על Make.com, אינטגרציות, ואוטומציות', 'bg-purple-900', 'make')
ON CONFLICT (name) DO NOTHING;

