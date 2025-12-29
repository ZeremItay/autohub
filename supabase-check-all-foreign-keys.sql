-- Check all foreign key constraints in the database
-- This will show you all relationships between tables

-- Check foreign keys for profiles table
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  tc.constraint_type
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'profiles'
  AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.constraint_name;

-- Check if profiles.user_id has foreign key to auth.users
SELECT
  CASE 
    WHEN EXISTS (
      SELECT 1
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.table_name = 'profiles'
        AND kcu.column_name = 'user_id'
        AND ccu.table_name = 'users'
        AND ccu.table_schema = 'auth'
        AND tc.constraint_type = 'FOREIGN KEY'
    ) THEN '✅ Foreign key exists: profiles.user_id -> auth.users(id)'
    ELSE '❌ Missing: profiles.user_id should reference auth.users(id)'
  END AS user_id_fkey_status;

-- Summary of all foreign keys in profiles table
SELECT
  'profiles table foreign keys:' AS info,
  COUNT(*) AS total_foreign_keys
FROM information_schema.table_constraints
WHERE table_name = 'profiles'
  AND constraint_type = 'FOREIGN KEY';

