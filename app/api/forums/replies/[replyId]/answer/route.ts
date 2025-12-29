import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { markReplyAsAnswer, unmarkReplyAsAnswer } from '@/lib/queries/forums';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ replyId: string }> }
) {
  try {
    const { replyId } = await params;
    const body = await request.json();
    const { post_id, user_id, mark } = body;

    if (!post_id || !user_id) {
      return NextResponse.json(
        { error: 'Post ID and User ID are required' },
        { status: 400 }
      );
    }

    const { data, error } = mark
      ? await markReplyAsAnswer(replyId, post_id, user_id)
      : await unmarkReplyAsAnswer(replyId, post_id, user_id);

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

