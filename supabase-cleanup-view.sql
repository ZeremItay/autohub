-- Remove unnecessary profiles_with_roles view
-- Since role_id is NOT NULL, we can always use INNER JOIN directly

DROP VIEW IF EXISTS profiles_with_roles;

-- That's it! Now you can always query profiles with roles using:
-- SELECT p.*, r.name as role_name, r.display_name as role_display_name 
-- FROM profiles p 
-- INNER JOIN roles r ON p.role_id = r.id

