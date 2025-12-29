-- Run this SQL query in your Supabase SQL Editor to get all tables
-- Copy and paste this into: Supabase Dashboard > SQL Editor

SELECT 
  tablename,
  schemaname
FROM pg_catalog.pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Alternative query to get more details:
SELECT 
  t.table_name,
  COUNT(c.column_name) as column_count
FROM information_schema.tables t
LEFT JOIN information_schema.columns c 
  ON t.table_name = c.table_name 
  AND t.table_schema = c.table_schema
WHERE t.table_schema = 'public' 
  AND t.table_type = 'BASE TABLE'
GROUP BY t.table_name
ORDER BY t.table_name;

