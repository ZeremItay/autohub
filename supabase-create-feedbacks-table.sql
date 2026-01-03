-- Create feedbacks table
CREATE TABLE IF NOT EXISTS feedbacks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback_type TEXT NOT NULL,
  image_url TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_feedbacks_user_id ON feedbacks(user_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_created_at ON feedbacks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedbacks_feedback_type ON feedbacks(feedback_type);

-- Enable Row Level Security
ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for feedbacks

-- Policy: Anyone can insert feedbacks (for the feedback form)
DROP POLICY IF EXISTS "Anyone can insert feedbacks" ON feedbacks;
CREATE POLICY "Anyone can insert feedbacks"
  ON feedbacks FOR INSERT
  WITH CHECK (true);

-- Policy: Admins can view all feedbacks
DROP POLICY IF EXISTS "Admins can view all feedbacks" ON feedbacks;
CREATE POLICY "Admins can view all feedbacks"
  ON feedbacks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.user_id = auth.uid() AND r.name = 'admin'
    )
  );

-- Policy: Users can view their own feedbacks (optional - if you want users to see their own feedbacks)
DROP POLICY IF EXISTS "Users can view their own feedbacks" ON feedbacks;
CREATE POLICY "Users can view their own feedbacks"
  ON feedbacks FOR SELECT
  USING (user_id = auth.uid());

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_feedbacks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_feedbacks_updated_at ON feedbacks;
CREATE TRIGGER update_feedbacks_updated_at
  BEFORE UPDATE ON feedbacks
  FOR EACH ROW
  EXECUTE FUNCTION update_feedbacks_updated_at();

