-- ============================================
-- BALANCED SECURITY FIX
-- ============================================
-- This provides GOOD security without breaking functionality
-- Focuses on the CRITICAL issues only
-- ============================================

-- ============================================
-- FIX 1: COURSE PROGRESS - Already good from rollback!
-- ============================================
-- Users can only view/edit their own progress ✅
-- This is already working from the rollback

-- ============================================
-- FIX 2: COURSES - Prevent non-admins from modifying
-- ============================================

-- Drop existing management policies
DROP POLICY IF EXISTS "Allow authenticated users to insert courses" ON courses;
DROP POLICY IF EXISTS "Allow authenticated users to update courses" ON courses;
DROP POLICY IF EXISTS "Allow authenticated users to delete courses" ON courses;
DROP POLICY IF EXISTS "Admins can manage courses" ON courses;

-- Keep public read (courses should be visible)
-- This was restored in rollback and is correct

-- Add admin-only policies for INSERT/UPDATE/DELETE
CREATE POLICY "Only admins can insert courses" ON courses
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      JOIN roles ON profiles.role_id = roles.id
      WHERE profiles.user_id = auth.uid() AND roles.name = 'admin'
    )
  );

CREATE POLICY "Only admins can update courses" ON courses
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      JOIN roles ON profiles.role_id = roles.id
      WHERE profiles.user_id = auth.uid() AND roles.name = 'admin'
    )
  );

CREATE POLICY "Only admins can delete courses" ON courses
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      JOIN roles ON profiles.role_id = roles.id
      WHERE profiles.user_id = auth.uid() AND roles.name = 'admin'
    )
  );

-- ============================================
-- FIX 3: RECORDINGS - Admin-only management
-- ============================================

-- Keep the "Authenticated users can view recordings" from rollback
-- This is CORRECT - let app code check premium status

-- Drop existing management policies
DROP POLICY IF EXISTS "Allow authenticated users to insert recordings" ON recordings;
DROP POLICY IF EXISTS "Allow authenticated users to update recordings" ON recordings;
DROP POLICY IF EXISTS "Allow authenticated users to delete recordings" ON recordings;
DROP POLICY IF EXISTS "Admins can manage recordings" ON recordings;

-- Add admin-only management
CREATE POLICY "Only admins can insert recordings" ON recordings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      JOIN roles ON profiles.role_id = roles.id
      WHERE profiles.user_id = auth.uid() AND roles.name = 'admin'
    )
  );

CREATE POLICY "Only admins can update recordings" ON recordings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      JOIN roles ON profiles.role_id = roles.id
      WHERE profiles.user_id = auth.uid() AND roles.name = 'admin'
    )
  );

CREATE POLICY "Only admins can delete recordings" ON recordings
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      JOIN roles ON profiles.role_id = roles.id
      WHERE profiles.user_id = auth.uid() AND roles.name = 'admin'
    )
  );

-- ============================================
-- FIX 4: COURSE_LESSONS - Prevent unauthorized changes
-- ============================================

-- Enable RLS if not already enabled
ALTER TABLE course_lessons ENABLE ROW LEVEL SECURITY;

-- Drop any overly permissive policies
DROP POLICY IF EXISTS "Anyone can view lessons" ON course_lessons;
DROP POLICY IF EXISTS "Authenticated users can create lessons" ON course_lessons;
DROP POLICY IF EXISTS "Authenticated users can update lessons" ON course_lessons;
DROP POLICY IF EXISTS "Authenticated users can delete lessons" ON course_lessons;

-- Public can view lessons (metadata only, enrollment checked in app)
CREATE POLICY "Anyone can view lessons" ON course_lessons
  FOR SELECT
  USING (true);

-- Only admins can manage lessons
CREATE POLICY "Only admins can manage lessons" ON course_lessons
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      JOIN roles ON profiles.role_id = roles.id
      WHERE profiles.user_id = auth.uid() AND roles.name = 'admin'
    )
  );

-- ============================================
-- SUMMARY OF PROTECTION
-- ============================================
-- ✅ Debug endpoints: DELETED (permanent fix)
-- ✅ Webhook: SECURED with signatures
-- ✅ Course progress: Users can only access their own
-- ✅ Courses: Public can view, only admins can modify
-- ✅ Recordings: Authenticated can view, only admins can modify
-- ✅ Lessons: Public can view, only admins can modify
-- ✅ Profiles: Authenticated can view, users can update own

-- ============================================
-- WHAT THIS DOES NOT DO (Intentionally)
-- ============================================
-- ❌ Does NOT block free users from viewing recordings
--    (Your app's AuthGuard handles this - better UX)
-- ❌ Does NOT hide profile emails at database level
--    (RLS can't do column-level - use app code)
-- ❌ Does NOT block enrollment checks
--    (Your app code handles this correctly)

-- This is a PRACTICAL balance between security and functionality!
