-- Remove category field from recordings table
-- This script removes the category column and migrates to tags-only system

-- Step 1: Clear all category values (set to NULL)
UPDATE recordings
SET category = NULL
WHERE category IS NOT NULL;

-- Step 2: Optionally drop the category column (uncomment if you want to remove it completely)
-- ALTER TABLE recordings DROP COLUMN IF EXISTS category;

-- Note: We're keeping the column for now in case of rollback, but setting all values to NULL
-- You can drop it later if everything works correctly

