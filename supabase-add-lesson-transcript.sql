-- Add transcript column to course_lessons table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'course_lessons' 
    AND column_name = 'transcript'
  ) THEN
    ALTER TABLE course_lessons ADD COLUMN transcript TEXT;
    RAISE NOTICE 'Added transcript column to course_lessons';
  ELSE
    RAISE NOTICE 'transcript column already exists in course_lessons';
  END IF;
END $$;
