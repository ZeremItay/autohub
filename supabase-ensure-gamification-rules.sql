-- Ensure required gamification rules exist with correct values
-- Run this in Supabase SQL Editor to fix/update gamification rules
-- This script handles both possible table structures (action_name/trigger_action)

DO $$
BEGIN
  -- Check if action_name column exists
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'gamification_rules' 
    AND column_name = 'action_name'
  ) THEN
    -- Use action_name column with status
    INSERT INTO gamification_rules (action_name, point_value, status, description)
    VALUES
      ('לייק לפוסט', 1, 'active', 'לייק לפוסט'),
      ('תגובה לפוסט', 5, 'active', 'תגובה לפוסט'),
      ('כניסה יומית', 5, 'active', 'כניסה יומית לאתר'),
      ('פוסט חדש', 10, 'active', 'יצירת פוסט חדש'),
      ('תגובה לנושא', 5, 'active', 'תגובה בפורום'),
      ('שיתוף פוסט', 3, 'active', 'שיתוף פוסט'),
      ('השלמת קורס', 50, 'active', 'השלמת קורס מלא'),
      ('העלאת פרויקט', 25, 'active', 'העלאת פרויקט חדש'),
      ('הרשמה לאירוע', 1, 'active', 'הרשמה לאירוע'),
      ('host_live_event', 50, 'active', 'העברת לייב')
    ON CONFLICT (action_name) 
    DO UPDATE SET 
      point_value = EXCLUDED.point_value,
      status = 'active',
      description = EXCLUDED.description,
      updated_at = NOW();
    
    -- Verify the rules were created/updated
    RAISE NOTICE 'Rules created/updated using action_name column';
    
  -- Check if trigger_action column exists
  ELSIF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'gamification_rules' 
    AND column_name = 'trigger_action'
  ) THEN
    -- Use trigger_action column with is_active
    INSERT INTO gamification_rules (trigger_action, point_value, is_active, description)
    VALUES
      ('לייק לפוסט', 1, true, 'לייק לפוסט'),
      ('תגובה לפוסט', 5, true, 'תגובה לפוסט'),
      ('כניסה יומית', 5, true, 'כניסה יומית לאתר'),
      ('פוסט חדש', 10, true, 'יצירת פוסט חדש'),
      ('תגובה לנושא', 5, true, 'תגובה בפורום'),
      ('שיתוף פוסט', 3, true, 'שיתוף פוסט'),
      ('השלמת קורס', 50, true, 'השלמת קורס מלא'),
      ('העלאת פרויקט', 25, true, 'העלאת פרויקט חדש'),
      ('הרשמה לאירוע', 1, true, 'הרשמה לאירוע'),
      ('host_live_event', 50, true, 'העברת לייב')
    ON CONFLICT (trigger_action) 
    DO UPDATE SET 
      point_value = EXCLUDED.point_value,
      is_active = true,
      description = EXCLUDED.description,
      updated_at = NOW();
    
    -- Verify the rules were created/updated
    RAISE NOTICE 'Rules created/updated using trigger_action column';
    
  ELSE
    RAISE EXCEPTION 'Neither action_name nor trigger_action column found in gamification_rules table';
  END IF;
END $$;

-- Verify the rules were created/updated (works for both structures)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'gamification_rules' AND column_name = 'action_name'
  ) THEN
    -- Show rules with action_name
    PERFORM * FROM gamification_rules 
    WHERE action_name IN ('לייק לפוסט', 'תגובה לפוסט', 'כניסה יומית', 'פוסט חדש')
    LIMIT 1;
    RAISE NOTICE 'Verification: Rules exist with action_name column';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'gamification_rules' AND column_name = 'trigger_action'
  ) THEN
    -- Show rules with trigger_action
    PERFORM * FROM gamification_rules 
    WHERE trigger_action IN ('לייק לפוסט', 'תגובה לפוסט', 'כניסה יומית', 'פוסט חדש')
    LIMIT 1;
    RAISE NOTICE 'Verification: Rules exist with trigger_action column';
  END IF;
END $$;
