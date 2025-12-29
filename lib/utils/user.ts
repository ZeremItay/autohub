import { supabase } from '../supabase';
import { getAllProfiles, getProfile } from '../queries/profiles';
import { logError } from './errorHandler';

export interface UserWithRole {
  id?: string;
  user_id?: string;
  display_name?: string;
  avatar_url?: string;
  roles?: {
    id: string;
    name: string;
    display_name?: string;
  };
  role?: {
    id: string;
    name: string;
    display_name?: string;
  };
  [key: string]: any;
}

/**
 * Get current user from session
 * Returns null if no active session (user is not authenticated)
 */
export async function getCurrentUser(): Promise<UserWithRole | null> {
  try {
    // Try to get user from session first (faster)
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      // Use getProfile query function instead of direct supabase call
      const { data: profile, error } = await getProfile(session.user.id);
      
      if (profile && !error) {
        return {
          id: profile.user_id || profile.id,
          ...profile
        };
      }
    }
    
    // No session - user is not authenticated
    return null;
  } catch (error) {
    logError(error, 'getCurrentUser');
    return null;
  }
}

/**
 * Get user role name from user object
 */
export function getUserRole(user: UserWithRole | null | undefined): string | null {
  if (!user) return null;
  
  const role = user.roles || user.role;
  if (!role) return null;
  
  return typeof role === 'object' ? role.name : role;
}

/**
 * Check if user is premium or admin
 */
export function isPremiumUser(user: UserWithRole | null | undefined): boolean {
  if (!user) return false;
  
  const roleName = getUserRole(user);
  return roleName === 'premium' || roleName === 'admin';
}

/**
 * Check if user is admin
 */
export function isAdmin(user: UserWithRole | null | undefined): boolean {
  if (!user) return false;
  
  const roleName = getUserRole(user);
  return roleName === 'admin';
}

