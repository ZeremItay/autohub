import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { createForumPostReply } from '@/lib/queries/forums';
import { getAllProfiles } from '@/lib/queries/profiles';
import { notifyForumPostReply, checkAndNotifyMentions } from '@/lib/utils/notifications';
import { awardPoints } from '@/lib/queries/gamification';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { post_id, user_id, content, parent_id } = body;

    if (!post_id || !user_id || !content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Get post info for notifications
    const { data: post } = await supabase
      .from('forum_posts')
      .select('id, title, forum_id, user_id')
      .eq('id', post_id)
      .single();

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Create the reply (with optional parent_id for nested replies)
    const { data: reply, error } = await createForumPostReply(post_id, user_id, content, parent_id || null);

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to create reply' },
        { status: 500 }
      );
    }

    // Get user profile for the reply
    // Try both user_id and id fields in case the structure is different
    let profile = null;
    const { data: profileByUserId } = await supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url, first_name, last_name, nickname, full_name')
      .eq('user_id', user_id)
      .single();
    
    if (profileByUserId) {
      profile = profileByUserId;
    } else {
      // Fallback: try to find by id field
      const { data: profileById } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url, first_name, last_name, nickname, full_name')
        .eq('id', user_id)
        .single();
      
      if (profileById) {
        profile = profileById;
      }
    }
    
    // Build display name with fallback chain
    const displayName = profile 
      ? (profile.display_name || profile.first_name || profile.nickname || profile.full_name || 'משתמש')
      : 'משתמש';

    // Get user info for notifications
    const { data: profiles } = await getAllProfiles();
    const replier = (Array.isArray(profiles) ? profiles : []).find((p: any) => (p.user_id || p.id) === user_id);
    const replierName = replier?.display_name || profile?.display_name || profile?.first_name || profile?.nickname || 'משתמש';

    // Create notification for post owner
    if (post.user_id && post.user_id !== user_id) {
      await notifyForumPostReply(
        post_id,
        post.title,
        post.forum_id,
        user_id,
        replierName,
        post.user_id
      );
    }

    // Check for mentions in content
    await checkAndNotifyMentions(
      content,
      user_id,
      replierName,
      `/forums/${post.forum_id}/posts/${post_id}`,
      reply?.id || '',
      'forum_reply'
    );

    // Award points for replying to a topic (only for top-level replies, not nested)
    if (!parent_id) {
      try {
        await awardPoints(user_id, 'תגובה לנושא');
      } catch (error) {
        console.error('Error awarding points for reply:', error);
        // Don't fail the request if points awarding fails
      }
    }

    // Return reply with profile (use the profile from createForumPostReply if it exists, otherwise use the one we fetched)
    const replyWithProfile = reply?.profile 
      ? reply 
      : {
          ...reply,
          profile: profile ? {
            user_id: profile.user_id,
            display_name: displayName,
            avatar_url: profile.avatar_url,
            first_name: profile.first_name,
            last_name: profile.last_name,
            nickname: profile.nickname,
            full_name: profile.full_name
          } : {
            user_id: user_id,
            display_name: 'משתמש',
            avatar_url: null
          }
        };
    
    return NextResponse.json({ 
      data: replyWithProfile
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

