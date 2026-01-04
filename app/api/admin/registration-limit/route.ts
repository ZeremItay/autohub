import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';
import { getRegistrationLimit, updateRegistrationLimit, getCurrentUserCount } from '@/lib/queries/system-settings';

// Helper function to check admin authorization
async function checkAdminAuth(request: NextRequest): Promise<boolean> {
  const apiKey = request.headers.get('X-API-Key') || request.headers.get('Authorization')?.replace('Bearer ', '');
  const validApiKey = process.env.ADMIN_API_KEY || process.env.API_KEY;

  // Option 1: Check API Key
  if (apiKey && validApiKey && apiKey === validApiKey) {
    return true;
  }

  // Option 2: Check Admin Session (for browser-based requests)
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (!sessionError && session) {
      // Check if user is admin
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select(`
          *,
          roles:role_id (
            id,
            name,
            display_name,
            description
          )
        `)
        .eq('user_id', session.user.id)
        .single();

      const role = adminProfile?.roles || adminProfile?.role;
      const roleName = typeof role === 'object' ? role?.name : role;

      if (roleName === 'admin') {
        return true;
      }
    }
  } catch (error) {
    // Session check failed
  }

  return false;
}

// GET - Get current registration limit and user count
export async function GET(request: NextRequest) {
  try {
    const [limitResult, countResult] = await Promise.all([
      getRegistrationLimit(),
      getCurrentUserCount()
    ]);

    if (limitResult.error || countResult.error) {
      return NextResponse.json(
        { 
          error: 'Failed to fetch registration limit',
          details: limitResult.error || countResult.error
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      limit: limitResult.data || 50,
      currentCount: countResult.data || 0,
      available: (countResult.data || 0) < (limitResult.data || 50)
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update registration limit (admin only)
export async function PUT(request: NextRequest) {
  try {
    const isAuthorized = await checkAdminAuth(request);

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Unauthorized. Provide valid API key in X-API-Key header or be logged in as admin.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { limit } = body;

    // Validation
    if (typeof limit !== 'number' || limit < 0) {
      return NextResponse.json(
        { error: 'Limit must be a positive number' },
        { status: 400 }
      );
    }

    const { data, error } = await updateRegistrationLimit(limit);

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to update registration limit' },
        { status: 500 }
      );
    }

    // Get updated count
    const { data: currentCount } = await getCurrentUserCount();

    return NextResponse.json({
      success: true,
      limit: limit,
      currentCount: currentCount || 0,
      data
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

