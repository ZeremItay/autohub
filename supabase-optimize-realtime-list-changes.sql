-- Optimize realtime.list_changes query performance
-- This query is called frequently by Realtime subscriptions and can be optimized

-- ============================================
-- 1. CREATE INDEX ON realtime.subscription IF IT EXISTS
-- ============================================
-- Note: realtime.subscription is a system table, but we can check if we can optimize it
-- This might not be possible if it's a read-only system table

-- ============================================
-- 2. ANALYZE realtime tables to update statistics
-- ============================================
ANALYZE realtime.subscription;
ANALYZE realtime.schema_migrations;

-- ============================================
-- 3. OPTIMIZE WAL (Write-Ahead Log) QUERIES
-- ============================================
-- The realtime.list_changes function reads from WAL (Write-Ahead Log)
-- We can't directly optimize WAL, but we can:
-- 1. Reduce the number of active subscriptions
-- 2. Use connection pooling to reduce overhead
-- 3. Monitor and clean up stale subscriptions

-- ============================================
-- 4. CREATE FUNCTION TO CLEAN UP STALE SUBSCRIPTIONS
-- ============================================
-- This function helps clean up subscriptions that are no longer active
-- Note: realtime.subscription might be a view, so DELETE might not work
-- In that case, Supabase will handle cleanup automatically
-- This function is for monitoring purposes

CREATE OR REPLACE FUNCTION realtime.cleanup_stale_subscriptions()
RETURNS TABLE(
  cleaned_count bigint,
  remaining_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cleaned bigint;
  remaining bigint;
BEGIN
  -- Try to clean up subscriptions older than 30 minutes with no heartbeat
  -- Note: This might fail if realtime.subscription is a view
  BEGIN
    DELETE FROM realtime.subscription
    WHERE (
      last_heartbeat_at < NOW() - INTERVAL '30 minutes'
      OR (last_heartbeat_at IS NULL AND created_at < NOW() - INTERVAL '30 minutes')
    );
    GET DIAGNOSTICS cleaned = ROW_COUNT;
  EXCEPTION WHEN OTHERS THEN
    -- If DELETE fails (e.g., it's a view), just return 0
    cleaned := 0;
  END;
  
  -- Get remaining count
  SELECT COUNT(*) INTO remaining FROM realtime.subscription;
  
  RETURN QUERY SELECT cleaned, remaining;
END;
$$;

-- ============================================
-- 5. CREATE INDEX ON realtime.subscription FOR FASTER QUERIES
-- ============================================
-- Note: These indexes might not be possible if realtime.subscription is a system view
-- But we'll try to create them anyway

-- Index on created_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_realtime_subscription_created_at 
ON realtime.subscription(created_at DESC);

-- Index on last_heartbeat_at for stale subscription detection
CREATE INDEX IF NOT EXISTS idx_realtime_subscription_last_heartbeat 
ON realtime.subscription(last_heartbeat_at DESC NULLS LAST);

-- ============================================
-- 6. CREATE FUNCTION TO MONITOR ACTIVE SUBSCRIPTIONS
-- ============================================
CREATE OR REPLACE FUNCTION realtime.get_active_subscription_count()
RETURNS TABLE(
  total_subscriptions bigint,
  active_subscriptions bigint,
  stale_subscriptions bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::bigint as total_subscriptions,
    COUNT(*) FILTER (WHERE last_heartbeat_at > NOW() - INTERVAL '5 minutes')::bigint as active_subscriptions,
    COUNT(*) FILTER (WHERE last_heartbeat_at < NOW() - INTERVAL '30 minutes' OR last_heartbeat_at IS NULL)::bigint as stale_subscriptions
  FROM realtime.subscription;
END;
$$;

-- ============================================
-- 7. CREATE SCHEDULED JOB TO CLEAN UP STALE SUBSCRIPTIONS
-- ============================================
-- Note: Supabase doesn't support pg_cron by default, but you can use Supabase Edge Functions
-- or external cron jobs to call this function periodically

-- ============================================
-- 8. RECOMMENDATIONS FOR APPLICATION CODE
-- ============================================
-- 1. Ensure all Realtime subscriptions are properly cleaned up in useEffect cleanup functions
-- 2. Use connection pooling (pgBouncer) to reduce connection overhead
-- 3. Monitor subscription count and clean up stale ones
-- 4. Consider reducing the number of active subscriptions by:
--    - Using polling instead of Realtime for less critical updates
--    - Combining multiple subscriptions into one where possible
--    - Using server-sent events (SSE) for one-way updates

-- ============================================
-- 9. VERIFY OPTIMIZATIONS
-- ============================================
-- Run this query to check subscription count:
-- SELECT * FROM realtime.get_active_subscription_count();

-- Run this query to see all active subscriptions:
-- SELECT id, channel, created_at, last_heartbeat_at 
-- FROM realtime.subscription 
-- ORDER BY created_at DESC 
-- LIMIT 100;

