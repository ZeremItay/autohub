-- Create system_settings table for storing system-wide configuration
-- This table will store settings like registration limits, feature flags, etc.

CREATE TABLE IF NOT EXISTS system_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on key for faster lookups
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_system_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_system_settings_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_system_settings_updated_at();

-- Insert default registration limit (50 users)
INSERT INTO system_settings (key, value, description)
VALUES ('max_registered_users', '50', 'Maximum number of users allowed to register on the platform')
ON CONFLICT (key) DO NOTHING;

-- RLS Policies
-- Allow anyone to read system settings (needed for signup page)
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view system settings
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Anyone can view system settings' 
    AND tablename = 'system_settings'
  ) THEN
    CREATE POLICY "Anyone can view system settings"
      ON system_settings FOR SELECT
      USING (true);
  END IF;
END $$;

-- Policy: Only admins can update system settings
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Only admins can update system settings' 
    AND tablename = 'system_settings'
  ) THEN
    CREATE POLICY "Only admins can update system settings"
      ON system_settings FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.user_id = auth.uid()
          AND profiles.role_id IN (
            SELECT id FROM roles WHERE name = 'admin'
          )
        )
      );
  END IF;
END $$;

-- Policy: Only admins can insert system settings
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Only admins can insert system settings' 
    AND tablename = 'system_settings'
  ) THEN
    CREATE POLICY "Only admins can insert system settings"
      ON system_settings FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.user_id = auth.uid()
          AND profiles.role_id IN (
            SELECT id FROM roles WHERE name = 'admin'
          )
        )
      );
  END IF;
END $$;

