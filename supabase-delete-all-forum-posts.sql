-- Delete all forum posts from all forums
-- This will also automatically delete:
-- - All forum_post_replies (due to CASCADE)
-- - All forum_post_likes (due to CASCADE)
-- 
-- After deletion, update posts_count for all forums to 0

-- Step 1: Delete all forum posts
DELETE FROM forum_posts;

-- Step 2: Update posts_count for all forums to 0
UPDATE forums
SET posts_count = 0,
    updated_at = NOW();

-- Verify deletion (optional - uncomment to check)
-- SELECT COUNT(*) as remaining_posts FROM forum_posts;
-- SELECT id, name, display_name, posts_count FROM forums;

