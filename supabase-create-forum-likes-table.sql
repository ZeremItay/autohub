-- Create forum_post_likes table
CREATE TABLE IF NOT EXISTS forum_post_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_forum_post_likes_post_id ON forum_post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_forum_post_likes_user_id ON forum_post_likes(user_id);

-- Enable Row Level Security
ALTER TABLE forum_post_likes ENABLE ROW LEVEL SECURITY;

-- Create policies for forum_post_likes
CREATE POLICY "Allow public read access to forum post likes"
  ON forum_post_likes FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated users to insert forum post likes"
  ON forum_post_likes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete own forum post likes"
  ON forum_post_likes FOR DELETE
  USING (true);

-- Add likes_count column to forum_posts if it doesn't exist
ALTER TABLE forum_posts 
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;

