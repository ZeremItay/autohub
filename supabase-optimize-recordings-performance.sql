-- Optimize recordings table performance
-- Run this in Supabase SQL Editor

-- 1. Ensure index on created_at exists (for sorting by recently-active)
CREATE INDEX IF NOT EXISTS idx_recordings_created_at_desc ON recordings(created_at DESC);

-- 2. Create index on views (for sorting by views)
CREATE INDEX IF NOT EXISTS idx_recordings_views_desc ON recordings(views DESC NULLS LAST);

-- 3. Create composite index for common queries (created_at + views)
CREATE INDEX IF NOT EXISTS idx_recordings_created_views ON recordings(created_at DESC, views DESC NULLS LAST);

-- 4. Analyze the table to update statistics
ANALYZE recordings;

-- 5. Check if indexes exist (for verification)
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'recordings'
ORDER BY indexname;

