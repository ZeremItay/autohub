-- Add gamification rules for lesson and course completion
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
    -- Use action_name column
    -- Add rule for lesson completion
    INSERT INTO gamification_rules (action_name, point_value, status, description)
    VALUES ('סיום שיעור', 10, 'active', 'סיום שיעור בקורס')
    ON CONFLICT (action_name) DO UPDATE 
    SET point_value = 10, status = 'active', description = 'סיום שיעור בקורס';
    
    -- Add rule for course completion
    INSERT INTO gamification_rules (action_name, point_value, status, description)
    VALUES ('השלמת קורס', 50, 'active', 'השלמת כל השיעורים בקורס')
    ON CONFLICT (action_name) DO UPDATE 
    SET point_value = 50, status = 'active', description = 'השלמת כל השיעורים בקורס';
    
  -- Check if trigger_action column exists
  ELSIF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'gamification_rules' 
    AND column_name = 'trigger_action'
  ) THEN
    -- Use trigger_action column
    -- Add rule for lesson completion
    INSERT INTO gamification_rules (trigger_action, point_value, is_active, description)
    VALUES ('סיום שיעור', 10, true, 'סיום שיעור בקורס')
    ON CONFLICT (trigger_action) DO UPDATE 
    SET point_value = 10, is_active = true, description = 'סיום שיעור בקורס';
    
    -- Add rule for course completion
    INSERT INTO gamification_rules (trigger_action, point_value, is_active, description)
    VALUES ('השלמת קורס', 50, true, 'השלמת כל השיעורים בקורס')
    ON CONFLICT (trigger_action) DO UPDATE 
    SET point_value = 50, is_active = true, description = 'השלמת כל השיעורים בקורס';
    
  ELSE
    RAISE EXCEPTION 'Neither action_name nor trigger_action column found in gamification_rules table';
  END IF;
END $$;

