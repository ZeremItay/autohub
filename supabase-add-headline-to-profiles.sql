-- Add headline column to profiles table
-- Run this SQL in your Supabase SQL Editor

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS headline TEXT;

-- Add comment to the column
COMMENT ON COLUMN profiles.headline IS 'כותרת משנה / משפט מפתח שהמשתמש יכול לכתוב על עצמו';
