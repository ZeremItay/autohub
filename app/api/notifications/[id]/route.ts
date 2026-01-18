import { NextRequest, NextResponse } from 'next/server';
import { markNotificationAsRead, deleteNotification } from '@/lib/queries/notifications';
import { createServerClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';

// Helper function to check if user is authenticated
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

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await params;
    const body = await request.json();
    const { is_read } = body;

    if (is_read === true) {
      const { error } = await markNotificationAsRead(id);
      if (error) {
        return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params;
    const { error } = await deleteNotification(id);
    if (error) {
      return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

