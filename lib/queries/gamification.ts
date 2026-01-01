import { supabase } from '../supabase'

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
export async function awardPoints(userId: string, actionName: string, options?: { checkDaily?: boolean }) {
  try {
    console.log(`🎯 Awarding points for action: "${actionName}" to user: ${userId}`);
    
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
      console.error('❌ Error fetching gamification rules:', allRulesError?.message || String(allRulesError));
      // If we can't get all rules, silently fail
      return { success: false, error: 'Rule not found', alreadyAwarded: false };
    }
    
    console.log(`📋 Found ${allRules?.length || 0} rules in database`);
    
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
      // Rule not found - log available rules for debugging
      console.warn(`⚠️ Rule not found for action: "${actionName}"`);
      if (allRules && allRules.length > 0) {
        console.log('Available rules:', allRules.map((r: any) => ({
          action_name: r.action_name,
          trigger_action: r.trigger_action,
          description: r.description
        })));
      }
      // Rule not found - silently return (don't fail the app)
      return { success: false, error: 'Rule not found', alreadyAwarded: false }
    }
    
    console.log(`✅ Found rule:`, {
      action_name: rule.action_name,
      trigger_action: rule.trigger_action,
      point_value: rule.point_value,
      description: rule.description
    });
    
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
          .eq('user_id', userId)
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
            .eq('user_id', userId)
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
        console.log(`ℹ️ User already got points today for action: "${actionName}"`);
        return { success: false, error: 'Already awarded today', alreadyAwarded: true }
      }
      
      console.log(`✅ No points awarded today yet for action: "${actionName}"`);
    }
    
    // Add to points history
    // Use the action name from the rule (trigger_action or action_name) to ensure consistency
    // For daily login, prefer the rule's trigger_action/action_name over the passed actionName
    const historyActionName = rule.trigger_action || rule.action_name || actionName;
    
    // Try 'action' column first (most common), then fallback to 'action_name'
    const historyData: any = {
      user_id: userId,
      points: rule.point_value
    };
    
    // Try to determine which column to use by checking a sample record
    try {
      const { data: sampleHistory } = await supabase
        .from('points_history')
        .select('action, action_name')
        .limit(1);
      
      if (sampleHistory && sampleHistory.length > 0) {
        const hasAction = 'action' in sampleHistory[0];
        const hasActionName = 'action_name' in sampleHistory[0];
        
        if (hasAction) {
          historyData.action = historyActionName;
        } else if (hasActionName) {
          historyData.action_name = historyActionName;
        } else {
          // Default to action (most common)
          historyData.action = historyActionName;
        }
      } else {
        // No records yet, try 'action' first (most common)
        historyData.action = historyActionName;
      }
    } catch (error) {
      // If we can't check, default to 'action' (most common)
      historyData.action = historyActionName;
    }
    
    // Try to insert with 'action' first, then fallback to 'action_name' if needed
    let historyError: any = null;
    const { error: insertError } = await supabase
      .from('points_history')
      .insert([historyData])
    
    if (insertError) {
      // If 'action' column doesn't exist, try 'action_name'
      if (insertError.code === 'PGRST204' || insertError.message?.includes('action') || insertError.message?.includes('column')) {
        console.log('⚠️ "action" column not found, trying "action_name" instead');
        const historyDataWithActionName: any = {
          user_id: userId,
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
    
    console.log('✅ Points history added successfully');
    
    // Update user's total points
    // Note: profiles table uses user_id, not id
    const { data: profile } = await supabase
      .from('profiles')
      .select('points')
      .eq('user_id', userId)
      .single()
    
    if (!profile) {
      // Try with id if user_id didn't work
      const { data: profileById } = await supabase
        .from('profiles')
        .select('points')
        .eq('id', userId)
        .single()
      
      if (!profileById) {
        return { success: false, error: 'Profile not found' }
      }
      
      const newPoints = (profileById.points || 0) + rule.point_value
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ points: newPoints })
        .eq('id', userId)
      
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
    
    // Create notification for points award
    try {
      const { createNotification } = await import('./notifications');
      // Get rule description for notification
      const ruleDescription = rule.description || actionName;
      console.log(`📬 Creating notification for ${rule.point_value} points: ${ruleDescription}`);
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
          // Use logError for proper error handling
          const { logError } = await import('@/lib/utils/errorHandler');
          logError(notificationError, 'awardPoints:createNotification');
          
          // Check if it's a table not found error
          if (notificationError.code === 'PGRST205' || notificationError.message?.includes('Could not find the table')) {
            console.warn('⚠️ Notifications table does not exist. Skipping notification creation.');
          } else if (notificationError.message?.includes('type') || notificationError.message?.includes('CHECK') || notificationError.code === '23514') {
            // If 'points' type is not supported, use 'like' as fallback
            console.log('⚠️ Points notification type not supported, using "like" as fallback');
            const { error: likeError } = await createNotification({
              user_id: userId,
              type: 'like',
              title: 'קיבלת נקודות! 🎉',
              message: `קיבלת ${rule.point_value} נקודות עבור: ${ruleDescription}`,
              // No link for points notifications
              is_read: false
            });
            
            if (likeError) {
              if (likeError.code === 'PGRST205' || likeError.message?.includes('Could not find the table')) {
                console.warn('⚠️ Notifications table does not exist. Skipping notification creation.');
              } else {
                console.warn('⚠️ Could not create notification with "like" type either:', likeError);
              }
            } else {
              console.log('✅ Notification created with "like" type');
              // Trigger event to refresh notifications in UI
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('notificationCreated'));
              }
            }
          } else {
            console.warn('⚠️ Error creating notification:', notificationError);
          }
        } else {
          console.log('✅ Notification created successfully');
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
    
    console.log(`🎉 Successfully awarded ${rule.point_value} points! New total: ${newPoints} (via profileById)`);
    return { success: true, points: newPoints }
    }
    
    const newPoints = (profile.points || 0) + rule.point_value
    console.log(`💰 Updating points: ${profile.points || 0} + ${rule.point_value} = ${newPoints}`)
    
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ points: newPoints })
      .eq('user_id', userId)
    
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
    
    // Create notification for points award
    try {
      const { createNotification } = await import('./notifications');
      // Get rule description for notification
      const ruleDescription = rule.description || actionName;
      console.log(`📬 Creating notification for ${rule.point_value} points: ${ruleDescription}`);
      
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
          // Use logError for proper error handling
          const { logError } = await import('@/lib/utils/errorHandler');
          logError(notificationError, 'awardPoints:createNotification');
          
          // Check if it's a table not found error
          if (notificationError.code === 'PGRST205' || notificationError.message?.includes('Could not find the table')) {
            console.warn('⚠️ Notifications table does not exist. Skipping notification creation.');
          } else if (notificationError.message?.includes('type') || notificationError.message?.includes('CHECK') || notificationError.code === '23514') {
            // If 'points' type is not supported, use 'like' as fallback
            console.log('⚠️ Points notification type not supported, using "like" as fallback');
            const { error: likeError } = await createNotification({
              user_id: userId,
              type: 'like',
              title: 'קיבלת נקודות! 🎉',
              message: `קיבלת ${rule.point_value} נקודות עבור: ${ruleDescription}`,
              link: '/profile',
              is_read: false
            });
            
            if (likeError) {
              if (likeError.code === 'PGRST205' || likeError.message?.includes('Could not find the table')) {
                console.warn('⚠️ Notifications table does not exist. Skipping notification creation.');
              } else {
                console.warn('⚠️ Could not create notification with "like" type either:', likeError);
              }
            } else {
              console.log('✅ Notification created with "like" type');
              // Trigger event to refresh notifications in UI
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('notificationCreated'));
              }
            }
          } else {
            console.warn('⚠️ Error creating notification:', notificationError);
          }
        } else {
          console.log('✅ Notification created successfully');
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

// Get user's points history
export async function getUserPointsHistory(userId: string) {
  const { data, error } = await supabase
    .from('points_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching points history:', error?.message || String(error))
    return { data: null, error }
  }
  
  return { data, error: null }
}

// Get user's current points and rank
export async function getUserGamificationStats(userId: string) {
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
