import { supabase } from '../supabase';
import type { User } from '@supabase/supabase-js';

/**
 * Ensures a user profile exists in the profiles table
 * Creates a new profile if one doesn't exist, using data from Google OAuth
 * @param user - The authenticated user from Supabase Auth
 * @returns The profile data or null if creation failed
 */
export async function ensureUserProfile(user: User) {
  if (!user) {
    console.error('ensureUserProfile: No user provided');
    return null;
  }

  try {
    // Check if profile already exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 is "not found" which is expected for new users
      console.error('Error checking for existing profile:', checkError);
    }

    // If profile exists, return it
    if (existingProfile) {
      return existingProfile;
    }

    // Profile doesn't exist - create it
    // Get user metadata from Google OAuth
    const userMetadata = user.user_metadata || {};
    const email = user.email || '';
    
    // Extract name from Google metadata
    // Google provides: full_name, name, or we can use email prefix
    const displayName = 
      userMetadata.full_name || 
      userMetadata.name || 
      userMetadata.display_name ||
      email.split('@')[0] || 
      'משתמש';

    // Extract first and last name if available
    const fullName = userMetadata.full_name || userMetadata.name || '';
    const nameParts = fullName.split(' ');
    const firstName = nameParts[0] || null;
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null;

    // Get avatar URL from Google
    const avatarUrl = userMetadata.avatar_url || userMetadata.picture || null;

    // Get free role ID
    const { data: freeRole, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'free')
      .single();

    if (roleError) {
      console.error('Error fetching free role:', roleError);
    }

    const freeRoleId = freeRole?.id || null;

    // Create new profile
    const { data: newProfile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        user_id: user.id,
        email: email,
        display_name: displayName,
        first_name: firstName,
        last_name: lastName,
        nickname: displayName,
        avatar_url: avatarUrl,
        role_id: freeRoleId,
        points: 0,
        is_online: true
      })
      .select()
      .single();

    if (profileError) {
      console.error('Error creating profile:', profileError);
      return null;
    }

    console.log('Profile created successfully for user:', user.id);
    return newProfile;
  } catch (error) {
    console.error('Error in ensureUserProfile:', error);
    return null;
  }
}

