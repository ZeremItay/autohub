-- Fix RLS policy for course_enrollments to allow admins to delete enrollments
-- Drop existing DELETE policy
DROP POLICY IF EXISTS "Users can delete their own enrollments" ON course_enrollments;

-- Create new DELETE policy that allows users to delete their own enrollments OR admins to delete any enrollment
CREATE POLICY "Users can delete their own enrollments or admins can delete any"
  ON course_enrollments FOR DELETE
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

