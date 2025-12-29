-- Insert test users with different subscription types
-- IMPORTANT: This script assumes you will create the users in Supabase Auth first
-- OR that the foreign key constraint has been temporarily disabled
-- Run this in Supabase SQL Editor

-- First, make sure we have the roles
INSERT INTO roles (name, display_name, description) VALUES
  ('free', 'מנוי חינמי', 'מנוי חינמי - גישה בסיסית'),
  ('premium', 'מנוי פרימיום', 'מנוי פרימיום - גישה מלאה'),
  ('admin', 'מנהל', 'מנהל מערכת - גישה מלאה וניהול')
ON CONFLICT (name) DO NOTHING;

-- Option 1: Use existing users from auth.users
-- This will create profiles for the first 2 users in auth.users
DO $$
DECLARE
  free_role_id UUID;
  premium_role_id UUID;
  user1_id UUID;
  user2_id UUID;
BEGIN
  -- Get role IDs
  SELECT id INTO free_role_id FROM roles WHERE name = 'free' LIMIT 1;
  SELECT id INTO premium_role_id FROM roles WHERE name = 'premium' LIMIT 1;

  -- Get first 2 users from auth.users (if they exist)
  SELECT id INTO user1_id FROM auth.users ORDER BY created_at LIMIT 1 OFFSET 0;
  SELECT id INTO user2_id FROM auth.users ORDER BY created_at LIMIT 1 OFFSET 1;

  -- If we have users, create profiles for them
  IF user1_id IS NOT NULL THEN
    INSERT INTO profiles (
      user_id,
      display_name,
      nickname,
      email,
      role_id,
      points,
      is_online,
      created_at,
      updated_at
    ) VALUES (
      user1_id,
      'יוסי כהן',
      'יוסי',
      'yossi.cohen@example.com',
      free_role_id,
      100,
      true,
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      display_name = EXCLUDED.display_name,
      nickname = EXCLUDED.nickname,
      email = EXCLUDED.email,
      role_id = EXCLUDED.role_id,
      points = EXCLUDED.points,
      is_online = EXCLUDED.is_online,
      updated_at = NOW();
  END IF;

  IF user2_id IS NOT NULL THEN
    INSERT INTO profiles (
      user_id,
      display_name,
      nickname,
      email,
      role_id,
      points,
      is_online,
      created_at,
      updated_at
    ) VALUES (
      user2_id,
      'שרה לוי',
      'שרה',
      'sara.levi@example.com',
      premium_role_id,
      500,
      true,
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      display_name = EXCLUDED.display_name,
      nickname = EXCLUDED.nickname,
      email = EXCLUDED.email,
      role_id = EXCLUDED.role_id,
      points = EXCLUDED.points,
      is_online = EXCLUDED.is_online,
      updated_at = NOW();
  END IF;
END $$;

-- Option 2: If you want to create test users manually, follow these steps:
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Click "Add User" and create:
--    - Email: yossi.cohen@example.com, Password: test123456
--    - Email: sara.levi@example.com, Password: test123456
-- 3. Copy their user IDs from the users table
-- 4. Run the queries below with the actual user IDs

-- Example (replace with actual user IDs from auth.users):
/*
-- Free User Profile
INSERT INTO profiles (
  user_id,
  display_name,
  nickname,
  email,
  role_id,
  points,
  is_online,
  created_at,
  updated_at
) 
SELECT 
  'YOUR_USER_ID_1_HERE'::UUID,  -- Replace with actual user ID
  'יוסי כהן',
  'יוסי',
  'yossi.cohen@example.com',
  (SELECT id FROM roles WHERE name = 'free' LIMIT 1),
  100,
  true,
  NOW(),
  NOW()
ON CONFLICT (user_id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  nickname = EXCLUDED.nickname,
  email = EXCLUDED.email,
  role_id = EXCLUDED.role_id,
  points = EXCLUDED.points,
  is_online = EXCLUDED.is_online,
  updated_at = NOW();

-- Premium User Profile
INSERT INTO profiles (
  user_id,
  display_name,
  nickname,
  email,
  role_id,
  points,
  is_online,
  created_at,
  updated_at
) 
SELECT 
  'YOUR_USER_ID_2_HERE'::UUID,  -- Replace with actual user ID
  'שרה לוי',
  'שרה',
  'sara.levi@example.com',
  (SELECT id FROM roles WHERE name = 'premium' LIMIT 1),
  500,
  true,
  NOW(),
  NOW()
ON CONFLICT (user_id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  nickname = EXCLUDED.nickname,
  email = EXCLUDED.email,
  role_id = EXCLUDED.role_id,
  points = EXCLUDED.points,
  is_online = EXCLUDED.is_online,
  updated_at = NOW();
*/

-- Option 3: If you need to temporarily disable the foreign key constraint
-- (NOT RECOMMENDED for production, only for testing)
/*
-- Check if constraint exists
SELECT constraint_name 
FROM information_schema.table_constraints 
WHERE table_name = 'profiles' 
AND constraint_name LIKE '%user_id%';

-- If you need to drop it temporarily (replace 'profiles_user_id_fkey' with actual constraint name):
-- ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;

-- After inserting test data, re-add the constraint:
-- ALTER TABLE profiles 
-- ADD CONSTRAINT profiles_user_id_fkey 
-- FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
*/
