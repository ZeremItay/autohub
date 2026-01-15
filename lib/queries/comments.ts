import { supabase } from '../supabase'

export interface Comment {
  id: string
  recording_id: string
  user_id: string
  content: string
  parent_id?: string | null
  created_at?: string
  updated_at?: string
  user?: {
    user_id?: string
    display_name?: string
    avatar_url?: string
    first_name?: string
    last_name?: string
    nickname?: string
    role?: {
      id: string
      name: string
      display_name: string
    }
  }
  replies?: Comment[]
}

// Get comments for a recording
export async function getRecordingComments(recordingId: string) {
  // Get main comments (without parent_id)
  const { data: commentsData, error } = await supabase
    .from('recording_comments')
    .select('*')
    .eq('recording_id', recordingId)
    .is('parent_id', null)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching comments:', error)
    return { data: null, error }
  }

  if (!commentsData || commentsData.length === 0) {
    return { data: [], error: null }
  }

  // Get all user IDs
  const userIds = [...new Set(commentsData.map((c: any) => c.user_id).filter(Boolean))]
  
  // Get profiles for all users with roles - try with roles first, then fallback
  let profiles: any[] = [];
  const query = supabase
    .from('profiles')
    .select(`
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
    `);
  
  const { data: profilesWithRole, error: profilesError } = userIds.length === 1
    ? await query.eq('user_id', userIds[0])
    : await query.in('user_id', userIds)
  
  if (!profilesError && profilesWithRole) {
    profiles = profilesWithRole;
  } else {
    // Fallback: try without roles
    console.warn('Failed to fetch profiles with roles, trying without:', profilesError);
    const fallbackQuery = supabase
      .from('profiles')
      .select(`
        user_id,
        display_name,
        avatar_url,
        first_name,
        last_name,
        nickname,
        role_id
      `);
    
    const { data: profilesWithoutRole } = userIds.length === 1
      ? await fallbackQuery.eq('user_id', userIds[0])
      : await fallbackQuery.in('user_id', userIds)
    
    if (profilesWithoutRole) {
      profiles = profilesWithoutRole;
      // Try to get roles separately
      const roleIds = [...new Set(profiles.map(p => p.role_id).filter(Boolean))];
      if (roleIds.length > 0) {
        const { data: rolesData } = await supabase
          .from('roles')
          .select('id, name, display_name')
          .in('id', roleIds);
        
        const roleMap = new Map(rolesData?.map((r: any) => [r.id, r]) || []);
        profiles = profiles.map((p: any) => ({
          ...p,
          roles: roleMap.get(p.role_id) || null
        }));
      }
    }
  }
  
  // If profiles fetch fails, continue without profiles
  const profileMap = new Map(profiles.map((p: any) => {
    const displayName = p.display_name || p.first_name || p.nickname || 'משתמש';
    return [p.user_id, {
      user_id: p.user_id,
      display_name: displayName,
      avatar_url: p.avatar_url,
      first_name: p.first_name,
      last_name: p.last_name,
      nickname: p.nickname,
      role: p.roles || null
    }];
  }))
  
  // Log for debugging
  if (userIds.length > 0 && profiles.length === 0) {
    console.warn('No profiles found for user IDs:', userIds);
  }

  // Get replies for each comment
  const commentsWithReplies = await Promise.all(
    commentsData.map(async (comment: any) => {
      // Get replies for this comment
      const { data: repliesData } = await supabase
        .from('recording_comments')
        .select('*')
        .eq('parent_id', comment.id)
        .order('created_at', { ascending: true })
      
      // Get profiles for reply users
      if (repliesData && repliesData.length > 0) {
        const replyUserIds = [...new Set(repliesData.map((r: any) => r.user_id).filter(Boolean))]
        
        // Try to get profiles with roles first
        let replyProfiles: any[] = [];
        const replyQuery = supabase
          .from('profiles')
          .select(`
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
          `);
        
        const { data: replyProfilesWithRole, error: replyProfilesError } = replyUserIds.length === 1
          ? await replyQuery.eq('user_id', replyUserIds[0])
          : await replyQuery.in('user_id', replyUserIds)
        
        if (!replyProfilesError && replyProfilesWithRole) {
          replyProfiles = replyProfilesWithRole;
        } else {
          // Fallback: try without roles
          console.warn('Failed to fetch reply profiles with roles, trying without:', replyProfilesError);
          const replyFallbackQuery = supabase
            .from('profiles')
            .select(`
              user_id,
              display_name,
              avatar_url,
              first_name,
              last_name,
              nickname,
              role_id
            `);
          
          const { data: replyProfilesWithoutRole } = replyUserIds.length === 1
            ? await replyFallbackQuery.eq('user_id', replyUserIds[0])
            : await replyFallbackQuery.in('user_id', replyUserIds)
          
          if (replyProfilesWithoutRole) {
            replyProfiles = replyProfilesWithoutRole;
            // Try to get roles separately
            const roleIds = [...new Set(replyProfiles.map(p => p.role_id).filter(Boolean))];
            if (roleIds.length > 0) {
              const { data: rolesData } = await supabase
                .from('roles')
                .select('id, name, display_name')
                .in('id', roleIds);
              
              const roleMap = new Map(rolesData?.map((r: any) => [r.id, r]) || []);
              replyProfiles = replyProfiles.map((p: any) => ({
                ...p,
                roles: roleMap.get(p.role_id) || null
              }));
            }
          }
        }
        
        const replyProfileMap = new Map(replyProfiles.map((p: any) => {
          const displayName = p.display_name || p.first_name || p.nickname || 'משתמש';
          return [p.user_id, {
            user_id: p.user_id,
            display_name: displayName,
            avatar_url: p.avatar_url,
            first_name: p.first_name,
            last_name: p.last_name,
            nickname: p.nickname,
            role: p.roles || null
          }];
        }))
        
        return {
          ...comment,
          user: profileMap.get(comment.user_id) || {
            user_id: comment.user_id,
            display_name: 'משתמש',
            avatar_url: null
          },
          replies: repliesData.map((reply: any) => ({
            ...reply,
            user: replyProfileMap.get(reply.user_id) || {
              user_id: reply.user_id,
              display_name: 'משתמש',
              avatar_url: null
            }
          }))
        }
      }
      
      return {
        ...comment,
        user: profileMap.get(comment.user_id) || {
          user_id: comment.user_id,
          display_name: 'משתמש',
          avatar_url: null
        },
        replies: []
      }
    })
  )
  
  return { data: Array.isArray(commentsWithReplies) ? commentsWithReplies : [], error: null }
}

// Create a comment
export async function createComment(
  recordingId: string,
  userId: string,
  content: string,
  parentId?: string | null
) {
  const { data, error } = await supabase
    .from('recording_comments')
    .insert({
      recording_id: recordingId,
      user_id: userId,
      content,
      parent_id: parentId || null,
      updated_at: new Date().toISOString()
    })
    .select('*')
    .single()
  
  if (error) {
    console.error('Error creating comment:', error)
    return { data: null, error }
  }
  
  // Get user profile with role - try with role first, then fallback without role
  let profile: any = null;
  
  // First try: get profile with role
  const { data: profileWithRole, error: profileWithRoleError } = await supabase
    .from('profiles')
    .select(`
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
    .eq('user_id', userId)
    .single()
  
  if (!profileWithRoleError && profileWithRole) {
    profile = profileWithRole;
  } else {
    // Fallback: try without role (in case of RLS issues)
    console.warn('Failed to fetch profile with role, trying without role:', profileWithRoleError);
    const { data: profileWithoutRole, error: profileWithoutRoleError } = await supabase
      .from('profiles')
      .select(`
        user_id,
        display_name,
        avatar_url,
        first_name,
        last_name,
        nickname,
        role_id
      `)
      .eq('user_id', userId)
      .single()
    
    if (!profileWithoutRoleError && profileWithoutRole) {
      profile = profileWithoutRole;
      // Try to get role separately if role_id exists
      if (profile.role_id) {
        const { data: roleData } = await supabase
          .from('roles')
          .select('id, name, display_name')
          .eq('id', profile.role_id)
          .single()
        
        if (roleData) {
          profile.roles = roleData;
        }
      }
    } else {
      // If both attempts failed, log warning but continue without profile
      console.warn('Failed to fetch profile for comment (both with and without role):', {
        withRoleError: profileWithRoleError,
        withoutRoleError: profileWithoutRoleError,
        userId: userId
      });
      // Continue without profile - will use default 'משתמש'
    }
  }
  
  // Log profile data for debugging
  if (!profile) {
    console.warn('No profile found for userId:', userId, 'Comment will show as "משתמש"');
  }
  
  // Build display name with fallback chain
  const displayName = profile 
    ? (profile.display_name || profile.first_name || profile.nickname || 'משתמש')
    : 'משתמש'
  
  return { 
    data: {
      ...data,
      user: profile ? {
        user_id: profile.user_id,
        display_name: displayName,
        avatar_url: profile.avatar_url,
        first_name: profile.first_name,
        last_name: profile.last_name,
        nickname: profile.nickname,
        role: profile.roles || null
      } : {
        user_id: userId,
        display_name: 'משתמש',
        avatar_url: null,
        first_name: null,
        last_name: null,
        nickname: null,
        role: null
      },
      replies: []
    }, 
    error: null 
  }
}

// Update a comment
export async function updateComment(commentId: string, content: string) {
  const { data: commentData, error } = await supabase
    .from('recording_comments')
    .update({
      content,
      updated_at: new Date().toISOString()
    })
    .eq('id', commentId)
    .select('*')
    .single()
  
  if (error) {
    console.error('Error updating comment:', error)
    return { data: null, error }
  }
  
  // Get user profile with role - try with role first, then fallback without role
  let profile: any = null;
  let profileError: any = null;
  
  // First try: get profile with role
  const { data: profileWithRole, error: profileWithRoleError } = await supabase
    .from('profiles')
    .select(`
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
    .eq('user_id', commentData.user_id)
    .single()
  
  if (!profileWithRoleError && profileWithRole) {
    profile = profileWithRole;
  } else {
    // Fallback: try without role (in case of RLS issues)
    profileError = profileWithRoleError;
    const { data: profileWithoutRole, error: profileWithoutRoleError } = await supabase
      .from('profiles')
      .select(`
        user_id,
        display_name,
        avatar_url,
        first_name,
        last_name,
        nickname,
        role_id
      `)
      .eq('user_id', commentData.user_id)
      .single()
    
    if (!profileWithoutRoleError && profileWithoutRole) {
      profile = profileWithoutRole;
      // Try to get role separately if role_id exists
      if (profile.role_id) {
        const { data: roleData } = await supabase
          .from('roles')
          .select('id, name, display_name')
          .eq('id', profile.role_id)
          .single()
        
        if (roleData) {
          profile.roles = roleData;
        }
      }
    } else {
      // If both attempts failed, log warning but continue without profile
      console.warn('Failed to fetch profile for comment update (both with and without role):', {
        withRoleError: profileWithRoleError,
        withoutRoleError: profileWithoutRoleError,
        userId: commentData.user_id
      });
      // Continue without profile - will use default 'משתמש'
    }
  }
  
  // Build display name with fallback chain
  const displayName = profile 
    ? (profile.display_name || profile.first_name || profile.nickname || 'משתמש')
    : 'משתמש'
  
  return { 
    data: {
      ...commentData,
      user: profile ? {
        user_id: profile.user_id,
        display_name: displayName,
        avatar_url: profile.avatar_url,
        first_name: profile.first_name,
        last_name: profile.last_name,
        nickname: profile.nickname,
        role: profile.roles || null
      } : {
        user_id: commentData.user_id,
        display_name: 'משתמש',
        avatar_url: null,
        first_name: null,
        last_name: null,
        nickname: null,
        role: null
      }
    }, 
    error: null 
  }
}

// Delete a comment
export async function deleteComment(commentId: string) {
  const { error } = await supabase
    .from('recording_comments')
    .delete()
    .eq('id', commentId)
  
  if (error) {
    console.error('Error deleting comment:', error)
    return { error }
  }
  
  return { error: null }
}

