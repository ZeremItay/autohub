-- Create subscriptions and payments tables
-- This allows tracking of user subscriptions and payment history

-- ============================================
-- 1. SUBSCRIPTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'pending')),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE,
  auto_renew BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. PAYMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'ILS',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_method TEXT,
  payment_date TIMESTAMP WITH TIME ZONE,
  invoice_url TEXT,
  invoice_number TEXT,
  transaction_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_role_id ON subscriptions(role_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_start_date ON subscriptions(start_date DESC);
CREATE INDEX IF NOT EXISTS idx_subscriptions_end_date ON subscriptions(end_date DESC);

CREATE INDEX IF NOT EXISTS idx_payments_subscription_id ON payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date DESC);

-- ============================================
-- 4. RLS POLICIES
-- ============================================

-- Enable RLS for subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all subscriptions
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON subscriptions;
CREATE POLICY "Admins can view all subscriptions"
  ON subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.user_id = auth.uid() AND r.name = 'admin'
    )
  );

-- Policy: Users can view their own subscriptions
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON subscriptions;
CREATE POLICY "Users can view their own subscriptions"
  ON subscriptions FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Admins can insert/update/delete subscriptions
DROP POLICY IF EXISTS "Admins can manage subscriptions" ON subscriptions;
CREATE POLICY "Admins can manage subscriptions"
  ON subscriptions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.user_id = auth.uid() AND r.name = 'admin'
    )
  );

-- Enable RLS for payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all payments
DROP POLICY IF EXISTS "Admins can view all payments" ON payments;
CREATE POLICY "Admins can view all payments"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.user_id = auth.uid() AND r.name = 'admin'
    )
  );

-- Policy: Users can view their own payments
DROP POLICY IF EXISTS "Users can view their own payments" ON payments;
CREATE POLICY "Users can view their own payments"
  ON payments FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Admins can insert/update/delete payments
DROP POLICY IF EXISTS "Admins can manage payments" ON payments;
CREATE POLICY "Admins can manage payments"
  ON payments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.user_id = auth.uid() AND r.name = 'admin'
    )
  );

-- ============================================
-- 5. MIGRATE EXISTING DATA (Optional)
-- ============================================
-- Create subscriptions for existing users based on their current role
INSERT INTO subscriptions (user_id, role_id, status, start_date)
SELECT 
  p.user_id,
  p.role_id,
  'active' as status,
  p.created_at as start_date
FROM profiles p
WHERE p.role_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM subscriptions s 
    WHERE s.user_id = p.user_id AND s.status = 'active'
  )
ON CONFLICT DO NOTHING;

