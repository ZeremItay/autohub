-- Insert new course: מיני קורס אוטומציות עם AI
-- First, add instructor columns if they don't exist
DO $$ 
BEGIN
  -- Add instructor_name column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'courses' AND column_name = 'instructor_name'
  ) THEN
    ALTER TABLE courses ADD COLUMN instructor_name TEXT;
  END IF;

  -- Add instructor_title column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'courses' AND column_name = 'instructor_title'
  ) THEN
    ALTER TABLE courses ADD COLUMN instructor_title TEXT;
  END IF;

  -- Add instructor_avatar_url column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'courses' AND column_name = 'instructor_avatar_url'
  ) THEN
    ALTER TABLE courses ADD COLUMN instructor_avatar_url TEXT;
  END IF;
END $$;

-- Insert the course (check if it already exists)
INSERT INTO courses (
  title,
  description,
  category,
  difficulty,
  duration_hours,
  lessons_count,
  is_recommended,
  is_new,
  instructor_name,
  instructor_title
) 
SELECT 
  'מיני קורס אוטומציות עם AI',
  'קורס מקיף ללימוד אוטומציות מתקדמות עם בינה מלאכותית. תלמדו כיצד לשלב AI באוטומציות שלכם, ליצור בוטים חכמים, ולנהל תהליכים מורכבים בצורה אוטומטית.',
  'AI',
  'בינוני',
  2.5,
  3,
  true,
  true,
  'איתי זרם',
  'מומחה אוטומציות ו-AI'
WHERE NOT EXISTS (
  SELECT 1 FROM courses WHERE title = 'מיני קורס אוטומציות עם AI'
);

-- Insert 3 lessons for the course (only if they don't exist)
DO $$
DECLARE
  course_uuid UUID;
BEGIN
  -- Get the course ID
  SELECT id INTO course_uuid FROM courses WHERE title = 'מיני קורס אוטומציות עם AI' LIMIT 1;
  
  IF course_uuid IS NOT NULL THEN
    -- Lesson 1
    INSERT INTO course_lessons (
      course_id,
      title,
      description,
      video_url,
      content,
      duration_minutes,
      lesson_order,
      is_preview
    )
    SELECT 
      course_uuid,
      'מבוא לאוטומציות עם AI',
      'בשיעור הראשון נכיר את המושגים הבסיסיים של אוטומציות עם AI, נבין איך AI יכול לשפר את האוטומציות שלנו, ונראה דוגמאות מעשיות.',
      NULL,
      '<div class="space-y-4"><h2 class="text-2xl font-bold text-gray-800 mb-4">מה נלמד בשיעור זה?</h2><ul class="list-disc list-inside space-y-2 text-gray-700"><li>הכרת מושגי יסוד ב-AI ואוטומציות</li><li>יתרונות שילוב AI באוטומציות</li><li>דוגמאות מעשיות מהעולם האמיתי</li><li>כלים ופלטפורמות מומלצות</li><li>תחילת עבודה עם AI APIs</li></ul><h3 class="text-xl font-semibold text-gray-800 mt-6 mb-3">נושאים מרכזיים:</h3><p class="text-gray-700 leading-relaxed">בשיעור זה נבנה בסיס איתן להבנת האינטגרציה בין אוטומציות לבינה מלאכותית. נלמד על הפוטנציאל העצום של שילוב זה ונבין איך להתחיל ליישם אותו בפרויקטים שלנו.</p></div>',
      45,
      1,
      true
    WHERE NOT EXISTS (
      SELECT 1 FROM course_lessons 
      WHERE course_id = course_uuid AND title = 'מבוא לאוטומציות עם AI'
    );

    -- Lesson 2
    INSERT INTO course_lessons (
      course_id,
      title,
      description,
      video_url,
      content,
      duration_minutes,
      lesson_order,
      is_preview
    )
    SELECT 
      course_uuid,
      'יצירת בוטים חכמים עם AI',
      'בשיעור השני נלמד ליצור בוטים חכמים שמסוגלים להבין הקשר, לענות על שאלות מורכבות, ולבצע משימות מתוחכמות.',
      NULL,
      '<div class="space-y-4"><h2 class="text-2xl font-bold text-gray-800 mb-4">מה נלמד בשיעור זה?</h2><ul class="list-disc list-inside space-y-2 text-gray-700"><li>עיצוב בוטים חכמים עם AI</li><li>שילוב ChatGPT ו-AI APIs</li><li>טיפול בשגיאות ותרחישים מורכבים</li><li>אופטימיזציה של הבוטים</li><li>ניהול שיחות מורכבות</li></ul><h3 class="text-xl font-semibold text-gray-800 mt-6 mb-3">תרגול מעשי:</h3><p class="text-gray-700 leading-relaxed">בשיעור זה נבנה בוט אמיתי שיכול לענות על שאלות, לבצע משימות, ולנהל שיחות מורכבות. נלמד על best practices ונראה דוגמאות קוד מעשיות.</p></div>',
      50,
      2,
      false
    WHERE NOT EXISTS (
      SELECT 1 FROM course_lessons 
      WHERE course_id = course_uuid AND title = 'יצירת בוטים חכמים עם AI'
    );

    -- Lesson 3
    INSERT INTO course_lessons (
      course_id,
      title,
      description,
      video_url,
      content,
      duration_minutes,
      lesson_order,
      is_preview
    )
    SELECT 
      course_uuid,
      'אוטומציות מתקדמות וטיפים מקצועיים',
      'בשיעור האחרון נעמיק באוטומציות מתקדמות, נלמד טיפים מקצועיים, ונראה איך לבנות תהליכים מורכבים ויעילים.',
      NULL,
      '<div class="space-y-4"><h2 class="text-2xl font-bold text-gray-800 mb-4">מה נלמד בשיעור זה?</h2><ul class="list-disc list-inside space-y-2 text-gray-700"><li>אוטומציות מתקדמות ומורכבות</li><li>טיפים מקצועיים לשיפור ביצועים</li><li>ניהול שגיאות ותרחישי קצה</li><li>מיטוב וניטור אוטומציות</li><li>סקיילביליות ותחזוקה</li></ul><h3 class="text-xl font-semibold text-gray-800 mt-6 mb-3">טיפים מקצועיים:</h3><p class="text-gray-700 leading-relaxed">בשיעור זה נעמיק בכלים ובטכניקות מתקדמות לבניית אוטומציות חזקות ויעילות. נלמד על אסטרטגיות מיטוב, ניטור, ותחזוקה ארוכת טווח.</p></div>',
      55,
      3,
      false
    WHERE NOT EXISTS (
      SELECT 1 FROM course_lessons 
      WHERE course_id = course_uuid AND title = 'אוטומציות מתקדמות וטיפים מקצועיים'
    );
  END IF;
END $$;

