import { supabase } from '../supabase'

export interface PostComment {
  id: string
  post_id: string
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
  replies?: PostComment[]
}

// Get comments for a post
export async function getPostComments(postId: string) {
  const { data: comments, error } = await supabase
    .from('comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
  
  if (error) {
    console.error('Error fetching post comments:', error)
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
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds)
      profiles = profilesData || [];
    }
    
    const profileMap = new Map(profiles.map((p: any) => [p.user_id, p]))
    
    // Map profiles to comments
    const commentsWithProfiles = comments.map((comment: any) => {
      const profile = profileMap.get(comment.user_id);
      return {
        ...comment,
        user: profile || {
          user_id: comment.user_id,
          display_name: 'משתמש',
          avatar_url: null
        },
        replies: []
      };
    })
    
    // Build hierarchical structure
    const commentMap = new Map(commentsWithProfiles.map((c: any) => [c.id, c]))
    const topLevelComments: PostComment[] = []
    
    commentsWithProfiles.forEach((comment: any) => {
      if (comment.parent_id) {
        const parent = commentMap.get(comment.parent_id)
        if (parent) {
          if (!parent.replies) {
            parent.replies = []
          }
          parent.replies.push(comment)
        }
      } else {
        topLevelComments.push(comment)
      }
    })
    
    return { data: Array.isArray(topLevelComments) ? topLevelComments : [], error: null }
  }
  
  return { data: Array.isArray(comments) ? comments.map((c: any) => ({ ...c, user: null, replies: [] })) : [], error: null }
}

// Create a comment on a post
export async function createPostComment(
  postId: string,
  userId: string,
  content: string,
  parentId?: string | null
) {
  const { data, error } = await supabase
    .from('comments')
    .insert({
      post_id: postId,
      user_id: userId,
      content,
      parent_id: parentId || null,
      updated_at: new Date().toISOString()
    })
    .select('*')
    .single()
  
  if (error) {
    console.error('Error creating post comment:', error)
    return { data: null, error }
  }
  
  // Update comments count on post
  const { data: post } = await supabase
    .from('posts')
    .select('comments_count')
    .eq('id', postId)
    .single()
  
  if (post) {
    await supabase
      .from('posts')
      .update({ comments_count: (post.comments_count || 0) + 1 })
      .eq('id', postId)
  }
  
  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_id, display_name, avatar_url')
    .eq('user_id', userId)
    .maybeSingle()
  
  const commenterName = profile?.display_name || 'משתמש';
  
  // Get post owner for notifications
  const { data: postData } = await supabase
    .from('posts')
    .select('user_id, content')
    .eq('id', postId)
    .maybeSingle()
  
  // Get parent comment owner if this is a reply
  let parentCommentOwnerId: string | undefined;
  if (parentId) {
    const { data: parentComment } = await supabase
      .from('comments')
      .select('user_id')
      .eq('id', parentId)
      .maybeSingle()
    parentCommentOwnerId = parentComment?.user_id;
  }
  
  // Send notifications
  try {
    const { notifyPostComment, checkAndNotifyMentions } = await import('../utils/notifications');
    
    // Notify post owner or parent comment owner
    if (postData?.user_id) {
      await notifyPostComment(
        postId,
        userId,
        commenterName,
        postData.user_id,
        !!parentId,
        parentCommentOwnerId
      ).catch((error) => {
        console.warn('Error sending post comment notification:', error);
      });
    }
    
    // Check for mentions in content
    await checkAndNotifyMentions(
      content,
      userId,
      commenterName,
      `/post/${postId}`,
      data.id,
      'comment'
    ).catch((error) => {
      console.warn('Error checking mentions:', error);
    });
  } catch (error) {
    console.warn('Error in notification system:', error);
  }
  
  // Award points for commenting on a post (only for top-level comments, not replies)
  if (!parentId) {
    try {
      const { awardPoints } = await import('./gamification');
      // Try both Hebrew and English action names
      await awardPoints(userId, 'תגובה לפוסט', {}).catch(() => {
        // If Hebrew doesn't work, try English
        return awardPoints(userId, 'reply_to_post', {});
      }).catch((error) => {
        // Silently fail - gamification is not critical
        console.warn('Error awarding points for comment:', error);
      });
    } catch (error) {
      // Silently fail - gamification is not critical
      console.warn('Error awarding points for comment:', error);
    }
  }
  
  return { 
    data: {
      ...data,
      user: profile || {
        user_id: userId,
        display_name: 'משתמש',
        avatar_url: null
      },
      replies: []
    }, 
    error: null 
  }
}

// Delete a comment
export async function deletePostComment(commentId: string) {
  // Get comment to find post_id
  const { data: comment } = await supabase
    .from('comments')
    .select('post_id')
    .eq('id', commentId)
    .single()
  
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId)
  
  if (error) {
    console.error('Error deleting post comment:', error)
    return { error }
  }
  
  // Update comments count on post
  if (comment) {
    const { data: post } = await supabase
      .from('posts')
      .select('comments_count')
      .eq('id', comment.post_id)
      .single()
    
    if (post && post.comments_count > 0) {
      await supabase
        .from('posts')
        .update({ comments_count: post.comments_count - 1 })
        .eq('id', comment.post_id)
    }
  }
  
  return { error: null }
}

