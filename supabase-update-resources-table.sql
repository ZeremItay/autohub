-- Update resources table to add new fields
-- Run this in Supabase SQL Editor

-- Add new columns to resources table
ALTER TABLE resources 
  ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('document', 'video', 'image', 'link', 'audio')),
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS external_url TEXT;

-- Create index for type
CREATE INDEX IF NOT EXISTS idx_resources_type ON resources(type);

-- Update existing resources to have a default type based on file_type
UPDATE resources 
SET type = CASE
  WHEN file_type LIKE 'image/%' THEN 'image'
  WHEN file_type LIKE 'video/%' THEN 'video'
  WHEN file_type LIKE 'audio/%' THEN 'audio'
  WHEN file_url LIKE 'http://%' OR file_url LIKE 'https://%' THEN 'link'
  ELSE 'document'
END
WHERE type IS NULL;

-- Set default type for any remaining NULL values
UPDATE resources SET type = 'document' WHERE type IS NULL;

