-- Create events table for live calendar
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TIME NOT NULL,
  event_type TEXT DEFAULT 'live' CHECK (event_type IN ('live', 'webinar', 'workshop', 'qa', 'other')),
  is_recurring BOOLEAN DEFAULT false,
  recurring_pattern TEXT, -- e.g., 'weekly', 'monthly'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_events_event_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);

-- Enable Row Level Security
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Create policies for events
CREATE POLICY "Allow public read access to events"
  ON events FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated users to insert events"
  ON events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update events"
  ON events FOR UPDATE
  USING (true);

CREATE POLICY "Allow authenticated users to delete events"
  ON events FOR DELETE
  USING (true);

-- Insert sample events
INSERT INTO events (title, description, event_date, event_time, event_type) VALUES
  ('סדנת Make.com', 'סדנה מעשית על Make.com', '2025-12-25', '19:00:00', 'workshop'),
  ('עבודה עם Apify', 'איך לעבוד עם Apify לאוטומציות', '2025-12-23', '20:00:00', 'workshop'),
  ('Q&A Session', 'שאלות ותשובות פתוחות עם הקהילה.', '2025-12-30', '18:00:00', 'qa'),
  ('וובינר: AI באוטומציה', 'איך לשלב בינה מלאכותית בתהליכי אוטומציה.', '2026-01-05', '20:00:00', 'webinar'),
  ('לייב: טיפים ל-n8n', 'טיפים וטריקים לשימוש יעיל ב-n8n.', '2026-01-12', '21:00:00', 'live')
ON CONFLICT DO NOTHING;

