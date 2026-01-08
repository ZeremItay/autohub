import { createServerClient } from '../supabase-server';

export interface EmailPreferences {
  id?: string;
  user_id: string;
  forum_reply: boolean;
  new_project: boolean;
  created_at?: string;
  updated_at?: string;
}

// Get email preferences for a user
export async function getEmailPreferences(userId: string): Promise<{ data: EmailPreferences | null; error: any }> {
  try {
    const supabase = createServerClient();
    
    const { data, error } = await supabase
      .from('email_notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching email preferences:', error);
      return { data: null, error };
    }

    // If no preferences exist, return default values
    if (!data) {
      return {
        data: {
          user_id: userId,
          forum_reply: true,  // Default: users receive forum reply notifications
          new_project: true, // Default: users receive new project notifications
        },
        error: null
      };
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('Error in getEmailPreferences:', error);
    return { data: null, error };
  }
}

// Update email preferences for a user
export async function updateEmailPreferences(
  userId: string,
  preferences: Partial<Pick<EmailPreferences, 'forum_reply' | 'new_project'>>
): Promise<{ data: EmailPreferences | null; error: any }> {
  try {
    const supabase = createServerClient();

    // Check if preferences exist
    const { data: existing } = await supabase
      .from('email_notification_preferences')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      // Update existing preferences
      const { data, error } = await supabase
        .from('email_notification_preferences')
        .update({
          ...preferences,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating email preferences:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } else {
      // Insert new preferences
      const { data, error } = await supabase
        .from('email_notification_preferences')
        .insert({
          user_id: userId,
          forum_reply: preferences.forum_reply ?? true,
          new_project: preferences.new_project ?? true,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating email preferences:', error);
        return { data: null, error };
      }

      return { data, error: null };
    }
  } catch (error: any) {
    console.error('Error in updateEmailPreferences:', error);
    return { data: null, error };
  }
}

// Check if we should send an email notification to a user
export async function shouldSendEmail(
  userId: string,
  notificationType: 'forum_reply' | 'new_project'
): Promise<boolean> {
  try {
    const { data, error } = await getEmailPreferences(userId);

    if (error || !data) {
      // If there's an error or no preferences, use defaults
      // Default: send both forum_reply and new_project
      return true;
    }

    return data[notificationType] === true;
  } catch (error) {
    console.error('Error in shouldSendEmail:', error);
    // Default: send all notifications
    return true;
  }
}

// Get all users who want to receive new project notifications
export async function getUsersForNewProjectNotifications(): Promise<{ data: string[]; error: any }> {
  try {
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('email_notification_preferences')
      .select('user_id')
      .eq('new_project', true);

    if (error) {
      console.error('Error fetching users for new project notifications:', error);
      return { data: [], error };
    }

    const userIds = (data || []).map((pref: any) => pref.user_id);
    return { data: userIds, error: null };
  } catch (error: any) {
    console.error('Error in getUsersForNewProjectNotifications:', error);
    return { data: [], error };
  }
}

