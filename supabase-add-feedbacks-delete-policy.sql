-- Add DELETE policy for feedbacks table (admins only)
-- Run this in Supabase SQL Editor

-- Drop existing DELETE policy if it exists
DROP POLICY IF EXISTS "Allow admins to delete feedback" ON feedbacks;

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

