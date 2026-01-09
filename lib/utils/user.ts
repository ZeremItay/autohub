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
 * Returns minimal user object if profile loading fails but session exists
 */
export async function getCurrentUser(): Promise<UserWithRole | null> {
  try {
    // Get session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      logError(sessionError, 'getCurrentUser:session');
      return null;
    }

    if (!session?.user) {
      // No session - user is not authenticated
      return null;
    }

    // Try to load full profile
    try {
      const { data: profile, error: profileError } = await getProfile(session.user.id);
      
      if (profile && !profileError) {
        return {
          id: profile.user_id || profile.id,
          ...profile
        };
      }
      
      // If profile loading failed, return minimal user from session
      if (profileError) {
        logError(profileError, 'getCurrentUser:profile');
      }
    } catch (profileError: any) {
      // Profile loading failed - log but return minimal user
      logError(profileError, 'getCurrentUser:profile:exception');
    }
    
    // Return minimal user object from session as fallback
    return {
      id: session.user.id,
      user_id: session.user.id,
      display_name: session.user.email?.split('@')[0] || 'משתמש',
      email: session.user.email
    };
  } catch (error: any) {
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

