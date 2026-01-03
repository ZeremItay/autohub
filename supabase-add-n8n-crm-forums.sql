-- Add N8N and CRM forums to the database
-- This script adds two new forums: N8N and CRM

-- Insert N8N Forum
INSERT INTO forums (name, display_name, description, header_color, logo_text, is_active, created_at, updated_at)
VALUES (
  'n8n',
  'N8N',
  'פורום לדיונים על N8N, אוטומציות, וורקלואו ועוד',
  'bg-gradient-to-r from-green-600 to-blue-600',
  'N8N',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (name) DO NOTHING;

-- Insert CRM Forum
INSERT INTO forums (name, display_name, description, header_color, logo_text, is_active, created_at, updated_at)
VALUES (
  'crm',
  'עבודה עם CRM',
  'פורום לדיונים על CRM, ניהול לקוחות, מכירות ועוד',
  'bg-gradient-to-r from-blue-600 to-red-600',
  'CRM',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (name) DO NOTHING;

