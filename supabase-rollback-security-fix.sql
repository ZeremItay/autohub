-- ============================================
-- EMERGENCY ROLLBACK - Restore working policies
-- ============================================
-- This script restores the old policies to get the site working again
-- Run this immediately if the security fix broke the site
-- ============================================

-- ============================================
-- PROFILES - Restore public access
-- ============================================

-- Drop the restrictive policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Anyone can view public profile fields" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can view public profile fields" ON profiles;

-- Restore the old policy (allows public access)
DROP POLICY IF EXISTS "Anyone can view profiles" ON profiles;
CREATE POLICY "Anyone can view profiles" ON profiles
  FOR SELECT
  USING (true);

-- ============================================
-- COURSE_LESSONS - Restore public access
-- ============================================

-- Drop the restrictive policies
DROP POLICY IF EXISTS "Premium members can view lessons" ON course_lessons;
DROP POLICY IF EXISTS "Admins can manage lessons" ON course_lessons;

-- Restore the old policy (allows public access)
DROP POLICY IF EXISTS "Anyone can view lessons" ON course_lessons;
CREATE POLICY "Anyone can view lessons" ON course_lessons FOR SELECT USING (true);

-- Restore old management policies
DROP POLICY IF EXISTS "Authenticated users can create lessons" ON course_lessons;
CREATE POLICY "Authenticated users can create lessons" ON course_lessons FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated users can update lessons" ON course_lessons;
CREATE POLICY "Authenticated users can update lessons" ON course_lessons FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Authenticated users can delete lessons" ON course_lessons;
CREATE POLICY "Authenticated users can delete lessons" ON course_lessons FOR DELETE USING (true);

-- ============================================
-- RECORDINGS - Restore public access
-- ============================================

-- Drop the restrictive policies
DROP POLICY IF EXISTS "Premium members can view recordings" ON recordings;
DROP POLICY IF EXISTS "Admins can manage recordings" ON recordings;

-- Restore the old policy (allows public access)
DROP POLICY IF EXISTS "Allow public read access to recordings" ON recordings;
CREATE POLICY "Allow public read access to recordings"
  ON recordings FOR SELECT
  USING (true);

-- Restore old management policies
DROP POLICY IF EXISTS "Allow authenticated users to insert recordings" ON recordings;
CREATE POLICY "Allow authenticated users to insert recordings"
  ON recordings FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update recordings" ON recordings;
CREATE POLICY "Allow authenticated users to update recordings"
  ON recordings FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete recordings" ON recordings;
CREATE POLICY "Allow authenticated users to delete recordings"
  ON recordings FOR DELETE
  USING (true);

-- ============================================
-- COMMENTS - Restore working policies
-- ============================================

-- Drop the restrictive policies
DROP POLICY IF EXISTS "Anyone can view comments" ON recording_comments;
DROP POLICY IF EXISTS "Authenticated users can insert comments" ON recording_comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON recording_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON recording_comments;
DROP POLICY IF EXISTS "Admins can manage all comments" ON recording_comments;

-- Restore the old policies
DROP POLICY IF EXISTS "Allow public read access to recording comments" ON recording_comments;
CREATE POLICY "Allow public read access to recording comments"
  ON recording_comments FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert comments" ON recording_comments;
CREATE POLICY "Allow authenticated users to insert comments"
  ON recording_comments FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow users to update own comments" ON recording_comments;
CREATE POLICY "Allow users to update own comments"
  ON recording_comments FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Allow users to delete own comments" ON recording_comments;
CREATE POLICY "Allow users to delete own comments"
  ON recording_comments FOR DELETE
  USING (true);

-- ============================================
-- DONE - Site should work now
-- ============================================
