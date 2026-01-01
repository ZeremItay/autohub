-- Create feedbacks table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS feedbacks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  name TEXT,
  email TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
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

-- Create policies
-- Allow authenticated users to insert feedback
CREATE POLICY "Allow authenticated users to insert feedback"
  ON feedbacks FOR INSERT
  TO authenticated
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

-- Add comment for documentation
COMMENT ON TABLE feedbacks IS 'טבלת פידבקים מהמשתמשים';
COMMENT ON COLUMN feedbacks.user_id IS 'מזהה המשתמש (אם מחובר)';
COMMENT ON COLUMN feedbacks.name IS 'שם המשתמש (אופציונלי)';
COMMENT ON COLUMN feedbacks.email IS 'אימייל המשתמש (אופציונלי)';
COMMENT ON COLUMN feedbacks.subject IS 'נושא הפידבק';
COMMENT ON COLUMN feedbacks.message IS 'תוכן הפידבק';
COMMENT ON COLUMN feedbacks.rating IS 'דירוג 1-5';
COMMENT ON COLUMN feedbacks.status IS 'סטטוס: new, read, archived';
COMMENT ON COLUMN feedbacks.admin_notes IS 'הערות מנהל (לא נראה למשתמש)';

