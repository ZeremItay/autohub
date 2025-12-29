-- Insert Q&A Live Event for Tuesday, December 30, 2025 at 11:00
INSERT INTO events (
  title,
  description,
  event_date,
  event_time,
  event_type,
  location,
  instructor_name,
  instructor_title,
  about_text,
  learning_points,
  is_recurring,
  created_at,
  updated_at
) VALUES (
  'לייב שאלות-תשובות',
  'פגישת שאלות ותשובות פתוחה עם הקהילה. הזדמנות לשאול שאלות, לקבל עזרה, ולשתף ידע.',
  '2025-12-30',
  '11:00:00',
  'qa',
  'אונליין',
  'איתי זרם',
  'מומחה אוטומציות ו-AI',
  'פגישת שאלות ותשובות פתוחה עם הקהילה. הזדמנות מצוינת לשאול שאלות על אוטומציות, לקבל עזרה בפרויקטים, ולשתף טיפים וטריקים עם חברי הקהילה.',
  ARRAY[
    'שאלות ותשובות פתוחות',
    'עזרה בפרויקטים',
    'שיתוף טיפים וטריקים',
    'דיונים על אוטומציות',
    'פתרון בעיות טכניות'
  ],
  false,
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING;

