-- Update tag_assignments to support resources
-- Run this in Supabase SQL Editor

-- First, drop the existing constraint if it exists
ALTER TABLE tag_assignments 
  DROP CONSTRAINT IF EXISTS tag_assignments_content_type_check;

-- Add the new constraint with 'resource' included
ALTER TABLE tag_assignments
  ADD CONSTRAINT tag_assignments_content_type_check 
  CHECK (content_type IN ('project', 'recording', 'course', 'post', 'blog_post', 'event', 'resource'));

