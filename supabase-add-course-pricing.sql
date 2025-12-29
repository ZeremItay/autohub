-- Add pricing and premium fields to courses table
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS price DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS is_premium_only BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN courses.price IS 'מחיר הקורס בשקלים. NULL אם הקורס חינם';
COMMENT ON COLUMN courses.is_premium_only IS 'אם true, הקורס זמין למשתמשי פרימיום בלבד';
COMMENT ON COLUMN courses.is_free IS 'אם true, הקורס חינם (ברירת מחדל)';

