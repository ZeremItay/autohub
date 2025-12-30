import { supabase } from '../supabase'
import { getCached, setCached, CACHE_TTL, invalidateCache } from '../cache'
import { logError, isNotFoundError } from '../utils/errorHandler'

export interface Post {
  id: string
  user_id: string
  content: string
  created_at: string
  updated_at?: string
  image_url?: string
  media_url?: string
  media_type?: string
  is_announcement?: boolean
  likes_count?: number
  comments_count?: number
}

export interface PostWithProfile extends Post {
  profile?: {
    id: string
    user_id?: string
    display_name?: string
    avatar_url?: string
    first_name?: string
    last_name?: string
    nickname?: string
    role?: string | {
      id: string
      name: string
      display_name: string
    }
  }
}

// Get all posts with user profiles and roles
export async function getPosts() {
  const cacheKey = 'posts:all';
  const cached = getCached<PostWithProfile[]>(cacheKey);
  if (cached) {
    return { data: Array.isArray(cached) ? cached : [], error: null };
  }

  const { data: posts, error: postsError } = await supabase
    .from('posts')
    .select('id, user_id, content, media_url, media_type, is_announcement, likes_count, comments_count, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(100) // Limit to improve performance
  
  if (postsError) {
    logError(postsError, 'getPosts');
    return { data: null, error: postsError }
  }

  if (!posts || posts.length === 0) {
    return { data: [], error: null }
  }

  // Get all user IDs
  const userIds = [...new Set(posts.map((p: any) => p.user_id).filter(Boolean))]
  
  // If no valid user IDs, return posts without profiles
  if (userIds.length === 0) {
    return { data: Array.isArray(posts) ? posts.map((post: any) => ({ ...post, profile: null })) : [], error: null }
  }
  
  // Try to get profiles - first without roles join to avoid issues
  let profiles: any[] = []
  let profilesError: any = null
  
  // First attempt: get profiles with roles
  const { data: profilesWithRoles, error: rolesError } = await supabase
    .from('profiles')
    .select(`
      id,
      user_id,
      display_name,
      avatar_url,
      first_name,
      last_name,
      nickname,
      role_id,
      roles:role_id (
        id,
        name,
        display_name
      )
    `)
    .in('user_id', userIds)

  if (rolesError) {
    console.warn('Error fetching profiles with roles, trying without roles:', rolesError)
    // Fallback: get profiles without roles join
    const { data: profilesWithoutRoles, error: simpleError } = await supabase
      .from('profiles')
      .select(`
        id,
        user_id,
        display_name,
        avatar_url,
        first_name,
        last_name,
        nickname,
        role_id
      `)
      .in('user_id', userIds)
    
    if (simpleError) {
      console.error('Error fetching profiles:', simpleError)
      console.error('Error details:', {
        message: simpleError.message,
        details: simpleError.details,
        hint: simpleError.hint,
        code: simpleError.code
      })
      // Return posts without profiles if profile fetch fails
      return { data: Array.isArray(posts) ? posts.map((post: any) => ({ ...post, profile: null })) : [], error: null }
    }
    
    profiles = profilesWithoutRoles || []
  } else {
    profiles = profilesWithRoles || []
  }

  // Map profiles to posts
  const profileMap = new Map(profiles?.map((p: any) => [p.user_id, {
    id: p.id,
    user_id: p.user_id,
    display_name: p.display_name || p.first_name || p.nickname || 'משתמש',
    avatar_url: p.avatar_url,
    first_name: p.first_name,
    last_name: p.last_name,
    nickname: p.nickname,
    role: p.roles || (p.role_id ? { id: p.role_id } : null)
  }]) || [])
  
  // Count comments for each post from the comments table
  const postIds = posts.map((p: any) => p.id)
  const commentsCountMap = new Map<string, number>()
  
  if (postIds.length > 0) {
    try {
      // Get all comments for all posts in one query
      const { data: allComments, error: commentsError } = await supabase
        .from('comments')
        .select('post_id')
        .in('post_id', postIds)
      
      if (!commentsError && allComments) {
        // Count comments per post
        allComments.forEach((comment: any) => {
          const postId = comment.post_id
          commentsCountMap.set(postId, (commentsCountMap.get(postId) || 0) + 1)
        })
      } else if (commentsError) {
        if (!isNotFoundError(commentsError)) {
          logError(commentsError, 'getPosts:comments');
        }
        // Continue without comments count - use existing values
      }
    } catch (error) {
      logError(error, 'getPosts:comments:catch');
      // Continue without comments count - use existing values
    }
  }
  
  const postsWithProfiles = posts.map((post: any) => {
    // Use actual count from comments table if available, otherwise use existing comments_count
    const actualCommentsCount = commentsCountMap.get(post.id) ?? post.comments_count ?? 0
    
    return {
      ...post,
      comments_count: actualCommentsCount,
      profile: profileMap.get(post.user_id) || null
    }
  })
  
  // Cache the result
  setCached(cacheKey, postsWithProfiles, CACHE_TTL.SHORT);
  return { data: Array.isArray(postsWithProfiles) ? postsWithProfiles : [], error: null }
}

// Get single post
export async function getPost(id: string) {
  const cacheKey = `post:${id}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return { data: Array.isArray(cached) ? cached : (cached ?? null), error: null };
  }

  const { data: post, error: postError } = await supabase
    .from('posts')
    .select('id, user_id, content, media_url, media_type, is_announcement, likes_count, comments_count, created_at, updated_at')
    .eq('id', id)
    .maybeSingle()
  
  if (postError) {
    logError(postError, 'getPost');
    return { data: null, error: postError }
  }

  if (!post) {
    return { data: null, error: null }
  }

  // Get profile for the post author
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select(`
      id,
      user_id,
      display_name,
      avatar_url,
      first_name,
      last_name,
      nickname,
      role_id,
      roles:role_id (
        id,
        name,
        display_name
      )
    `)
    .eq('user_id', post.user_id)
    .single()

  if (profileError) {
    if (!isNotFoundError(profileError)) {
      logError(profileError, 'getPost:profile');
    }
    // Return post without profile if profile fetch fails
    const result = { ...post, profile: null };
    setCached(cacheKey, result, CACHE_TTL.SHORT);
    return { data: result, error: null }
  }

  const result = { ...post, profile: profile || null };
  setCached(cacheKey, result, CACHE_TTL.SHORT);
  return { data: result, error: null }
}

// Create new post
export async function createPost(post: {
  user_id: string
  content: string
  image_url?: string
  media_url?: string
  media_type?: string
  is_announcement?: boolean
}) {
  // Validate required fields
  if (!post.user_id || !post.content) {
    const error = { message: 'Missing required fields: user_id and content are required' };
    console.error('Error creating post:', error);
    return { data: null, error };
  }

  // Prepare insert data - only include fields that exist
  const insertData: any = {
    user_id: post.user_id,
    content: post.content,
    is_announcement: post.is_announcement || false
  };

  // Add optional fields only if they have values
  // The posts table uses media_url, not image_url
  if (post.image_url) {
    insertData.media_url = post.image_url;
    insertData.media_type = 'image';
  }
  if (post.media_url) {
    insertData.media_url = post.media_url;
  }
  if (post.media_type) {
    insertData.media_type = post.media_type;
  }

  console.log('Inserting post with data:', JSON.stringify(insertData, null, 2));
  
  const { data, error } = await supabase
    .from('posts')
    .insert([insertData])
    .select()
    .single()
  
  if (error) {
    logError(error, 'createPost');
    return { data: null, error }
  }
  
  // Invalidate posts cache
  invalidateCache('posts:all');
  
  // Award points for creating a post
  try {
    const { awardPoints } = await import('./gamification');
    // Try both Hebrew and English action names
    await awardPoints(post.user_id, 'יצירת פוסט', {}).catch(() => {
      // If Hebrew doesn't work, try English
      return awardPoints(post.user_id, 'create_post', {});
    }).catch((error) => {
      // Silently fail - gamification is not critical
      logError(error, 'createPost:points');
    });
  } catch (error) {
    // Silently fail - gamification is not critical
    logError(error, 'createPost:points:catch');
  }
  
  return { data, error: null }
}

// Update post
export async function updatePost(id: string, updates: Partial<Post>) {
  const { data, error } = await supabase
    .from('posts')
    .update(updates)
    .eq('id', id)
    .select('id, user_id, content, media_url, media_type, is_announcement, likes_count, comments_count, created_at, updated_at')
    .single()
  
  if (error) {
    logError(error, 'updatePost');
    return { data: null, error }
  }
  
  // Invalidate caches
  invalidateCache('posts:all');
  invalidateCache(`post:${id}`);
  
  return { data, error: null }
}

// Delete post
export async function deletePost(id: string) {
  const { data, error } = await supabase
    .from('posts')
    .delete()
    .eq('id', id)
  
  if (error) {
    logError(error, 'deletePost');
    return { data: null, error }
  }
  
  // Invalidate caches
  invalidateCache('posts:all');
  invalidateCache(`post:${id}`);
  
  return { data, error: null }
}

// Like/Unlike post
export async function toggleLike(postId: string, userId: string) {
  // Check if user already liked the post
  const { data: existingLike, error: checkError } = await supabase
    .from('post_likes')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .maybeSingle();
  
  // If there's an error checking (not just "not found"), return it
  if (checkError && checkError.code !== 'PGRST116') {
    // Check if table doesn't exist
    if (checkError.code === 'PGRST205' || checkError.message?.includes('Could not find the table')) {
      console.error('❌ Table post_likes does not exist! Please run the SQL script: supabase-create-post-likes-table.sql');
      return { 
        data: null, 
        error: { 
          message: 'Table post_likes does not exist. Please run supabase-create-post-likes-table.sql in Supabase SQL Editor',
          code: checkError.code,
          hint: 'See CREATE_POST_LIKES_TABLE.md for instructions'
        } 
      };
    }
    return { data: null, error: checkError };
  }
  
  if (existingLike) {
    // Unlike - delete the like
    const { error: deleteError } = await supabase
      .from('post_likes')
      .delete()
      .eq('id', existingLike.id);
    
    if (deleteError) {
      logError(deleteError, 'toggleLike:delete');
      return { data: null, error: deleteError };
    }
    
    // Decrement likes count
    const { data: postData, error: postError } = await supabase
      .from('posts')
      .select('likes_count')
      .eq('id', postId)
      .maybeSingle();
    
    if (postError) {
      if (!isNotFoundError(postError)) {
        logError(postError, 'toggleLike:unlike:fetch');
      }
      // Don't fail the unlike operation if we can't update the count
    } else if (postData) {
      const { error: updateError } = await supabase
        .from('posts')
        .update({ likes_count: Math.max(0, (postData.likes_count || 0) - 1) })
        .eq('id', postId);
      
      if (updateError) {
        logError(updateError, 'toggleLike:unlike:update');
        // Don't fail the unlike operation if we can't update the count
      } else {
        // Invalidate cache
        invalidateCache('posts:all');
        invalidateCache(`post:${postId}`);
      }
    }
    
    return { data: { liked: false }, error: null };
  } else {
    // Like - insert the like
    // Try insert without select first (simpler, avoids RLS issues with select)
    const { error: insertError } = await supabase
      .from('post_likes')
      .insert([{ post_id: postId, user_id: userId }]);
    
    if (insertError) {
      // Check if it's a duplicate key error (user already liked)
      const isDuplicateError = insertError.code === '23505' || 
                               insertError.message?.includes('duplicate') ||
                               insertError.message?.includes('unique');
      
      if (isDuplicateError) {
        // User already liked - this is OK, just return success
        // This can happen in race conditions
        return { data: { liked: true }, error: null };
      }
      
      // Real error - insert failed
      logError(insertError, 'toggleLike:insert');
      return { data: null, error: insertError };
    }
    
    // Insert succeeded
    
    // Get post owner for notifications
    const { data: postOwnerData } = await supabase
      .from('posts')
      .select('user_id, likes_count')
      .eq('id', postId)
      .maybeSingle();
    
    // Send notification to post owner
    if (postOwnerData?.user_id && postOwnerData.user_id !== userId) {
      try {
        // Get liker profile
        const { data: likerProfile } = await supabase
          .from('profiles')
          .select('user_id, display_name')
          .eq('user_id', userId)
          .maybeSingle();
        
        const likerName = likerProfile?.display_name || 'משתמש';
        
        const { notifyPostLike } = await import('../utils/notifications');
        await notifyPostLike(
          postId,
          userId,
          likerName,
          postOwnerData.user_id
        ).catch((error) => {
          logError(error, 'toggleLike:notification');
        });
      } catch (error) {
        logError(error, 'toggleLike:notification:catch');
      }
    }
    
    // Award points for liking a post (only when adding a like, not removing)
    try {
      const { awardPoints } = await import('./gamification');
      // Try both Hebrew and English action names
      await awardPoints(userId, 'לייק לפוסט', {}).catch(() => {
        // If Hebrew doesn't work, try English
        return awardPoints(userId, 'like_post', {});
      }).catch((error) => {
        // Silently fail - gamification is not critical
        logError(error, 'toggleLike:points');
      });
    } catch (error) {
      // Silently fail - gamification is not critical
      logError(error, 'toggleLike:points:catch');
    }
    
    // Increment likes count
    if (postOwnerData) {
      const { error: updateError } = await supabase
        .from('posts')
        .update({ likes_count: (postOwnerData.likes_count || 0) + 1 })
        .eq('id', postId);
      
      if (updateError) {
        logError(updateError, 'toggleLike:like:update');
        // Don't fail the like operation if we can't update the count
      } else {
        // Invalidate cache
        invalidateCache('posts:all');
        invalidateCache(`post:${postId}`);
      }
    }
    
    return { data: { liked: true }, error: null };
  }
}

// Check if user liked a post
export async function checkUserLikedPost(postId: string, userId: string) {
  const { data, error } = await supabase
    .from('post_likes')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .maybeSingle();
  
  // If error is "not found", that's OK - user didn't like
  if (error && isNotFoundError(error)) {
    return { liked: false, error: null };
  }
  
  if (error) {
    logError(error, 'checkUserLikedPost');
  }
  
  return { liked: !!data, error: error || null };
}

