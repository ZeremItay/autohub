import { supabase } from '../supabase';
import { createServerClient, getSupabaseClient } from '../supabase-server';

export interface SystemSetting {
  id: string;
  key: string;
  value: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get a system setting by key
 */
export async function getSystemSetting(key: string): Promise<{ data: SystemSetting | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .eq('key', key)
      .single();

    if (error) {
      // If setting doesn't exist, return null (not an error)
      if (error.code === 'PGRST116') {
        return { data: null, error: null };
      }
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

/**
 * Get registration limit from system settings
 */
export async function getRegistrationLimit(): Promise<{ data: number | null; error: any }> {
  const { data, error } = await getSystemSetting('max_registered_users');
  
  if (error) {
    return { data: null, error };
  }

  if (!data) {
    // Default limit if not set
    return { data: 50, error: null };
  }

  const limit = parseInt(data.value, 10);
  if (isNaN(limit)) {
    return { data: null, error: { message: 'Invalid registration limit value' } };
  }

  return { data: limit, error: null };
}

/**
 * Update registration limit
 */
export async function updateRegistrationLimit(limit: number): Promise<{ data: SystemSetting | null; error: any }> {
  if (limit < 0) {
    return { data: null, error: { message: 'Registration limit must be a positive number' } };
  }

  try {
    // Use appropriate client based on environment
    const supabaseClient = await getSupabaseClient();

    // Check if setting exists
    const { data: existing } = await getSystemSetting('max_registered_users');

    if (existing) {
      // Update existing setting
      const { data, error } = await supabaseClient
        .from('system_settings')
        .update({ 
          value: limit.toString(),
          updated_at: new Date().toISOString()
        })
        .eq('key', 'max_registered_users')
        .select()
        .single();

      if (error) {
        return { data: null, error };
      }

      return { data, error: null };
    } else {
      // Create new setting
      const { data, error } = await supabaseClient
        .from('system_settings')
        .insert({
          key: 'max_registered_users',
          value: limit.toString(),
          description: 'Maximum number of users allowed to register on the platform'
        })
        .select()
        .single();

      if (error) {
        return { data: null, error };
      }

      return { data, error: null };
    }
  } catch (error) {
    return { data: null, error };
  }
}

/**
 * Get current user count from profiles table
 */
export async function getCurrentUserCount(): Promise<{ data: number; error: any }> {
  try {
    const { count, error } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    if (error) {
      return { data: 0, error };
    }

    return { data: count || 0, error: null };
  } catch (error) {
    return { data: 0, error };
  }
}

/**
 * Check if registration is currently available
 */
export async function checkRegistrationAvailable(): Promise<{ available: boolean; currentCount: number; limit: number; error: any }> {
  const [limitResult, countResult] = await Promise.all([
    getRegistrationLimit(),
    getCurrentUserCount()
  ]);

  if (limitResult.error || countResult.error) {
    // If there's an error, allow registration (fail open)
    return { 
      available: true, 
      currentCount: countResult.data, 
      limit: limitResult.data || 999999, 
      error: limitResult.error || countResult.error 
    };
  }

  const limit = limitResult.data || 999999;
  const currentCount = countResult.data;

  return {
    available: currentCount < limit,
    currentCount,
    limit,
    error: null
  };
}

