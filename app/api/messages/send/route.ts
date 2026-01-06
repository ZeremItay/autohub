import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { recipient_id, content } = body;

    if (!recipient_id || !content || !content.trim()) {
      return NextResponse.json(
        { error: 'Missing required fields: recipient_id, content' },
        { status: 400 }
      );
    }

    // Verify recipient exists
    const { data: recipient, error: recipientError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('user_id', recipient_id)
      .maybeSingle();

    if (recipientError || !recipient) {
      return NextResponse.json(
        { error: 'Recipient not found' },
        { status: 404 }
      );
    }

    // Insert message
    const { data: message, error: insertError } = await supabase
      .from('messages')
      .insert({
        sender_id: session.user.id,
        recipient_id: recipient_id,
        content: content.trim(),
        is_read: false
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting message:', insertError);
      return NextResponse.json(
        { error: 'Failed to send message', details: insertError.message },
        { status: 500 }
      );
    }

    // Create notification for recipient
    try {
      const { createNotification } = await import('@/lib/queries/notifications');
      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('display_name, first_name, nickname')
        .eq('user_id', session.user.id)
        .maybeSingle();

      const senderName = senderProfile?.display_name || senderProfile?.first_name || senderProfile?.nickname || 'משתמש';

      await createNotification({
        user_id: recipient_id,
        type: 'mention', // Using 'mention' as closest type until 'message' type is added
        title: 'הודעה חדשה',
        message: `${senderName} שלח לך הודעה`,
        link: '/messages',
        related_id: message.id,
        related_type: 'message',
        is_read: false
      });
    } catch (notificationError) {
      // Don't fail the request if notification fails
      console.warn('Error creating notification for message:', notificationError);
    }

    return NextResponse.json({
      success: true,
      data: message
    });
  } catch (error: any) {
    console.error('Error in send message API:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

