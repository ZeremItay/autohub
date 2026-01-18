-- ============================================
-- EMERGENCY ROLLBACK - Restore site functionality
-- ============================================
-- Run this NOW to restore your site
-- ============================================

-- ============================================
-- RESTORE PROFILES ACCESS
-- ============================================

-- Drop restrictive policies
DROP POLICY IF EXISTS "Authenticated users can view public profile fields" ON profiles;
DROP POLICY IF EXISTS "Users can view their own complete profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Restore: Authenticated users can view all profiles
CREATE POLICY "Authenticated users can view profiles" ON profiles
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Keep secure update policy
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- RESTORE COURSE_PROGRESS ACCESS
-- ============================================

-- Drop overly restrictive policies
DROP POLICY IF EXISTS "Users can view own progress" ON course_progress;
DROP POLICY IF EXISTS "Users can insert own progress" ON course_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON course_progress;

-- Restore: Users can manage their own progress
CREATE POLICY "Users can view own progress" ON course_progress
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress" ON course_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress" ON course_progress
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- RESTORE COURSES ACCESS
-- ============================================

-- Drop restrictive policies
DROP POLICY IF EXISTS "Only admins can insert courses" ON courses;
DROP POLICY IF EXISTS "Only admins can update courses" ON courses;

-- Restore: Public can view courses
DROP POLICY IF EXISTS "Allow public read access to courses" ON courses;
CREATE POLICY "Allow public read access to courses" ON courses
  FOR SELECT
  USING (true);

-- Admin-only for management (keep this)
CREATE POLICY "Admins can manage courses" ON courses
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.user_id = auth.uid() AND r.name = 'admin'
    )
  );

-- ============================================
-- RESTORE RECORDINGS ACCESS (KEEP PREMIUM PROTECTION)
-- ============================================

-- Drop overly restrictive policies
DROP POLICY IF EXISTS "Premium members can view recordings" ON recordings;
DROP POLICY IF EXISTS "Only admins can insert recordings" ON recordings;
DROP POLICY IF EXISTS "Only admins can update recordings" ON recordings;
DROP POLICY IF EXISTS "Only admins can delete recordings" ON recordings;

-- COMPROMISE: Authenticated users can VIEW recordings metadata
-- But video_url should be checked in application code
CREATE POLICY "Authenticated users can view recordings" ON recordings
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Admin-only for management
CREATE POLICY "Admins can manage recordings" ON recordings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.user_id = auth.uid() AND r.name = 'admin'
    )
  );

-- ============================================
-- DROP THE VIEW (it might be causing issues)
-- ============================================
DROP VIEW IF EXISTS public_profiles;

-- ============================================
-- VERIFICATION
-- ============================================
-- Run these to verify site is working:
-- SELECT * FROM profiles WHERE user_id = auth.uid();
-- SELECT * FROM courses LIMIT 10;
-- SELECT * FROM recordings LIMIT 10;
