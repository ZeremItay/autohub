import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';
import { markReplyAsAnswer, unmarkReplyAsAnswer } from '@/lib/queries/forums';

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ replyId: string }> }
) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { replyId } = await params;
    const body = await request.json();
    const { post_id, mark } = body;

    if (!post_id) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      );
    }

    // Use authenticated user's ID, not from request body
    const { data, error } = mark
      ? await markReplyAsAnswer(replyId, post_id, user.id)
      : await unmarkReplyAsAnswer(replyId, post_id, user.id);

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to mark/unmark answer' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

