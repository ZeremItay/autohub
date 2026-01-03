import { createServerClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// GET - Get all feedbacks (admin only)
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(cookieStore)
    
    // Check authorization - get session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized', details: sessionError?.message || 'No session' }, { status: 401 })
    }
    
    // Check if user is admin
    const { data: adminProfile, error: profileError } = await supabase
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
      .single()
    
    if (profileError || !adminProfile) {
      return NextResponse.json({ error: 'Unauthorized', details: profileError?.message }, { status: 401 })
    }
    
    const role = adminProfile.roles || adminProfile.role
    const roleName = typeof role === 'object' ? role?.name : role
    
    if (roleName !== 'admin') {
      return NextResponse.json({ error: 'Admin access required', details: `User role is: ${roleName}` }, { status: 403 })
    }
    
    // Get all feedbacks ordered by created_at descending (newest first)
    // Use service role key to bypass RLS if needed
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/admin/feedbacks/route.ts:45',message:'Feedbacks GET - attempting query',data:{hasServiceKey:!!process.env.SUPABASE_SERVICE_ROLE_KEY},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    
    const { data: feedbacks, error } = await supabaseAdmin
      .from('feedbacks')
      .select('*')
      .order('created_at', { ascending: false })
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/admin/feedbacks/route.ts:55',message:'Feedbacks GET - query result',data:{hasData:!!feedbacks,dataCount:feedbacks?.length || 0,hasError:!!error,errorMessage:error?.message,errorCode:error?.code},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    
    if (error) {
      console.error('Error fetching feedbacks:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    return NextResponse.json({ data: feedbacks || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

