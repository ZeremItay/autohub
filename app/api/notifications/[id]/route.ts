import { NextRequest, NextResponse } from 'next/server';
import { markNotificationAsRead, deleteNotification } from '@/lib/queries/notifications';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
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

