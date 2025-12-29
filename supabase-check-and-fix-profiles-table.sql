-- Check and fix profiles table structure
-- This script will:
-- 1. Check if profiles table exists and has correct structure
-- 2. Add foreign key constraint to auth.users if missing
-- 3. Verify all required columns exist

-- Step 1: Check if profiles table exists, if not create it
CREATE TABLE IF NOT EXISTS profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  nickname TEXT,
  experience_level TEXT,
  points INTEGER DEFAULT 0,
  rank INTEGER DEFAULT 0,
  is_online BOOLEAN DEFAULT false,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  how_to_address TEXT,
  nocode_experience TEXT,
  birthdate DATE,
  instagram_url TEXT,
  facebook_url TEXT,
  role_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Add foreign key constraint to auth.users if it doesn't exist
DO $$
BEGIN
  -- Check if foreign key constraint exists
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE table_name = 'profiles' 
    AND constraint_name LIKE '%user_id%'
    AND constraint_type = 'FOREIGN KEY'
  ) THEN
    -- Add foreign key constraint
    ALTER TABLE profiles 
    ADD CONSTRAINT profiles_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Foreign key constraint added to profiles.user_id';
  ELSE
    RAISE NOTICE 'Foreign key constraint already exists';
  END IF;
END $$;

-- Step 3: Add missing columns if they don't exist
DO $$
BEGIN
  -- Add role_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'role_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN role_id UUID;
    RAISE NOTICE 'Added role_id column';
  END IF;

  -- Add first_name if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'first_name'
  ) THEN
    ALTER TABLE profiles ADD COLUMN first_name TEXT;
    RAISE NOTICE 'Added first_name column';
  END IF;

  -- Add last_name if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'last_name'
  ) THEN
    ALTER TABLE profiles ADD COLUMN last_name TEXT;
    RAISE NOTICE 'Added last_name column';
  END IF;

  -- Add other fields if needed
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'how_to_address'
  ) THEN
    ALTER TABLE profiles ADD COLUMN how_to_address TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'nocode_experience'
  ) THEN
    ALTER TABLE profiles ADD COLUMN nocode_experience TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'birthdate'
  ) THEN
    ALTER TABLE profiles ADD COLUMN birthdate DATE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'instagram_url'
  ) THEN
    ALTER TABLE profiles ADD COLUMN instagram_url TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'facebook_url'
  ) THEN
    ALTER TABLE profiles ADD COLUMN facebook_url TEXT;
  END IF;
END $$;

-- Step 4: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role_id ON profiles(role_id) WHERE role_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email) WHERE email IS NOT NULL;

-- Step 5: Verify the structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- Step 6: Check foreign key constraints
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'profiles'
  AND tc.constraint_type = 'FOREIGN KEY';

