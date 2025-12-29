-- Add Q&A and Key Points sections to course_lessons table
-- Run this in Supabase SQL Editor

ALTER TABLE course_lessons 
ADD COLUMN IF NOT EXISTS qa_section JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS key_points JSONB DEFAULT '[]'::jsonb;

-- Example structure:
-- qa_section: [{"question": "שאלה?", "answer": "תשובה"}]
-- key_points: [{"title": "כותרת", "description": "תיאור", "url": "https://..."}]

-- Verify the columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'course_lessons' 
  AND column_name IN ('qa_section', 'key_points');

