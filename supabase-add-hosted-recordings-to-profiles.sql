-- Add hosted_recordings field to profiles table
-- This will store an array of recording IDs that the user has hosted/instructed
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS hosted_recordings UUID[] DEFAULT '{}';

-- Add index for better performance when querying by hosted_recordings
CREATE INDEX IF NOT EXISTS idx_profiles_hosted_recordings ON profiles USING GIN(hosted_recordings);

