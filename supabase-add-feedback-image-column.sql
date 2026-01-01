-- Add image_url column to feedbacks table
ALTER TABLE feedbacks
ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMENT ON COLUMN feedbacks.image_url IS 'קישור לתמונה/צילום מסך שצורף לפידבק';

