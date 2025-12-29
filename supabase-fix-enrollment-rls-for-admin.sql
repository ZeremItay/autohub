-- Fix RLS policy for course_enrollments to allow admins to create enrollments
-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can create their own enrollments" ON course_enrollments;

-- Create new INSERT policy that allows users to create their own enrollments OR admins to create any enrollment
CREATE POLICY "Users can create their own enrollments or admins can create any"
  ON course_enrollments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role_id IN (
        SELECT id FROM roles WHERE name = 'admin'
      )
    )
  );
