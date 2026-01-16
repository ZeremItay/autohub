import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase-server';
import { awardPoints } from '@/lib/queries/gamification';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const cookieStore = await cookies();
    const serverSupabase = createServerClient(cookieStore);
    const { data: { session }, error: sessionError } = await serverSupabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { postId } = body;

    if (!postId) {
      return NextResponse.json(
        { error: 'Missing postId' },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    // Check if user already liked the post
    const { data: existingLike } = await serverSupabase
      .from('forum_post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();

    if (existingLike) {
      // Unlike - delete the like
      const { error } = await serverSupabase
        .from('forum_post_likes')
        .delete()
        .eq('id', existingLike.id);

      if (error) return NextResponse.json({ error: error.message }, { status: 400 });

      // Update likes_count in forum_posts table
      const { data: currentPost } = await serverSupabase
        .from('forum_posts')
        .select('likes_count')
        .eq('id', postId)
        .single();

      const newCount = Math.max(0, (currentPost?.likes_count || 0) - 1);

      try {
        await serverSupabase
          .from('forum_posts')
          .update({ likes_count: newCount })
          .eq('id', postId);
      } catch (updateError: any) {
        if (updateError?.code !== '42703') {
          console.warn('Error updating likes_count:', updateError);
        }
      }

      return NextResponse.json({ data: { liked: false, likes_count: newCount }, error: null });
    } else {
      // Like - insert the like
      const { error } = await serverSupabase
        .from('forum_post_likes')
        .insert([{ post_id: postId, user_id: userId }]);

      if (error) return NextResponse.json({ error: error.message }, { status: 400 });

      // Update likes_count in forum_posts table and get post owner
      const { data: currentPost } = await serverSupabase
        .from('forum_posts')
        .select('likes_count, user_id')
        .eq('id', postId)
        .single();

      const newCount = (currentPost?.likes_count || 0) + 1;

      try {
        await serverSupabase
          .from('forum_posts')
          .update({ likes_count: newCount })
          .eq('id', postId);
      } catch (updateError: any) {
        if (updateError?.code !== '42703') {
          console.warn('Error updating likes_count:', updateError);
        }
      }

      // Award points to post owner for receiving a like (not to the liker)
      if (currentPost?.user_id && currentPost.user_id !== userId) {
        try {
          const result = await awardPoints(currentPost.user_id, 'קיבלתי לייק על פוסט', {
            checkRelatedId: true,
            relatedId: postId
          }).catch(async () => {
            return await awardPoints(currentPost.user_id, 'received_like_on_post', {
              checkRelatedId: true,
              relatedId: postId
            });
          });

          if (!result.success && !result.alreadyAwarded) {
            console.error('Failed to award points to post owner for forum like:', result.error);
          }
        } catch (error) {
          console.warn('Error awarding points to post owner for forum like:', error);
        }
      }

      return NextResponse.json({ data: { liked: true, likes_count: newCount }, error: null });
    }
  } catch (error: any) {
    console.error('Error in /api/forums/posts/like:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
