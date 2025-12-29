-- Check courses table structure and constraints
-- Run this in Supabase SQL Editor to verify the table structure

-- 1. Check if table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'courses';

-- 2. Check all columns and their types
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'courses'
ORDER BY ordinal_position;

-- 3. Check constraints
SELECT 
  constraint_name,
  constraint_type
FROM information_schema.table_constraints 
WHERE table_schema = 'public' AND table_name = 'courses';

-- 4. Check check constraints specifically
SELECT 
  constraint_name,
  check_clause
FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%courses%';

-- 5. Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'courses';

-- 6. Test insert with minimal data
INSERT INTO courses (
  title,
  description,
  category,
  difficulty,
  duration_hours,
  lessons_count
) VALUES (
  'Test Course',
  'Test Description',
  'Test Category',
  'מתחילים',
  1.0,
  0
) RETURNING *;

-- If the above works, delete the test record
DELETE FROM courses WHERE title = 'Test Course';

