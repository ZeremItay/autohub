-- Make role_id required (NOT NULL) in profiles table
-- Run this after you've already created the roles table and added role_id column

-- Step 1: Set default role (free) for any profiles without role
UPDATE profiles
SET role_id = (SELECT id FROM roles WHERE name = 'free' LIMIT 1)
WHERE role_id IS NULL;

-- Step 2: Make role_id NOT NULL (required) - כל פרופיל חייב להיות עם תפקיד!
ALTER TABLE profiles ALTER COLUMN role_id SET NOT NULL;

-- Step 3: Set default value for new profiles (automatically assign 'free' role)
ALTER TABLE profiles 
ALTER COLUMN role_id SET DEFAULT (SELECT id FROM roles WHERE name = 'free' LIMIT 1);

-- Step 4: Ensure foreign key constraint exists
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

-- Note: No need for profiles_with_roles view!
-- Since every profile MUST have a role (NOT NULL), we can always use INNER JOIN
-- Example query:
-- SELECT p.*, r.name as role_name, r.display_name as role_display_name 
-- FROM profiles p 
-- INNER JOIN roles r ON p.role_id = r.id

