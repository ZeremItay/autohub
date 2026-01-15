import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase-server';
import { awardPoints } from '@/lib/queries/gamification';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { userId, actionName, options } = body;

    // Validate inputs
    if (!userId || !actionName) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: userId, actionName' },
        { status: 400 }
      );
    }

    // Security: Only allow users to award points to themselves
    // OR allow admins to award points to anyone
    const { data: profile } = await supabase
      .from('profiles')
      .select(`
        role_id,
        roles:role_id (name)
      `)
      .eq('user_id', session.user.id)
      .single();

    const isAdmin = profile?.roles && typeof profile.roles === 'object' && (profile.roles as any).name === 'admin';

    if (userId !== session.user.id && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Cannot award points to other users' },
        { status: 403 }
      );
    }

    // Award points server-side
    const result = await awardPoints(userId, actionName, options || {});

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in /api/points/award:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
