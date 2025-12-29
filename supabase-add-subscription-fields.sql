-- Add fields to subscriptions table for monthly subscription management
-- This allows tracking previous role, warnings, and automatic renewal

-- Step 1: Add previous_role_id column (to restore user's previous role when subscription expires)
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS previous_role_id UUID REFERENCES roles(id) ON DELETE SET NULL;

-- Step 2: Add warning_sent column (to track if warning notification was sent)
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS warning_sent BOOLEAN DEFAULT false;

-- Step 3: Add comment for documentation
COMMENT ON COLUMN subscriptions.previous_role_id IS 'The role_id the user had before this subscription (for restoration on expiry)';
COMMENT ON COLUMN subscriptions.warning_sent IS 'Whether a warning notification was sent to the user about expiring subscription';

-- Step 4: Create index for better performance on warning_sent queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_warning_sent ON subscriptions(warning_sent) WHERE warning_sent = false;

-- Step 5: Create index for better performance on expiring subscriptions queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_end_date_status ON subscriptions(end_date, status) WHERE status = 'active';

