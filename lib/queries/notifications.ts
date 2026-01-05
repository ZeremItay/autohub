import { createServerClient } from '../supabase-server';

export interface Notification {
  id: string;
  user_id: string;
  type: 'comment' | 'reply' | 'mention' | 'like' | 'follow' | 'project_offer' | 'forum_reply' | 'forum_mention' | 'points';
  title: string;
  message: string;
  link?: string;
  related_id?: string;
  related_type?: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

// Get all notifications for a user with pagination support
export async function getUserNotifications(
  userId: string, 
  options?: { 
    limit?: number; 
    offset?: number; 
    maxNotifications?: number;
  }
) {
  const supabase = createServerClient();
  const limit = options?.limit || 50;
  const offset = options?.offset || 0;
  const maxNotifications = options?.maxNotifications || 60;
  
  // First, get total count (capped at maxNotifications)
  const { count: totalCount, error: countError } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  
  if (countError) {
    console.error('Error fetching notifications count:', countError);
    // If table doesn't exist or RLS issue, return empty array instead of error
    if (countError.code === 'PGRST116' || countError.message?.includes('relation') || countError.message?.includes('permission')) {
      return { data: [], total: 0, error: null };
    }
    return { data: null, total: 0, error: countError };
  }
  
  const total = Math.min(totalCount || 0, maxNotifications);
  
  // Get paginated notifications
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
    .limit(limit);
  
  if (error) {
    console.error('Error fetching notifications:', error);
    // If table doesn't exist or RLS issue, return empty array instead of error
    if (error.code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('permission')) {
      return { data: [], total: 0, error: null };
    }
    return { data: null, total: 0, error };
  }
  
  return { data: Array.isArray(data) ? data : [], total, error: null };
}

// Get unread notifications count
export async function getUnreadNotificationsCount(userId: string) {
  const supabase = createServerClient();
  
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  
  if (error) {
    console.error('Error fetching unread count:', error);
    // If table doesn't exist or RLS issue, return 0 instead of error
    if (error.code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('permission')) {
      return { count: 0, error: null };
    }
    return { count: 0, error };
  }
  
  return { count: count || 0, error: null };
}

// Mark notification as read
export async function markNotificationAsRead(notificationId: string) {
  const supabase = createServerClient();
  
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, updated_at: new Date().toISOString() })
    .eq('id', notificationId);
  
  if (error) {
    console.error('Error marking notification as read:', error);
    return { error };
  }
  
  return { error: null };
}

// Mark all notifications as read
export async function markAllNotificationsAsRead(userId: string) {
  const supabase = createServerClient();
  
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('is_read', false);
  
  if (error) {
    console.error('Error marking all notifications as read:', error);
    return { error };
  }
  
  return { error: null };
}

// Create a notification
export async function createNotification(notification: Omit<Notification, 'id' | 'created_at' | 'updated_at'>) {
  // Log notification creation attempt
  console.log('📬 Creating notification:', {
    user_id: notification.user_id,
    type: notification.type,
    title: notification.title,
    message: notification.message?.substring(0, 50) + '...'
  });

  // Try to use API route if available (server-side), fallback to direct supabase call
  if (typeof window === 'undefined') {
    // Server-side: use direct supabase call
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('notifications')
      .insert([notification])
      .select()
      .single();
    
    if (error) {
      // Log the full error object for debugging
      const errorInfo: any = {
        code: error.code || null,
        message: error.message || null,
        details: error.details || null,
        hint: error.hint || null,
        fullError: error
      };
      
      // Always log in development, log important errors in production
      if (process.env.NODE_ENV === 'development' || error.code || error.message) {
        if (Object.keys(errorInfo).filter(k => errorInfo[k] !== null).length > 0) {
          console.error('❌ Error creating notification:', errorInfo);
        } else {
          console.warn('⚠️ Notification creation failed (no error details available)', {
            notification: {
              user_id: notification.user_id,
              type: notification.type,
              title: notification.title
            },
            rawError: error
          });
        }
      }
      
      // Check for specific error types
      if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️ Notifications table does not exist in schema cache');
        }
      } else if (error.code === '23514' || error.message?.includes('CHECK constraint') || error.message?.includes('violates check constraint')) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️ Notification type not allowed in CHECK constraint. Available types may not include:', notification.type);
        }
      } else if (error.code === '42501' || error.message?.includes('permission') || error.message?.includes('row-level security')) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️ RLS policy violation - user may not have permission to create notification');
        }
      }
      
      return { data: null, error };
    }
    
    console.log('✅ Notification created successfully:', {
      id: data?.id,
      type: data?.type,
      user_id: data?.user_id
    });
    
    return { data, error: null };
  } else {
    // Client-side: use API route
    try {
      const siteUrl = window.location.origin;
      const response = await fetch(`${siteUrl}/api/notifications/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notification),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('❌ Error creating notification via API:', result);
        return { data: null, error: result };
      }

      console.log('✅ Notification created successfully via API:', {
        id: result.data?.id,
        type: result.data?.type,
        user_id: result.data?.user_id
      });

      return { data: result.data, error: null };
    } catch (fetchError: any) {
      console.error('❌ Error calling notification API:', fetchError);
      return { data: null, error: fetchError };
    }
  }
}

// Delete a notification
export async function deleteNotification(notificationId: string) {
  const supabase = createServerClient();
  
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId);
  
  if (error) {
    console.error('Error deleting notification:', error);
    return { error };
  }
  
  return { error: null };
}

// Delete old notifications, keeping only the most recent ones
export async function deleteOldNotifications(userId: string, keepCount: number = 60) {
  const supabase = createServerClient();
  
  try {
    // First, get all notification IDs ordered by created_at DESC
    const { data: allNotifications, error: fetchError } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (fetchError) {
      console.error('Error fetching notifications for deletion:', fetchError);
      return { error: fetchError };
    }
    
    if (!allNotifications || allNotifications.length <= keepCount) {
      // No need to delete anything
      return { deletedCount: 0, error: null };
    }
    
    // Get IDs of notifications to delete (everything after keepCount)
    const notificationsToDelete = allNotifications.slice(keepCount);
    const idsToDelete = notificationsToDelete.map(n => n.id);
    
    if (idsToDelete.length === 0) {
      return { deletedCount: 0, error: null };
    }
    
    // Delete old notifications
    const { error: deleteError } = await supabase
      .from('notifications')
      .delete()
      .in('id', idsToDelete);
    
    if (deleteError) {
      console.error('Error deleting old notifications:', deleteError);
      return { error: deleteError };
    }
    
    return { deletedCount: idsToDelete.length, error: null };
  } catch (error: any) {
    console.error('Unexpected error in deleteOldNotifications:', error);
    return { error };
  }
}

