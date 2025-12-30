-- Add recording_id column to events table
-- Run this in Supabase SQL Editor

-- Add recording_id column with foreign key reference to recordings table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS recording_id UUID REFERENCES recordings(id) ON DELETE SET NULL;

-- Create index for better performance when filtering by recording_id
CREATE INDEX IF NOT EXISTS idx_events_recording_id ON events(recording_id);

-- Add comment to document the column
COMMENT ON COLUMN events.recording_id IS 'Reference to the recording associated with this event (if event is completed and has a recording)';

