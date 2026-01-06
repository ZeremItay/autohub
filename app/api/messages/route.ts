import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';

// GET - Get all conversations and messages for the current user
export async function GET(request: NextRequest) {
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

    const userId = session.user.id;

    // Get all messages where user is sender or recipient
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      return NextResponse.json(
        { error: 'Failed to fetch messages', details: messagesError.message },
        { status: 500 }
      );
    }

    // Get unique conversation partners
    const partnerIds = new Set<string>();
    (messages || []).forEach((msg: any) => {
      if (msg.sender_id === userId) {
        partnerIds.add(msg.recipient_id);
      } else {
        partnerIds.add(msg.sender_id);
      }
    });

    // Get profiles for all partners
    const partnerIdsArray = Array.from(partnerIds);
    let partnerProfiles: Record<string, any> = {};

    if (partnerIdsArray.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, first_name, last_name, nickname, avatar_url')
        .in('user_id', partnerIdsArray);

      if (!profilesError && profiles) {
        profiles.forEach((profile: any) => {
          partnerProfiles[profile.user_id] = profile;
        });
      }
    }

    // Group messages by conversation
    const conversations: Record<string, any> = {};
    
    (messages || []).forEach((msg: any) => {
      const partnerId = msg.sender_id === userId ? msg.recipient_id : msg.sender_id;
      const conversationKey = partnerId;

      if (!conversations[conversationKey]) {
        const partner = partnerProfiles[partnerId] || {};
        const partnerName = partner.display_name || partner.first_name || partner.nickname || 'משתמש';
        
        conversations[conversationKey] = {
          id: partnerId,
          partner_id: partnerId,
          partner_name: partnerName,
          partner_avatar: partner.avatar_url || null,
          messages: [],
          unread_count: 0,
          last_message_at: null
        };
      }

      conversations[conversationKey].messages.push({
        id: msg.id,
        text: msg.content,
        sender: msg.sender_id === userId ? 'me' : 'other',
        timestamp: msg.created_at,
        is_read: msg.is_read
      });

      if (!msg.is_read && msg.recipient_id === userId) {
        conversations[conversationKey].unread_count++;
      }

      if (!conversations[conversationKey].last_message_at || 
          new Date(msg.created_at) > new Date(conversations[conversationKey].last_message_at)) {
        conversations[conversationKey].last_message_at = msg.created_at;
      }
    });

    // Convert to array and sort by last message time
    const conversationsArray = Object.values(conversations).sort((a: any, b: any) => {
      const aTime = new Date(a.last_message_at || 0).getTime();
      const bTime = new Date(b.last_message_at || 0).getTime();
      return bTime - aTime;
    });

    return NextResponse.json({
      success: true,
      data: {
        conversations: conversationsArray,
        messages: messages || []
      }
    });
  } catch (error: any) {
    console.error('Error in get messages API:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

// PUT - Mark messages as read
export async function PUT(request: NextRequest) {
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
    const { conversation_id } = body; // partner_id

    if (!conversation_id) {
      return NextResponse.json(
        { error: 'Missing required field: conversation_id' },
        { status: 400 }
      );
    }

    // Mark all unread messages in this conversation as read
    const { data: updatedMessages, error: updateError } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('recipient_id', session.user.id)
      .eq('sender_id', conversation_id)
      .eq('is_read', false)
      .select();

    if (updateError) {
      console.error('Error marking messages as read:', updateError);
      return NextResponse.json(
        { error: 'Failed to mark messages as read', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedMessages
    });
  } catch (error: any) {
    console.error('Error in mark messages as read API:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

