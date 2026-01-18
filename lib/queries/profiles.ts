import { supabase } from '../supabase'
import { getCached, setCached, CACHE_TTL, invalidateCache } from '../cache'
import { logError, isNotFoundError } from '../utils/errorHandler'

export interface SocialLink {
  platform: string
  url: string
}

export interface Profile {
  id: string
  user_id: string
  display_name?: string
  avatar_url?: string
  bio?: string
  headline?: string
  nickname?: string
  experience_level?: string
  points?: number
  rank?: number
  is_online?: boolean
  email?: string
  role_id: string // Required - every profile MUST have a role
  social_links?: SocialLink[]
  hosted_recordings?: string[] // Array of recording IDs that the user has hosted/instructed
  has_seen_completion_message?: boolean // Whether user has seen the profile completion success message
  created_at?: string
  updated_at?: string
}

export interface ProfileWithRole extends Profile {
  role?: {
    id: string
    name: string
    display_name: string
    description?: string
  }
}

// Get profile by user_id with role
// Uses safe_profiles view to hide email from non-owners
export async function getProfile(userId: string) {
  // Check cache first
  const cacheKey = `profile:${userId}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return { data: cached, error: null };
  }


  try {
    const { data, error } = await supabase
      .from('safe_profiles')
      .select(`
        *,
        roles:role_id (
          id,
          name,
          display_name,
          description,
          price
        )
      `)
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('[getProfile] Query error:', error);
      if (!isNotFoundError(error)) {
        logError(error, 'getProfileById');
      }
      return { data: null, error };
    }

    // Cache the result
    if (data) {
      setCached(cacheKey, data, CACHE_TTL.MEDIUM);
    }

    return { data, error: null };
  } catch (err: any) {
    console.error('[getProfile] Exception:', err);
    return { data: null, error: err };
  }
}

// Get profile by id (primary key) with role
// Uses safe_profiles view to hide email from non-owners
export async function getProfileById(profileId: string) {
  const { data, error } = await supabase
    .from('safe_profiles')
    .select(`
      *,
      roles:role_id (
        id,
        name,
        display_name,
        description
      )
    `)
    .eq('id', profileId)
    .single()
  
  if (error) {
    console.error('Error fetching profile:', error)
    return { data: null, error }
  }
  
  return { data, error: null }
}

// Get profile with role (alias for getProfile)
export async function getProfileWithRole(userId: string) {
  return getProfile(userId)
}

// Fields that should never be updated by regular users
const PROTECTED_FIELDS = ['role_id', 'role', 'id', 'user_id', 'created_at'] as const

// Helper function to remove protected fields from updates
function sanitizeProfileUpdates<T extends Record<string, unknown>>(updates: T): Omit<T, typeof PROTECTED_FIELDS[number]> {
  const sanitized = { ...updates }
  for (const field of PROTECTED_FIELDS) {
    delete sanitized[field as keyof typeof sanitized]
  }
  return sanitized
}

// Update profile by user_id
export async function updateProfile(userId: string, updates: Partial<Profile>) {
  // Remove protected fields to prevent privilege escalation
  const safeUpdates = sanitizeProfileUpdates(updates)

  const { data, error } = await supabase
    .from('profiles')
    .update({
      ...safeUpdates,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .select(`
      *,
      roles:role_id (
        id,
        name,
        display_name,
        description
      )
    `)
    .single()
  
  if (error) {
    console.error('Error updating profile:', error)
    return { data: null, error }
  }
  
  return { data, error: null }
}

// Update profile by id (primary key)
export async function updateProfileById(profileId: string, updates: Partial<Profile>) {
  // Remove protected fields to prevent privilege escalation
  const safeUpdates = sanitizeProfileUpdates(updates)

  const { data, error } = await supabase
    .from('profiles')
    .update({
      ...safeUpdates,
      updated_at: new Date().toISOString()
    })
    .eq('id', profileId)
    .select(`
      *,
      roles:role_id (
        id,
        name,
        display_name,
        description
      )
    `)
    .single()
  
  if (error) {
    logError(error, 'updateProfileById');
    return { data: null, error }
  }
  
  // Invalidate caches
  invalidateCache('profiles:all');
  invalidateCache(`profile:id:${profileId}`);
  if (updates.user_id) {
    invalidateCache(`profile:${updates.user_id}`);
  }
  
  return { data, error: null }
}

// Update user role
export async function updateUserRole(userId: string, roleName: 'free' | 'basic' | 'premium' | 'admin') {
  // First get the role ID
  const { data: role, error: roleError } = await supabase
    .from('roles')
    .select('id')
    .eq('name', roleName)
    .single()
  
  if (roleError || !role) {
    return { data: null, error: roleError || new Error('Role not found') }
  }
  
  // Update profile with new role
  return updateProfile(userId, { role_id: role.id })
}

// Get all profiles with their roles
// Helper function to add timeout to Supabase queries
async function withQueryTimeout<T>(
  queryPromise: Promise<{ data: T | null; error: any }>,
  timeoutMs: number = 10000
): Promise<{ data: T | null; error: any }> {
  const timeoutPromise = new Promise<{ data: null; error: any }>((resolve) => {
    setTimeout(() => {
      resolve({ data: null, error: { message: 'Query timeout', code: 'TIMEOUT' } });
    }, timeoutMs);
  });

  return Promise.race([queryPromise, timeoutPromise]);
}

// Uses safe_profiles view to hide email from non-owners
export async function getAllProfiles() {
  const cacheKey = 'profiles:all';
  const cached = getCached(cacheKey);
  if (cached) {
    return { data: Array.isArray(cached) ? cached : (cached ?? null), error: null };
  }

  const result = await withQueryTimeout(
    supabase
      .from('safe_profiles')
      .select(`
        id,
        user_id,
        display_name,
        avatar_url,
        bio,
        headline,
        nickname,
        experience_level,
        points,
        rank,
        is_online,
        role_id,
        created_at,
        updated_at,
        roles:role_id (
          id,
          name,
          display_name,
          description,
          price
        )
      `)
      .order('created_at', { ascending: false })
      .limit(100), // Limit to improve performance
    10000 // 10 second timeout
  )
  
  const data = result.data as any[] | null;
  const error = result.error;
  
  if (error) {
    logError(error, 'getAllProfiles');
    return { data: null, error }
  }
  
  // Use longer cache for profiles (10 minutes) since they don't change frequently
  if (data && Array.isArray(data)) {
    setCached(cacheKey, data, CACHE_TTL.EXTRA_LONG);
    return { data, error: null }
  }
  
  return { data: [], error: null }
}

// Get profiles by user IDs (batch loading)
// Uses safe_profiles view to hide email from non-owners
export async function getProfilesByIds(userIds: string[]) {
  if (!userIds || userIds.length === 0) {
    return { data: [], error: null };
  }

  // Use single query for single user, batch for multiple
  const query = supabase
    .from('safe_profiles')
    .select(`
      id,
      user_id,
      display_name,
      avatar_url,
      bio,
      nickname,
      experience_level,
      points,
      rank,
      is_online,
      role_id,
      created_at,
      updated_at,
      roles:role_id (
        id,
        name,
        display_name,
        description
      )
    `);

  const { data, error } = userIds.length === 1
    ? await query.eq('user_id', userIds[0])
    : await query.in('user_id', userIds);
  
  if (error) {
    logError(error, 'getProfilesByIds');
    return { data: null, error }
  }
  
  return { data: Array.isArray(data) ? data : [], error: null }
}

// Get current user profile (optimized)
export async function getCurrentUserProfile() {
  try {
    // Try to get user from session first (faster)
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select(`
          id,
          user_id,
          display_name,
          avatar_url,
          bio,
          nickname,
          experience_level,
          points,
          rank,
          is_online,
          email,
          role_id,
          created_at,
          updated_at,
          roles:role_id (
            id,
            name,
            display_name,
            description
          )
        `)
        .eq('user_id', session.user.id)
        .maybeSingle();
      
      if (error) {
        if (!isNotFoundError(error)) {
          logError(error, 'getCurrentUserProfile');
        }
        return { data: null, error };
      }
      
      if (profile) {
        return { data: profile, error: null };
      }
    }
    
    // Fallback to getAllProfiles
    const { data: profilesData } = await getAllProfiles();
    const profiles = profilesData as any[];
    if (profiles && profiles.length > 0) {
      const selectedUserId = typeof window !== 'undefined' ? localStorage.getItem('selectedUserId') : null;
      let user = profiles[0];
      
      if (selectedUserId) {
        const foundUser = profiles.find((p: any) => (p.user_id || p.id) === selectedUserId);
        if (foundUser) {
          user = foundUser;
        }
      }
      
      return { data: user, error: null };
    }
    
    return { data: null, error: null };
  } catch (err: any) {
    logError(err, 'getCurrentUserProfile:exception');
    return { data: null, error: err };
  }
}

// Get all roles
export async function getAllRoles() {
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .order('name', { ascending: true })
  
  if (error) {
    logError(error, 'getAllRoles');
    return { data: null, error }
  }
  
  return { data, error: null }
}
