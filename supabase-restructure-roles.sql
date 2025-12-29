-- Restructure roles system
-- This script will:
-- 1. Create a roles table with: מנוי חינמי, מנוי פרימיום, ADMIN
-- 2. Add role_id column to profiles
-- 3. Migrate existing data
-- 4. Optionally drop old user_roles table

-- Step 1: Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Insert the 3 roles
INSERT INTO roles (name, display_name, description) VALUES
  ('free', 'מנוי חינמי', 'מנוי חינמי - גישה בסיסית'),
  ('premium', 'מנוי פרימיום', 'מנוי פרימיום - גישה מלאה'),
  ('admin', 'מנהל', 'מנהל מערכת - גישה מלאה וניהול')
ON CONFLICT (name) DO NOTHING;

-- Step 3: Add role_id column to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES roles(id);

-- Step 4: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_role_id ON profiles(role_id);

-- Step 5: Migrate existing data from user_roles to profiles
-- Set admin role for users who have admin in user_roles
UPDATE profiles p
SET role_id = (SELECT id FROM roles WHERE name = 'admin')
WHERE EXISTS (
  SELECT 1 FROM user_roles ur 
  WHERE ur.user_id = p.user_id 
  AND ur.role = 'admin'
);

-- Step 6: Set default role (free) for users without role
UPDATE profiles
SET role_id = (SELECT id FROM roles WHERE name = 'free')
WHERE role_id IS NULL;

-- Step 7: Make role_id NOT NULL (required) - כל פרופיל חייב להיות עם תפקיד!
-- First, set default for any NULL values
UPDATE profiles
SET role_id = (SELECT id FROM roles WHERE name = 'free' LIMIT 1)
WHERE role_id IS NULL;

-- Now make it NOT NULL
ALTER TABLE profiles ALTER COLUMN role_id SET NOT NULL;

-- Step 8: Add default value for new profiles (automatically assign 'free' role)
-- Note: PostgreSQL doesn't support subquery in DEFAULT, so we'll handle this in application code
-- Or create a trigger/function for this

-- Step 9: Ensure foreign key constraint exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_role_id_fkey'
  ) THEN
    ALTER TABLE profiles 
    ADD CONSTRAINT profiles_role_id_fkey 
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- Step 10: Drop profiles_with_roles view if it exists (not needed!)
DROP VIEW IF EXISTS profiles_with_roles;

-- Note: אין צורך ב-view profiles_with_roles!
-- כל פרופיל חייב להיות עם תפקיד (NOT NULL), אז תמיד נוכל להשתמש ב-INNER JOIN
-- דוגמה לשאילתה:
-- SELECT p.*, r.name as role_name, r.display_name as role_display_name 
-- FROM profiles p 
-- INNER JOIN roles r ON p.role_id = r.id

