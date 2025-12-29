-- Add RLS policies for profiles table
-- This allows authenticated users to update profiles (especially for admin panel)

-- Enable RLS on profiles table if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Anyone can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can update profiles" ON profiles;

-- Policy: Anyone can view profiles (for public display)
CREATE POLICY "Anyone can view profiles" ON profiles
  FOR SELECT
  USING (true);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Authenticated users can update any profile (for admin panel)
-- This allows admins to update any user's profile
-- Note: In production, you might want to restrict this to admin role only
CREATE POLICY "Authenticated users can update profiles" ON profiles
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Policy: Authenticated users can insert profiles (for signup)
CREATE POLICY "Authenticated users can insert profiles" ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

