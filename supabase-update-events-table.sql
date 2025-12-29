-- Add additional fields to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS location TEXT DEFAULT 'Google Meet',
ADD COLUMN IF NOT EXISTS instructor_name TEXT,
ADD COLUMN IF NOT EXISTS instructor_title TEXT,
ADD COLUMN IF NOT EXISTS instructor_avatar_url TEXT,
ADD COLUMN IF NOT EXISTS learning_points TEXT[], -- Array of learning points
ADD COLUMN IF NOT EXISTS about_text TEXT; -- Description/about the event

-- Update sample events with new fields
UPDATE events SET
  location = 'Google Meet',
  instructor_name = 'מיכל לוי',
  instructor_title = 'מומחה',
  about_text = 'סדנה מעמיקה לכל מי שכבר מכיר את הבסיס של Make.com ורוצה לקחת את היכולות שלו לשלב הבא. נבנה יחד תהליכים מורכבים עם מספר תרחישים.',
  learning_points = ARRAY[
    'עבודה עם Aggregators ו-Iterators',
    'ניהול שגיאות מתקדם',
    'אופטימיזציה של תהליכים',
    'שילוב עם Webhooks'
  ]
WHERE title = 'סדנת Make.com';

UPDATE events SET
  location = 'Google Meet',
  instructor_name = 'איתי זרם',
  instructor_title = 'מומחה',
  about_text = 'למד איך לעבוד עם Apify לאוטומציות מתקדמות.',
  learning_points = ARRAY[
    'הכרת Apify',
    'יצירת Scenarios',
    'אינטגרציות'
  ]
WHERE title = 'עבודה עם Apify';

UPDATE events SET
  location = 'Google Meet',
  about_text = 'שאלות ותשובות פתוחות עם הקהילה.'
WHERE title = 'Q&A Session';

UPDATE events SET
  location = 'Google Meet',
  instructor_name = 'דניאל שטרית',
  instructor_title = 'מומחה AI',
  about_text = 'איך לשלב בינה מלאכותית בתהליכי אוטומציה.',
  learning_points = ARRAY[
    'שילוב AI באוטומציות',
    'שימוש ב-GPT',
    'אוטומציות חכמות'
  ]
WHERE title = 'וובינר: AI באוטומציה';

UPDATE events SET
  location = 'Google Meet',
  instructor_name = 'אסי כהן',
  instructor_title = 'מומחה n8n',
  about_text = 'טיפים וטריקים לשימוש יעיל ב-n8n.',
  learning_points = ARRAY[
    'טיפים ל-n8n',
    'אופטימיזציה',
    'Best Practices'
  ]
WHERE title = 'לייב: טיפים ל-n8n';

