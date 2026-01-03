-- Add DELETE policy for projects table
-- Allows users to delete their own projects and admins to delete any project

-- Drop existing DELETE policy if exists
DROP POLICY IF EXISTS "Users can delete their own projects" ON projects;
DROP POLICY IF EXISTS "Admins can delete any project" ON projects;
DROP POLICY IF EXISTS "Users can delete their own projects or admins can delete any" ON projects;

-- Create new DELETE policy that allows:
-- 1. Users to delete their own projects
-- 2. Admins to delete any project
CREATE POLICY "Users can delete their own projects or admins can delete any"
  ON projects FOR DELETE
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

