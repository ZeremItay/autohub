-- Fix RLS policy for recordings to allow listing (metadata) for all authenticated users
-- This allows non-premium users to see that recordings exist
-- The video_url will be filtered out for non-premium users at the application level

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Premium members can view recordings" ON recordings;
DROP POLICY IF EXISTS "Authenticated users can view recordings" ON recordings;

-- Create new policy that allows all authenticated users to see recording metadata
-- Note: RLS cannot restrict columns, only rows, so we allow all authenticated users
-- to see recordings, and the application code will filter video_url for non-premium users
-- This fixes the issue where recordings page shows "no recordings found" for non-premium users
CREATE POLICY "Authenticated users can view recordings"
ON recordings FOR SELECT
USING (
  -- Allow all authenticated users to see recordings (metadata)
  -- Application code will filter video_url for non-premium users
  auth.uid() IS NOT NULL
);

-- Keep the admin management policy
DROP POLICY IF EXISTS "Admins can manage recordings" ON recordings;
CREATE POLICY "Admins can manage recordings"
ON recordings FOR ALL
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
