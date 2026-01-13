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
  console.log('[getCurrentUser] Starting...');
  try {
    // Get session directly
    console.log('[getCurrentUser] Calling getSession()...');
    const startTime = Date.now();

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    console.log('[getCurrentUser] getSession() completed in', Date.now() - startTime, 'ms', { hasSession: !!session, sessionError });

    if (sessionError) {
      console.error('[getCurrentUser] Session error:', sessionError);
      return null;
    }

    if (!session?.user) {
      // No session - user is not authenticated
      console.log('[getCurrentUser] No session/user, returning null');
      return null;
    }

    console.log('[getCurrentUser] Session found, userId:', session.user.id);

    // Try to load full profile
    try {
      console.log('[getCurrentUser] Calling getProfile()...');
      const { data: profile, error: profileError } = await getProfile(session.user.id);
      console.log('[getCurrentUser] getProfile() completed', { hasProfile: !!profile, profileError });

      if (profile && !profileError) {
        console.log('[getCurrentUser] Returning full profile');
        return {
          id: profile.user_id || profile.id,
          ...profile
        };
      }

      // If profile loading failed, return minimal user from session
      if (profileError) {
        console.error('[getCurrentUser] Profile error:', profileError);
        logError(profileError, 'getCurrentUser:profile');
      }
    } catch (profileError: any) {
      // Profile loading failed - log but return minimal user
      console.error('[getCurrentUser] Profile exception:', profileError);
      logError(profileError, 'getCurrentUser:profile:exception');
    }

    // Return minimal user object from session as fallback
    console.log('[getCurrentUser] Returning minimal user from session');
    return {
      id: session.user.id,
      user_id: session.user.id,
      display_name: session.user.email?.split('@')[0] || 'משתמש',
      email: session.user.email
    };
  } catch (error: any) {
    console.error('[getCurrentUser] Top-level error:', error);
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

/**
 * Check if user is basic subscription
 */
export function isBasicUser(user: UserWithRole | null | undefined): boolean {
  if (!user) return false;
  
  const roleName = getUserRole(user);
  return roleName === 'basic';
}

/**
 * Check if user has access to live events
 * Returns true for: basic, premium, admin
 */
export function hasLiveAccess(user: UserWithRole | null | undefined): boolean {
  if (!user) return false;
  
  const roleName = getUserRole(user);
  return roleName === 'basic' || roleName === 'premium' || roleName === 'admin';
}

/**
 * Check if user has access to recordings
 * Returns true for: premium, admin only
 */
export function hasRecordingAccess(user: UserWithRole | null | undefined): boolean {
  if (!user) return false;
  
  const roleName = getUserRole(user);
  return roleName === 'premium' || roleName === 'admin';
}

/**
 * Check if user can submit projects without paying points
 * Returns true for: premium, admin only
 */
export function hasFreeProjectSubmission(user: UserWithRole | null | undefined): boolean {
  if (!user) return false;
  
  const roleName = getUserRole(user);
  return roleName === 'premium' || roleName === 'admin';
}
