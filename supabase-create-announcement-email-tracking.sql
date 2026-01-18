-- Create announcement_email_sent table for tracking which users received emails for which announcements
-- This prevents duplicate emails and allows selective sending

CREATE TABLE IF NOT EXISTS announcement_email_sent (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_announcement_email_sent_post_id ON announcement_email_sent(post_id);
CREATE INDEX IF NOT EXISTS idx_announcement_email_sent_user_id ON announcement_email_sent(user_id);
CREATE INDEX IF NOT EXISTS idx_announcement_email_sent_sent_at ON announcement_email_sent(sent_at DESC);

-- Enable Row Level Security
ALTER TABLE announcement_email_sent ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all email tracking records
CREATE POLICY "Admins can view all email tracking"
  ON announcement_email_sent FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.user_id = auth.uid() AND r.name = 'admin'
    )
  );

-- Policy: System can insert email tracking records (for API route)
CREATE POLICY "System can insert email tracking"
  ON announcement_email_sent FOR INSERT
  WITH CHECK (true);

-- Policy: Admins can delete email tracking records
CREATE POLICY "Admins can delete email tracking"
  ON announcement_email_sent FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.user_id = auth.uid() AND r.name = 'admin'
    )
  );
