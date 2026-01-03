import { createServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    // Security: Check authentication via API Key or Admin Session
    const apiKey = request.headers.get('X-API-Key') || request.headers.get('Authorization')?.replace('Bearer ', '')
    const validApiKey = process.env.ADMIN_API_KEY || process.env.API_KEY

    let isAuthorized = false

    // Option 1: Check API Key
    if (apiKey && validApiKey && apiKey === validApiKey) {
      isAuthorized = true
    } else {
      // Option 2: Check Admin Session (for browser-based requests)
      try {
        const cookieStore = await cookies()
        const supabase = createServerClient(cookieStore)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

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
            .single()

          const role = adminProfile?.roles || adminProfile?.role
          const roleName = typeof role === 'object' ? role?.name : role

          if (roleName === 'admin') {
            isAuthorized = true
          }
        }
      } catch (error) {
        // Session check failed - continue to check API key only
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Unauthorized. Provide valid API key in X-API-Key header or be logged in as admin.' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    const search = searchParams.get('search') // General search in name/email
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    let query = supabaseAdmin
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

    // Apply filters
    if (email) {
      query = query.eq('email', email)
    } else if (search) {
      // Search in display_name, nickname, or email
      query = query.or(`display_name.ilike.%${search}%,nickname.ilike.%${search}%,email.ilike.%${search}%`)
    }

    // Apply limit
    if (limit) {
      query = query.limit(limit)
    }

    // Order by created_at
    query = query.order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true,
      data: data || [],
      count: data?.length || 0
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const body = await request.json()
    
    const { data, error } = await supabase
      .from('profiles')
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
    const supabase = createServerClient()
    const { id, ...updates } = await request.json()
    
    console.log('Updating user via API:', { id, updates })
    
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        roles:role_id (
          id,
          name,
          display_name,
          description
        )
      `)
      .single()
    
    if (error) {
      console.error('Error updating user:', error)
      return NextResponse.json({ 
        error: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      }, { status: 400 })
    }
    
    console.log('User updated successfully:', data)
    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('Exception updating user:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Security: Check authentication via API Key or Admin Session
    const apiKey = request.headers.get('X-API-Key') || request.headers.get('Authorization')?.replace('Bearer ', '')
    const validApiKey = process.env.ADMIN_API_KEY || process.env.API_KEY

    let isAuthorized = false

    // Option 1: Check API Key
    if (apiKey && validApiKey && apiKey === validApiKey) {
      isAuthorized = true
    } else {
      // Option 2: Check Admin Session (for browser-based requests)
      try {
        const cookieStore = await cookies()
        const supabase = createServerClient(cookieStore)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

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
            .single()

          const role = adminProfile?.roles || adminProfile?.role
          const roleName = typeof role === 'object' ? role?.name : role

          if (roleName === 'admin') {
            isAuthorized = true
          }
        }
      } catch (error) {
        // Session check failed - continue to check API key only
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Unauthorized. Provide valid API key in X-API-Key header or be logged in as admin.' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Create admin client
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // First, get the user_id from the profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .eq('id', id)
      .maybeSingle()

    if (profileError) {
      return NextResponse.json({ error: `Failed to find profile: ${profileError.message}` }, { status: 400 })
    }

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const userId = profile.user_id

    // Delete the user from Auth (this will cascade delete the profile due to foreign key)
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (authDeleteError) {
      // If auth delete fails, try to delete profile manually
      const { error: profileDeleteError } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', id)

      if (profileDeleteError) {
        return NextResponse.json({ 
          error: `Failed to delete user: ${authDeleteError.message}. Also failed to delete profile: ${profileDeleteError.message}` 
        }, { status: 400 })
      }

      return NextResponse.json({ 
        success: true,
        warning: 'User deleted from profiles but failed to delete from Auth',
        message: `Auth deletion failed: ${authDeleteError.message}, but profile was deleted`
      })
    }

    return NextResponse.json({ 
      success: true,
      message: 'User deleted successfully from both Auth and profiles'
    })
  } catch (error: any) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

