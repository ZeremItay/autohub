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
    // Add timeout for session check to prevent hanging
    let sessionTimeoutId: NodeJS.Timeout | null = null;
    const sessionTimeoutPromise = new Promise<never>((_, reject) => {
      sessionTimeoutId = setTimeout(() => reject(new Error('Session check timeout')), 5000); // 5 seconds for session check
    });

    const { data: { session } } = await Promise.race([
      supabase.auth.getSession(),
      sessionTimeoutPromise
    ]);

    if (sessionTimeoutId) clearTimeout(sessionTimeoutId);

    if (session?.user) {
      // Use getProfile query function instead of direct supabase call
      // Add timeout for profile loading to prevent hanging
      let profileTimeoutId: NodeJS.Timeout | null = null;
      const profileTimeoutPromise = new Promise<never>((_, reject) => {
        profileTimeoutId = setTimeout(() => reject(new Error('Profile loading timeout')), 10000); // 10 seconds for profile
      });

      try {
        const { data: profile, error } = await Promise.race([
          getProfile(session.user.id),
          profileTimeoutPromise
        ]);

        if (profileTimeoutId) clearTimeout(profileTimeoutId);
        
        if (profile && !error) {
          return {
            id: profile.user_id || profile.id,
            ...profile
          };
        }
      } catch (profileError: any) {
        if (profileTimeoutId) clearTimeout(profileTimeoutId);
        // If profile loading times out, log but don't fail completely
        // Return a minimal user object based on session
        if (profileError?.message?.includes('timeout')) {
          console.warn('Profile loading timed out, using session data');
          return {
            id: session.user.id,
            user_id: session.user.id,
            display_name: session.user.email?.split('@')[0] || 'משתמש',
            email: session.user.email
          };
        }
        throw profileError;
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

