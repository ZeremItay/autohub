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
  instructor_name?: string
  instructor_title?: string
  instructor_avatar_url?: string
  instructor_user_id?: string
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
      .select('id, title, description, video_url, thumbnail_url, category, duration, views, created_at, updated_at, instructor_name, instructor_title, instructor_avatar_url, instructor_user_id')
      .order('created_at', { ascending: false })
      .limit(100) // Limit to improve performance
    
    if (error) {
      logError(error, 'getAllRecordings');
      // If specific columns fail, try with * as fallback
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('recordings')
        .select('id, title, description, video_url, thumbnail_url, category, duration, views, created_at, updated_at, instructor_name, instructor_title, instructor_avatar_url, instructor_user_id')
        .order('created_at', { ascending: false })
        .limit(100)
      
      if (fallbackError) {
        logError(fallbackError, 'getAllRecordings:fallback');
        return { data: null, error: fallbackError }
      }
      
      setCached(cacheKey, fallbackData, CACHE_TTL.MEDIUM);
      return { data: Array.isArray(fallbackData) ? fallbackData : [], error: null }
    }
    
    setCached(cacheKey, data, CACHE_TTL.MEDIUM);
    return { data: Array.isArray(data) ? data : [], error: null }
  } catch (err: any) {
    logError(err, 'getAllRecordings:exception');
    return { data: null, error: err }
  }
}

// Get recordings with pagination
export async function getRecordingsPaginated(page: number = 1, limit: number = 6, sortBy: string = 'recently-active') {
  const funcStartTime = Date.now();
  const cacheKey = `recordings:paginated:${page}:${limit}:${sortBy}`;
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'recordings.ts:81',message:'getRecordingsPaginated START',data:{page,limit,sortBy,cacheKey},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  
  const cached = getCached<{ data: Recording[], totalCount: number }>(cacheKey);
  if (cached) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'recordings.ts:85',message:'CACHE HIT',data:{cacheKey,dataLength:cached.data?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    return { data: cached.data, totalCount: cached.totalCount, error: null };
  }
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'recordings.ts:88',message:'CACHE MISS - querying DB',data:{cacheKey},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion

  try {
    // Calculate range for pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Build query - use 'planned' count for better performance (much faster than 'exact')
    // 'planned' uses table statistics and is good enough for pagination
    let query = supabase
      .from('recordings')
      .select('id, title, description, video_url, thumbnail_url, category, duration, views, created_at, updated_at, instructor_name, instructor_title, instructor_avatar_url, instructor_user_id', { count: 'planned' });

    // Apply sorting
    if (sortBy === 'recently-active') {
      query = query.order('created_at', { ascending: false });
    } else if (sortBy === 'views') {
      query = query.order('views', { ascending: false, nullsFirst: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    // Apply pagination
    const dbQueryStartTime = Date.now();
    const { data, error, count } = await query.range(from, to);
    const dbQueryDuration = Date.now() - dbQueryStartTime;
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'recordings.ts:109',message:'DB QUERY RESULT',data:{dbQueryDuration,hasData:!!data,dataLength:data?.length||0,count,hasError:!!error,errorMessage:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    if (error) {
      logError(error, 'getRecordingsPaginated');
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'recordings.ts:112',message:'DB QUERY ERROR',data:{error:error.message,dbQueryDuration},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      return { data: null, totalCount: 0, error };
    }

    const recordings = Array.isArray(data) ? data : [];
    const totalCount = count || 0;
    const totalDuration = Date.now() - funcStartTime;

    // Cache the result
    setCached(cacheKey, { data: recordings, totalCount }, CACHE_TTL.SHORT);
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'recordings.ts:122',message:'getRecordingsPaginated SUCCESS',data:{totalDuration,dbQueryDuration,recordingsLength:recordings.length,totalCount},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    return { data: recordings, totalCount, error: null };
  } catch (err: any) {
    logError(err, 'getRecordingsPaginated:exception');
    return { data: null, totalCount: 0, error: err };
  }
}

// Get recording basic info (for fast initial load)
export async function getRecordingBasicById(id: string) {
  const cacheKey = `recording:basic:${id}`;
  const cached = getCached<Recording>(cacheKey);
  if (cached) {
    return { data: cached ?? null, error: null };
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
    return { data: cached ?? null, error: null };
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
  // Build update object, only including fields that are explicitly provided
  // This prevents accidentally clearing fields that weren't meant to be updated
  const updateData: any = {
    updated_at: new Date().toISOString()
  };
  
  // Only include fields that are explicitly provided (not undefined)
  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.description !== undefined) {
    // Allow empty string to clear description, but preserve if undefined
    updateData.description = updates.description || null;
  }
  if (updates.video_url !== undefined) updateData.video_url = updates.video_url;
  if (updates.thumbnail_url !== undefined) updateData.thumbnail_url = updates.thumbnail_url;
  if (updates.category !== undefined) updateData.category = updates.category;
  if (updates.duration !== undefined) updateData.duration = updates.duration;
  if (updates.views !== undefined) updateData.views = updates.views;
  if (updates.is_new !== undefined) updateData.is_new = updates.is_new;
  if (updates.user_id !== undefined) updateData.user_id = updates.user_id;
  if (updates.instructor_name !== undefined) updateData.instructor_name = updates.instructor_name;
  if (updates.instructor_title !== undefined) updateData.instructor_title = updates.instructor_title;
  if (updates.instructor_avatar_url !== undefined) updateData.instructor_avatar_url = updates.instructor_avatar_url;
  if (updates.instructor_user_id !== undefined) updateData.instructor_user_id = updates.instructor_user_id;
  
  // Handle qa_section and key_points specially
  if (updates.qa_section !== undefined) {
    updateData.qa_section = updates.qa_section || [];
  }
  if (updates.key_points !== undefined) {
    updateData.key_points = updates.key_points || [];
  }
  
  const { data, error } = await supabase
    .from('recordings')
    .update(updateData)
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

