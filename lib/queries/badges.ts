import { supabase } from '../supabase';

export interface Badge {
  id: string;
  name: string;
  icon: string;
  icon_color: string;
  points_threshold: number;
  description?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
  badge?: Badge;
}

// Get all active badges
export async function getActiveBadges() {
  const { data, error } = await supabase
    .from('badges')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .order('points_threshold', { ascending: true });

  if (error) {
    console.error('Error fetching badges:', error);
    return { data: null, error };
  }

  return { data, error: null };
}

// Get all badges (including inactive - for admin)
export async function getAllBadges() {
  const { data, error } = await supabase
    .from('badges')
    .select('*')
    .order('display_order', { ascending: true })
    .order('points_threshold', { ascending: true });

  if (error) {
    console.error('Error fetching all badges:', error);
    return { data: null, error };
  }

  return { data, error: null };
}

// Get user's badges
export async function getUserBadges(userId: string) {
  const { data, error } = await supabase
    .from('user_badges')
    .select(`
      *,
      badge:badge_id (
        id,
        name,
        icon,
        icon_color,
        points_threshold,
        description,
        display_order
      )
    `)
    .eq('user_id', userId)
    .order('earned_at', { ascending: false });

  if (error) {
    console.error('Error fetching user badges:', error);
    return { data: null, error };
  }

  return { data, error: null };
}

// Get user's highest badge (by points threshold)
export async function getUserHighestBadge(userId: string) {
  try {
    // Get all user badges first
    const { data: userBadges, error } = await supabase
      .from('user_badges')
      .select(`
        *,
        badge:badge_id (
          id,
          name,
          icon,
          icon_color,
          points_threshold,
          description,
          display_order
        )
      `)
      .eq('user_id', userId);

    if (error) {
      // Silently fail - badges are not critical
      return { data: null, error: null };
    }

    if (!userBadges || userBadges.length === 0) {
      return { data: null, error: null };
    }

    // Sort by points_threshold in code (can't sort by joined table field in Supabase)
    const sorted = userBadges.sort((a: any, b: any) => {
      const aPoints = a.badge?.points_threshold || 0;
      const bPoints = b.badge?.points_threshold || 0;
      return bPoints - aPoints;
    });

    return { data: sorted[0] || null, error: null };
  } catch (error) {
    // Silently fail - badges are not critical
    return { data: null, error: null };
  }
}

// Create a new badge (admin only)
export async function createBadge(badge: Omit<Badge, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('badges')
    .insert([badge])
    .select()
    .single();

  if (error) {
    console.error('Error creating badge:', error);
    return { data: null, error };
  }

  return { data, error: null };
}

// Update a badge (admin only)
export async function updateBadge(id: string, updates: Partial<Omit<Badge, 'id' | 'created_at'>>) {
  const { data, error } = await supabase
    .from('badges')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating badge:', error);
    return { data: null, error };
  }

  return { data, error: null };
}

// Delete a badge (admin only)
export async function deleteBadge(id: string) {
  const { error } = await supabase
    .from('badges')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting badge:', error);
    return { success: false, error };
  }

  return { success: true, error: null };
}

// Manually check and award badges for a user (admin only or system)
export async function checkAndAwardBadges(userId: string) {
  // Call the database function
  const { error } = await supabase.rpc('check_and_award_badges', {
    target_user_id: userId
  });

  if (error) {
    console.error('Error checking badges:', error);
    return { success: false, error };
  }

  return { success: true, error: null };
}

