-- Add course sections support
-- Create course_sections table
CREATE TABLE IF NOT EXISTS course_sections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  section_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(course_id, section_order)
);

-- Add section_id to course_lessons
ALTER TABLE course_lessons 
ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES course_sections(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_course_sections_course_id ON course_sections(course_id);
CREATE INDEX IF NOT EXISTS idx_course_sections_order ON course_sections(course_id, section_order);
CREATE INDEX IF NOT EXISTS idx_course_lessons_section_id ON course_lessons(section_id);

-- Enable Row Level Security
ALTER TABLE course_sections ENABLE ROW LEVEL SECURITY;

-- Create policies for course_sections (only if they don't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'course_sections' 
    AND policyname = 'Anyone can view sections'
  ) THEN
    CREATE POLICY "Anyone can view sections" ON course_sections FOR SELECT USING (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'course_sections' 
    AND policyname = 'Authenticated users can create sections'
  ) THEN
    CREATE POLICY "Authenticated users can create sections" ON course_sections FOR INSERT WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'course_sections' 
    AND policyname = 'Authenticated users can update sections'
  ) THEN
    CREATE POLICY "Authenticated users can update sections" ON course_sections FOR UPDATE USING (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'course_sections' 
    AND policyname = 'Authenticated users can delete sections'
  ) THEN
    CREATE POLICY "Authenticated users can delete sections" ON course_sections FOR DELETE USING (true);
  END IF;
END $$;

