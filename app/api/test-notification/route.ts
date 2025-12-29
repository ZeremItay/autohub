import { NextRequest, NextResponse } from 'next/server';
import { createNotification } from '@/lib/queries/notifications';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, title, message, type = 'like' } = body;

    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      );
    }

    const { data, error } = await createNotification({
      user_id,
      type: type as any,
      title: title || 'קיבלת נקודות! 🎉',
      message: message || 'קיבלת 5 נקודות עבור: כניסה יומית',
      link: '/profile',
      is_read: false
    });

    if (error) {
      console.error('Error creating notification:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to create notification', details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      data,
      message: 'Notification created successfully!' 
    });
  } catch (error: any) {
    console.error('Error in test-notification API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

