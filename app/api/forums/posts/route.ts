import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';
import { awardPoints } from '@/lib/queries/gamification';
import { checkAndNotifyMentions } from '@/lib/utils/notifications';

// Helper function to get authenticated user
async function getAuthenticatedUser() {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(cookieStore)
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error || !session) {
      return null
    }
    return session.user
  } catch (error) {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json();
    const { forum_id, title, content, media_url, media_type } = body;

    // Use authenticated user's ID, not from request body
    const user_id = user.id;

    if (!forum_id || !title || !content) {
      console.error('Missing required fields:', {
        forum_id: !!forum_id,
        title: !!title,
        content: !!content
      });
      return NextResponse.json(
        {
          error: 'Missing required fields',
          missing: {
            forum_id: !forum_id,
            title: !title,
            content: !content
          }
        },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    
    // Verify the user exists in profiles table
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, user_id')
      .or(`user_id.eq.${user_id},id.eq.${user_id}`)
      .limit(1)
      .single();
    
    if (profileError || !userProfile) {
      console.error('Profile lookup error:', profileError);
      return NextResponse.json(
        { 
          error: 'User profile not found',
          details: profileError?.message || 'No profile found for user_id',
          user_id: user_id
        },
        { status: 404 }
      );
    }
    
    // Use the profile's user_id (from auth.users) for the post
    const actualUserId = userProfile.user_id || user_id;

    // Create the post - only include media fields if they have values
    const postData: any = {
      forum_id,
      user_id: actualUserId,
      title,
      content
    };

    // Only add media fields if they exist and have values
    // Check if columns exist first to avoid errors
    if (media_url && media_url.trim() !== '') {
      postData.media_url = media_url.trim();
    }
    if (media_type && media_type.trim() !== '') {
      // Validate media_type
      if (media_type === 'image' || media_type === 'video') {
        postData.media_type = media_type;
      } else {
        console.warn('Invalid media_type:', media_type, 'Expected: image or video');
      }
    }

    
    const { data: post, error: postError } = await supabase
      .from('forum_posts')
      .insert([postData])
      .select()
      .single();

    if (postError) {
      console.error('Supabase error creating post:', JSON.stringify(postError, null, 2));
      console.error('Post data that failed:', JSON.stringify(postData, null, 2));
      return NextResponse.json(
        { 
          error: postError.message || 'Failed to create post',
          details: postError.details || null,
          hint: postError.hint || null,
          code: postError.code || null,
          fullError: JSON.stringify(postError),
          postData: postData
        },
        { status: 500 }
      );
    }

    // Update forum posts count - get actual count
    const { count } = await supabase
      .from('forum_posts')
      .select('*', { count: 'exact', head: true })
      .eq('forum_id', forum_id);

    if (count !== null) {
      const { error: updateError } = await supabase
        .from('forums')
        .update({ 
          posts_count: count,
          updated_at: new Date().toISOString()
        })
        .eq('id', forum_id);

      if (updateError) {
        console.error('Error updating forum posts count:', updateError);
      }
    }

    // Get user profile for the post
    let postProfile: any = null;
    const { data: profileByUserId } = await supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url, first_name, last_name, nickname')
      .eq('user_id', actualUserId)
      .single();
    
    if (profileByUserId) {
      postProfile = profileByUserId;
    } else {
      // Fallback: try to find by id field
      const { data: profileById } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url, first_name, last_name, nickname')
        .eq('id', actualUserId)
        .single();
      
      if (profileById) {
        postProfile = profileById;
      }
    }

    // Award points for creating a new post
    try {
      await awardPoints(actualUserId, 'פוסט חדש');
    } catch (error) {
      console.error('Error awarding points for new post:', error);
      // Don't fail the request if points awarding fails
    }

    // Check for mentions in content
    try {
      const mentionerName = postProfile?.display_name || postProfile?.first_name || postProfile?.nickname || 'משתמש';
      await checkAndNotifyMentions(
        content,
        actualUserId,
        mentionerName,
        `/forums/${forum_id}/posts/${post.id}`,
        post.id,
        'forum_post'
      );
    } catch (mentionError) {
      console.warn('Error checking mentions:', mentionError);
    }

    // Return post with profile
    return NextResponse.json({ 
      data: {
        ...post,
        profile: postProfile ? {
          user_id: postProfile.user_id,
          display_name: postProfile.display_name || postProfile.first_name || postProfile.nickname || 'משתמש',
          avatar_url: postProfile.avatar_url
        } : null
      }
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/forums/posts:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        details: error.stack || null
      },
      { status: 500 }
    );
  }
}

