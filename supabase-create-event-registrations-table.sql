-- Create event_registrations table
CREATE TABLE IF NOT EXISTS event_registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_event_registrations_user_id ON event_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id ON event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_user_event ON event_registrations(user_id, event_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_created_at ON event_registrations(created_at DESC);

-- Enable Row Level Security
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;

-- Create policies for event_registrations
-- SELECT: Users can see only their own registrations, admins can see all
CREATE POLICY "Users can view their own registrations"
  ON event_registrations FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role_id IN (
        SELECT id FROM roles WHERE name = 'admin'
      )
    )
  );

-- INSERT: Users can create registrations only for themselves
CREATE POLICY "Users can create their own registrations"
  ON event_registrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can delete only their own registrations (for future cancellation feature)
CREATE POLICY "Users can delete their own registrations"
  ON event_registrations FOR DELETE
  USING (auth.uid() = user_id);
