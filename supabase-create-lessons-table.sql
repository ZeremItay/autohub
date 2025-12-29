-- Create course_lessons table
CREATE TABLE IF NOT EXISTS course_lessons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  content TEXT,
  duration_minutes INTEGER,
  lesson_order INTEGER NOT NULL,
  is_preview BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_course_lessons_course_id ON course_lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_course_lessons_order ON course_lessons(course_id, lesson_order);

-- Enable Row Level Security
ALTER TABLE course_lessons ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view lessons" ON course_lessons FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create lessons" ON course_lessons FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update lessons" ON course_lessons FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete lessons" ON course_lessons FOR DELETE USING (true);

