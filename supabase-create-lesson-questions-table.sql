-- Create lesson_questions table for user questions about lessons
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS lesson_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT,
  answered_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  answered_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'answered')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_lesson_questions_lesson_id ON lesson_questions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_questions_user_id ON lesson_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_questions_status ON lesson_questions(status);

-- Enable RLS
ALTER TABLE lesson_questions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own questions" ON lesson_questions;
DROP POLICY IF EXISTS "Admins can view all questions" ON lesson_questions;
DROP POLICY IF EXISTS "Users can insert their own questions" ON lesson_questions;
DROP POLICY IF EXISTS "Admins can update questions" ON lesson_questions;

-- Users can view their own questions
CREATE POLICY "Users can view their own questions"
  ON lesson_questions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all questions
CREATE POLICY "Admins can view all questions"
  ON lesson_questions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role_id IN (
        SELECT id FROM roles WHERE name = 'admin'
      )
    )
  );

-- Users can insert their own questions
CREATE POLICY "Users can insert their own questions"
  ON lesson_questions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can update questions (to answer them)
CREATE POLICY "Admins can update questions"
  ON lesson_questions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role_id IN (
        SELECT id FROM roles WHERE name = 'admin'
      )
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_lesson_questions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS update_lesson_questions_updated_at ON lesson_questions;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_lesson_questions_updated_at
  BEFORE UPDATE ON lesson_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_lesson_questions_updated_at();

-- Verify the table was created
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'lesson_questions'
ORDER BY ordinal_position;
