-- Add status column to events table
-- Run this in Supabase SQL Editor

-- Add status column with default value 'upcoming'
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'upcoming' 
CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled', 'deleted'));

-- Create index for better performance when filtering by status
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);

-- Update existing events to have 'upcoming' status if they don't have one
UPDATE events 
SET status = 'upcoming' 
WHERE status IS NULL;

-- Set status to 'completed' for past events (events that ended more than 2 hours ago)
UPDATE events 
SET status = 'completed' 
WHERE status IS NULL 
  OR status = 'upcoming'
  AND (
    event_date < CURRENT_DATE 
    OR (event_date = CURRENT_DATE AND event_time < CURRENT_TIME - INTERVAL '2 hours')
  );

