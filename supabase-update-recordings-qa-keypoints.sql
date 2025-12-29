-- Add Q&A and Key Points sections to recordings table
ALTER TABLE recordings 
ADD COLUMN IF NOT EXISTS qa_section JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS key_points JSONB DEFAULT '[]'::jsonb;

-- Example structure:
-- qa_section: [{"question": "שאלה?", "answer": "תשובה"}]
-- key_points: [{"title": "כותרת", "description": "תיאור"}]

