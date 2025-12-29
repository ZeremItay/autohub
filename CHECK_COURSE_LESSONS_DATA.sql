-- בדוק אם יש שיעורים במסד הנתונים
-- הרץ את זה ב-Supabase SQL Editor

-- 1. בדוק כמה שיעורים יש בסך הכל
SELECT COUNT(*) as total_lessons FROM course_lessons;

-- 2. בדוק את כל השיעורים עם פרטי הקורס
SELECT 
  cl.id,
  cl.course_id,
  c.title as course_title,
  cl.title as lesson_title,
  cl.lesson_order,
  cl.created_at
FROM course_lessons cl
LEFT JOIN courses c ON c.id = cl.course_id
ORDER BY c.title, cl.lesson_order;

-- 3. בדוק שיעורים לקורס ספציפי (החלף את ה-ID ב-ID של הקורס שלך)
-- SELECT * FROM course_lessons WHERE course_id = 'YOUR_COURSE_ID_HERE';

-- 4. בדוק את כל הקורסים עם מספר השיעורים שלהם
SELECT 
  c.id,
  c.title,
  c.lessons_count as lessons_count_in_course_table,
  COUNT(cl.id) as actual_lessons_count
FROM courses c
LEFT JOIN course_lessons cl ON cl.course_id = c.id
GROUP BY c.id, c.title, c.lessons_count
ORDER BY c.title;

