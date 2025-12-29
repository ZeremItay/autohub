-- Add zoom_meeting_id column to events table for Zoom live room integration
-- This allows storing Zoom Meeting ID for live events

-- Step 1: Add zoom_meeting_id column
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS zoom_meeting_id TEXT;

-- Step 2: Add zoom_meeting_password column (optional, for password-protected meetings)
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS zoom_meeting_password TEXT;

-- Step 3: Add comment for documentation
COMMENT ON COLUMN events.zoom_meeting_id IS 'Zoom Meeting ID for live streaming (premium users only)';
COMMENT ON COLUMN events.zoom_meeting_password IS 'Zoom Meeting password if required';

-- Step 4: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_events_zoom_meeting_id ON events(zoom_meeting_id) WHERE zoom_meeting_id IS NOT NULL;

