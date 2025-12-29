-- Add missing fields to profiles table for profile page
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS how_to_address TEXT,
ADD COLUMN IF NOT EXISTS nocode_experience TEXT,
ADD COLUMN IF NOT EXISTS instagram_url TEXT,
ADD COLUMN IF NOT EXISTS facebook_url TEXT;

-- Update existing profile with sample data
UPDATE profiles SET
  first_name = 'איתי',
  last_name = 'זרם',
  nickname = COALESCE(nickname, 'zeremitay'),
  how_to_address = COALESCE(how_to_address, 'אוטומטור'),
  nocode_experience = COALESCE(nocode_experience, 'No בטופ 100'),
  points = COALESCE(points, 102),
  rank = COALESCE(rank, 3)
WHERE id IN (SELECT id FROM profiles LIMIT 1);

