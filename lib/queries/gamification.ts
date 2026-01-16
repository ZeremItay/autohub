import { getSupabaseClient } from '../supabase-server'

export interface GamificationRule {
  id: string
  action_name: string
  point_value: number
  status: 'active' | 'inactive'
  description?: string
}

export interface PointsHistory {
  id: string
  user_id: string
  action_name: string
  points: number
  created_at: string
}

// Get all active gamification rules
export async function getActiveRules() {
  try {
    const supabase = await getSupabaseClient()

    // Get all rules first, then filter in code
    // Don't use .order() if column might not exist
    const { data, error } = await supabase
      .from('gamification_rules')
      .select('*')
      .limit(100) // Get all rules (shouldn't be more than 100)
    
    if (error) {
      // Silently fail - rules are not critical
      console.warn('Error fetching rules:', error)
      return { data: [], error: null } // Return empty array instead of null
    }
    
    // Filter by status or is_active in code
    const activeRules = (data || []).filter((rule: any) => {
      if ('status' in rule) {
        return rule.status === 'active'
      } else if ('is_active' in rule) {
        return rule.is_active === true
      }
      return true // If neither exists, include all
    })
    
    // Sort in code if needed
    try {
      activeRules.sort((a: any, b: any) => {
        const aName = (a.action_name || a.trigger_action || '').toLowerCase()
        const bName = (b.action_name || b.trigger_action || '').toLowerCase()
        return aName.localeCompare(bName)
      })
    } catch (sortError) {
      // Ignore sort errors
    }
    
    return { data: Array.isArray(activeRules) ? activeRules : [], error: null }
  } catch (error: any) {
    // Silently fail - rules are not critical
    console.warn('Error in getActiveRules:', error)
    return { data: [], error: null } // Return empty array instead of null
  }
}

// Award points to user
export async function awardPoints(userId: string, actionName: string, options?: { checkDaily?: boolean; relatedId?: string; checkRelatedId?: boolean }) {
  try {
    const supabase = await getSupabaseClient()
    
    // Get the rule for this action
    // Try both trigger_action and action_name - handle missing columns gracefully
    // DO NOT filter by status/is_active in query - filter in code instead
    let rule: any = null;
    let ruleError: any = null;
    
    // Try to get all rules first, then filter in code (most reliable approach)
    const { data: allRules, error: allRulesError } = await supabase
      .from('gamification_rules')
      .select('*')
      .limit(100); // Get all rules (shouldn't be more than 100)
    
    if (allRulesError) {
      console.warn('⚠️ Error fetching gamification rules:', allRulesError?.message || String(allRulesError));
      // If we can't get all rules, silently fail
      return { success: false, error: 'Rule not found', alreadyAwarded: false };
    }
    
    
    // Filter in code by action_name or trigger_action
    if (allRules && allRules.length > 0) {
      rule = allRules.find((r: any) => {
        const actionMatch = r.action_name && r.action_name.toLowerCase() === actionName.toLowerCase();
        const triggerMatch = r.trigger_action && r.trigger_action.toLowerCase() === actionName.toLowerCase();
        
        // Special handling for daily login - try both Hebrew and English
        if (actionName === 'כניסה יומית' || actionName === 'daily_login') {
          const isDailyLogin = r.action_name?.toLowerCase() === 'daily_login' || 
                               r.trigger_action?.toLowerCase() === 'daily_login' ||
                               r.action_name?.toLowerCase() === 'כניסה יומית' ||
                               r.trigger_action?.toLowerCase() === 'כניסה יומית' ||
                               r.description?.toLowerCase() === 'כניסה יומית';
          return isDailyLogin;
        }
        
        return actionMatch || triggerMatch;
      });
    }
    
    // Filter by status or is_active if rule was found (in code, not in query)
    if (rule) {
      const hasStatus = 'status' in rule;
      const hasIsActive = 'is_active' in rule;
      
      if (hasStatus && rule.status !== 'active') {
        rule = null; // Rule is inactive
      } else if (hasIsActive && !rule.is_active) {
        rule = null; // Rule is inactive
      }
    }
    
    if (ruleError) {
      // Silently fail - gamification is not critical
      console.warn('Error fetching gamification rule:', ruleError);
      return { success: false, error: ruleError.message || 'Rule not found', alreadyAwarded: false }
    }
    
    if (!rule) {
      // Rule not found - try to ensure rules exist and retry
      console.warn(`⚠️ Rule not found for action: "${actionName}", ensuring rules exist...`);
      
      // Ensure rules exist
      const ensureResult = await ensureGamificationRules();

      if (ensureResult.success) {
        // Retry finding the rule after ensuring
        const { data: allRulesRetry, error: retryError } = await supabase
          .from('gamification_rules')
          .select('*')
          .limit(100);
        
        if (!retryError && allRulesRetry) {
          rule = allRulesRetry.find((r: any) => {
            const actionMatch = r.action_name && r.action_name.toLowerCase() === actionName.toLowerCase();
            const triggerMatch = r.trigger_action && r.trigger_action.toLowerCase() === actionName.toLowerCase();
            
            // Special handling for daily login
            if (actionName === 'כניסה יומית' || actionName === 'daily_login') {
              const isDailyLogin = r.action_name?.toLowerCase() === 'daily_login' || 
                                   r.trigger_action?.toLowerCase() === 'daily_login' ||
                                   r.action_name?.toLowerCase() === 'כניסה יומית' ||
                                   r.trigger_action?.toLowerCase() === 'כניסה יומית';
              return isDailyLogin;
            }
            
            return actionMatch || triggerMatch;
          });
          
          // Filter by status if rule was found
          if (rule) {
            const hasStatus = 'status' in rule;
            const hasIsActive = 'is_active' in rule;
            
            if (hasStatus && rule.status !== 'active') {
              rule = null;
            } else if (hasIsActive && !rule.is_active) {
              rule = null;
            }
          }
        }
      }
      
      if (!rule) {
        // Still not found after ensuring - try alternative names
        // Try alternative names for registration
        if (actionName === 'הרשמה') {
          const alternativeNames = ['registration', 'signup', 'הרשמה למערכת', 'הרשמה למערכת', 'user_registration'];
          for (const altName of alternativeNames) {
            rule = allRules?.find((r: any) => {
              const actionMatch = r.action_name && r.action_name.toLowerCase() === altName.toLowerCase();
              const triggerMatch = r.trigger_action && r.trigger_action.toLowerCase() === altName.toLowerCase();
              return actionMatch || triggerMatch;
            });
            if (rule) {
              break;
            }
          }
        }
        
        if (!rule) {
          // Still not found - this is not critical, just log and continue
          // Don't fail the operation if gamification rule doesn't exist
          console.warn(`⚠️ Rule not found for action: "${actionName}" - continuing without points`);
        }
        // Rule not found - return error (but don't fail the app operation)
        return { success: false, error: `Rule not found for action: ${actionName}`, alreadyAwarded: false }
      } else {
      }
    }

    // Get profile ID (points_history.user_id references profiles.id, not profiles.user_id)
    // First try to get profile by user_id
    let profileIdForHistory = userId;
    const { data: profileForHistory } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();
    
    if (profileForHistory) {
      profileIdForHistory = profileForHistory.id;
    } else {
      // If not found by user_id, assume userId is already the profile id
      profileIdForHistory = userId;
    }
    
    // Check if user already got points for this specific action with relatedId (e.g., like on same post)
    if (options?.checkRelatedId && options?.relatedId) {
      // Check if user already got points for this action with this relatedId
      // Try both 'action' and 'action_name' columns
      const historyActionName = rule.trigger_action || rule.action_name || actionName;
      
      // First check if related_id column exists
      const { data: sampleWithRelatedId, error: relatedIdCheckError } = await supabase
        .from('points_history')
        .select('related_id')
        .limit(1);
      
      if (!relatedIdCheckError && sampleWithRelatedId !== null) {
        // related_id column exists, check for duplicate
        // Try 'action' column first
        const { data: historyWithAction, error: actionError } = await supabase
          .from('points_history')
          .select('id')
          .eq('user_id', profileIdForHistory) // Use profile.id, not profile.user_id
          .eq('action', historyActionName)
          .eq('related_id', options.relatedId)
          .limit(1);
        
        if (!actionError && historyWithAction && historyWithAction.length > 0) {
          return { success: false, error: 'Points already awarded for this action', alreadyAwarded: true };
        }
        
        // Try 'action_name' column as fallback
        const { data: historyWithActionName, error: actionNameError } = await supabase
          .from('points_history')
          .select('id')
          .eq('user_id', profileIdForHistory) // Use profile.id, not profile.user_id
          .eq('action_name', historyActionName)
          .eq('related_id', options.relatedId)
          .limit(1);
        
        if (!actionNameError && historyWithActionName && historyWithActionName.length > 0) {
          return { success: false, error: 'Points already awarded for this action', alreadyAwarded: true };
        }
      } else {
        // related_id column doesn't exist - fallback to checking without related_id
        // This is a less precise check, but prevents duplicate points if column doesn't exist
      }
    }
    
    // For daily actions (like daily login), check if user already got points today
    if (options?.checkDaily || actionName === 'כניסה יומית') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStart = today.toISOString();
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStart = tomorrow.toISOString();
      
      // Check if user already got points for this action today
      // For daily login, check both Hebrew and English names
      let todayHistory: any[] = [];
      const actionNamesToCheck = (actionName === 'כניסה יומית' || actionName === 'daily_login') 
        ? ['כניסה יומית', 'daily_login'] 
        : [actionName];
      
      for (const nameToCheck of actionNamesToCheck) {
        // Try 'action' column first (most common), then fallback to 'action_name'
        const { data: historyWithAction, error: actionError } = await supabase
          .from('points_history')
          .select('id')
          .eq('user_id', profileIdForHistory) // Use profile.id, not profile.user_id
          .eq('action', nameToCheck)
          .gte('created_at', todayStart)
          .lt('created_at', tomorrowStart)
          .limit(1)
        
        if (historyWithAction && historyWithAction.length > 0) {
          todayHistory = historyWithAction;
          break;
        } else if (actionError && (actionError.code === '42703' || actionError.message?.includes('column'))) {
          // Try with 'action_name' column instead
          const { data: historyWithActionName, error: actionNameError } = await supabase
            .from('points_history')
            .select('id')
            .eq('user_id', profileIdForHistory) // Use profile.id, not profile.user_id
            .eq('action_name', nameToCheck)
            .gte('created_at', todayStart)
            .lt('created_at', tomorrowStart)
            .limit(1)
          
          if (historyWithActionName && historyWithActionName.length > 0) {
            todayHistory = historyWithActionName;
            break;
          }
        }
      }
      
      if (todayHistory && todayHistory.length > 0) {
        // User already got points today for this action
        return { success: false, error: 'Already awarded today', alreadyAwarded: true }
      }
      
    }
    
    // Add to points history
    // Use the action name from the rule (trigger_action or action_name) to ensure consistency
    // For daily login, prefer the rule's trigger_action/action_name over the passed actionName
    const historyActionName = rule.trigger_action || rule.action_name || actionName;
    
    // Try 'action' column first (most common), then fallback to 'action_name'
    const historyData: any = {
      user_id: profileIdForHistory, // Use profile.id, not profile.user_id
      points: rule.point_value
    };
    
    // Try to determine which column to use by checking a sample record
    // Default to 'action_name' as it's more common in newer schemas
    try {
      // Try 'action_name' first (more common in newer schemas)
      const { data: sampleHistoryWithActionName, error: actionNameError } = await supabase
        .from('points_history')
        .select('action_name')
        .limit(1);
      
      if (!actionNameError) {
        // 'action_name' column exists (even if no records)
        historyData.action_name = historyActionName;
      } else {
        // Try 'action' column as fallback
        const { data: sampleHistoryWithAction, error: actionError } = await supabase
          .from('points_history')
          .select('action')
          .limit(1);
        
        if (!actionError) {
          // 'action' column exists
          historyData.action = historyActionName;
        } else {
          // Neither column exists, default to 'action_name' (most common)
          historyData.action_name = historyActionName;
        }
      }
    } catch (error) {
      // If we can't check, default to 'action_name' (most common)
      historyData.action_name = historyActionName;
    }
    
    // Try to insert with 'action' first, then fallback to 'action_name' if needed
    let historyError: any = null;
    const { error: insertError } = await supabase
      .from('points_history')
      .insert([historyData])
    
    if (insertError) {
      // If 'action' column doesn't exist, try 'action_name'
      if (insertError.code === 'PGRST204' || insertError.message?.includes('action') || insertError.message?.includes('column')) {
        const historyDataWithActionName: any = {
          user_id: profileIdForHistory, // Use profile.id, not profile.user_id
          points: rule.point_value,
          action_name: historyActionName
        };
        const { error: insertError2 } = await supabase
          .from('points_history')
          .insert([historyDataWithActionName])
        
        if (insertError2) {
          historyError = insertError2;
        }
      } else {
        historyError = insertError;
      }
    }
    
    if (historyError) {
      console.error('❌ Error adding to history:', historyError?.message || String(historyError))
      return { success: false, error: historyError.message }
    }
    
    
    // Update user's total points
    // Note: profiles table uses user_id, not id
    const { data: profile } = await supabase
      .from('profiles')
      .select('points')
      .eq('user_id', userId)
      .single()
    
    let currentProfile = profile;
    let updateField = 'user_id';
    let updateValue = userId;
    
    if (!currentProfile) {
      // Try with id if user_id didn't work
      const { data: profileById } = await supabase
        .from('profiles')
        .select('points')
        .eq('id', userId)
        .single()
      
      if (!profileById) {
        return { success: false, error: 'Profile not found' }
      }
      
      currentProfile = profileById;
      updateField = 'id';
      updateValue = userId;
    }
    
    const newPoints = (currentProfile.points || 0) + rule.point_value
    
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ points: newPoints })
      .eq(updateField, updateValue)
    
    if (updateError) {
      console.error('Error updating points:', updateError?.message || String(updateError))
      return { success: false, error: updateError.message }
    }
    
    // Check and award badges based on new points
    try {
      const { checkAndAwardBadges } = await import('./badges');
      await checkAndAwardBadges(userId);
    } catch (badgeError) {
      // Don't fail the points award if badge check fails
      console.warn('Error checking badges after points update:', badgeError);
    }
    
    // Create notification for points award (ONLY ONCE)
    try {
      const { createNotification } = await import('./notifications');
      // Get rule description for notification
      const ruleDescription = rule.description || actionName;
      
      // Try 'points' type first, fallback to 'like' if not supported
      try {
        const { data: notificationData, error: notificationError } = await createNotification({
          user_id: userId,
          type: 'points' as any, // Try 'points' type
          title: 'קיבלת נקודות! 🎉',
          message: `קיבלת ${rule.point_value} נקודות עבור: ${ruleDescription}`,
          link: '/profile',
          is_read: false
        });
        
        if (notificationError) {
          // Log the full error object for debugging
          const errorInfo: any = {
            code: notificationError.code || null,
            message: notificationError.message || null,
            details: notificationError.details || null,
            hint: notificationError.hint || null,
            fullError: notificationError
          };
          
          // Try to extract more info from the error object
          try {
            if (typeof notificationError === 'object') {
              // Try to get all properties
              const errorKeys = Object.keys(notificationError);
              if (errorKeys.length > 0) {
                errorInfo.allKeys = errorKeys;
                errorInfo.stringified = JSON.stringify(notificationError, Object.getOwnPropertyNames(notificationError));
              }
            }
          } catch (stringifyErr) {
            // Ignore stringify errors
          }
          
          // Always log in development, log important errors in production
          if (process.env.NODE_ENV === 'development' || notificationError.code || notificationError.message) {
            const hasInfo = Object.keys(errorInfo).filter(k => errorInfo[k] !== null && k !== 'fullError').length > 0;
            if (hasInfo) {
              console.error('❌ Notification error details:', errorInfo);
            } else {
              console.warn('⚠️ Notification creation failed (no error details available)', {
                userId,
                actionName,
                errorType: typeof notificationError,
                errorString: String(notificationError),
                rawError: notificationError
              });
            }
          }
          
          // Check if it's a table not found error
          if (notificationError.code === 'PGRST205' || notificationError.message?.includes('Could not find the table')) {
            if (process.env.NODE_ENV === 'development') {
              console.warn('⚠️ Notifications table does not exist. Skipping notification creation.');
            }
          } else if (notificationError.message?.includes('type') || notificationError.message?.includes('CHECK') || notificationError.code === '23514') {
            // If 'points' type is not supported, use 'like' as fallback
            if (process.env.NODE_ENV === 'development') {
            }
            const { error: likeError } = await createNotification({
              user_id: userId,
              type: 'like',
              title: 'קיבלת נקודות! 🎉',
              message: `קיבלת ${rule.point_value} נקודות עבור: ${ruleDescription}`,
              link: '/profile',
              is_read: false
            });
            
            if (likeError) {
              if (process.env.NODE_ENV === 'development') {
                if (likeError.code === 'PGRST205' || likeError.message?.includes('Could not find the table')) {
                  console.warn('⚠️ Notifications table does not exist. Skipping notification creation.');
                } else {
                  console.warn('⚠️ Could not create notification with "like" type either:', likeError);
                }
              }
            } else {
              if (process.env.NODE_ENV === 'development') {
              }
              // Trigger event to refresh notifications in UI
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('notificationCreated'));
              }
            }
          } else {
            if (process.env.NODE_ENV === 'development') {
              console.warn('⚠️ Error creating notification:', notificationError);
            }
          }
        } else {
          if (process.env.NODE_ENV === 'development') {
          }
          // Trigger event to refresh notifications in UI
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('notificationCreated'));
          }
        }
      } catch (typeError: any) {
        // If table doesn't exist, silently skip
        if (typeError.code === 'PGRST205' || typeError.message?.includes('Could not find the table')) {
          console.warn('⚠️ Notifications table does not exist. Skipping notification creation.');
        } else {
          console.warn('⚠️ Error creating notification:', typeError);
        }
      }
    } catch (notificationError: any) {
      // Don't fail the points award if notification creation fails
      if (notificationError.code === 'PGRST205' || notificationError.message?.includes('Could not find the table')) {
        console.warn('⚠️ Notifications table does not exist. Skipping notification creation.');
      } else {
        console.warn('❌ Error creating notification for points:', notificationError);
      }
    }
    
    return { success: true, points: newPoints }
  } catch (error: any) {
    console.error('Error awarding points:', error?.message || String(error))
    return { success: false, error: error.message }
  }
}

// Deduct points from user
export async function deductPoints(userId: string, amount: number) {
  try {
    const supabase = await getSupabaseClient()

    if (amount <= 0) {
      return { success: false, error: 'Amount must be positive' };
    }


    // Get current profile to check points balance
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('points, user_id')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      console.error('❌ Error fetching profile for points deduction:', profileError);
      return { success: false, error: profileError?.message || 'Profile not found' };
    }

    const currentPoints = profile.points || 0;
    
    // Check if user has enough points
    if (currentPoints < amount) {
      console.warn(`⚠️ Insufficient points: ${currentPoints} < ${amount}`);
      return { 
        success: false, 
        error: 'Insufficient points',
        currentPoints,
        requiredPoints: amount
      };
    }

    // Calculate new points balance
    const newPoints = currentPoints - amount;

    // Get profile ID for points_history (points_history.user_id references profiles.id, not profiles.user_id)
    let profileIdForHistory = profile.user_id;
    const { data: profileForHistory } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();
    
    if (profileForHistory) {
      profileIdForHistory = profileForHistory.id;
    }

    // Add to points history
    const historyActionName = 'הגשת הצעה לפרויקט';
    const historyData: any = {
      user_id: profileIdForHistory, // Use profile.id, not profile.user_id
      points: -amount, // Negative points for deduction
      action_name: historyActionName
    };

    // Try to insert with 'action_name' first, then fallback to 'action' if needed
    let historyError: any = null;
    const { error: insertError } = await supabase
      .from('points_history')
      .insert([historyData]);
    
    if (insertError) {
      // If 'action_name' column doesn't exist, try 'action'
      if (insertError.code === 'PGRST204' || insertError.message?.includes('action_name') || insertError.message?.includes('column')) {
        const historyDataWithAction: any = {
          user_id: profileIdForHistory,
          points: -amount,
          action: historyActionName
        };
        const { error: insertError2 } = await supabase
          .from('points_history')
          .insert([historyDataWithAction]);
        
        if (insertError2) {
          historyError = insertError2;
        }
      } else {
        historyError = insertError;
      }
    }
    
    if (historyError) {
      console.error('❌ Error adding to points history:', historyError?.message || String(historyError));
      // Don't fail the deduction if history insert fails, but log it
    } else {
    }

    // Update points in database
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ points: newPoints })
      .eq('user_id', userId);

    if (updateError) {
      console.error('❌ Error deducting points:', updateError);
      return { success: false, error: updateError.message };
    }

    return { success: true, points: newPoints, previousPoints: currentPoints };
  } catch (error: any) {
    console.error('❌ Error in deductPoints:', error?.message || String(error));
    return { success: false, error: error?.message || 'Unknown error' };
  }
}

// Get user's points history
export async function getUserPointsHistory(userId: string) {
  const supabase = await getSupabaseClient()

  // Get profile ID (points_history.user_id references profiles.id, not profiles.user_id)
  // First try to get profile by user_id
  let profileIdForHistory = userId;
  const { data: profileForHistory } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .single();
  
  if (profileForHistory) {
    profileIdForHistory = profileForHistory.id;
  } else {
    // If not found by user_id, assume userId is already the profile id
    profileIdForHistory = userId;
  }
  
  const { data, error } = await supabase
    .from('points_history')
    .select('*')
    .eq('user_id', profileIdForHistory) // Use profile.id, not profile.user_id
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching points history:', error?.message || String(error))
    return { data: null, error }
  }
  
  return { data, error: null }
}

// Get user's current points and rank
export async function getUserGamificationStats(userId: string) {
  const supabase = await getSupabaseClient()

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('points')
    .eq('id', userId)
    .single()
  
  if (profileError) {
    return { points: 0, rank: 0, error: profileError }
  }
  
  // Calculate rank (users with more points)
  const { count } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .gt('points', profile.points || 0)
  
  const rank = (count || 0) + 1
  
  return { points: profile.points || 0, rank, error: null }
}

// Ensure required gamification rules exist with correct values
export async function ensureGamificationRules() {
  try {
    const supabase = await getSupabaseClient()
    
    const requiredRules = [
      { name: 'לייק לפוסט', point_value: 1, description: 'לייק לפוסט' },
      { name: 'תגובה לפוסט', point_value: 5, description: 'תגובה לפוסט' },
      { name: 'כניסה יומית', point_value: 5, description: 'כניסה יומית לאתר' },
      { name: 'פוסט חדש', point_value: 10, description: 'יצירת פוסט חדש' },
      { name: 'תגובה לנושא', point_value: 5, description: 'תגובה בפורום' },
      { name: 'הרשמה', point_value: 10, description: 'הרשמה למערכת' },
      { name: 'host_live_event', point_value: 50, description: 'העברת לייב' },
      { name: 'קיבלתי לייק על פוסט', point_value: 1, description: 'קיבלתי לייק על פוסט שפרסמתי' },
    ];
    
    // Try to detect which column structure is used
    // First try to get one rule to see the structure
    const { data: sampleRule, error: sampleError } = await supabase
      .from('gamification_rules')
      .select('*')
      .limit(1);
    
    let usesTriggerAction = false;
    let usesStatus = false;
    
    if (!sampleError && sampleRule && sampleRule.length > 0) {
      const rule = sampleRule[0] as any;
      usesTriggerAction = 'trigger_action' in rule;
      usesStatus = 'status' in rule;
    } else {
      // If no rules exist, try to detect by attempting a select
      // Try action_name first
      const { error: actionNameError } = await supabase
        .from('gamification_rules')
        .select('action_name')
        .limit(0);
      
      if (actionNameError && (actionNameError.code === '42703' || actionNameError.message?.includes('column'))) {
        // action_name doesn't exist, try trigger_action
        const { error: triggerActionError } = await supabase
          .from('gamification_rules')
          .select('trigger_action')
          .limit(0);
        
        if (!triggerActionError) {
          usesTriggerAction = true;
        }
      }
    }
    
    // Get all existing rules
    const selectFields = usesTriggerAction 
      ? 'trigger_action, point_value, is_active' 
      : 'action_name, point_value, status';
    
    const { data: existingRules, error: fetchError } = await supabase
      .from('gamification_rules')
      .select(selectFields);
    
    if (fetchError) {
      console.warn('⚠️ Error fetching rules:', fetchError);
      return { success: false, error: fetchError.message };
    }
    
    // Get existing rule names
    const existingNames = (existingRules || []).map((r: any) => 
      usesTriggerAction ? r.trigger_action : r.action_name
    );
    
    const missingRules = requiredRules.filter(r => !existingNames.includes(r.name));
    
    // Insert missing rules
    if (missingRules.length > 0) {
      const rulesToInsert = missingRules.map(rule => {
        if (usesTriggerAction) {
          return {
            trigger_action: rule.name,
            point_value: rule.point_value,
            is_active: true,
            description: rule.description
          };
        } else {
          return {
            action_name: rule.name,
            point_value: rule.point_value,
            status: 'active',
            description: rule.description
          };
        }
      });
      
      const { error: insertError } = await supabase
        .from('gamification_rules')
        .insert(rulesToInsert);
      
      if (insertError) {
        // RLS policy might block insertion - this is not critical, just log as warning
        console.warn('⚠️ Could not insert missing gamification rules (RLS policy):', insertError.message || insertError);
        return { success: false, error: insertError.message };
      }
      
    }
    
    // Update existing rules to ensure correct values
    let updatedCount = 0;
    for (const rule of requiredRules) {
      const existingRule = existingRules?.find((r: any) => 
        (usesTriggerAction ? r.trigger_action : r.action_name) === rule.name
      );
      
      if (existingRule) {
        const needsUpdate = 
          existingRule.point_value !== rule.point_value ||
          (usesTriggerAction ? !existingRule.is_active : existingRule.status !== 'active');
        
        if (needsUpdate) {
          const updateData: any = {
            point_value: rule.point_value
          };
          
          if (usesTriggerAction) {
            updateData.is_active = true;
          } else {
            updateData.status = 'active';
          }
          
          const columnName = usesTriggerAction ? 'trigger_action' : 'action_name';
          const { error: updateError } = await supabase
            .from('gamification_rules')
            .update(updateData)
            .eq(columnName, rule.name);
          
          if (updateError) {
            console.warn(`⚠️ Could not update rule ${rule.name}:`, updateError);
          } else {
            updatedCount++;
          }
        }
      }
    }
    
    if (updatedCount > 0) {
    }
    
    return { success: true, created: missingRules.length, updated: updatedCount };
  } catch (error: any) {
    console.warn('⚠️ Error ensuring rules:', error);
    return { success: false, error: error.message };
  }
}

// Sync points from history to profiles (fix inconsistencies)
export async function syncUserPoints(userId: string) {
  try {
    const supabase = await getSupabaseClient()
    
    // Get profile ID (points_history.user_id references profiles.id, not profiles.user_id)
    let profileIdForHistory = userId;
    const { data: profileForHistory } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();
    
    if (profileForHistory) {
      profileIdForHistory = profileForHistory.id;
    } else {
      // If not found by user_id, assume userId is already the profile id
      profileIdForHistory = userId;
    }
    
    // Calculate total points from history
    // Try both 'action' and 'action_name' columns
    let history: any[] = [];
    let historyError: any = null;
    
    // Try 'action_name' first (more common)
    const { data: historyWithActionName, error: error1 } = await supabase
      .from('points_history')
      .select('points')
      .eq('user_id', profileIdForHistory); // Use profile.id, not profile.user_id
    
    if (!error1 && historyWithActionName) {
      history = historyWithActionName;
    } else if (error1 && (error1.code === '42703' || error1.message?.includes('column'))) {
      // Try 'action' column instead
      const { data: historyWithAction, error: error2 } = await supabase
        .from('points_history')
        .select('points')
        .eq('user_id', profileIdForHistory); // Use profile.id, not profile.user_id
      
      if (!error2 && historyWithAction) {
        history = historyWithAction;
      } else {
        historyError = error2;
      }
    } else {
      historyError = error1;
    }
    
    if (historyError) {
      console.error('❌ Error fetching points history:', historyError);
      return { success: false, error: historyError.message };
    }
    
    const totalFromHistory = (history || []).reduce((sum, entry) => sum + (entry.points || 0), 0);
    
    // Get current points from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('points, user_id')
      .eq('user_id', userId)
      .single();
    
    if (profileError || !profile) {
      // Try with id if user_id didn't work
      const { data: profileById, error: profileByIdError } = await supabase
        .from('profiles')
        .select('points')
        .eq('id', userId)
        .single();
      
      if (profileByIdError || !profileById) {
        console.error('❌ Error fetching profile:', profileError || profileByIdError);
        return { success: false, error: (profileError || profileByIdError)?.message || 'Profile not found' };
      }
      
      const currentPoints = profileById.points || 0;
      
      if (totalFromHistory !== currentPoints) {
        
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ points: totalFromHistory })
          .eq('id', userId);
        
        if (updateError) {
          console.error('❌ Error updating points:', updateError);
          return { success: false, error: updateError.message };
        }
        
        return { 
          success: true, 
          previousPoints: currentPoints, 
          newPoints: totalFromHistory,
          wasInconsistent: true
        };
      }
      
      return { success: true, points: currentPoints, wasInconsistent: false };
    }
    
    const currentPoints = profile.points || 0;
    
    // If different, update profile
    if (totalFromHistory !== currentPoints) {
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ points: totalFromHistory })
        .eq('user_id', userId);
      
      if (updateError) {
        console.error('❌ Error updating points:', updateError);
        return { success: false, error: updateError.message };
      }
      
      return { 
        success: true, 
        previousPoints: currentPoints, 
        newPoints: totalFromHistory,
        wasInconsistent: true
      };
    }
    
    return { success: true, points: currentPoints, wasInconsistent: false };
  } catch (error: any) {
    console.error('❌ Error syncing points:', error);
    return { success: false, error: error.message };
  }
}

// Sync all users' points (admin function)
export async function syncAllUsersPoints() {
  try {
    const supabase = await getSupabaseClient()
    
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('user_id');
    
    if (error || !profiles) {
      return { success: false, error: error?.message || 'Failed to fetch profiles' };
    }
    
    const results = [];
    let syncedCount = 0;
    let inconsistentCount = 0;
    
    for (const profile of profiles) {
      const result = await syncUserPoints(profile.user_id);
      results.push({ userId: profile.user_id, ...result });
      
      if (result.success && result.wasInconsistent) {
        inconsistentCount++;
      }
      if (result.success) {
        syncedCount++;
      }
    }
    
    
    return { 
      success: true, 
      results,
      synced: syncedCount,
      inconsistent: inconsistentCount,
      total: profiles.length
    };
  } catch (error: any) {
    console.error('❌ Error syncing all points:', error);
    return { success: false, error: error.message };
  }
}