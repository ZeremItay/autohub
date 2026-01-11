import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';
import { syncUserPoints, syncAllUsersPoints, ensureGamificationRules } from '@/lib/queries/gamification';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);
    
    // Check if user is admin
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role_id, roles:role_id (name)')
      .eq('user_id', session.user.id)
      .single();
    
    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }
    
    const roleName = (profile.roles as any)?.name;
    if (roleName !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    const body = await request.json();
    const { userId, syncAll, ensureRules } = body;
    
    // Ensure rules exist if requested
    if (ensureRules) {
      const ensureResult = await ensureGamificationRules();
      if (!ensureResult.success) {
        return NextResponse.json({ 
          error: 'Failed to ensure rules', 
          details: ensureResult.error 
        }, { status: 500 });
      }
    }
    
    // Sync points
    if (syncAll) {
      const result = await syncAllUsersPoints();
      return NextResponse.json(result);
    } else if (userId) {
      const result = await syncUserPoints(userId);
      return NextResponse.json(result);
    } else {
      return NextResponse.json({ 
        error: 'Missing userId or syncAll flag' 
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error in sync-points API:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}
