-- Add is_free_for_premium column to courses table
-- This allows courses to be free for premium users but paid for free users

ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS is_free_for_premium BOOLEAN DEFAULT FALSE;

-- Add comment to explain the column
COMMENT ON COLUMN courses.is_free_for_premium IS 'If true, course is free for premium users but paid for free users. Requires price to be set.';

-- Update existing courses: if is_premium_only is true and price is set, set is_free_for_premium to true
UPDATE courses 
SET is_free_for_premium = TRUE 
WHERE is_premium_only = TRUE AND price IS NOT NULL AND price > 0;

