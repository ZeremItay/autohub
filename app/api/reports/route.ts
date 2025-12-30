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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/reports/route.ts:31',message:'POST /api/reports entry',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    
    const body = await request.json();
    const { title, content, user_id, is_published, created_at } = body;
    
    // #region agent log
    try {
      fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/reports/route.ts:36',message:'Request body parsed',data:{hasTitle:!!title,titleLength:title?.length,hasContent:!!content,contentLength:content?.length,hasUserId:!!user_id,user_id:user_id,is_published,created_at},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C'})}).catch(()=>{});
    } catch (logError) {
      // Silently ignore log errors
    }
    // #endregion

    if (!title || !content || !user_id) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/reports/route.ts:40',message:'Validation failed - missing fields',data:{hasTitle:!!title,hasContent:!!content,hasUserId:!!user_id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
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
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/reports/route.ts:70',message:'Session check',data:{hasSession:!!session,sessionError:sessionError?.message,userId:session?.user?.id,requestUserId:user_id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    
    // If no session from cookies, use service role key and verify admin by user_id from request
    let profile;
    if (sessionError || !session) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/reports/route.ts:76',message:'No session from cookies, using service role key',data:{requestUserId:user_id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      
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

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/reports/route.ts:95',message:'About to call createReport',data:{title,contentLength:content?.length,user_id,is_published,created_at},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    
    const { data, error } = await createReport({
      title,
      content,
      user_id,
      is_published: is_published !== undefined ? is_published : true,
      created_at: created_at || undefined
    });

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/reports/route.ts:105',message:'createReport result',data:{hasData:!!data,hasError:!!error,error:error?.message,errorCode:error?.code},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D,E'})}).catch(()=>{});
    // #endregion

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

