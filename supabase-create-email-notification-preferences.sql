-- Create email_notification_preferences table
-- This table stores user preferences for email notifications

CREATE TABLE IF NOT EXISTS email_notification_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(user_id) ON DELETE CASCADE,
  forum_reply BOOLEAN DEFAULT true,  -- התראה על תגובה על פוסט שפרסמתי
  new_project BOOLEAN DEFAULT true, -- התראה על פרויקט חדש שעלה
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_email_notification_preferences_user_id ON email_notification_preferences(user_id);

-- Create index for querying users who want new project notifications
CREATE INDEX IF NOT EXISTS idx_email_notification_preferences_new_project ON email_notification_preferences(new_project) WHERE new_project = true;

-- Enable Row Level Security
ALTER TABLE email_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own email preferences"
  ON email_notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own email preferences"
  ON email_notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email preferences"
  ON email_notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_email_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_email_notification_preferences_updated_at
  BEFORE UPDATE ON email_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_email_notification_preferences_updated_at();

