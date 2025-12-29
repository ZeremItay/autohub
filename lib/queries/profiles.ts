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
  nickname?: string
  experience_level?: string
  points?: number
  rank?: number
  is_online?: boolean
  email?: string
  role_id: string // Required - every profile MUST have a role
  social_links?: SocialLink[]
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
export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      *,
      roles:role_id (
        id,
        name,
        display_name,
        description
      )
    `)
    .eq('user_id', userId)
    .single()
  
  if (error) {
    if (!isNotFoundError(error)) {
      logError(error, 'getProfileById');
    }
    return { data: null, error }
  }
  
  return { data, error: null }
}

// Get profile by id (primary key) with role
export async function getProfileById(profileId: string) {
  const { data, error } = await supabase
    .from('profiles')
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

// Update profile by user_id
export async function updateProfile(userId: string, updates: Partial<Profile>) {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      ...updates,
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
  const { data, error } = await supabase
    .from('profiles')
    .update({
      ...updates,
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
export async function updateUserRole(userId: string, roleName: 'free' | 'premium' | 'admin') {
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
export async function getAllProfiles() {
  const cacheKey = 'profiles:all';
  const cached = getCached(cacheKey);
  if (cached) {
    return { data: cached, error: null };
  }

  const { data, error } = await supabase
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
    .order('created_at', { ascending: false })
    .limit(100) // Limit to improve performance
  
  if (error) {
    logError(error, 'getAllProfiles');
    return { data: null, error }
  }
  
  setCached(cacheKey, data, CACHE_TTL.MEDIUM);
  return { data, error: null }
}

// Get profiles by user IDs (batch loading)
export async function getProfilesByIds(userIds: string[]) {
  if (!userIds || userIds.length === 0) {
    return { data: [], error: null };
  }

  // Use single query for single user, batch for multiple
  const query = supabase
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
    `);

  const { data, error } = userIds.length === 1
    ? await query.eq('user_id', userIds[0])
    : await query.in('user_id', userIds);
  
  if (error) {
    logError(error, 'getProfilesByIds');
    return { data: null, error }
  }
  
  return { data: data || [], error: null }
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
    const { data: profiles } = await getAllProfiles();
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
