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
  let sessionTimeoutId: NodeJS.Timeout | null = null;
  let profileTimeoutId: NodeJS.Timeout | null = null;
  
  try {
    // Try to get user from session first (faster)
    // Add timeout for session check to prevent hanging
    const sessionTimeoutPromise = new Promise<never>((_, reject) => {
      sessionTimeoutId = setTimeout(() => reject(new Error('Session check timeout')), 5000); // 5 seconds for session check
    });

    let sessionResult;
    try {
      sessionResult = await Promise.race([
        supabase.auth.getSession(),
        sessionTimeoutPromise
      ]);
    } catch (raceError: any) {
      // Suppress Chrome extension errors
      if (raceError?.message?.includes('message channel') || 
          raceError?.message?.includes('asynchronous response')) {
        console.warn('Chrome extension error suppressed, retrying session check...');
        // Retry without race to avoid extension interference
        const { data: { session } } = await supabase.auth.getSession();
        sessionResult = { data: { session } };
      } else {
        throw raceError;
      }
    } finally {
      if (sessionTimeoutId) {
        clearTimeout(sessionTimeoutId);
        sessionTimeoutId = null;
      }
    }

    const { data: { session } } = sessionResult;

    if (session?.user) {
      // Use getProfile query function instead of direct supabase call
      // Add timeout for profile loading to prevent hanging
      const profileTimeoutPromise = new Promise<never>((_, reject) => {
        profileTimeoutId = setTimeout(() => reject(new Error('Profile loading timeout')), 10000); // 10 seconds for profile
      });

      try {
        let profileResult;
        try {
          profileResult = await Promise.race([
            getProfile(session.user.id),
            profileTimeoutPromise
          ]);
        } catch (raceError: any) {
          // Suppress Chrome extension errors
          if (raceError?.message?.includes('message channel') || 
              raceError?.message?.includes('asynchronous response')) {
            console.warn('Chrome extension error suppressed, retrying profile load...');
            // Retry without race to avoid extension interference
            profileResult = await getProfile(session.user.id);
          } else {
            throw raceError;
          }
        } finally {
          if (profileTimeoutId) {
            clearTimeout(profileTimeoutId);
            profileTimeoutId = null;
          }
        }

        const { data: profile, error } = profileResult;
        
        if (profile && !error) {
          return {
            id: profile.user_id || profile.id,
            ...profile
          };
        }
      } catch (profileError: any) {
        // If profile loading times out, log but don't fail completely
        // Return a minimal user object based on session
        if (profileError?.message?.includes('timeout') || 
            profileError?.message?.includes('message channel') ||
            profileError?.message?.includes('asynchronous response')) {
          console.warn('Profile loading timed out or extension error, using session data');
          return {
            id: session.user.id,
            user_id: session.user.id,
            display_name: session.user.email?.split('@')[0] || 'משתמש',
            email: session.user.email
          };
        }
        // Only throw if it's not a Chrome extension error
        if (!profileError?.message?.includes('message channel') && 
            !profileError?.message?.includes('asynchronous response')) {
          throw profileError;
        }
        // For extension errors, return minimal user
        return {
          id: session.user.id,
          user_id: session.user.id,
          display_name: session.user.email?.split('@')[0] || 'משתמש',
          email: session.user.email
        };
      }
    }
    
    // No session - user is not authenticated
    return null;
  } catch (error: any) {
    // Suppress Chrome extension errors - they don't affect functionality
    if (error?.message?.includes('message channel') || 
        error?.message?.includes('asynchronous response')) {
      console.warn('Chrome extension error suppressed in getCurrentUser');
      // Try to get session without race to avoid extension interference
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          return {
            id: session.user.id,
            user_id: session.user.id,
            display_name: session.user.email?.split('@')[0] || 'משתמש',
            email: session.user.email
          };
        }
      } catch (retryError) {
        // If retry also fails, return null
        logError(retryError, 'getCurrentUser:retry');
      }
      return null;
    }
    logError(error, 'getCurrentUser');
    return null;
  } finally {
    // Ensure timeouts are always cleared
    if (sessionTimeoutId) clearTimeout(sessionTimeoutId);
    if (profileTimeoutId) clearTimeout(profileTimeoutId);
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

