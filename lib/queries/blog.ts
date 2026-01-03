import { supabase } from '../supabase';
import { createServerClient } from '../supabase-server';

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  featured_image_url?: string;
  category: string;
  author_id: string;
  is_featured: boolean;
  is_published: boolean;
  read_time_minutes: number;
  views: number;
  likes_count: number;
  created_at: string;
  updated_at: string;
  published_at?: string;
  profile?: {
    display_name?: string;
    avatar_url?: string;
    user_id?: string;
  };
}

// Get all published blog posts
export async function getAllBlogPosts(filters?: {
  category?: string;
  featured?: boolean;
  limit?: number;
}) {
  let query = supabase
    .from('blog_posts')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  if (filters?.category) {
    query = query.eq('category', filters.category);
  }

  if (filters?.featured !== undefined) {
    query = query.eq('is_featured', filters.featured);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) {
    // Always return empty array instead of null to prevent crashes
    // This handles cases where table doesn't exist, RLS issues, or any other errors
    const errorMessage = String(error.message || '');
    const errorCode = String(error.code || '');
    const errorDetails = String(error.details || '');
    const errorHint = String(error.hint || '');
    
    // Check if it's a table doesn't exist error
    const isTableMissing = errorCode === 'PGRST116' || 
        errorCode === '42P01' || 
        errorMessage.includes('relation') || 
        errorMessage.includes('does not exist') ||
        errorMessage.includes('doesn\'t exist');
    
    if (isTableMissing) {
      // Only log once as a warning, not an error
      console.warn('Blog posts table does not exist yet. Returning empty array.');
      console.warn('To fix: Run the SQL script "supabase-create-blog-table.sql" in Supabase SQL Editor');
      return { data: [], error: null };
    }
    
    // For other errors (RLS, permissions, etc.), log as warning
    if (errorMessage.includes('permission denied') ||
        errorMessage.includes('new row violates row-level security') ||
        errorMessage.includes('RLS') ||
        errorMessage.includes('row-level security')) {
      console.warn('Blog posts RLS issue. Returning empty array.');
      console.warn('Error details:', { message: errorMessage, code: errorCode });
      return { data: [], error: null };
    }
    
    // For unknown errors, log as warning (not error) to avoid cluttering console
    console.warn('Error fetching blog posts, returning empty array:', {
      message: errorMessage,
      code: errorCode,
      details: errorDetails,
      hint: errorHint
    });
    return { data: [], error: null };
  }

  // Debug: Log if no posts found
  if (!data || data.length === 0) {
    console.log('No published blog posts found. Checking if there are any posts at all...');
    // Try to get all posts (including unpublished) to debug
    const { data: allPosts } = await supabase
      .from('blog_posts')
      .select('id, title, is_published')
      .limit(5);
    if (allPosts && allPosts.length > 0) {
      console.log('Found blog posts in database:', allPosts.map((p: any) => ({
        id: p.id,
        title: p.title,
        is_published: p.is_published
      })));
      console.log('Note: Only posts with is_published=true are shown on the blog page.');
    } else {
      console.log('No blog posts found in database at all.');
    }
  }

  // Get profiles for authors
  if (data && data.length > 0) {
    const authorIds = [...new Set(data.map((post: any) => post.author_id).filter(Boolean))];
    
    if (authorIds.length > 0) {
      let profiles: any[] = [];
      
      // Handle single vs multiple IDs to avoid .in() issues
      if (authorIds.length === 1) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .eq('user_id', authorIds[0]);
        profiles = profileData || [];
      } else {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', authorIds);
        profiles = profileData || [];
      }

      const profileMap = new Map(profiles.map((p: any) => [p.user_id, p]));
      const postsWithProfiles = data.map((post: any) => ({
        ...post,
        profile: profileMap.get(post.author_id) || null
      }));

      return { data: Array.isArray(postsWithProfiles) ? postsWithProfiles : [], error: null };
    }
  }

  return { data: Array.isArray(data) ? data : [], error: null };
}

// Get blog post by slug
export async function getBlogPostBySlug(slug: string) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single();

  if (error) {
    console.error('Error fetching blog post:', error);
    return { data: null, error };
  }

  // Get author profile
  if (data) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url')
      .eq('user_id', data.author_id)
      .single();

    return {
      data: {
        ...data,
        profile: profile || null
      },
      error: null
    };
  }

  return { data: null, error: null };
}

// Get blog post by ID
export async function getBlogPostById(id: string) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching blog post:', error);
    return { data: null, error };
  }

  return { data, error: null };
}

// Create blog post (admin only)
export async function createBlogPost(post: Omit<BlogPost, 'id' | 'created_at' | 'updated_at' | 'views' | 'likes_count'>) {
  // Use server client to bypass RLS or use service role key
  const supabase = createServerClient();
  
  // Validate required fields
  if (!post.title || post.title.trim() === '') {
    const error = { message: 'Title is required', code: 'VALIDATION_ERROR' };
    console.error('Error creating blog post:', error);
    return { data: null, error };
  }

  if (!post.content || post.content.trim() === '') {
    const error = { message: 'Content is required', code: 'VALIDATION_ERROR' };
    console.error('Error creating blog post:', error);
    return { data: null, error };
  }

  if (!post.author_id) {
    const error = { message: 'Author ID is required', code: 'VALIDATION_ERROR' };
    console.error('Error creating blog post:', error);
    return { data: null, error };
  }

  // Generate slug from title if slug is empty
  let slug = post.slug || '';
  if (!slug || slug.trim() === '') {
    slug = generateSlug(post.title);
  }

  // Ensure slug is not empty (fallback)
  if (!slug || slug.trim() === '') {
    slug = `post-${Date.now()}`;
  }

  // Check if slug already exists and make it unique if needed
  let finalSlug = slug;
  let attempt = 0;
  const maxAttempts = 10;

  while (attempt < maxAttempts) {
    const { data: existingPost } = await supabase
      .from('blog_posts')
      .select('id')
      .eq('slug', finalSlug)
      .single();

    if (!existingPost) {
      // Slug is unique, we can use it
      break;
    }

    // Slug exists, add suffix
    attempt++;
    finalSlug = `${slug}-${attempt}`;
  }

  // Prepare post data - explicitly set all fields
  const postData: any = {
    slug: finalSlug,
    title: post.title.trim(),
    content: post.content.trim(),
    category: (post.category && post.category.trim()) || 'general', // Default to 'general' if not provided
    author_id: post.author_id,
    excerpt: post.excerpt?.trim() || null,
    featured_image_url: post.featured_image_url?.trim() || null,
    is_featured: false, // Always false for simplicity
    is_published: post.is_published !== false, // Default to true
    read_time_minutes: post.read_time_minutes || 5,
    views: 0,
    likes_count: 0
  };

  const { data, error } = await supabase
    .from('blog_posts')
    .insert([postData])
    .select()
    .single();

  if (error) {
    // Enhanced error logging - only in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error creating blog post:', {
        message: error.message || (error as any)?.message,
        code: error.code || (error as any)?.code,
        details: error.details || (error as any)?.details,
        hint: error.hint || (error as any)?.hint
      });
    }
    
    // Try to extract message
    const errorMessage = error.message || 
                        (error as any)?.message || 
                        String(error) || 
                        'שגיאה לא ידועה ביצירת הפוסט';
    
    const errorCode = error.code || 
                     (error as any)?.code || 
                     'UNKNOWN';
    
    return { 
      data: null, 
      error: { 
        message: errorMessage, 
        code: errorCode
      } 
    };
  }

  return { data, error: null };
}

// Update blog post (admin only)
export async function updateBlogPost(id: string, updates: Partial<BlogPost>) {
  // Use server client to bypass RLS or use service role key
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('blog_posts')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    // Enhanced error logging - only in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error updating blog post:', {
        message: error.message || (error as any)?.message,
        code: error.code || (error as any)?.code,
        details: error.details || (error as any)?.details
      });
    }
    
    const errorMessage = error.message || 
                        (error as any)?.message || 
                        String(error) || 
                        'שגיאה לא ידועה בעדכון הפוסט';
    
    const errorCode = error.code || 
                     (error as any)?.code || 
                     'UNKNOWN';
    
    return { 
      data: null, 
      error: { 
        message: errorMessage, 
        code: errorCode
      } 
    };
  }

  return { data, error: null };
}

// Delete blog post (admin only)
export async function deleteBlogPost(id: string) {
  const { error } = await supabase
    .from('blog_posts')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting blog post:', error);
    return { error };
  }

  return { error: null };
}

// Increment views
export async function incrementBlogPostViews(id: string) {
  const { data: post } = await getBlogPostById(id);
  if (!post) return { error: new Error('Post not found') };

  return updateBlogPost(id, {
    views: (post.views || 0) + 1
  });
}

// Generate slug from title
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\u0590-\u05FF\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

