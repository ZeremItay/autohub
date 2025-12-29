-- Add media support to forum_posts table
ALTER TABLE forum_posts 
ADD COLUMN IF NOT EXISTS media_url TEXT,
ADD COLUMN IF NOT EXISTS media_type TEXT CHECK (media_type IN ('image', 'video', NULL));

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_forum_posts_media_type ON forum_posts(media_type);

