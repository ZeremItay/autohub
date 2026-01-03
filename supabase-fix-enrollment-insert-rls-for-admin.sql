-- Fix RLS policy for course_enrollments to allow admins to create enrollments for any user
-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can create their own enrollments" ON course_enrollments;
DROP POLICY IF EXISTS "Users can create their own enrollments or admins can create any" ON course_enrollments;

-- Create new INSERT policy that allows:
-- 1. Users to create enrollments for themselves (auth.uid() = user_id)
-- 2. Admins to create enrollments for any user (admin can set any user_id)
CREATE POLICY "Users can create their own enrollments or admins can create any"
  ON course_enrollments FOR INSERT
  WITH CHECK (
    -- Users can create enrollments for themselves
    auth.uid() = user_id OR
    -- Admins can create enrollments for any user
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role_id IN (
        SELECT id FROM roles WHERE name = 'admin'
      )
    )
  );

