import { supabase } from '../supabase'

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

export interface News {
  id: string
  title: string
  content?: string
  image_url?: string
  link_url?: string
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
}

// Get all active news items for carousel
export async function getActiveNews() {
  const result = await withQueryTimeout(
    supabase
      .from('news')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false }),
    10000 // 10 second timeout
  )
  
  const data = result.data as any[] | null;
  const error = result.error;
  
  if (error) {
    console.error('Error fetching news:', error)
    return { data: null, error }
  }
  
  return { data: Array.isArray(data) ? data : [], error: null }
}

// Get all news items (admin only)
export async function getAllNews() {
  const { data, error } = await supabase
    .from('news')
    .select('*')
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching all news:', error)
    return { data: null, error }
  }
  
  return { data: Array.isArray(data) ? data : [], error: null }
}

// Create news item (admin only)
export async function createNews(news: {
  title: string
  content?: string
  image_url?: string
  link_url?: string
  is_active?: boolean
  display_order?: number
}) {
  const { data, error } = await supabase
    .from('news')
    .insert([news])
    .select()
    .single()
  
  if (error) {
    console.error('Error creating news:', error)
    return { data: null, error }
  }
  
  return { data: Array.isArray(data) ? data : [], error: null }
}

// Update news item (admin only)
export async function updateNews(id: string, news: {
  title?: string
  content?: string
  image_url?: string
  link_url?: string
  is_active?: boolean
  display_order?: number
}) {
  const { data, error } = await supabase
    .from('news')
    .update(news)
    .eq('id', id)
    .select()
    .single()
  
  if (error) {
    console.error('Error updating news:', error)
    return { data: null, error }
  }
  
  return { data: Array.isArray(data) ? data : [], error: null }
}

// Delete news item (admin only)
export async function deleteNews(id: string) {
  const { error } = await supabase
    .from('news')
    .delete()
    .eq('id', id)
  
  if (error) {
    console.error('Error deleting news:', error)
    return { success: false, error }
  }
  
  return { success: true, error: null }
}

