import { supabase } from '@/lib/supabase';
import { awardPoints } from './gamification';

// Helper function to clean placeholder images from HTML content
function cleanPlaceholderImagesFromContent(content: string): string {
  if (!content || typeof content !== 'string') {
    return content;
  }
  
  // Pattern to match base64 SVG images with "טוען..." (loading placeholder)
  // This matches data:image/svg+xml;base64,... with "טוען" in the base64 content
  const placeholderPattern = /<img[^>]*src=["']data:image\/svg\+xml;base64,[^"']*טוען[^"']*["'][^>]*>/gi;
  
  // Remove placeholder images
  let cleanedContent = content.replace(placeholderPattern, '');
  
  // Also check for the specific loading SVG pattern we use
  const loadingSvgPattern = /<img[^>]*src=["']data:image\/svg\+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5טוען[^"']*["'][^>]*>/gi;
  cleanedContent = cleanedContent.replace(loadingSvgPattern, '');
  
  return cleanedContent;
}

export interface Forum {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  header_color: string;
  logo_text?: string;
  posts_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ForumPost {
  id: string;
  forum_id: string;
  user_id: string;
  title: string;
  content: string;
  views: number;
  replies_count: number;
  likes_count?: number;
  is_pinned: boolean;
  is_locked: boolean;
  media_url?: string | null;
  media_type?: 'image' | 'video' | null;
  created_at: string;
  updated_at: string;
  profile?: {
    display_name?: string;
    avatar_url?: string;
    user_id?: string;
  };
}

export interface ForumPostReply {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  parent_id?: string | null;
  is_answer?: boolean;
  likes_count?: number;
  user_liked?: boolean;
  created_at: string;
  updated_at: string;
  profile?: {
    display_name?: string;
    avatar_url?: string;
    user_id?: string;
  };
  replies?: ForumPostReply[];
}

// Get all forums
export async function getAllForums() {
  // Use client-side supabase for client components
  const { data, error } = await supabase
    .from('forums')
    .select('id, name, display_name, description, header_color, logo_text, is_active, created_at, updated_at')
    .eq('is_active', true)
    .order('display_name', { ascending: true });
  
  if (error || !data) return { data, error };
  
  // Batch count posts for all forums in parallel
  const forumIds = data.map((f: any) => f.id);
  const { data: countsData } = await supabase
    .from('forum_posts')
    .select('forum_id')
    .in('forum_id', forumIds);
  
  // Count posts per forum
  const countsMap = new Map<string, number>();
  if (countsData) {
    countsData.forEach((post: any) => {
      const current = countsMap.get(post.forum_id) || 0;
      countsMap.set(post.forum_id, current + 1);
    });
  }
  
  // Map counts to forums
  const forumsWithCounts = data.map((forum: any) => ({
    ...forum,
    posts_count: countsMap.get(forum.id) || 0
  }));
  
  return { data: Array.isArray(forumsWithCounts) ? forumsWithCounts : [], error: null };
}

// Get forum by ID
export async function getForumById(id: string) {
  // Use client-side supabase for client components
  const { data, error } = await supabase
    .from('forums')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error || !data) return { data, error };
  
  // Count actual posts for the forum
  const { count } = await supabase
    .from('forum_posts')
    .select('*', { count: 'exact', head: true })
    .eq('forum_id', id);
  
  return { 
    data: {
      ...data,
      posts_count: count || 0
    }, 
    error: null 
  };
}

// Get forum by name
export async function getForumByName(name: string) {
  // Use client-side supabase for client components
  const { data, error } = await supabase
    .from('forums')
    .select('*')
    .eq('name', name)
    .single();
  
  return { data, error };
}

// Get posts in a forum
export async function getForumPosts(forumId: string) {
  // Use client-side supabase for client components
  const { data, error } = await supabase
    .from('forum_posts')
    .select('*')
    .eq('forum_id', forumId)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });
  
  if (error || !data) return { data: [], error };
  
  // Get profiles for all posts
  const userIds = [...new Set(data.map((post: any) => post.user_id).filter(Boolean))];
  
  if (userIds.length > 0) {
    const query = supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url, first_name, last_name, nickname');
    
    const { data: profiles } = userIds.length === 1
      ? await query.eq('user_id', userIds[0])
      : await query.in('user_id', userIds);
    
    // Map profiles to posts
    const profileMap = new Map(profiles?.map((p: any) => [p.user_id, p]) || []);
    const transformedData = data.map((post: any) => {
      const profile = profileMap.get(post.user_id);
      // Build display name with fallback chain
      const displayName = profile 
        ? ((profile as any).display_name || (profile as any).first_name || (profile as any).nickname || 'משתמש')
        : 'משתמש';
      
      return {
        ...post,
        profile: profile ? {
          user_id: (profile as any).user_id,
          display_name: displayName,
          avatar_url: (profile as any).avatar_url,
          first_name: (profile as any).first_name,
          last_name: (profile as any).last_name,
          nickname: (profile as any).nickname
        } : {
          user_id: post.user_id,
          display_name: 'משתמש',
          avatar_url: null
        }
      };
    });
    
    return { data: Array.isArray(transformedData) ? transformedData : [], error: null };
  }
  
  // If no user IDs, return posts without profiles
  return { data: Array.isArray(data) ? data.map((post: any) => ({ ...post, profile: null })) : [], error: null };
}

// Get single forum post with replies
export async function getForumPostById(postId: string, userId?: string) {
  try {
    // Use client-side supabase for client components
    
    // Get the post
    const { data: postData, error: postError } = await supabase
      .from('forum_posts')
      .select('id, forum_id, user_id, title, content, is_pinned, is_locked, views, replies_count, likes_count, created_at, updated_at')
      .eq('id', postId)
      .single();
    
    if (postError) {
      // Enhanced error logging - check if error is actually an object with properties
      const errorDetails: any = {
        postId,
        userId,
        hasError: !!postError,
        errorType: typeof postError,
        errorKeys: postError ? Object.keys(postError) : [],
        errorString: String(postError),
      };
      
      // Try to extract error properties safely
      if (postError && typeof postError === 'object') {
        errorDetails.code = (postError as any).code;
        errorDetails.message = (postError as any).message;
        errorDetails.details = (postError as any).details;
        errorDetails.hint = (postError as any).hint;
        
        // Try to stringify the error
        try {
          errorDetails.fullError = JSON.stringify(postError, Object.getOwnPropertyNames(postError));
        } catch (e) {
          errorDetails.fullError = String(postError);
        }
      } else {
        errorDetails.fullError = String(postError);
      }
      
      // Check if error is empty object or non-critical
      const isEmptyError = postError && typeof postError === 'object' && Object.keys(postError).length === 0;
      const isNonCriticalError = isEmptyError || 
        (errorDetails.code === '42501') || 
        (errorDetails.message && (errorDetails.message.includes('permission') || errorDetails.message.includes('row-level security')));
      
      if (isNonCriticalError && postData) {
        // If we have data despite the error, continue with the data
        console.warn('Non-critical error fetching forum post, continuing with data:', errorDetails);
        // Continue with postData below
      } else {
        // Critical error - log and return
        console.error('Error fetching forum post:', errorDetails);
        
        // Return error with all details
        return { 
          data: null, 
          error: {
            code: errorDetails.code || 'UNKNOWN',
            message: errorDetails.message || 'Unknown error',
            details: errorDetails.details || null,
            hint: errorDetails.hint || null,
            ...errorDetails
          }
        };
      }
    }
    
    if (!postData) {
      console.warn('No post data returned for postId:', postId);
      return { data: null, error: { message: 'Post not found', code: 'PGRST116' } as any };
    }
    
    // Get profile for post author
    const { data: postProfile } = await supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url, first_name, last_name, nickname')
      .eq('user_id', postData.user_id)
      .single();
    
    // Build display name with fallback chain for post author
    const postAuthorDisplayName = postProfile 
      ? (postProfile.display_name || postProfile.first_name || postProfile.nickname || 'משתמש')
      : 'משתמש';
    
    // Check if user liked the post
    let userLiked = false;
    if (userId) {
      const { data: liked } = await checkUserLikedPost(postId, userId);
      userLiked = liked || false;
    }
    
    // Clean placeholder images from content
    const cleanedContent = cleanPlaceholderImagesFromContent(postData.content || '');
    
    // Increment views before building the post object
    await incrementForumPostViews(postId);
    
    // Get updated views count after increment
    const { data: updatedPost } = await supabase
      .from('forum_posts')
      .select('views')
      .eq('id', postId)
      .single();
    
    const post = {
      ...postData,
      views: updatedPost?.views || postData.views || 0,
      content: cleanedContent,
      profile: postProfile ? {
        ...postProfile,
        display_name: postAuthorDisplayName
      } : {
        user_id: postData.user_id,
        display_name: 'משתמש',
        avatar_url: null
      },
      user_liked: userLiked
    };
    
    // Get all replies (including nested ones)
    const { data: repliesData, error: repliesError } = await supabase
      .from('forum_post_replies')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    
    if (repliesError) {
      console.error('Error fetching forum post replies:', {
        code: repliesError.code,
        message: repliesError.message,
        details: repliesError.details,
        hint: repliesError.hint,
        postId
      });
      // Continue without replies - don't fail the whole request
    }
    
    if (repliesData && repliesData.length > 0) {
      // Get profiles for all replies
      const replyUserIds = [...new Set(repliesData.map((r: any) => r.user_id).filter(Boolean))];
      
      if (replyUserIds.length > 0) {
        const replyQuery = supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url, first_name, last_name, nickname');
        
        const { data: replyProfiles, error: profilesError } = replyUserIds.length === 1
          ? await replyQuery.eq('user_id', replyUserIds[0])
          : await replyQuery.in('user_id', replyUserIds);
        
        if (profilesError) {
          console.error('Error fetching reply profiles:', profilesError);
        }
        
        const profileMap = new Map(replyProfiles?.map((p: any) => [p.user_id, p]) || []);
        
        // Log for debugging
        if (replyUserIds.length > 0 && (!replyProfiles || replyProfiles.length === 0)) {
          console.warn('No profiles found for reply user IDs:', replyUserIds);
        }
        
        // Get likes for all replies
        const replyIds = repliesData.map((r: any) => r.id);
        const { data: replyLikes } = await supabase
          .from('forum_reply_likes')
          .select('reply_id, user_id')
          .in('reply_id', replyIds);
        
        // Count likes per reply and check if user liked
        const likesCountMap = new Map<string, number>();
        const userLikedMap = new Map<string, boolean>();
        
        if (replyLikes) {
          replyLikes.forEach((like: any) => {
            const count = likesCountMap.get(like.reply_id) || 0;
            likesCountMap.set(like.reply_id, count + 1);
            
            if (like.user_id === userId) {
              userLikedMap.set(like.reply_id, true);
            }
          });
        }
        
        // Map all replies with profiles and likes
        const allReplies = repliesData.map((reply: any) => {
          const profile = profileMap.get(reply.user_id);
          // Build display name with fallback chain
          const displayName = profile 
            ? ((profile as any).display_name || (profile as any).first_name || (profile as any).nickname || 'משתמש')
            : 'משתמש';
          
          // Log if profile is missing
          if (!profile) {
            console.warn('No profile found for reply user_id:', reply.user_id, 'Reply ID:', reply.id);
          }
          
          return {
            ...reply,
            profile: profile ? {
              user_id: (profile as any).user_id,
              display_name: displayName,
              avatar_url: (profile as any).avatar_url,
              first_name: (profile as any).first_name,
              last_name: (profile as any).last_name,
              nickname: (profile as any).nickname
            } : {
              user_id: reply.user_id,
              display_name: 'משתמש',
              avatar_url: null
            },
            likes_count: likesCountMap.get(reply.id) || 0,
            user_liked: userLikedMap.get(reply.id) || false,
            replies: [] // Initialize replies array
          };
        });
        
        // Build hierarchical structure
        const replyMap = new Map(allReplies.map((r: any) => [r.id, r]));
        const topLevelReplies: any[] = [];
        
        allReplies.forEach((reply: any) => {
          if (reply.parent_id) {
            // This is a nested reply
            const parent = replyMap.get(reply.parent_id);
            if (parent) {
              if (!(parent as any).replies) {
                (parent as any).replies = [];
              }
              (parent as any).replies.push(reply);
            }
          } else {
            // This is a top-level reply
            topLevelReplies.push(reply);
          }
        });
        
        return { 
          data: { ...post, replies: topLevelReplies }, 
          error: null // Don't fail the whole request if replies had errors
        };
      }
    }
    
    // No replies or error fetching replies - return post without replies
    // Don't fail the whole request if replies had errors
    return { 
      data: { ...post, replies: [] }, 
      error: null
    };
  } catch (error: any) {
    console.error('Unexpected error in getForumPostById:', {
      error,
      message: error?.message,
      stack: error?.stack,
      postId,
      userId
    });
    return {
      data: null,
      error: {
        code: 'UNEXPECTED_ERROR',
        message: error?.message || 'Unexpected error occurred',
        details: error?.stack || null,
        postId,
        userId
      }
    };
  }
}

// Create forum post
export async function createForumPost(forumId: string, userId: string, title: string, content: string) {
  // Use client-side supabase for client components
  
  // Create the post
  const { data, error } = await supabase
    .from('forum_posts')
    .insert([{
      forum_id: forumId,
      user_id: userId,
      title,
      content
    }])
    .select()
    .single();
  
  if (error) return { data: null, error };
  
  // Get profile for the post author
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_id, display_name, avatar_url, first_name, last_name, nickname')
    .eq('user_id', userId)
    .single();
  
  // Build display name with fallback chain
  const displayName = profile 
    ? (profile.display_name || profile.first_name || profile.nickname || 'משתמש')
    : 'משתמש';
  
  // Update forum posts count - get actual count
  const { count } = await supabase
    .from('forum_posts')
    .select('*', { count: 'exact', head: true })
    .eq('forum_id', forumId);
  
  if (count !== null) {
    await supabase
      .from('forums')
      .update({ 
        posts_count: count,
        updated_at: new Date().toISOString()
      })
      .eq('id', forumId);
  }
  
  // Award points for creating a forum post
  try {
    const { awardPoints } = await import('./gamification');
    // Try both Hebrew and English action names
    await awardPoints(userId, 'יצירת פוסט בפורום', {}).catch(() => {
      // If Hebrew doesn't work, try English
      return awardPoints(userId, 'create_forum_post', {});
    }).catch((error) => {
      // Silently fail - gamification is not critical
      console.warn('Error awarding points for forum post creation:', error);
    });
  } catch (error) {
    // Silently fail - gamification is not critical
    console.warn('Error awarding points for forum post creation:', error);
  }
  
  return { 
    data: {
      ...data,
      profile: profile ? {
        ...profile,
        display_name: displayName
      } : {
        user_id: userId,
        display_name: 'משתמש',
        avatar_url: null
      }
    }, 
    error: null 
  };
}

// Create forum post reply
export async function createForumPostReply(postId: string, userId: string, content: string, parentId?: string | null) {
  // Use client-side supabase for client components
  
  // Create the reply
  const replyData: any = {
    post_id: postId,
    user_id: userId,
    content
  };
  
  // Add parent_id if this is a reply to another reply
  if (parentId) {
    replyData.parent_id = parentId;
  }
  
  const { data, error } = await supabase
    .from('forum_post_replies')
    .insert([replyData])
    .select()
    .single();
  
  if (error) return { data: null, error };
  
  // Get profile for the reply author
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_id, display_name, avatar_url, first_name, last_name, nickname')
    .eq('user_id', userId)
    .single();
  
  // Build display name with fallback chain
  const displayName = profile 
    ? (profile.display_name || profile.first_name || profile.nickname || 'משתמש')
    : 'משתמש';
  
  // Get post info for notifications
  const { data: postData } = await supabase
    .from('forum_posts')
    .select('user_id, title, forum_id, replies_count')
    .eq('id', postId)
    .maybeSingle();
  
  // Get parent reply owner if this is a reply to a reply
  let parentReplyOwnerId: string | undefined;
  if (parentId) {
    const { data: parentReply } = await supabase
      .from('forum_post_replies')
      .select('user_id')
      .eq('id', parentId)
      .maybeSingle();
    parentReplyOwnerId = parentReply?.user_id;
  }
  
  // Update post replies count (only for top-level replies)
  if (!parentId && postData) {
    await supabase
      .from('forum_posts')
      .update({ replies_count: (postData.replies_count || 0) + 1 })
      .eq('id', postId);
  }
  
  // Send notifications
  try {
    const { notifyForumPostReply, checkAndNotifyMentions } = await import('../utils/notifications');
    
    // Notify post owner or parent reply owner
    if (postData) {
      if (parentId && parentReplyOwnerId && parentReplyOwnerId !== userId) {
        // This is a reply to a reply - notify the parent reply owner
        const { createNotification } = await import('../queries/notifications');
        // Validate forum_id before creating link
        const validForumId = postData.forum_id && postData.forum_id !== 'null' && postData.forum_id !== 'undefined' 
          ? postData.forum_id 
          : null;
        
        if (!validForumId) {
          console.warn(`Invalid forum_id for post ${postId}, skipping notification link`);
        }
        
        await createNotification({
          user_id: parentReplyOwnerId,
          type: 'forum_reply',
          title: 'תגובה לתגובה שלך',
          message: `${displayName} הגיב על התגובה שלך`,
          link: validForumId ? `/forums/${validForumId}/posts/${postId}` : `/forums`,
          related_id: parentId,
          related_type: 'forum_reply',
          is_read: false
        }).catch((error) => {
          console.warn('Error sending forum reply notification:', error);
        });
      } else if (!parentId && postData.user_id && postData.user_id !== userId) {
        // This is a top-level reply - notify the post owner
        await notifyForumPostReply(
          postId,
          postData.title || 'פוסט',
          postData.forum_id || '',
          userId,
          displayName,
          postData.user_id
        ).catch((error) => {
          console.warn('Error sending forum post reply notification:', error);
        });
      }
    }
    
    // Check for mentions in content
    await checkAndNotifyMentions(
      content,
      userId,
      displayName,
      `/forums/${postData?.forum_id || ''}/posts/${postId}`,
      data.id,
      'forum_reply'
    ).catch((error) => {
      console.warn('Error checking mentions:', error);
    });
  } catch (error) {
    console.warn('Error in notification system:', error);
  }
  
  // Award points for replying to a forum post (only for top-level replies, not nested replies)
  if (!parentId) {
    try {
      const { awardPoints } = await import('./gamification');
      // Try both Hebrew and English action names
      await awardPoints(userId, 'תגובה לפוסט', {}).catch(() => {
        // If Hebrew doesn't work, try English
        return awardPoints(userId, 'reply_to_post', {});
      }).catch((error) => {
        // Silently fail - gamification is not critical
        console.warn('Error awarding points for forum reply:', error);
      });
    } catch (error) {
      // Silently fail - gamification is not critical
      console.warn('Error awarding points for forum reply:', error);
    }
  }
  
  return { 
    data: {
      ...data,
      profile: profile ? {
        ...profile,
        display_name: displayName
      } : {
        user_id: userId,
        display_name: 'משתמש',
        avatar_url: null
      }
    }, 
    error: null 
  };
}

// Get user's forum posts
export async function getUserForumPosts(userId: string) {
  // Use client-side supabase for client components
  
  const { data, error } = await supabase
    .from('forum_posts')
    .select(`
      *,
      forums:forum_id (
        id,
        display_name,
        name
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) return { data: null, error };
  
  return { data: Array.isArray(data) ? data : [], error: null };
}

// Get user's forum replies
export async function getUserForumReplies(userId: string) {
  // Use client-side supabase for client components
  
  const { data, error } = await supabase
    .from('forum_post_replies')
    .select(`
      *,
      forum_posts:post_id (
        id,
        title,
        forum_id,
        forums:forum_id (
          id,
          display_name,
          name
        )
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) return { data: null, error };
  
  return { data: Array.isArray(data) ? data : [], error: null };
}

// Get user's liked forum posts
export async function getUserLikedForumPosts(userId: string) {
  // Use client-side supabase for client components
  
  const { data: likes, error: likesError } = await supabase
    .from('forum_post_likes')
    .select('post_id')
    .eq('user_id', userId);
  
  if (likesError || !likes || likes.length === 0) {
    return { data: [], error: null };
  }
  
  const postIds = likes.map((l: any) => l.post_id);
  
  const { data, error } = await supabase
    .from('forum_posts')
    .select(`
      *,
      forums:forum_id (
        id,
        display_name,
        name
      )
    `)
    .in('id', postIds)
    .order('created_at', { ascending: false });
  
  if (error) return { data: null, error };
  
  return { data: Array.isArray(data) ? data : [], error: null };
}

// Increment forum post views
export async function incrementForumPostViews(postId: string) {
  // Use client-side supabase for client components
  
  // First, get the current post to read the views count
  const { data: post, error: fetchError } = await supabase
    .from('forum_posts')
    .select('views')
    .eq('id', postId)
    .single();
  
  if (fetchError || !post) {
    return { error: fetchError };
  }
  
  // Update with incremented views
  const { error } = await supabase
    .from('forum_posts')
    .update({ views: (post.views || 0) + 1 })
    .eq('id', postId);
  
  return { error };
}


// Delete forum post reply
export async function deleteForumPostReply(replyId: string) {
  // Use client-side supabase for client components
  const { error } = await supabase
    .from('forum_post_replies')
    .delete()
    .eq('id', replyId);
  
  return { error };
}

// Like/Unlike a forum post
export async function toggleForumPostLike(postId: string, userId: string) {
  // Use client-side supabase for client components
  
  // Check if user already liked the post
  const { data: existingLike } = await supabase
    .from('forum_post_likes')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .single();
  
  if (existingLike) {
    // Unlike - delete the like
    const { error } = await supabase
      .from('forum_post_likes')
      .delete()
      .eq('id', existingLike.id);
    
    if (error) return { error };
    
    // Update likes_count in forum_posts table
    // First get current count
    const { data: currentPost } = await supabase
      .from('forum_posts')
      .select('likes_count')
      .eq('id', postId)
      .single();
    
    const newCount = Math.max(0, (currentPost?.likes_count || 0) - 1);
    
    // Update the count
    await supabase
      .from('forum_posts')
      .update({ likes_count: newCount })
      .eq('id', postId);
    
    return { data: { liked: false, likes_count: newCount }, error: null };
  } else {
    // Like - insert the like
    const { error } = await supabase
      .from('forum_post_likes')
      .insert([{ post_id: postId, user_id: userId }]);
    
    if (error) return { error, data: null };
    
    // Update likes_count in forum_posts table
    // First get current count
    const { data: currentPost } = await supabase
      .from('forum_posts')
      .select('likes_count')
      .eq('id', postId)
      .single();
    
    const newCount = (currentPost?.likes_count || 0) + 1;
    
    // Update the count
    await supabase
      .from('forum_posts')
      .update({ likes_count: newCount })
      .eq('id', postId);
    
    // Award points for liking a post (only when adding a like, not removing)
    try {
      const { awardPoints } = await import('./gamification');
      // Try both Hebrew and English action names
      await awardPoints(userId, 'לייק לפוסט', {}).catch(() => {
        // If Hebrew doesn't work, try English
        return awardPoints(userId, 'like_post', {});
      }).catch((error) => {
        // Silently fail - gamification is not critical
        console.warn('Error awarding points for like:', error);
      });
    } catch (error) {
      // Silently fail - gamification is not critical
      console.warn('Error awarding points for like:', error);
    }
    
    return { data: { liked: true, likes_count: newCount }, error: null };
  }
}

// Like/Unlike a forum post reply
export async function toggleForumReplyLike(replyId: string, userId: string) {
  // Use client-side supabase for client components
  
  // Check if user already liked the reply
  const { data: existingLike } = await supabase
    .from('forum_reply_likes')
    .select('id')
    .eq('reply_id', replyId)
    .eq('user_id', userId)
    .single();
  
  if (existingLike) {
    // Unlike - delete the like
    const { error } = await supabase
      .from('forum_reply_likes')
      .delete()
      .eq('id', existingLike.id);
    
    if (error) return { error };
    
    return { data: { liked: false }, error: null };
  } else {
    // Like - insert the like
    const { error } = await supabase
      .from('forum_reply_likes')
      .insert([{ reply_id: replyId, user_id: userId }]);
    
    if (error) return { error, data: null };
    
    return { data: { liked: true }, error: null };
  }
}

// Toggle post lock status (only post owner)
export async function toggleForumPostLock(postId: string, userId: string) {
  // First check if user is the post owner
  const { data: post, error: postError } = await supabase
    .from('forum_posts')
    .select('user_id, is_locked')
    .eq('id', postId)
    .single();
  
  if (postError || !post) {
    return { data: null, error: { message: 'Post not found' } };
  }
  
  if (post.user_id !== userId) {
    return { data: null, error: { message: 'Only post owner can lock/unlock' } };
  }
  
  const { data, error } = await supabase
    .from('forum_posts')
    .update({ is_locked: !post.is_locked })
    .eq('id', postId)
    .select()
    .single();
  
  if (error) return { data: null, error };
  
  return { data: Array.isArray(data) ? data : [], error: null };
}

// Mark reply as answer (only post owner)
export async function markReplyAsAnswer(replyId: string, postId: string, userId: string) {
  // First check if user is the post owner
  const { data: post, error: postError } = await supabase
    .from('forum_posts')
    .select('user_id')
    .eq('id', postId)
    .single();
  
  if (postError || !post) {
    return { data: null, error: { message: 'Post not found' } };
  }
  
  if (post.user_id !== userId) {
    return { data: null, error: { message: 'Only post owner can mark as answer' } };
  }
  
  // Unmark all other answers for this post
  await supabase
    .from('forum_post_replies')
    .update({ is_answer: false })
    .eq('post_id', postId)
    .neq('id', replyId);
  
  // Mark this reply as answer
  const { data, error } = await supabase
    .from('forum_post_replies')
    .update({ is_answer: true })
    .eq('id', replyId)
    .select()
    .single();
  
  if (error) return { data: null, error };
  
  return { data: Array.isArray(data) ? data : [], error: null };
}

// Unmark reply as answer (only post owner)
export async function unmarkReplyAsAnswer(replyId: string, postId: string, userId: string) {
  // First check if user is the post owner
  const { data: post, error: postError } = await supabase
    .from('forum_posts')
    .select('user_id')
    .eq('id', postId)
    .single();
  
  if (postError || !post) {
    return { data: null, error: { message: 'Post not found' } };
  }
  
  if (post.user_id !== userId) {
    return { data: null, error: { message: 'Only post owner can unmark as answer' } };
  }
  
  const { data, error } = await supabase
    .from('forum_post_replies')
    .update({ is_answer: false })
    .eq('id', replyId)
    .select()
    .single();
  
  if (error) return { data: null, error };
  
  return { data: Array.isArray(data) ? data : [], error: null };
}

// Delete forum post (admin only - should be called from API route with admin check)
export async function deleteForumPost(postId: string) {
  const { error } = await supabase
    .from('forum_posts')
    .delete()
    .eq('id', postId);
  
  if (error) return { success: false, error };
  
  return { success: true, error: null };
}

// Check if user liked a post
export async function checkUserLikedPost(postId: string, userId: string) {
  // Use client-side supabase for client components
  const { data, error } = await supabase
    .from('forum_post_likes')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .single();
  
  return { data: !!data, error };
}

// Get all forums for admin (including inactive)
export async function getAllForumsForAdmin() {
  const { data, error } = await supabase
    .from('forums')
    .select('id, name, display_name, description, header_color, logo_text, is_active, created_at, updated_at')
    .order('display_name', { ascending: true });
  
  if (error || !data) return { data, error };
  
  // Batch count posts for all forums in parallel
  const forumIds = data.map((f: any) => f.id);
  const { data: countsData } = await supabase
    .from('forum_posts')
    .select('forum_id')
    .in('forum_id', forumIds);
  
  // Count posts per forum
  const countsMap = new Map<string, number>();
  if (countsData) {
    countsData.forEach((post: any) => {
      const current = countsMap.get(post.forum_id) || 0;
      countsMap.set(post.forum_id, current + 1);
    });
  }
  
  // Map counts to forums
  const forumsWithCounts = data.map((forum: any) => ({
    ...forum,
    posts_count: countsMap.get(forum.id) || 0
  }));
  
  return { data: Array.isArray(forumsWithCounts) ? forumsWithCounts : [], error: null };
}

// Create a new forum
export async function createForum(
  name: string,
  display_name: string,
  description?: string,
  header_color: string = 'bg-blue-900',
  logo_text?: string
) {
  const { data, error } = await supabase
    .from('forums')
    .insert([{
      name,
      display_name,
      description: description || null,
      header_color,
      logo_text: logo_text || null,
      is_active: true,
      posts_count: 0
    }])
    .select()
    .single();
  
  if (error) return { data: null, error };
  
  return { data, error: null };
}

// Update a forum
export async function updateForum(
  id: string,
  updates: {
    name?: string;
    display_name?: string;
    description?: string;
    header_color?: string;
    logo_text?: string;
    is_active?: boolean;
  }
) {
  const updateData: any = {
    ...updates,
    updated_at: new Date().toISOString()
  };
  
  // Remove undefined values
  Object.keys(updateData).forEach(key => {
    if (updateData[key] === undefined) {
      delete updateData[key];
    }
  });
  
  const { data, error } = await supabase
    .from('forums')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  
  if (error) return { data: null, error };
  
  return { data, error: null };
}

// Delete a forum (soft delete - set is_active to false)
export async function deleteForum(id: string) {
  const { data, error } = await supabase
    .from('forums')
    .update({ 
      is_active: false,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();
  
  if (error) return { data: null, error };
  
  return { data, error: null };
}

