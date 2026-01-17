import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { getUserPointsHistory } from '@/lib/queries/gamification';

// GET - Get user's points history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    
    // Get user_id from profile if needed
    const supabase = createServerClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id, id')
      .or(`user_id.eq.${userId},id.eq.${userId}`)
      .limit(1)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const actualUserId = profile.user_id || userId;
    const result = await getUserPointsHistory(actualUserId);

    if (result.error) {
      return NextResponse.json(
        { error: 'Failed to fetch points history', details: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: result.data, error: null });
  } catch (error: any) {
    console.error('Error in GET /api/admin/users/[userId]/points-history:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
