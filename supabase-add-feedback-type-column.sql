-- Add feedback_type column to feedbacks table
-- Run this in Supabase SQL Editor

ALTER TABLE feedbacks 
ADD COLUMN IF NOT EXISTS feedback_type TEXT;

-- Add comment for documentation
COMMENT ON COLUMN feedbacks.feedback_type IS 'סוג הפידבק: הצעה לשיפור, דיווח על באג, בקשה לתוכן חדש, פרגון, אחר';

