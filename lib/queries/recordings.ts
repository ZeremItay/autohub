import { supabase } from '../supabase'
import { getCached, setCached, CACHE_TTL, invalidateCache } from '../cache'
import { logError, isNotFoundError } from '../utils/errorHandler'

export interface QAItem {
  question: string
  answer: string
}

export interface KeyPoint {
  title: string
  description: string
  url?: string
}

export interface Recording {
  id: string
  title: string
  description?: string
  video_url: string
  thumbnail_url?: string
  category?: string[] // Changed to array to support multiple categories
  duration?: string
  views?: number
  is_new?: boolean
  qa_section?: QAItem[]
  key_points?: KeyPoint[]
  user_id?: string
  created_at?: string
  updated_at?: string
}

// Get all recordings
export async function getAllRecordings() {
  const cacheKey = 'recordings:all';
  const cached = getCached<Recording[]>(cacheKey);
  if (cached) {
    return { data: cached, error: null };
  }

  try {
    // Select only necessary fields for listing page (exclude qa_section and key_points for faster loading)
    // Note: qa_section and key_points are only needed in detail page, not in listing
    const { data, error } = await supabase
      .from('recordings')
      .select('id, title, description, video_url, thumbnail_url, category, duration, views, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(100) // Limit to improve performance
    
    if (error) {
      logError(error, 'getAllRecordings');
      // If specific columns fail, try with * as fallback
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('recordings')
        .select('id, title, description, video_url, thumbnail_url, category, duration, views, created_at, updated_at')
        .order('created_at', { ascending: false })
        .limit(100)
      
      if (fallbackError) {
        logError(fallbackError, 'getAllRecordings:fallback');
        return { data: null, error: fallbackError }
      }
      
      setCached(cacheKey, fallbackData, CACHE_TTL.MEDIUM);
      return { data: fallbackData, error: null }
    }
    
    setCached(cacheKey, data, CACHE_TTL.MEDIUM);
    return { data, error: null }
  } catch (err: any) {
    logError(err, 'getAllRecordings:exception');
    return { data: null, error: err }
  }
}

// Get recording basic info (for fast initial load)
export async function getRecordingBasicById(id: string) {
  const cacheKey = `recording:basic:${id}`;
  const cached = getCached<Recording>(cacheKey);
  if (cached) {
    return { data: cached, error: null };
  }

  const { data, error } = await supabase
    .from('recordings')
    .select('id, title, video_url, thumbnail_url, category, duration, views, created_at')
    .eq('id', id)
    .maybeSingle()
  
  if (error) {
    if (!isNotFoundError(error)) {
      logError(error, 'getRecordingBasicById');
    }
    return { data: null, error }
  }
  
  if (data) {
    setCached(cacheKey, data, CACHE_TTL.SHORT);
  }
  return { data, error: null }
}

// Get recording by ID (full data)
export async function getRecordingById(id: string) {
  const cacheKey = `recording:${id}`;
  const cached = getCached<Recording>(cacheKey);
  if (cached) {
    return { data: cached, error: null };
  }

  const { data, error } = await supabase
    .from('recordings')
    .select('id, title, description, video_url, thumbnail_url, category, duration, views, qa_section, key_points, created_at, updated_at')
    .eq('id', id)
    .maybeSingle()
  
  if (error) {
    if (!isNotFoundError(error)) {
      logError(error, 'getRecordingById');
    }
    return { data: null, error }
  }
  
  if (data) {
    setCached(cacheKey, data, CACHE_TTL.MEDIUM);
  }
  return { data, error: null }
}

// Get recordings by category
export async function getRecordingsByCategory(category: string) {
  const cacheKey = `recordings:category:${category}`;
  const cached = getCached<Recording[]>(cacheKey);
  if (cached) {
    return { data: cached, error: null };
  }

  const { data, error } = await supabase
    .from('recordings')
    .select('id, title, description, video_url, thumbnail_url, category, duration, views, created_at, updated_at')
    .contains('category', [category]) // Use contains for array search
    .order('created_at', { ascending: false })
    .limit(50) // Limit to improve performance
  
  if (error) {
    logError(error, 'getRecordingsByCategory');
    return { data: null, error }
  }
  
  setCached(cacheKey, data, CACHE_TTL.MEDIUM);
  return { data, error: null }
}

// Create recording (admin only)
export async function createRecording(recording: Omit<Recording, 'id' | 'updated_at'> & { created_at?: string }) {
  const insertData: any = {
    ...recording,
    qa_section: recording.qa_section || [],
    key_points: recording.key_points || [],
    updated_at: new Date().toISOString()
  };
  
  // If created_at is provided, use it; otherwise let the database set it automatically
  if (recording.created_at) {
    insertData.created_at = recording.created_at;
  }
  
  const { data, error } = await supabase
    .from('recordings')
    .insert(insertData)
    .select()
    .single()
  
  if (error) {
    logError(error, 'createRecording');
    return { data: null, error }
  }
  
  // Invalidate caches
  invalidateCache('recordings:all');
  
  return { data, error: null }
}

// Update recording (admin only)
export async function updateRecording(id: string, updates: Partial<Recording>) {
  const { data, error } = await supabase
    .from('recordings')
    .update({
      ...updates,
      qa_section: updates.qa_section !== undefined ? updates.qa_section : undefined,
      key_points: updates.key_points !== undefined ? updates.key_points : undefined,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()
  
  if (error) {
    logError(error, 'updateRecording');
    return { data: null, error }
  }
  
  // Invalidate caches
  invalidateCache('recordings:all');
  invalidateCache(`recording:${id}`);
  
  return { data, error: null }
}

// Delete recording (admin only)
export async function deleteRecording(id: string) {
  const { error } = await supabase
    .from('recordings')
    .delete()
    .eq('id', id)
  
  if (error) {
    logError(error, 'deleteRecording');
    return { error }
  }
  
  // Invalidate caches
  invalidateCache('recordings:all');
  invalidateCache(`recording:${id}`);
  
  return { error: null }
}

// Increment views
export async function incrementRecordingViews(id: string) {
  const { data: recording } = await getRecordingById(id)
  if (!recording) return { error: new Error('Recording not found') }
  
  return updateRecording(id, {
    views: (recording.views || 0) + 1
  })
}

