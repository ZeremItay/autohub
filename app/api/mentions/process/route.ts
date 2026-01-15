import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase-server';
import { checkAndNotifyMentions } from '@/lib/utils/notifications';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, mentionerId, mentionerName, link, relatedId, relatedType } = body || {};

    if (!content || !mentionerId || !link || !relatedId || !relatedType) {
      return NextResponse.json(
        { error: 'Missing required fields: content, mentionerId, link, relatedId, relatedType' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (session.user.id !== mentionerId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    let resolvedName = mentionerName;
    if (!resolvedName) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, first_name, nickname')
        .eq('user_id', mentionerId)
        .single();
      resolvedName = profile?.display_name || profile?.first_name || profile?.nickname || 'משתמש';
    }

    await checkAndNotifyMentions(
      content,
      mentionerId,
      resolvedName,
      link,
      relatedId,
      relatedType
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error processing mentions:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
