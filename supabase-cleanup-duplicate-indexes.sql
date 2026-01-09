-- Cleanup duplicate indexes on recordings table
-- Run this in Supabase SQL Editor

-- Drop the old index if it exists (keep the new one with better name)
DROP INDEX IF EXISTS idx_recordings_created_at;

-- Verify remaining indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'recordings'
ORDER BY indexname;

