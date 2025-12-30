import { supabase } from '../supabase'

export interface BlogComment {
  id: string
  blog_post_id: string
  user_id: string
  content: string
  parent_id?: string | null
  created_at: string
  updated_at?: string
  user?: {
    display_name?: string
    avatar_url?: string
    user_id?: string
  }
  replies?: BlogComment[]
}

// Get comments for a blog post
export async function getBlogComments(blogPostId: string) {
  const { data: comments, error } = await supabase
    .from('blog_comments')
    .select('*')
    .eq('blog_post_id', blogPostId)
    .order('created_at', { ascending: true })
  
  if (error) {
    console.error('Error fetching blog comments:', error)
    return { data: null, error }
  }

  if (!comments || comments.length === 0) {
    return { data: [], error: null }
  }

  // Get user IDs
  const userIds = [...new Set(comments.map((c: any) => c.user_id).filter(Boolean))]
  
  if (userIds.length > 0) {
    // Handle single user_id case to avoid .in() issues
    let profiles: any[] = [];
    if (userIds.length === 1) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .eq('user_id', userIds[0])
        .maybeSingle()
      if (profileData) {
        profiles = [profileData];
      }
    } else {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds)
      profiles = profileData || [];
    }

    const profileMap = new Map(profiles.map((p: any) => [p.user_id, p]))
    
    // Build nested structure
    const commentsWithUsers = comments.map((comment: any) => ({
      ...comment,
      user: profileMap.get(comment.user_id) || null
    }))

    // Organize into parent-child structure
    const topLevelComments = commentsWithUsers.filter((c: any) => !c.parent_id)
    const repliesMap = new Map<string, BlogComment[]>()
    
    commentsWithUsers.forEach((comment: any) => {
      if (comment.parent_id) {
        if (!repliesMap.has(comment.parent_id)) {
          repliesMap.set(comment.parent_id, [])
        }
        repliesMap.get(comment.parent_id)!.push(comment)
      }
    })

    const organizedComments = topLevelComments.map((comment: any) => ({
      ...comment,
      replies: repliesMap.get(comment.id) || []
    }))

    return { data: Array.isArray(organizedComments) ? organizedComments : [], error: null }
  }

  return { data: Array.isArray(comments) ? comments : [], error: null }
}

// Create a comment on a blog post
export async function createBlogComment(
  blogPostId: string,
  userId: string,
  content: string,
  parentId?: string | null
) {
  const { data, error } = await supabase
    .from('blog_comments')
    .insert([{
      blog_post_id: blogPostId,
      user_id: userId,
      content: content.trim(),
      parent_id: parentId || null
    }])
    .select()
    .single()

  if (error) {
    console.error('Error creating blog comment:', error)
    return { data: null, error }
  }

  // Get user profile
  if (data) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url')
      .eq('user_id', userId)
      .maybeSingle()

    return {
      data: {
        ...data,
        user: profile || null
      },
      error: null
    }
  }

  return { data, error: null }
}

// Delete a comment
export async function deleteBlogComment(commentId: string) {
  const { error } = await supabase
    .from('blog_comments')
    .delete()
    .eq('id', commentId)

  if (error) {
    console.error('Error deleting blog comment:', error)
    return { error }
  }

  return { error: null }
}

