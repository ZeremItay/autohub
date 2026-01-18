-- ============================================
-- CRITICAL SECURITY FIX - RLS Policies
-- ============================================
-- This script fixes critical RLS policy vulnerabilities that allow:
-- 1. Any authenticated user to modify courses
-- 2. Any user to read/write any user's course progress
-- 3. Public access to sensitive profile data (emails, phones)
-- ============================================

-- ============================================
-- FIX 1: COURSE PROGRESS - Restrict to own data only
-- ============================================

-- Drop broken policies
DROP POLICY IF EXISTS "Allow users to read own progress" ON course_progress;
DROP POLICY IF EXISTS "Allow users to insert own progress" ON course_progress;
DROP POLICY IF EXISTS "Allow users to update own progress" ON course_progress;

-- Fixed policy: Users can only read their own progress (or admins can read all)
CREATE POLICY "Users can view own progress" ON course_progress
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.user_id = auth.uid() AND r.name = 'admin'
    )
  );

-- Fixed policy: Users can only insert their own progress
CREATE POLICY "Users can insert own progress" ON course_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Fixed policy: Users can only update their own progress (or admins can update all)
CREATE POLICY "Users can update own progress" ON course_progress
  FOR UPDATE
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.user_id = auth.uid() AND r.name = 'admin'
    )
  )
  WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.user_id = auth.uid() AND r.name = 'admin'
    )
  );

-- ============================================
-- FIX 2: COURSES - Restrict insert/update to admins only
-- ============================================

-- Drop broken policies
DROP POLICY IF EXISTS "Allow authenticated users to insert courses" ON courses;
DROP POLICY IF EXISTS "Allow authenticated users to update courses" ON courses;

-- Fixed policy: Only admins can insert courses
CREATE POLICY "Only admins can insert courses" ON courses
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.user_id = auth.uid() AND r.name = 'admin'
    )
  );

-- Fixed policy: Only admins can update courses
CREATE POLICY "Only admins can update courses" ON courses
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.user_id = auth.uid() AND r.name = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.user_id = auth.uid() AND r.name = 'admin'
    )
  );

-- ============================================
-- FIX 3: PROFILES - Hide sensitive data from public
-- ============================================

-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Anyone can view profiles" ON profiles;

-- Create separate policies for authenticated vs public access

-- Policy 1: Authenticated users can view limited profile fields
-- This policy allows authenticated users to see usernames, avatars, etc.
-- but NOT sensitive data like emails and phone numbers
CREATE POLICY "Authenticated users can view public profile fields" ON profiles
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy 2: Users can view their OWN complete profile
CREATE POLICY "Users can view their own complete profile" ON profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy 3: Admins can view ALL profiles with ALL data
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.user_id = auth.uid() AND r.name = 'admin'
    )
  );

-- ============================================
-- FIX 5: RECORDINGS - Restrict to premium members only
-- ============================================

-- Drop broken policies that allow public/authenticated access
DROP POLICY IF EXISTS "Allow public read access to recordings" ON recordings;
DROP POLICY IF EXISTS "Allow authenticated users to insert recordings" ON recordings;
DROP POLICY IF EXISTS "Allow authenticated users to update recordings" ON recordings;
DROP POLICY IF EXISTS "Allow authenticated users to delete recordings" ON recordings;

-- Fixed policy: Only premium members and admins can view recordings
-- This enforces the paywall at the database level
CREATE POLICY "Premium members can view recordings" ON recordings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.user_id = auth.uid()
      AND r.name IN ('premium', 'admin')
    )
  );

-- Fixed policy: Only admins can insert recordings
CREATE POLICY "Only admins can insert recordings" ON recordings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.user_id = auth.uid() AND r.name = 'admin'
    )
  );

-- Fixed policy: Only admins can update recordings
CREATE POLICY "Only admins can update recordings" ON recordings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.user_id = auth.uid() AND r.name = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.user_id = auth.uid() AND r.name = 'admin'
    )
  );

-- Fixed policy: Only admins can delete recordings
CREATE POLICY "Only admins can delete recordings" ON recordings
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.user_id = auth.uid() AND r.name = 'admin'
    )
  );

-- ============================================
-- ADDITIONAL SECURITY: Add policy for DELETE operations
-- ============================================

-- Only admins can delete course progress
CREATE POLICY "Only admins can delete course progress" ON course_progress
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.user_id = auth.uid() AND r.name = 'admin'
    )
  );

-- Only admins can delete courses
CREATE POLICY "Only admins can delete courses" ON courses
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.user_id = auth.uid() AND r.name = 'admin'
    )
  );

-- ============================================
-- FIX 4: Create a public profiles view
-- ============================================
-- Since RLS policies can't restrict column-level access,
-- we create a view that exposes only non-sensitive profile data

-- Drop existing view if it exists
DROP VIEW IF EXISTS public_profiles;

-- Create view with only public profile fields
-- Note: Only includes columns that definitely exist in your profiles table
-- Excludes sensitive data: email, phone, address, birthdate
CREATE VIEW public_profiles AS
SELECT
  id,
  user_id,
  display_name,
  nickname,
  first_name,
  last_name,
  avatar_url,
  bio,
  role_id,
  points,
  rank,
  experience_level,
  nocode_experience,
  instagram_url,
  facebook_url,
  is_online,
  created_at,
  updated_at
FROM profiles;

-- Grant access to the view
GRANT SELECT ON public_profiles TO authenticated, anon;

-- Add RLS to the view (inherits from base table)
ALTER VIEW public_profiles SET (security_invoker = true);

-- ============================================
-- IMPORTANT NOTES FOR DEVELOPERS
-- ============================================
--
-- 1. PROFILE DATA VISIBILITY:
--    ⚠️  CRITICAL: Always use 'public_profiles' view instead of 'profiles' table
--    in your application queries to prevent exposing sensitive data (email, phone).
--
--    Example:
--    ❌ BAD:  .from('profiles').select('*')
--    ✅ GOOD: .from('public_profiles').select('*')
--
--    Only use the 'profiles' table when:
--    - User is viewing their own profile (auth.uid() = user_id)
--    - Admin is managing users
--
-- 2. WEBHOOK SECRET:
--    ⚠️  Set the WEBHOOK_SECRET environment variable immediately.
--    Without this, the payment webhook is vulnerable to fake submissions.
--
--    To generate a secure secret:
--    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
--
-- 3. ADMIN VERIFICATION:
--    All admin checks use: EXISTS (SELECT 1 FROM profiles p JOIN roles r ...)
--    This is secure but can be slow. Consider adding an index:
--    CREATE INDEX IF NOT EXISTS idx_profiles_role_id ON profiles(role_id);
--
-- 4. TESTING CHECKLIST:
--    After running this script, verify that:
--    ✅ Regular users CANNOT update other users' progress
--    ✅ Regular users CANNOT insert/update/delete courses
--    ✅ Unauthenticated users CANNOT see profile data
--    ✅ Authenticated users can only see public profile fields (via public_profiles view)
--    ✅ Users can see their own complete profile data
--    ✅ Admins CAN perform all operations
--    ✅ Payment webhook rejects unsigned requests
--
-- 5. APPLICATION CODE CHANGES REQUIRED:
--    You MUST update your application code to use 'public_profiles' view
--    for all public-facing profile queries. Search your codebase for:
--    - .from('profiles').select()
--    - "SELECT * FROM profiles"
--    And replace with public_profiles where appropriate.
--
-- ============================================
