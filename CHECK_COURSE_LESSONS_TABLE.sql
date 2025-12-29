-- Check course_lessons table structure and RLS policies
-- Run this in Supabase SQL Editor to verify the table exists and has correct permissions

-- 1. Check if table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'course_lessons';

-- 2. Check all columns and their types
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'course_lessons'
ORDER BY ordinal_position;

-- 3. Check RLS policies
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
WHERE tablename = 'course_lessons';

-- 4. Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'course_lessons';

-- 5. Test select query (should work if RLS is correct)
SELECT COUNT(*) as lesson_count FROM course_lessons;

-- 6. If table doesn't exist, create it:
-- Run the supabase-create-lessons-table.sql script

