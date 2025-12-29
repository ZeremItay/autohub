-- Update recordings table to support multiple categories as TEXT[]
-- Run this in Supabase SQL Editor

-- First, check if we need to migrate existing data
DO $$
BEGIN
  -- Check if category column exists and is TEXT
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'recordings' 
    AND column_name = 'category'
    AND data_type = 'text'
  ) THEN
    -- Create a backup column
    ALTER TABLE recordings ADD COLUMN IF NOT EXISTS category_backup TEXT;
    UPDATE recordings SET category_backup = category WHERE category IS NOT NULL;
    
    -- Drop the old column
    ALTER TABLE recordings DROP COLUMN category;
    
    -- Add new column as TEXT[]
    ALTER TABLE recordings ADD COLUMN category TEXT[];
    
    -- Migrate existing data: convert single category strings to arrays
    UPDATE recordings 
    SET category = CASE 
      WHEN category_backup IS NOT NULL AND category_backup != '' THEN 
        ARRAY[category_backup]
      ELSE 
        NULL
    END
    WHERE category_backup IS NOT NULL;
    
    -- Drop backup column
    ALTER TABLE recordings DROP COLUMN category_backup;
  END IF;
END $$;

-- Create index for better performance with array operations
CREATE INDEX IF NOT EXISTS idx_recordings_category ON recordings USING GIN (category);

