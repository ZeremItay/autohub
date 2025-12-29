-- Verify database structure - Check all foreign keys
-- Run this in Supabase SQL Editor to see the complete structure

-- 1. Check all foreign keys for profiles table
SELECT
  'Foreign Keys in profiles table:' AS section,
  tc.constraint_name,
  kcu.column_name AS local_column,
  ccu.table_schema || '.' || ccu.table_name AS references_table,
  ccu.column_name AS references_column
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'profiles'
  AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY kcu.column_name;

-- 2. Check specifically for user_id foreign key to auth.users
SELECT
  CASE 
    WHEN EXISTS (
      SELECT 1
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.table_name = 'profiles'
        AND kcu.column_name = 'user_id'
        AND ccu.table_name = 'users'
        AND ccu.table_schema = 'auth'
        AND tc.constraint_type = 'FOREIGN KEY'
    ) THEN '✅ YES - profiles.user_id -> auth.users(id) exists'
    ELSE '❌ NO - Missing foreign key: profiles.user_id -> auth.users(id)'
  END AS user_id_to_auth_users_status;

-- 3. Check all columns in profiles table
SELECT
  'Columns in profiles table:' AS section,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- 4. Count profiles vs auth.users
SELECT
  'User counts:' AS section,
  (SELECT COUNT(*) FROM auth.users) AS auth_users_count,
  (SELECT COUNT(*) FROM profiles) AS profiles_count,
  (SELECT COUNT(*) FROM auth.users) - (SELECT COUNT(*) FROM profiles) AS missing_profiles;

