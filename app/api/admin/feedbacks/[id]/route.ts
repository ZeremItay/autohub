import { createServerClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// DELETE - Delete a feedback (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(cookieStore)
    const { id } = await params
    
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
    
    if (!id) {
      return NextResponse.json({ error: 'Feedback ID is required' }, { status: 400 })
    }
    
    // Use service role key to bypass RLS
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
    
    const { error } = await supabaseAdmin
      .from('feedbacks')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error('Error deleting feedback:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

