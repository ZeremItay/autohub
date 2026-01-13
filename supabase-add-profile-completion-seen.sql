-- Add field to track if user has seen the profile completion message
-- This prevents the "כל הכבוד" message from showing every time the user logs in
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS has_seen_completion_message BOOLEAN DEFAULT false;

-- Add comment
COMMENT ON COLUMN profiles.has_seen_completion_message IS 'Whether the user has seen the profile completion success message';
