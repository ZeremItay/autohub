-- Add status column to courses table
-- This allows courses to be in draft or published state

ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published'));

-- Add comment to explain the column
COMMENT ON COLUMN courses.status IS 'סטטוס הקורס: draft (טיוטה) או published (מפורסם). רק קורסים מפורסמים יוצגו לקהל הרחב.';

-- Set all existing courses to published by default
UPDATE courses 
SET status = 'published' 
WHERE status IS NULL;

