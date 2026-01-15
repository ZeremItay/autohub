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

  try {
    return await Promise.race([queryPromise, timeoutPromise]);
  } catch (error: any) {
    return { data: null, error: error || { message: 'Query failed', code: 'UNKNOWN' } };
  }
}

// Get all posts with user profiles and roles
export async function getPosts() {
  const cacheKey = 'posts:all';
  const cached = getCached<PostWithProfile[]>(cacheKey);
  if (cached) {
    return { data: Array.isArray(cached) ? cached : [], error: null };
  }

  const postsResult = await withQueryTimeout(
    supabase
      .from('posts')
      .select('id, user_id, content, media_url, media_type, is_announcement, likes_count, comments_count, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(100), // Limit to improve performance
    10000 // 10 second timeout
  )
  
  const posts = postsResult.data as any[] | null;
  const postsError = postsResult.error;
  
  if (postsError) {
    logError(postsError, 'getPosts');
    return { data: null, error: postsError }
  }

  if (!posts || !Array.isArray(posts) || posts.length === 0) {
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
  const profilesWithRolesResult = await withQueryTimeout(
    supabase
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
      .in('user_id', userIds),
    10000 // 10 second timeout
  )

  const profilesWithRoles = profilesWithRolesResult.data as any[] | null;
  const rolesError = profilesWithRolesResult.error;

  if (rolesError) {
    console.warn('Error fetching profiles with roles, trying without roles:', rolesError)
    // Fallback: get profiles without roles join
    const profilesWithoutRolesResult = await withQueryTimeout(
      supabase
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
        .in('user_id', userIds),
      10000 // 10 second timeout
    )
    
    const profilesWithoutRoles = profilesWithoutRolesResult.data as any[] | null;
    const simpleError = profilesWithoutRolesResult.error;
    
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
    
    profiles = Array.isArray(profilesWithoutRoles) ? profilesWithoutRoles : []
  } else {
    profiles = Array.isArray(profilesWithRoles) ? profilesWithRoles : []
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
  
  // Count comments and likes for each post from the tables
  const postIds = posts.map((p: any) => p.id)
  const commentsCountMap = new Map<string, number>()
  const likesCountMap = new Map<string, number>()
  
  if (postIds.length > 0) {
    // Get all comments for all posts in one query
    try {
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
    
    // Get all likes for all posts in one query
    try {
      const { data: allLikes, error: likesError } = await supabase
        .from('post_likes')
        .select('post_id')
        .in('post_id', postIds)
      
      if (!likesError && allLikes) {
        // Count likes per post
        allLikes.forEach((like: any) => {
          const postId = like.post_id
          likesCountMap.set(postId, (likesCountMap.get(postId) || 0) + 1)
        })
      } else if (likesError) {
        if (!isNotFoundError(likesError)) {
          logError(likesError, 'getPosts:likes');
        }
        // Continue without likes count - use existing values
      }
    } catch (error) {
      logError(error, 'getPosts:likes:catch');
      // Continue without likes count - use existing values
    }
  }
  
  const postsWithProfiles = posts.map((post: any) => {
    // Use actual count from comments table if available, otherwise use existing comments_count
    const actualCommentsCount = commentsCountMap.get(post.id) ?? post.comments_count ?? 0
    // Use actual count from post_likes table if available, otherwise use existing likes_count
    const actualLikesCount = likesCountMap.get(post.id) ?? post.likes_count ?? 0
    
    return {
      ...post,
      comments_count: actualCommentsCount,
      likes_count: actualLikesCount,
      profile: profileMap.get(post.user_id) || null
    }
  })
  
  // Cache the result
  setCached(cacheKey, postsWithProfiles, CACHE_TTL.MEDIUM);
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
    // Check if user already got points for this post to prevent duplicate points
    try {
      const { awardPoints } = await import('./gamification');
      // Try Hebrew first (primary), then English as fallback
      // Pass postId as relatedId to prevent duplicate points for same post
      const result = await awardPoints(userId, 'לייק לפוסט', { 
        checkRelatedId: true, 
        relatedId: postId 
      }).catch(async () => {
        // If Hebrew doesn't work, try English
        return await awardPoints(userId, 'like_post', { 
          checkRelatedId: true, 
          relatedId: postId 
        });
      });
      
      if (!result.success) {
        if (result.alreadyAwarded) {
        } else {
          console.error('❌ Failed to award points for like:', result.error);
          // Don't fail the like operation, but log the error for debugging
          logError(new Error(result.error || 'Failed to award points'), 'toggleLike:points');
        }
      } else {
      }
    } catch (error) {
      // Silently fail - gamification is not critical, but log for debugging
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

// Check if user liked multiple posts (batch query for performance)
export async function checkUserLikedPosts(postIds: string[], userId: string) {
  if (!postIds || postIds.length === 0) {
    return { likedMap: {}, error: null };
  }

  const { data, error } = await supabase
    .from('post_likes')
    .select('post_id')
    .eq('user_id', userId)
    .in('post_id', postIds);
  
  if (error) {
    // Check if table doesn't exist
    if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
      console.warn('Table post_likes does not exist. Returning empty map.');
      return { likedMap: {}, error: null };
    }
    logError(error, 'checkUserLikedPosts');
    return { likedMap: {}, error };
  }
  
  const likedSet = new Set(data?.map((l: any) => l.post_id) || []);
  const likedMap = Object.fromEntries(postIds.map(id => [id, likedSet.has(id)]));
  
  return { likedMap, error: null };
}

// Get list of users who liked a post
export async function getPostLikes(postId: string) {
  // First, get all likes for the post
  const { data: likesData, error: likesError } = await supabase
    .from('post_likes')
    .select('user_id, created_at')
    .eq('post_id', postId)
    .order('created_at', { ascending: false });

  if (likesError) {
    logError(likesError, 'getPostLikes');
    console.error('Error fetching post likes:', likesError);
    return { data: null, error: likesError };
  }

  if (!likesData || likesData.length === 0) {
    return { data: [], error: null };
  }

  // Get user IDs
  const userIds = likesData.map((like: any) => like.user_id).filter(Boolean);
  
  if (userIds.length === 0) {
    return { data: [], error: null };
  }

  // Fetch profiles for all users
  const { data: profilesData, error: profilesError } = await supabase
    .from('profiles')
    .select('user_id, display_name, avatar_url, first_name, last_name, nickname')
    .in('user_id', userIds);

  if (profilesError) {
    console.error('Error fetching profiles for likes:', profilesError);
    // Return likes without profile data if profiles fetch fails
    return { 
      data: likesData.map((like: any) => ({
        user_id: like.user_id,
        display_name: 'משתמש',
        avatar_url: null,
        created_at: like.created_at
      })), 
      error: null 
    };
  }

  // Create a map of user_id to profile
  const profileMap = new Map(
    (profilesData || []).map((profile: any) => [profile.user_id, profile])
  );

  // Combine likes with profile data
  const likes = likesData.map((like: any) => {
    const profile = profileMap.get(like.user_id);
    return {
      user_id: like.user_id,
      display_name: (profile as any)?.display_name || (profile as any)?.first_name || (profile as any)?.nickname || 'משתמש',
      avatar_url: (profile as any)?.avatar_url || null,
      created_at: like.created_at
    };
  });

  return { data: likes, error: null };
}
