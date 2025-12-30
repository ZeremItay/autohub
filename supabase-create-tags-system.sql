-- Create unified tags system
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. TAGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT,
  icon TEXT,
  usage_count INTEGER DEFAULT 0,
  is_approved BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. TAG_ASSIGNMENTS TABLE (Many-to-Many)
-- ============================================
CREATE TABLE IF NOT EXISTS tag_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('project', 'recording', 'course', 'post', 'blog_post', 'event')),
  content_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tag_id, content_type, content_id)
);

-- ============================================
-- 3. INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_tags_usage_count ON tags(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_tags_is_approved ON tags(is_approved);

CREATE INDEX IF NOT EXISTS idx_tag_assignments_tag_id ON tag_assignments(tag_id);
CREATE INDEX IF NOT EXISTS idx_tag_assignments_content ON tag_assignments(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_tag_assignments_content_type ON tag_assignments(content_type);

-- ============================================
-- 4. ENABLE RLS
-- ============================================
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE tag_assignments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. RLS POLICIES FOR TAGS
-- ============================================
-- Anyone can view approved tags
CREATE POLICY "Anyone can view approved tags" ON tags
  FOR SELECT USING (is_approved = true);

-- Admins can view all tags (including unapproved)
CREATE POLICY "Admins can view all tags" ON tags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role_id IN (
        SELECT id FROM roles WHERE name = 'admin'
      )
    )
  );

-- Authenticated users can suggest tags (create with is_approved=false)
CREATE POLICY "Authenticated users can suggest tags" ON tags
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND is_approved = false
  );

-- Only admins can create approved tags
CREATE POLICY "Admins can create approved tags" ON tags
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role_id IN (
        SELECT id FROM roles WHERE name = 'admin'
      )
    )
  );

-- Only admins can update tags
CREATE POLICY "Admins can update tags" ON tags
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role_id IN (
        SELECT id FROM roles WHERE name = 'admin'
      )
    )
  );

-- Only admins can delete tags
CREATE POLICY "Admins can delete tags" ON tags
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role_id IN (
        SELECT id FROM roles WHERE name = 'admin'
      )
    )
  );

-- ============================================
-- 6. RLS POLICIES FOR TAG_ASSIGNMENTS
-- ============================================
-- Anyone can view tag assignments
CREATE POLICY "Anyone can view tag assignments" ON tag_assignments
  FOR SELECT USING (true);

-- Authenticated users can create tag assignments (for their own content)
CREATE POLICY "Authenticated users can create tag assignments" ON tag_assignments
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Content owners and admins can update/delete tag assignments
CREATE POLICY "Content owners can manage tag assignments" ON tag_assignments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role_id IN (
        SELECT id FROM roles WHERE name = 'admin'
      )
    )
    OR (
      content_type = 'project' AND EXISTS (
        SELECT 1 FROM projects WHERE projects.id = tag_assignments.content_id AND projects.user_id = auth.uid()
      )
    )
    OR (
      content_type = 'post' AND EXISTS (
        SELECT 1 FROM posts WHERE posts.id = tag_assignments.content_id AND posts.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Content owners can delete tag assignments" ON tag_assignments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role_id IN (
        SELECT id FROM roles WHERE name = 'admin'
      )
    )
    OR (
      content_type = 'project' AND EXISTS (
        SELECT 1 FROM projects WHERE projects.id = tag_assignments.content_id AND projects.user_id = auth.uid()
      )
    )
    OR (
      content_type = 'post' AND EXISTS (
        SELECT 1 FROM posts WHERE posts.id = tag_assignments.content_id AND posts.user_id = auth.uid()
      )
    )
  );

-- ============================================
-- 7. FUNCTION TO UPDATE USAGE_COUNT
-- ============================================
CREATE OR REPLACE FUNCTION update_tag_usage_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE tags SET usage_count = usage_count + 1 WHERE id = NEW.tag_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tags SET usage_count = GREATEST(0, usage_count - 1) WHERE id = OLD.tag_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. TRIGGERS TO AUTO-UPDATE USAGE_COUNT
-- ============================================
CREATE TRIGGER tag_assignments_insert_trigger
  AFTER INSERT ON tag_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_tag_usage_count();

CREATE TRIGGER tag_assignments_delete_trigger
  AFTER DELETE ON tag_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_tag_usage_count();

-- ============================================
-- 9. FUNCTION TO GENERATE SLUG FROM NAME
-- ============================================
CREATE OR REPLACE FUNCTION generate_slug(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Convert to lowercase, replace spaces with hyphens, remove special chars
  RETURN lower(
    regexp_replace(
      regexp_replace(
        regexp_replace(input_text, '[^a-zA-Z0-9\s-]', '', 'g'),
        '\s+', '-', 'g'
      ),
      '-+', '-', 'g'
    )
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 10. INSERT SOME INITIAL TAGS (OPTIONAL)
-- ============================================
-- Insert common tags if they don't exist
INSERT INTO tags (name, slug, description, is_approved) VALUES
  ('Make.com', 'make-com', 'כלי אוטומציה חזק לבניית תרחישים', true),
  ('API', 'api', 'Application Programming Interface', true),
  ('Automation', 'automation', 'אוטומציה של תהליכים', true),
  ('Zapier', 'zapier', 'כלי אוטומציה מבוסס ענן', true),
  ('Airtable', 'airtable', 'מסד נתונים מבוסס ענן', true),
  ('Shopify', 'shopify', 'פלטפורמת מסחר אלקטרוני', true),
  ('Node.js', 'node-js', 'פלטפורמת JavaScript', true),
  ('Telegram', 'telegram', 'בוטים ומסרים', true)
ON CONFLICT (slug) DO NOTHING;

