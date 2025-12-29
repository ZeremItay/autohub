-- Insert new course: מיני קורס אוטומציות בשילוב AI
-- First, insert the course
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
) VALUES (
  'מיני קורס אוטומציות בשילוב AI',
  'קורס מקיף ללימוד אוטומציות מתקדמות בשילוב בינה מלאכותית. תלמדו כיצד לשלב AI באוטומציות שלכם, ליצור בוטים חכמים, ולנהל תהליכים מורכבים בצורה אוטומטית.',
  'AI',
  'בינוני',
  2.5,
  3,
  true,
  true,
  'איתי זרם',
  'מומחה אוטומציות ו-AI'
)
RETURNING id;

-- Note: Replace the course_id below with the actual ID returned from the above query
-- For now, we'll use a subquery to get the course ID

-- Insert 3 lessons for the course
INSERT INTO course_lessons (
  course_id,
  title,
  description,
  video_url,
  content,
  duration_minutes,
  lesson_order,
  is_preview
) VALUES 
-- Lesson 1
(
  (SELECT id FROM courses WHERE title = 'מיני קורס אוטומציות בשילוב AI' LIMIT 1),
  'מבוא לאוטומציות עם AI',
  'בשיעור הראשון נכיר את המושגים הבסיסיים של אוטומציות עם AI, נבין איך AI יכול לשפר את האוטומציות שלנו, ונראה דוגמאות מעשיות.',
  NULL, -- Add video URL if available
  '<h2>מה נלמד בשיעור זה?</h2><ul><li>הכרת מושגי יסוד ב-AI ואוטומציות</li><li>יתרונות שילוב AI באוטומציות</li><li>דוגמאות מעשיות מהעולם האמיתי</li><li>כלים ופלטפורמות מומלצות</li></ul>',
  45,
  1,
  true
),
-- Lesson 2
(
  (SELECT id FROM courses WHERE title = 'מיני קורס אוטומציות בשילוב AI' LIMIT 1),
  'יצירת בוטים חכמים עם AI',
  'בשיעור השני נלמד ליצור בוטים חכמים שמסוגלים להבין הקשר, לענות על שאלות מורכבות, ולבצע משימות מתוחכמות.',
  NULL, -- Add video URL if available
  '<h2>מה נלמד בשיעור זה?</h2><ul><li>עיצוב בוטים חכמים עם AI</li><li>שילוב ChatGPT ו-AI APIs</li><li>טיפול בשגיאות ותרחישים מורכבים</li><li>אופטימיזציה של הבוטים</li></ul>',
  50,
  2,
  false
),
-- Lesson 3
(
  (SELECT id FROM courses WHERE title = 'מיני קורס אוטומציות בשילוב AI' LIMIT 1),
  'אוטומציות מתקדמות וטיפים מקצועיים',
  'בשיעור האחרון נעמיק באוטומציות מתקדמות, נלמד טיפים מקצועיים, ונראה איך לבנות תהליכים מורכבים ויעילים.',
  NULL, -- Add video URL if available
  '<h2>מה נלמד בשיעור זה?</h2><ul><li>אוטומציות מתקדמות ומורכבות</li><li>טיפים מקצועיים לשיפור ביצועים</li><li>ניהול שגיאות ותרחישי קצה</li><li>מיטוב וניטור אוטומציות</li></ul>',
  55,
  3,
  false
);

