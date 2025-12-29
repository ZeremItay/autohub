-- Create comments table for recordings
CREATE TABLE IF NOT EXISTS recording_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recording_id UUID NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES recording_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_recording_comments_recording_id ON recording_comments(recording_id);
CREATE INDEX IF NOT EXISTS idx_recording_comments_user_id ON recording_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_recording_comments_parent_id ON recording_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_recording_comments_created_at ON recording_comments(created_at DESC);

-- Enable Row Level Security
ALTER TABLE recording_comments ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all users to read comments
CREATE POLICY "Allow public read access to recording comments"
  ON recording_comments FOR SELECT
  USING (true);

-- Create policy to allow authenticated users to insert comments
CREATE POLICY "Allow authenticated users to insert comments"
  ON recording_comments FOR INSERT
  WITH CHECK (true);

-- Create policy to allow users to update their own comments
CREATE POLICY "Allow users to update own comments"
  ON recording_comments FOR UPDATE
  USING (true);

-- Create policy to allow users to delete their own comments
CREATE POLICY "Allow users to delete own comments"
  ON recording_comments FOR DELETE
  USING (true);

