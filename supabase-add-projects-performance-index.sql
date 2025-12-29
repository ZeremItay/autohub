-- Add performance index for projects table
-- This will improve the speed of loading projects ordered by created_at

CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);

-- This index helps with:
-- 1. Fast ordering by created_at (most recent first)
-- 2. Better query performance when filtering by date ranges
-- 3. Faster pagination when loading projects

