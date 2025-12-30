import { supabase } from '../supabase'
import { getCached, setCached, invalidateCache } from '../cache'

export interface Tag {
  id: string
  name: string
  slug: string
  description?: string
  color?: string
  icon?: string
  usage_count?: number
  is_approved: boolean
  created_by?: string
  created_at?: string
  updated_at?: string
}

export interface TagAssignment {
  id: string
  tag_id: string
  content_type: 'project' | 'recording' | 'course' | 'post' | 'blog_post' | 'event'
  content_id: string
  created_at?: string
  tag?: Tag
}

// Helper function to generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

// Get all tags (approved only for non-admins)
export async function getAllTags(includeUnapproved: boolean = false) {
  const cacheKey = includeUnapproved ? 'tags:all:with-unapproved' : 'tags:all';
  const cached = getCached(cacheKey);
  if (cached) {
    return { data: Array.isArray(cached) ? cached : (cached ?? null), error: null };
  }

  let query = supabase
    .from('tags')
    .select('*')
    .order('usage_count', { ascending: false })
    .order('name', { ascending: true })

  if (!includeUnapproved) {
    query = query.eq('is_approved', true)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching tags:', error)
    // If table doesn't exist, return empty array instead of error
    if (error.code === '42P01' || error.message?.includes('does not exist')) {
      console.warn('Tags table does not exist yet. Please run the SQL migration first.')
      return { data: [], error: null }
    }
    return { data: null, error }
  }

  setCached(cacheKey, data, 300000); // Cache for 5 minutes
  return { data: Array.isArray(data) ? data : [], error: null }
}

// Get tag by ID
export async function getTagById(id: string) {
  const cacheKey = `tag:${id}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return { data: Array.isArray(cached) ? cached : (cached ?? null), error: null };
  }

  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching tag:', error)
    return { data: null, error }
  }

  setCached(cacheKey, data, 300000);
  return { data: Array.isArray(data) ? data : (data ?? null), error: null }
}

// Get tag by slug
export async function getTagBySlug(slug: string) {
  const cacheKey = `tag:slug:${slug}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return { data: Array.isArray(cached) ? cached : (cached ?? null), error: null };
  }

  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .eq('slug', slug)
    .eq('is_approved', true)
    .single()

  if (error) {
    console.error('Error fetching tag by slug:', error)
    return { data: null, error }
  }

  setCached(cacheKey, data, 300000);
  return { data: Array.isArray(data) ? data : (data ?? null), error: null }
}

// Create tag
export async function createTag(tag: Omit<Tag, 'id' | 'created_at' | 'updated_at' | 'usage_count'>) {
  // Generate slug if not provided
  const slug = tag.slug || generateSlug(tag.name)

  const { data, error } = await supabase
    .from('tags')
    .insert([{
      ...tag,
      slug,
      updated_at: new Date().toISOString()
    }])
    .select()
    .single()

  if (error) {
    console.error('Error creating tag:', error)
    return { data: null, error }
  }

  invalidateCache('tags:all');
  invalidateCache('tags:all:with-unapproved');
  return { data, error: null }
}

// Update tag
export async function updateTag(id: string, updates: Partial<Tag>) {
  // Regenerate slug if name changed
  let finalUpdates = { ...updates, updated_at: new Date().toISOString() }
  if (updates.name && !updates.slug) {
    finalUpdates.slug = generateSlug(updates.name)
  }

  const { data, error } = await supabase
    .from('tags')
    .update(finalUpdates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating tag:', error)
    return { data: null, error }
  }

  invalidateCache('tags:all');
  invalidateCache('tags:all:with-unapproved');
  invalidateCache(`tag:${id}`);
  if (data.slug) {
    invalidateCache(`tag:slug:${data.slug}`);
  }
  return { data, error: null }
}

// Delete tag
export async function deleteTag(id: string) {
  const { data, error } = await supabase
    .from('tags')
    .delete()
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error deleting tag:', error)
    return { data: null, error }
  }

  invalidateCache('tags:all');
  invalidateCache('tags:all:with-unapproved');
  invalidateCache(`tag:${id}`);
  if (data.slug) {
    invalidateCache(`tag:slug:${data.slug}`);
  }
  return { data, error: null }
}

// Get tags by content
export async function getTagsByContent(contentType: string, contentId: string) {
  const cacheKey = `tags:${contentType}:${contentId}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return { data: Array.isArray(cached) ? cached : (cached ?? null), error: null };
  }

  const { data, error } = await supabase
    .from('tag_assignments')
    .select(`
      *,
      tag:tags (*)
    `)
    .eq('content_type', contentType)
    .eq('content_id', contentId)
    .eq('tag.is_approved', true)

  if (error) {
    console.error('Error fetching tags by content:', error)
    return { data: null, error }
  }

  setCached(cacheKey, data, 300000);
  return { data: Array.isArray(data) ? data : (data ?? null), error: null }
}

// Assign tags to content
export async function assignTagsToContent(
  contentType: string,
  contentId: string,
  tagIds: string[]
) {
  // Remove existing assignments first
  await supabase
    .from('tag_assignments')
    .delete()
    .eq('content_type', contentType)
    .eq('content_id', contentId)

  if (tagIds.length === 0) {
    invalidateCache(`tags:${contentType}:${contentId}`);
    return { data: [], error: null }
  }

  // Create new assignments
  const assignments = tagIds.map(tagId => ({
    tag_id: tagId,
    content_type: contentType,
    content_id: contentId
  }))

  const { data, error } = await supabase
    .from('tag_assignments')
    .insert(assignments)
    .select(`
      *,
      tag:tags (*)
    `)

  if (error) {
    console.error('Error assigning tags:', error)
    return { data: null, error }
  }

  invalidateCache(`tags:${contentType}:${contentId}`);
  // Invalidate tag caches to update usage_count
  tagIds.forEach(tagId => {
    invalidateCache(`tag:${tagId}`);
  })
  invalidateCache('tags:all');
  invalidateCache('tags:all:with-unapproved');

  return { data, error: null }
}

// Remove tags from content
export async function removeTagsFromContent(
  contentType: string,
  contentId: string,
  tagIds: string[]
) {
  const { data, error } = await supabase
    .from('tag_assignments')
    .delete()
    .eq('content_type', contentType)
    .eq('content_id', contentId)
    .in('tag_id', tagIds)
    .select()

  if (error) {
    console.error('Error removing tags:', error)
    return { data: null, error }
  }

  invalidateCache(`tags:${contentType}:${contentId}`);
  // Invalidate tag caches to update usage_count
  tagIds.forEach(tagId => {
    invalidateCache(`tag:${tagId}`);
  })
  invalidateCache('tags:all');
  invalidateCache('tags:all:with-unapproved');

  return { data, error: null }
}

// Get content by tag
export async function getContentByTag(
  tagId: string,
  contentType?: string
) {
  let query = supabase
    .from('tag_assignments')
    .select('*')
    .eq('tag_id', tagId)

  if (contentType) {
    query = query.eq('content_type', contentType)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching content by tag:', error)
    return { data: null, error }
  }

  return { data, error: null }
}

// Suggest tag (create with is_approved=false)
export async function suggestTag(name: string, description?: string) {
  const slug = generateSlug(name)

  // Check if tag already exists
  const { data: existing } = await supabase
    .from('tags')
    .select('id, is_approved')
    .eq('slug', slug)
    .single()

  if (existing) {
    if (existing.is_approved) {
      return { data: existing, error: { message: 'Tag already exists and is approved' } }
    } else {
      return { data: existing, error: { message: 'Tag already suggested, waiting for approval' } }
    }
  }

  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user?.id

  const { data, error } = await supabase
    .from('tags')
    .insert([{
      name,
      slug,
      description,
      is_approved: false,
      created_by: userId
    }])
    .select()
    .single()

  if (error) {
    console.error('Error suggesting tag:', error)
    return { data: null, error }
  }

  invalidateCache('tags:all:with-unapproved');
  return { data, error: null }
}

// Get popular tags
export async function getPopularTags(limit: number = 20) {
  const cacheKey = `tags:popular:${limit}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return { data: Array.isArray(cached) ? cached : (cached ?? null), error: null };
  }

  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .eq('is_approved', true)
    .order('usage_count', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching popular tags:', error)
    return { data: null, error }
  }

  setCached(cacheKey, data, 300000);
  return { data: Array.isArray(data) ? data : (data ?? null), error: null }
}

// Search tags
export async function searchTags(query: string) {
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .eq('is_approved', true)
    .or(`name.ilike.%${query}%,description.ilike.%${query}%,slug.ilike.%${query}%`)
    .order('usage_count', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Error searching tags:', error)
    return { data: null, error }
  }

  return { data, error: null }
}

// Get unapproved tags (for admin)
export async function getUnapprovedTags() {
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .eq('is_approved', false)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching unapproved tags:', error)
    return { data: null, error }
  }

  return { data, error: null }
}

