-- Add is_sequential field to courses table
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS is_sequential BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN courses.is_sequential IS 'אם true, הקורס היררכי - התלמידים חייבים לסיים שיעור לפני מעבר לשיעור הבא';

