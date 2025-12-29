-- Create courses table
CREATE TABLE IF NOT EXISTS courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  thumbnail_url TEXT,
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('מתחילים', 'בינוני', 'מתקדמים')),
  duration_hours DECIMAL(4,1) NOT NULL,
  lessons_count INTEGER NOT NULL,
  is_recommended BOOLEAN DEFAULT false,
  is_new BOOLEAN DEFAULT false,
  instructor_name TEXT,
  instructor_title TEXT,
  instructor_avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create course_progress table to track user progress
CREATE TABLE IF NOT EXISTS course_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(course_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category);
CREATE INDEX IF NOT EXISTS idx_courses_difficulty ON courses(difficulty);
CREATE INDEX IF NOT EXISTS idx_courses_created_at ON courses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_course_progress_user_id ON course_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_course_progress_course_id ON course_progress(course_id);

-- Enable Row Level Security
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_progress ENABLE ROW LEVEL SECURITY;

-- Create policies for courses
CREATE POLICY "Allow public read access to courses"
  ON courses FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated users to insert courses"
  ON courses FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update courses"
  ON courses FOR UPDATE
  USING (true);

-- Create policies for course_progress
CREATE POLICY "Allow users to read own progress"
  ON course_progress FOR SELECT
  USING (true);

CREATE POLICY "Allow users to insert own progress"
  ON course_progress FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow users to update own progress"
  ON course_progress FOR UPDATE
  USING (true);

-- Insert sample courses
INSERT INTO courses (title, description, category, difficulty, duration_hours, lessons_count, is_recommended, is_new, instructor_name, instructor_title) VALUES
  ('יסודות האוטומציה עם Make.com', 'למד את הבסיס של יצירת אוטומציות חכמות עם Make.com מאפס ועד לאוטומציות מורכבות', 'Make.com', 'מתחילים', 4.0, 12, true, false, 'מיכל לוי', 'מומחה'),
  ('ChatGPT למתקדמים', 'טכניקות מתקדמות לכתיבת פרומפטים אפקטיביים והפקת המקסימום מ-ChatGPT', 'AI', 'בינוני', 3.0, 8, false, true, 'דניאל שטרית', 'מומחה AI'),
  ('השוואה מעשית - Zapier vs Make.com', 'הבן את ההבדלים בין הפלטפורמות ובחר את הכלי המתאים לך', 'Make.com', 'מתחילים', 2.0, 6, false, true, 'איתי זרם', 'מומחה'),
  ('בניית בוטים לטלגרם', 'צור בוטים אוטומטיים לטלגרם שיעבדו בשבילך 24/7', 'בוטים', 'מתקדמים', 4.5, 10, false, false, 'אסי כהן', 'מומחה בוטים'),
  ('אינטגרציות עם Airtable', 'בנה מערכות ניהול נתונים חכמות עם Airtable ואוטומציות', 'Airtable', 'בינוני', 5.0, 15, false, false, 'מיכל לוי', 'מומחה')
ON CONFLICT DO NOTHING;

