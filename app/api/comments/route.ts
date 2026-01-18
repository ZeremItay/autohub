import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';
import { createComment } from '@/lib/queries/comments';
import { getRecordingById } from '@/lib/queries/recordings';
import { getAllProfiles } from '@/lib/queries/profiles';
import { notifyRecordingComment, notifyCommentReply, checkAndNotifyMentions } from '@/lib/utils/notifications';

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
    const { recording_id, content, parent_id } = body;

    if (!recording_id || !content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Use authenticated user's ID, not from request body
    const user_id = user.id;

    // Create the comment
    const { data: comment, error } = await createComment(
      recording_id,
      user_id,
      content,
      parent_id || null
    );

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to create comment' },
        { status: 500 }
      );
    }

    // Award points for commenting on a recording (only for top-level comments, not replies)
    if (!parent_id && comment) {
      try {
        const { awardPoints } = await import('@/lib/queries/gamification');
        // Try both Hebrew and English action names
        await awardPoints(user_id, 'תגובה להקלטה', {}).catch(() => {
          // If Hebrew doesn't work, try English
          return awardPoints(user_id, 'comment_on_recording', {});
        }).catch((error) => {
          // Silently fail - gamification is not critical
          console.warn('Error awarding points for recording comment:', error);
        });
      } catch (error) {
        // Silently fail - gamification is not critical
        console.warn('Error awarding points for recording comment:', error);
      }
    }

    // Get recording and user info for notifications
    const { data: recording } = await getRecordingById(recording_id);
    const { data: profiles } = await getAllProfiles();
    const commenter = (Array.isArray(profiles) ? profiles : []).find((p: any) => (p.user_id || p.id) === user_id);
    const commenterName = commenter?.display_name || 'משתמש';

    // Create notifications
    if (recording) {
      if (parent_id) {
        // This is a reply to a comment - notify the comment owner
        const { createServerClient } = await import('@/lib/supabase-server');
        const supabase = createServerClient();
        const { data: parentComment } = await supabase
          .from('recording_comments')
          .select('user_id')
          .eq('id', parent_id)
          .single();
        
        if (parentComment && parentComment.user_id !== user_id) {
          await notifyCommentReply(
            recording_id,
            recording.title,
            user_id,
            commenterName,
            parentComment.user_id,
            parent_id
          ).catch((error) => {
            console.warn('Error sending comment reply notification:', error);
          });
        }
      } else {
        // This is a top-level comment - notify the recording owner
        // Note: recordings table doesn't have user_id, so we skip owner notification for now
        // If you need to notify recording owners, add user_id column to recordings table
        // if (recording.user_id && recording.user_id !== user_id) {
        //   await notifyRecordingComment(
        //     recording_id,
        //     recording.title,
        //     user_id,
        //     commenterName,
        //     recording.user_id
        //   ).catch((error) => {
        //     console.warn('Error sending recording comment notification:', error);
        //   });
        // }
      }

      // Check for mentions in content
      await checkAndNotifyMentions(
        content,
        user_id,
        commenterName,
        `/recordings/${recording_id}`,
        comment?.id || '',
        'comment'
      ).catch((error) => {
        console.warn('Error checking mentions:', error);
      });
    }

    return NextResponse.json({ data: comment }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

