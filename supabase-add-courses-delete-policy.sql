-- Add DELETE policy for courses table
-- Run this in Supabase SQL Editor to allow authenticated users to delete courses

-- Check if policy already exists
SELECT policyname 
FROM pg_policies 
WHERE tablename = 'courses' AND policyname = 'Allow authenticated users to delete courses';

-- If the above returns nothing, create the policy:
CREATE POLICY "Allow authenticated users to delete courses"
  ON courses FOR DELETE
  USING (true);

-- Verify the policy was created
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'courses';

