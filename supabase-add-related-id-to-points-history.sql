-- Add related_id column to points_history table
-- This allows tracking which specific item (post, comment, etc.) the points were awarded for
-- Run this in Supabase SQL Editor

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'points_history' 
        AND column_name = 'related_id'
    ) THEN
        ALTER TABLE points_history ADD COLUMN related_id UUID;
        RAISE NOTICE 'Added related_id column to points_history';
    ELSE
        RAISE NOTICE 'related_id column already exists in points_history';
    END IF;
END
$$;

-- Optional: Add index for better performance when querying by related_id
CREATE INDEX IF NOT EXISTS idx_points_history_related_id ON points_history(related_id);

-- Optional: Add index for better performance when querying by user_id and related_id together
CREATE INDEX IF NOT EXISTS idx_points_history_user_related ON points_history(user_id, related_id);
