-- Add social_links JSONB column to profiles table
-- This allows users to add multiple social media links flexibly

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN profiles.social_links IS 'Array of social media links in format: [{"platform": "instagram", "url": "https://..."}]';

