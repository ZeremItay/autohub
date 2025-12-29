-- Add 'points' notification type to notifications table
-- Run this in Supabase SQL Editor

-- First, drop the existing CHECK constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add the new CHECK constraint with 'points' type
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
  CHECK (type IN ('comment', 'reply', 'mention', 'like', 'follow', 'project_offer', 'forum_reply', 'forum_mention', 'points'));

