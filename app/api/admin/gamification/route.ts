import { createServerClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// Helper function to check admin authorization
async function checkAdminAuth(request: NextRequest): Promise<boolean> {
  const apiKey = request.headers.get('X-API-Key') || request.headers.get('Authorization')?.replace('Bearer ', '')
  const validApiKey = process.env.ADMIN_API_KEY || process.env.API_KEY

  if (apiKey && validApiKey && apiKey === validApiKey) {
    return true
  }

  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(cookieStore)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (!sessionError && session) {
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('*, roles:role_id (id, name)')
        .eq('user_id', session.user.id)
        .single()

      const role = adminProfile?.roles || adminProfile?.role
      const roleName = typeof role === 'object' ? role?.name : role

      if (roleName === 'admin') {
        return true
      }
    }
  } catch (error) {
    // Session check failed
  }

  return false
}

export async function GET(request: NextRequest) {
  try {
    const isAuthorized = await checkAdminAuth(request)
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(cookieStore)
    
    const { data, error } = await supabase
      .from('gamification_rules')
      .select('*')
      .order('action_name', { ascending: true })
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    return NextResponse.json({ data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const isAuthorized = await checkAdminAuth(request)
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(cookieStore)
    const body = await request.json()
    
    const { data, error } = await supabase
      .from('gamification_rules')
      .insert([body])
      .select()
      .single()
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    return NextResponse.json({ data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const isAuthorized = await checkAdminAuth(request)
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(cookieStore)
    const { id, ...updates } = await request.json()
    
    const { data, error } = await supabase
      .from('gamification_rules')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    return NextResponse.json({ data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const isAuthorized = await checkAdminAuth(request)
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(cookieStore)
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }
    
    const { error } = await supabase
      .from('gamification_rules')
      .delete()
      .eq('id', id)
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

