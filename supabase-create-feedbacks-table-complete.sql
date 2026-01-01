-- Create feedbacks table with all columns and RLS policies
-- Run this in Supabase SQL Editor

-- Create the table with all columns
CREATE TABLE IF NOT EXISTS feedbacks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  name TEXT,
  email TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback_type TEXT,
  image_url TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'read', 'archived')),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_feedbacks_user_id ON feedbacks(user_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_status ON feedbacks(status);
CREATE INDEX IF NOT EXISTS idx_feedbacks_created_at ON feedbacks(created_at DESC);

-- Enable Row Level Security
ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to insert feedback" ON feedbacks;
DROP POLICY IF EXISTS "Allow anyone to insert feedback" ON feedbacks;
DROP POLICY IF EXISTS "Allow users to view their own feedback" ON feedbacks;
DROP POLICY IF EXISTS "Allow admins to view all feedback" ON feedbacks;
DROP POLICY IF EXISTS "Allow admins to update feedback" ON feedbacks;

-- Allow anyone (including unauthenticated users) to insert feedback
-- This is safe because user_id can be null, and we validate required fields in the API
-- Note: We use service role key in API route to bypass RLS, but this policy is a fallback
CREATE POLICY "Allow anyone to insert feedback"
  ON feedbacks FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow users to view their own feedback
CREATE POLICY "Allow users to view their own feedback"
  ON feedbacks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow admins to view all feedback
CREATE POLICY "Allow admins to view all feedback"
  ON feedbacks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM roles
        WHERE roles.id = profiles.role_id
        AND roles.name = 'admin'
      )
    )
  );

-- Allow admins to update feedback (for status, notes, etc.)
CREATE POLICY "Allow admins to update feedback"
  ON feedbacks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM roles
        WHERE roles.id = profiles.role_id
        AND roles.name = 'admin'
      )
    )
  );

-- Allow admins to delete feedback
CREATE POLICY "Allow admins to delete feedback"
  ON feedbacks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM roles
        WHERE roles.id = profiles.role_id
        AND roles.name = 'admin'
      )
    )
  );

-- Add comments for documentation
COMMENT ON TABLE feedbacks IS 'טבלת פידבקים מהמשתמשים';
COMMENT ON COLUMN feedbacks.user_id IS 'מזהה המשתמש (אם מחובר)';
COMMENT ON COLUMN feedbacks.name IS 'שם המשתמש (אופציונלי)';
COMMENT ON COLUMN feedbacks.email IS 'אימייל המשתמש (אופציונלי)';
COMMENT ON COLUMN feedbacks.subject IS 'נושא הפידבק';
COMMENT ON COLUMN feedbacks.message IS 'תוכן הפידבק';
COMMENT ON COLUMN feedbacks.rating IS 'דירוג 1-5';
COMMENT ON COLUMN feedbacks.feedback_type IS 'סוג הפידבק: הצעה לשיפור, דיווח על באג, בקשה לתוכן חדש, פרגון, אחר';
COMMENT ON COLUMN feedbacks.image_url IS 'קישור לתמונה/צילום מסך שצורף לפידבק';
COMMENT ON COLUMN feedbacks.status IS 'סטטוס: new, read, archived';
COMMENT ON COLUMN feedbacks.admin_notes IS 'הערות מנהל (לא נראה למשתמש)';

