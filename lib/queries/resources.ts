import { supabase } from '../supabase';
import { createServerClient, getSupabaseClient } from '../supabase-server';

export interface Resource {
  id: string;
  title: string;
  description?: string;
  file_url: string;
  file_name: string;
  file_size?: number;
  file_type?: string;
  category?: string;
  type?: 'document' | 'video' | 'image' | 'link' | 'audio';
  thumbnail_url?: string;
  external_url?: string;
  is_premium: boolean;
  download_count: number;
  likes_count?: number;
  is_liked?: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
  author?: {
    display_name?: string;
    avatar_url?: string;
    first_name?: string;
    nickname?: string;
  };
}

// Get all resources
export async function getAllResources() {
  try {
    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching resources:', error);
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return { data: null, error };
    }
    
    return { data: Array.isArray(data) ? data : [], error: null };
  } catch (err) {
    console.error('Unexpected error in getAllResources:', err);
    return { 
      data: null, 
      error: err instanceof Error ? err : new Error('Unknown error occurred')
    };
  }
}

// Get resources with details (likes, author)
export async function getResourcesWithDetails(userId?: string, cookieStore?: any) {
  try {
    // Use server client if running on server, client otherwise
    let supabaseClient;
    try {
      if (typeof window !== 'undefined') {
        supabaseClient = supabase;
      } else {
        // If cookieStore is provided, use it; otherwise try to create one
        if (cookieStore) {
          supabaseClient = createServerClient(cookieStore);
        } else {
          // Try to import cookies dynamically
          try {
            const { cookies } = await import('next/headers');
            const cookieStoreInstance = await cookies();
            supabaseClient = createServerClient(cookieStoreInstance);
          } catch (e) {
            // Fallback to getSupabaseClient (uses singleton, service role if available)
            supabaseClient = await getSupabaseClient();
          }
        }
      }
    } catch (e) {
      console.error('Error creating Supabase client:', e);
      // Final fallback
      if (cookieStore) {
        supabaseClient = createServerClient(cookieStore);
      } else {
        supabaseClient = await getSupabaseClient();
      }
    }

    // Get resources with author info
    // Fetch resources and authors separately to avoid foreign key issues
    const { data: resourcesData, error: resourcesOnlyError } = await supabaseClient
      .from('resources')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (resourcesOnlyError) {
      console.error('Error fetching resources:', resourcesOnlyError);
      console.error('Error details:', {
        message: resourcesOnlyError.message,
        code: resourcesOnlyError.code,
        details: resourcesOnlyError.details,
        hint: resourcesOnlyError.hint
      });
      return { data: null, error: resourcesOnlyError };
    }
    
    if (!resourcesData || resourcesData.length === 0) {
      return { data: [], error: null };
    }
    
    // Get unique user IDs from created_by
    const userIds = [...new Set(resourcesData.filter((r: any) => r.created_by).map((r: any) => r.created_by))];
    
    // Fetch profiles for authors
    let profilesMap = new Map();
    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabaseClient
        .from('profiles')
        .select('user_id, display_name, avatar_url, first_name, nickname')
        .in('user_id', userIds);
      
      if (profilesError && process.env.NODE_ENV === 'development') {
        console.warn('Error fetching profiles for resources:', profilesError);
      }
      
      if (profiles) {
        profiles.forEach((profile: any) => {
          profilesMap.set(profile.user_id, profile);
        });
      }
    }
    
    // Combine resources with authors
    const resources = resourcesData.map((resource: any) => ({
      ...resource,
      author: resource.created_by ? profilesMap.get(resource.created_by) : null
    }));
    
    // Error already handled above, continue with processing

    if (!resources || resources.length === 0) {
      return { data: [], error: null };
    }

    // Get likes count for each resource
    const resourceIds = resources.map((r: any) => r.id);
    const { data: likesData, error: likesError } = await supabaseClient
      .from('resource_likes')
      .select('resource_id, user_id')
      .in('resource_id', resourceIds);

    if (likesError && process.env.NODE_ENV === 'development') {
      console.warn('Error fetching likes:', likesError);
    }

    // Count likes per resource and check if user liked
    const likesCountMap = new Map<string, number>();
    const userLikesSet = new Set<string>();

    if (likesData) {
      likesData.forEach((like: any) => {
        const count = likesCountMap.get(like.resource_id) || 0;
        likesCountMap.set(like.resource_id, count + 1);
        
        if (userId && like.user_id === userId) {
          userLikesSet.add(like.resource_id);
        }
      });
    }

    // Combine data
    const resourcesWithDetails = resources.map((resource: any) => ({
      ...resource,
      likes_count: likesCountMap.get(resource.id) || 0,
      is_liked: userId ? userLikesSet.has(resource.id) : false,
      author: resource.author ? {
        display_name: resource.author.display_name || resource.author.first_name || resource.author.nickname,
        avatar_url: resource.author.avatar_url,
        first_name: resource.author.first_name,
        nickname: resource.author.nickname
      } : undefined
    }));

    return { data: resourcesWithDetails, error: null };
  } catch (err) {
    console.error('Unexpected error in getResourcesWithDetails:', err);
    return { 
      data: null, 
      error: err instanceof Error ? err : new Error('Unknown error occurred')
    };
  }
}

// Get resources by type
export async function getResourcesByType(type: 'document' | 'video' | 'image' | 'link' | 'audio', userId?: string) {
  const { data, error } = await getResourcesWithDetails(userId);
  if (error) return { data: null, error };
  return { 
    data: data?.filter((r: any) => r.type === type) || [], 
    error: null 
  };
}

// Get resources by category
export async function getResourcesByCategory(category: string, userId?: string) {
  const { data, error } = await getResourcesWithDetails(userId);
  if (error) return { data: null, error };
  return { 
    data: data?.filter((r: any) => r.category === category) || [], 
    error: null 
  };
}

// Search resources
export async function searchResources(query: string, userId?: string) {
  const { data, error } = await getResourcesWithDetails(userId);
  if (error) return { data: null, error };
  
  const lowerQuery = query.toLowerCase();
  const filtered = data?.filter((r: any) => 
    r.title?.toLowerCase().includes(lowerQuery) ||
    r.description?.toLowerCase().includes(lowerQuery) ||
    r.category?.toLowerCase().includes(lowerQuery)
  ) || [];
  
  return { data: filtered, error: null };
}

// Get resource by ID
export async function getResourceById(id: string) {
  const { data, error } = await supabase
    .from('resources')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error fetching resource:', error);
    return { data: null, error };
  }
  
  return { data, error: null };
}

// Create resource (admin only)
export async function createResource(resource: Omit<Resource, 'id' | 'created_at' | 'updated_at' | 'download_count'>) {
  const { data, error } = await supabase
    .from('resources')
    .insert([{
      ...resource,
      download_count: 0
    }])
    .select()
    .single();
  
  if (error) {
    console.error('Error creating resource:', error);
    return { data: null, error };
  }
  
  return { data, error: null };
}

// Update resource (admin only)
export async function updateResource(id: string, updates: Partial<Resource>) {
  const { data, error } = await supabase
    .from('resources')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating resource:', error);
    return { data: null, error };
  }
  
  return { data, error: null };
}

// Delete resource (admin only)
export async function deleteResource(id: string) {
  const { error } = await supabase
    .from('resources')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting resource:', error);
    return { error };
  }
  
  return { error: null };
}

// Increment download count
export async function incrementDownloadCount(id: string) {
  const { data: resource } = await getResourceById(id);
  if (!resource) return { error: new Error('Resource not found') };
  
  return updateResource(id, {
    download_count: (resource.download_count || 0) + 1
  });
}

// Toggle resource like
export async function toggleResourceLike(resourceId: string, userId: string) {
  try {
    // Check if like exists
    const { data: existingLike, error: checkError } = await supabase
      .from('resource_likes')
      .select('id')
      .eq('resource_id', resourceId)
      .eq('user_id', userId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking like:', checkError);
      return { data: null, error: checkError };
    }

    if (existingLike) {
      // Unlike - delete the like
      const { error: deleteError } = await supabase
        .from('resource_likes')
        .delete()
        .eq('id', existingLike.id);

      if (deleteError) {
        console.error('Error unliking resource:', deleteError);
        return { data: { liked: false }, error: deleteError };
      }

      return { data: { liked: false }, error: null };
    } else {
      // Like - insert new like
      const { data, error: insertError } = await supabase
        .from('resource_likes')
        .insert([{ resource_id: resourceId, user_id: userId }])
        .select()
        .single();

      if (insertError) {
        console.error('Error liking resource:', insertError);
        return { data: null, error: insertError };
      }

      return { data: { liked: true }, error: null };
    }
  } catch (err) {
    console.error('Unexpected error in toggleResourceLike:', err);
    return { 
      data: null, 
      error: err instanceof Error ? err : new Error('Unknown error occurred')
    };
  }
}

// Get resource likes count
export async function getResourceLikesCount(resourceId: string) {
  try {
    const { count, error } = await supabase
      .from('resource_likes')
      .select('*', { count: 'exact', head: true })
      .eq('resource_id', resourceId);

    if (error) {
      console.error('Error getting likes count:', error);
      return { data: 0, error };
    }

    return { data: count || 0, error: null };
  } catch (err) {
    console.error('Unexpected error in getResourceLikesCount:', err);
    return { 
      data: 0, 
      error: err instanceof Error ? err : new Error('Unknown error occurred')
    };
  }
}

