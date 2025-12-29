import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { getUserNotifications, getUnreadNotificationsCount, markAllNotificationsAsRead } from '@/lib/queries/notifications';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('user_id');
    const countOnly = searchParams.get('count_only') === 'true';

    if (!userId) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      );
    }

    if (countOnly) {
      const { count, error } = await getUnreadNotificationsCount(userId);
      if (error) {
        // Return 0 instead of error - notifications are not critical
        return NextResponse.json({ count: 0 });
      }
      return NextResponse.json({ count: count || 0 });
    }

    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const maxNotifications = parseInt(searchParams.get('maxNotifications') || '60', 10);

    // Calculate offset for pagination
    const offset = (page - 1) * pageSize;

    const { data, total, error } = await getUserNotifications(userId, {
      limit: pageSize,
      offset,
      maxNotifications
    });

    if (error) {
      // Always return empty array instead of 500 - notifications are not critical
      // This prevents blocking the page load
      return NextResponse.json({ 
        data: [], 
        total: 0, 
        page: 1, 
        pageSize: 20, 
        totalPages: 0 
      });
    }

    const totalPages = Math.ceil(total / pageSize);

    return NextResponse.json({ 
      data: data || [], 
      total, 
      page, 
      pageSize, 
      totalPages 
    });
  } catch (error: any) {
    // Always return empty array instead of 500 - notifications are not critical
    // This prevents blocking the page load
    return NextResponse.json({ 
      data: [], 
      total: 0, 
      page: 1, 
      pageSize: 20, 
      totalPages: 0 
    });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, mark_all_read } = body;

    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      );
    }

    if (mark_all_read) {
      const { error } = await markAllNotificationsAsRead(user_id);
      if (error) {
        return NextResponse.json({ error: 'Failed to mark all as read' }, { status: 500 });
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

