-- Add price column to roles table
-- This allows each subscription role to have a monthly price

-- Step 1: Add price column (in ILS - Israeli Shekels)
ALTER TABLE roles 
ADD COLUMN IF NOT EXISTS price DECIMAL(10, 2) DEFAULT 0;

-- Step 2: Update existing roles with default prices
UPDATE roles 
SET price = 0 
WHERE name = 'free' AND (price IS NULL OR price = 0);

UPDATE roles 
SET price = 97 
WHERE name = 'premium';

UPDATE roles 
SET price = 0 
WHERE name = 'admin' AND (price IS NULL OR price = 0);

-- Step 3: Make price NOT NULL (with default 0)
ALTER TABLE roles 
ALTER COLUMN price SET DEFAULT 0;

-- Step 4: Set any NULL values to 0
UPDATE roles 
SET price = 0 
WHERE price IS NULL;

-- Step 5: Add comment for documentation
COMMENT ON COLUMN roles.price IS 'Monthly subscription price in ILS (Israeli Shekels)';

