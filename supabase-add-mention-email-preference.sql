-- Add mention email preference column to email_notification_preferences table
-- This allows users to control whether they receive email notifications when mentioned

-- Add the mention column with default value true (users opt-out if they don't want emails)
ALTER TABLE email_notification_preferences
ADD COLUMN IF NOT EXISTS mention BOOLEAN DEFAULT true;

-- Create index for efficient queries when finding users who want mention notifications
CREATE INDEX IF NOT EXISTS idx_email_notification_preferences_mention
ON email_notification_preferences(mention)
WHERE mention = true;

-- Add descriptive comment for documentation
COMMENT ON COLUMN email_notification_preferences.mention IS 'Receive email notification when mentioned by another user in comments, posts, or forums';

-- Verify the column was added successfully
-- Uncomment to run verification query:
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'email_notification_preferences' AND column_name = 'mention';
