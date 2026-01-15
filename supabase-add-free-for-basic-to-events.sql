-- Add is_free_for_basic column to events table
-- This allows marking live events as accessible to basic (free) users
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS is_free_for_basic BOOLEAN DEFAULT false;

-- Add comment to explain the column
COMMENT ON COLUMN events.is_free_for_basic IS 'If true, this event is accessible to basic (free) users, not just premium users';
