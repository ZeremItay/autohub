-- Add guest fields to projects table for guest users
-- Run this in Supabase SQL Editor

-- Add guest_name and guest_email fields (nullable)
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS guest_name TEXT,
ADD COLUMN IF NOT EXISTS guest_email TEXT;

-- Make user_id nullable to allow guest projects
ALTER TABLE projects 
ALTER COLUMN user_id DROP NOT NULL;

-- Add check constraint: either user_id OR (guest_name AND guest_email) must be provided
ALTER TABLE projects
DROP CONSTRAINT IF EXISTS projects_user_or_guest_check;

ALTER TABLE projects
ADD CONSTRAINT projects_user_or_guest_check 
CHECK (
  (user_id IS NOT NULL) OR 
  (guest_name IS NOT NULL AND guest_email IS NOT NULL)
);

-- Add index for guest_email for faster lookups
CREATE INDEX IF NOT EXISTS idx_projects_guest_email ON projects(guest_email) WHERE guest_email IS NOT NULL;

