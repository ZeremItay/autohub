-- Add basic subscription role
-- This adds a new 'basic' subscription tier with monthly price of 42 ILS

-- Step 1: Insert the basic role
INSERT INTO roles (name, display_name, description, price) VALUES
  ('basic', 'מנוי בסיסי', 'מנוי בסיסי - גישה ללייבים, ללא הקלטות', 42)
ON CONFLICT (name) DO UPDATE
SET 
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  price = EXCLUDED.price;

-- Step 2: Verify the role was created
-- You can run this query to verify:
-- SELECT id, name, display_name, description, price FROM roles WHERE name = 'basic';
