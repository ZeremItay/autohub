-- Create forum_reply_likes table for liking forum post replies
CREATE TABLE IF NOT EXISTS forum_reply_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reply_id UUID NOT NULL REFERENCES forum_post_replies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(reply_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_forum_reply_likes_reply_id ON forum_reply_likes(reply_id);
CREATE INDEX IF NOT EXISTS idx_forum_reply_likes_user_id ON forum_reply_likes(user_id);

-- Enable Row Level Security
ALTER TABLE forum_reply_likes ENABLE ROW LEVEL SECURITY;

-- Create policies for forum_reply_likes
CREATE POLICY "Allow public read access to forum reply likes"
  ON forum_reply_likes FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated users to insert forum reply likes"
  ON forum_reply_likes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete own forum reply likes"
  ON forum_reply_likes FOR DELETE
  USING (true);

-- Add likes_count column to forum_post_replies if it doesn't exist
ALTER TABLE forum_post_replies 
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;

