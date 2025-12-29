-- Create course_enrollments table
CREATE TABLE IF NOT EXISTS course_enrollments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'completed', 'cancelled')),
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  payment_status TEXT DEFAULT 'free' CHECK (payment_status IN ('free', 'paid', 'pending')),
  payment_amount DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(course_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_course_enrollments_user_id ON course_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course_id ON course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_status ON course_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_user_course ON course_enrollments(user_id, course_id);

-- Enable Row Level Security
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;

-- Create policies for course_enrollments
-- SELECT: Users can see only their own enrollments, admins can see all
CREATE POLICY "Users can view their own enrollments"
  ON course_enrollments FOR SELECT
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

-- INSERT: Users can create enrollments only for themselves
CREATE POLICY "Users can create their own enrollments"
  ON course_enrollments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can update only their own enrollments
CREATE POLICY "Users can update their own enrollments"
  ON course_enrollments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can delete only their own enrollments
CREATE POLICY "Users can delete their own enrollments"
  ON course_enrollments FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_course_enrollments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_course_enrollments_updated_at
  BEFORE UPDATE ON course_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION update_course_enrollments_updated_at();

