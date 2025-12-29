-- Add features for forum posts: lock/unlock, mark as answer, delete
-- Run this in Supabase SQL Editor

-- 1. Add is_answer column to forum_post_replies if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'forum_post_replies' 
    AND column_name = 'is_answer'
  ) THEN
    ALTER TABLE forum_post_replies ADD COLUMN is_answer BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 2. Create index for better performance
CREATE INDEX IF NOT EXISTS idx_forum_post_replies_is_answer ON forum_post_replies(is_answer) WHERE is_answer = true;

-- 3. Update RLS policies for forum posts (allow post owner to lock/unlock)
-- Drop existing update policy if it exists
DROP POLICY IF EXISTS "Users can update their own forum posts" ON forum_posts;

-- Create new policy that allows post owner to update (including lock/unlock)
CREATE POLICY "Users can update their own forum posts"
  ON forum_posts FOR UPDATE
  USING (auth.uid() = user_id);

-- 4. Update RLS policies for forum post replies (allow marking as answer)
-- Drop existing update policy if it exists
DROP POLICY IF EXISTS "Users can update their own replies" ON forum_post_replies;

-- Create new policy that allows reply owner to update
CREATE POLICY "Users can update their own replies"
  ON forum_post_replies FOR UPDATE
  USING (auth.uid() = user_id);

-- 5. Add policy for post owner to mark replies as answer
-- This requires a function to check if user is post owner
CREATE OR REPLACE FUNCTION is_forum_post_owner(post_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM forum_posts 
    WHERE id = post_id_param 
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policy for post owner to mark replies as answer
CREATE POLICY "Post owner can mark replies as answer"
  ON forum_post_replies FOR UPDATE
  USING (
    is_forum_post_owner(
      (SELECT post_id FROM forum_post_replies WHERE id = forum_post_replies.id)
    )
  );

-- 6. Add policy for admins to delete forum posts
-- First, create function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM profiles p
    JOIN roles r ON p.role_id = r.id
    WHERE p.user_id = auth.uid()
    AND r.name = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policy for admins to delete forum posts
DROP POLICY IF EXISTS "Admins can delete forum posts" ON forum_posts;
CREATE POLICY "Admins can delete forum posts"
  ON forum_posts FOR DELETE
  USING (is_admin());

-- 7. Add policy for admins to delete forum post replies
DROP POLICY IF EXISTS "Admins can delete forum post replies" ON forum_post_replies;
CREATE POLICY "Admins can delete forum post replies"
  ON forum_post_replies FOR DELETE
  USING (is_admin());

