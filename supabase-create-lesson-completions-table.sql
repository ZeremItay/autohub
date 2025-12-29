-- Create lesson_completions table to track which lessons users have completed
CREATE TABLE IF NOT EXISTS lesson_completions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_lesson_completions_user_id ON lesson_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_completions_lesson_id ON lesson_completions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_completions_course_id ON lesson_completions(course_id);
CREATE INDEX IF NOT EXISTS idx_lesson_completions_user_course ON lesson_completions(user_id, course_id);

-- Enable Row Level Security
ALTER TABLE lesson_completions ENABLE ROW LEVEL SECURITY;

-- Create policies for lesson_completions
-- SELECT: Users can see only their own completions, admins can see all
CREATE POLICY "Users can view their own lesson completions"
  ON lesson_completions FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role_id IN (
        SELECT id FROM roles WHERE name = 'admin'
      )
    )
  );

-- INSERT: Users can create completions only for themselves
CREATE POLICY "Users can create their own lesson completions"
  ON lesson_completions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can update only their own completions
CREATE POLICY "Users can update their own lesson completions"
  ON lesson_completions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can delete only their own completions
CREATE POLICY "Users can delete their own lesson completions"
  ON lesson_completions FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_lesson_completions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_lesson_completions_updated_at
  BEFORE UPDATE ON lesson_completions
  FOR EACH ROW
  EXECUTE FUNCTION update_lesson_completions_updated_at();

