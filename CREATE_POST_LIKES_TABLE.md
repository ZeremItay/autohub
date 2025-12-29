# יצירת טבלת post_likes

הטבלה `post_likes` לא קיימת במסד הנתונים. כדי ליצור אותה:

1. פתח את Supabase Dashboard
2. לך ל-SQL Editor
3. העתק והדבק את הקוד הבא:

```sql
-- Create post_likes table for home page posts
-- Run this in Supabase SQL Editor

-- 1. Create post_likes table
CREATE TABLE IF NOT EXISTS post_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- 2. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON post_likes(user_id);

-- 3. Enable Row Level Security
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
-- Anyone can view likes
CREATE POLICY "Anyone can view post likes"
  ON post_likes FOR SELECT
  USING (true);

-- Authenticated users can like posts
CREATE POLICY "Authenticated users can like posts"
  ON post_likes FOR INSERT
  WITH CHECK (true);

-- Users can unlike their own likes
CREATE POLICY "Users can unlike their own likes"
  ON post_likes FOR DELETE
  USING (true);
```

4. לחץ על "Run" או "Execute"

לאחר יצירת הטבלה, הפיצ'ר של הלייקים יעבוד!

