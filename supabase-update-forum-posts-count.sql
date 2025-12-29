-- Update posts_count for all forums based on actual count from forum_posts table
UPDATE forums
SET posts_count = (
  SELECT COUNT(*)
  FROM forum_posts
  WHERE forum_posts.forum_id = forums.id
),
updated_at = NOW();

