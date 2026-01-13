-- Add instructor_user_id column to events table
-- This allows selecting instructors from the community
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS instructor_user_id UUID REFERENCES profiles(user_id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_events_instructor_user_id ON events(instructor_user_id);

-- Add comment
COMMENT ON COLUMN events.instructor_user_id IS 'User ID of instructor from the community (optional)';
