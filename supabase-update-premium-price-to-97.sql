-- Update premium subscription price to 97 ILS
-- Run this script in Supabase SQL Editor to update the price

UPDATE roles 
SET price = 97 
WHERE name = 'premium';

-- Verify the update
SELECT id, name, display_name, price 
FROM roles 
WHERE name = 'premium';

