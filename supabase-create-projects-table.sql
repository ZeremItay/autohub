-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'closed')),
  budget_min DECIMAL(10, 2),
  budget_max DECIMAL(10, 2),
  budget_currency TEXT DEFAULT 'USD',
  technologies TEXT[], -- Array of technology tags
  offers_count INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create project_offers table
CREATE TABLE IF NOT EXISTS project_offers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  offer_amount DECIMAL(10, 2),
  offer_currency TEXT DEFAULT 'USD',
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_offers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects
CREATE POLICY "Anyone can view projects" ON projects
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create projects" ON projects
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own projects" ON projects
  FOR UPDATE USING (true);

-- RLS Policies for project_offers
CREATE POLICY "Anyone can view project offers" ON project_offers
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create offers" ON project_offers
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own offers" ON project_offers
  FOR UPDATE USING (true);

-- Insert sample projects
INSERT INTO projects (user_id, title, description, status, budget_min, budget_max, budget_currency, technologies, offers_count) VALUES
  (
    (SELECT user_id FROM profiles LIMIT 1),
    'צריך תרחיש Make.com מורכב ל-CRM',
    'מחפש מומחה אוטומציה שיבנה תרחיש מורכב שיחבר בין Google Sheets, Salesforce, Slack. התרחיש צריך לסנכרן לידים חדשים, לשלוח התראות ולעדכן גיליון אקסל בזמן אמת.',
    'open',
    500,
    1000,
    'USD',
    ARRAY['Google Sheets', 'API', 'Salesforce', 'Make'],
    3
  ),
  (
    (SELECT user_id FROM profiles LIMIT 1),
    'אינטגרציה בין Airtable לחנות Shopify',
    'דרוש חיבור אוטומטי בין מערכת ניהול המלאי שלנו ב-Airtable לחנות ה-Shopify. כולל סנכרון מלאי, הזמנות ומחירים.',
    'open',
    2000,
    3500,
    'ILS',
    ARRAY['Zapier', 'E-commerce', 'Shopify', 'Airtable'],
    7
  ),
  (
    (SELECT user_id FROM profiles LIMIT 1),
    'בוט טלגרם לניהול הזמנות',
    'פיתוח בוט טלגרם שיאפשר ללקוחות לבצע הזמנות, לקבל עדכונים על סטטוס ולתקשר עם התמיכה. כולל ממשק ניהול פשוט.',
    'open',
    800,
    1500,
    'USD',
    ARRAY['Automation', 'API', 'Node.js', 'Telegram'],
    12
  ),
  (
    (SELECT user_id FROM profiles LIMIT 1),
    'אוטומציה לניהול קמפיינים בפייסבוק',
    'דרושה מערכת אוטומציה שתנהל קמפיינים בפייסבוק, תעקוב אחר ביצועים ותעדכן תקציבים אוטומטית.',
    'in_progress',
    1500,
    2500,
    'USD',
    ARRAY['Facebook API', 'Automation', 'Marketing'],
    5
  );

