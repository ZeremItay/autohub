-- Create menu_items table for managing navigation menu items
-- Run this SQL in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS menu_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  path TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  icon TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for ordering
CREATE INDEX IF NOT EXISTS idx_menu_items_order ON menu_items("order");

-- Insert initial menu items based on current Layout.tsx
INSERT INTO menu_items (path, label, icon, "order", is_visible) VALUES
  ('/', 'בית', 'Home', 1, true),
  ('/members', 'חברים', 'Users', 2, true),
  ('/forums', 'פורומים', 'MessageSquare', 3, true),
  ('/recordings', 'הקלטות', 'Video', 4, true),
  ('/resources', 'משאבים', 'FileText', 5, true),
  ('/projects', 'פרויקטים', 'Briefcase', 6, true),
  ('/courses', 'קורסים', 'GraduationCap', 7, true),
  ('/live-log', 'יומן לייבים', 'Calendar', 8, true),
  ('/blog', 'בלוג', 'BookOpen', 9, true),
  ('/feedback', 'פידבקים', 'MessageCircleMore', 10, true)
ON CONFLICT (path) DO NOTHING;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_menu_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_menu_items_updated_at
  BEFORE UPDATE ON menu_items
  FOR EACH ROW
  EXECUTE FUNCTION update_menu_items_updated_at();

-- Enable RLS (Row Level Security)
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read menu items
CREATE POLICY "Menu items are viewable by everyone"
  ON menu_items
  FOR SELECT
  USING (true);

-- Policy: Only admins can insert/update/delete menu items
CREATE POLICY "Only admins can manage menu items"
  ON menu_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role_id IN (
        SELECT id FROM roles WHERE name = 'admin'
      )
    )
  );
