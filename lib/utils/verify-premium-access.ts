/**
 * Verify if a user has premium access
 * Checks for active subscription with premium role, premium role in profile, or admin role
 */

import { createServerClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';

export interface PremiumAccessResult {
  hasAccess: boolean;
  reason: 'active_subscription' | 'premium_role' | 'admin_role' | 'none';
}

/**
 * Verify premium access for a user
 * @param userId - The user ID to check
 * @returns Object with hasAccess boolean and reason
 */
export async function verifyPremiumAccess(userId: string): Promise<PremiumAccessResult> {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    // Get user profile with role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        user_id,
        role_id,
        roles:role_id (
          id,
          name,
          display_name
        )
      `)
      .eq('user_id', userId)
      .maybeSingle();

    if (profileError || !profile) {
      return { hasAccess: false, reason: 'none' };
    }

    const role = profile.roles as any;
    const roleName = typeof role === 'object' ? role?.name : role;

    // Check if user is admin
    if (roleName === 'admin') {
      return { hasAccess: true, reason: 'admin_role' };
    }

    // Check if user has premium role (backward compatibility)
    if (roleName === 'premium') {
      return { hasAccess: true, reason: 'premium_role' };
    }

    // Check for active subscription with premium role
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select(`
        id,
        status,
        role_id,
        roles:role_id (
          id,
          name,
          display_name
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    if (!subscriptionError && subscription) {
      const subscriptionRole = subscription.roles as any;
      const subscriptionRoleName = typeof subscriptionRole === 'object' 
        ? subscriptionRole?.name 
        : subscriptionRole;

      if (subscriptionRoleName === 'premium' || subscriptionRoleName === 'admin') {
        return { hasAccess: true, reason: 'active_subscription' };
      }
    }

    return { hasAccess: false, reason: 'none' };
  } catch (error) {
    console.error('Error verifying premium access:', error);
    return { hasAccess: false, reason: 'none' };
  }
}

/**
 * Simple boolean check for premium access
 */
export async function hasPremiumAccess(userId: string): Promise<boolean> {
  const result = await verifyPremiumAccess(userId);
  return result.hasAccess;
}
