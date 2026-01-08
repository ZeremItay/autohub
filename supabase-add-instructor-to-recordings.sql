-- Add instructor fields to recordings table
ALTER TABLE recordings 
ADD COLUMN IF NOT EXISTS instructor_name TEXT,
ADD COLUMN IF NOT EXISTS instructor_title TEXT,
ADD COLUMN IF NOT EXISTS instructor_avatar_url TEXT,
ADD COLUMN IF NOT EXISTS instructor_user_id UUID;

-- Add index for instructor_user_id for better performance
CREATE INDEX IF NOT EXISTS idx_recordings_instructor_user_id ON recordings(instructor_user_id);

