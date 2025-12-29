-- Create recordings table
CREATE TABLE IF NOT EXISTS recordings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  category TEXT,
  duration TEXT,
  views INTEGER DEFAULT 0,
  is_new BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_recordings_category ON recordings(category);
CREATE INDEX IF NOT EXISTS idx_recordings_created_at ON recordings(created_at DESC);

-- Enable Row Level Security
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all users to read recordings
CREATE POLICY "Allow public read access to recordings"
  ON recordings FOR SELECT
  USING (true);

-- Create policy to allow authenticated users to insert recordings (for admins)
CREATE POLICY "Allow authenticated users to insert recordings"
  ON recordings FOR INSERT
  WITH CHECK (true);

-- Create policy to allow authenticated users to update recordings (for admins)
CREATE POLICY "Allow authenticated users to update recordings"
  ON recordings FOR UPDATE
  USING (true);

-- Create policy to allow authenticated users to delete recordings (for admins)
CREATE POLICY "Allow authenticated users to delete recordings"
  ON recordings FOR DELETE
  USING (true);

-- Insert the example recording
INSERT INTO recordings (
  title,
  description,
  video_url,
  category,
  duration,
  views,
  is_new
) VALUES (
  'עבודה עם Apify – כלי הסקרייפינג החזק ביותר',
  'במפגש הזה הכרנו ולמדנו לעומק על אחד הכלים הכי חזקים בארגז הכלים שלנו: Apify.
זה כלי שמאפשר לנו להוציא מידע כמעט מכל אתר ברשת – החל מלידים בגוגל מפות, דרך מעקב אחרי מודעות מתחרים בפייסבוק, ועד שליפת נתונים מאתרי איקומרס ועוד ועוד.

מה מחכה לכם בהקלטה?
🔥 איך שולפים מאות לידים ממוקדים (עם מיילים וטלפונים) בשניות.
🤖 איך בניתי סוכן שלוקח סרטון יוטיוב, מוציא את התמלול והופך אותו למאמר בבלוג (בשילוב Gemini).
🛠 השיטה הנכונה לעבוד עם Apify בתוך Make בלי שהתהליך "ייתקע".
💎 אסי הראה לנו איך הוא מעשיר לידים ב-CRM בעזרת חיפוש אוטומטי בלינקדאין.
צפייה מהנה! 👇',
  'http://dbrexfovwe6hg.cloudfront.net/%D7%94%D7%A7%D7%9C%D7%98%D7%95%D7%AA+%D7%A1%D7%93%D7%A0%D7%90%D7%95%D7%AA/%D7%A2%D7%91%D7%95%D7%93%D7%94+%D7%A2%D7%9D+APIFY.mp4',
  'Make.com',
  '1:45:00',
  234,
  true
);

