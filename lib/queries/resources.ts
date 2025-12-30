import { supabase } from '../supabase';

export interface Resource {
  id: string;
  title: string;
  description?: string;
  file_url: string;
  file_name: string;
  file_size?: number;
  file_type?: string;
  category?: string;
  is_premium: boolean;
  download_count: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
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

