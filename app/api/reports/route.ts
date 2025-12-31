import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAllReports, createReport } from '@/lib/queries/reports';
import { createServerClient } from '@/lib/supabase-server';

// GET - Get all published reports (for carousel)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

    const { data, error } = await getAllReports(limit);

    if (error) {
      return NextResponse.json(
        { error: (error as any)?.message || 'Failed to fetch reports' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data || [] });
  } catch (error: any) {
    console.error('Error in GET /api/reports:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new report (admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, user_id, is_published, created_at } = body;

    if (!title || !content || !user_id) {
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          missing: {
            title: !title,
            content: !content,
            user_id: !user_id
          }
        },
        { status: 400 }
      );
    }

    // Verify user is admin - try to get session from cookies first
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    // If no session from cookies, use service role key and verify admin by user_id from request
    let profile;
    if (sessionError || !session) {
      
      // Use service role key to check admin status
      const supabaseAdmin = createServerClient();
      const { data: profileData, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select(`
          *,
          roles:role_id (
            name
          )
        `)
        .eq('user_id', user_id)
        .single();
      
      if (profileError || !profileData) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      
      profile = profileData;
    } else {
      // Session exists, use it to get profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`
          *,
          roles:role_id (
            name
          )
        `)
        .eq('user_id', session.user.id)
        .single();
      
      if (profileError || !profileData) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      
      profile = profileData;
    }

    // profile is guaranteed to be set at this point (checked in if/else above)
    if (!profile) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const role = profile.roles || profile.role;
    const roleName = typeof role === 'object' ? role?.name : role;

    if (roleName !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const { data, error } = await createReport({
      title,
      content,
      user_id,
      is_published: is_published !== undefined ? is_published : true,
      created_at: created_at || undefined
    });

    if (error) {
      return NextResponse.json(
        { error: (error as any)?.message || 'Failed to create report' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/reports:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

