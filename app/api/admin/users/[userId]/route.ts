import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'

// GET - Get user by ID or email
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
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

    const { userId } = await params
    const { searchParams } = new URL(request.url)
    const searchBy = searchParams.get('by') || 'id' // 'id', 'email', or 'user_id'

    if (!userId) {
      return NextResponse.json(
        { error: 'User identifier is required' },
        { status: 400 }
      )
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
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    let profile = null

    // Search by different criteria
    if (searchBy === 'email') {
      // Search by email
      const { data, error } = await supabaseAdmin
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
        .eq('email', userId)
        .maybeSingle()

      if (error) {
        return NextResponse.json(
          { error: `Failed to find user: ${error.message}` },
          { status: 400 }
        )
      }

      profile = data
    } else if (searchBy === 'user_id') {
      // Search by user_id (auth user ID)
      const { data, error } = await supabaseAdmin
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
        .eq('user_id', userId)
        .maybeSingle()

      if (error) {
        return NextResponse.json(
          { error: `Failed to find user: ${error.message}` },
          { status: 400 }
        )
      }

      profile = data
    } else {
      // Search by profile ID (default)
      const { data, error } = await supabaseAdmin
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
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        return NextResponse.json(
          { error: `Failed to find user: ${error.message}` },
          { status: 400 }
        )
      }

      profile = data
    }

    if (!profile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get user enrollments count
    const { count: enrollmentsCount } = await supabaseAdmin
      .from('course_enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', profile.user_id)

    // Get user's courses
    const { data: enrollments } = await supabaseAdmin
      .from('course_enrollments')
      .select(`
        *,
        courses:course_id (
          id,
          title,
          description,
          category,
          thumbnail_url
        )
      `)
      .eq('user_id', profile.user_id)
      .order('enrolled_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      success: true,
      data: {
        ...profile,
        enrollments_count: enrollmentsCount || 0,
        recent_enrollments: enrollments || []
      }
    })

  } catch (error: any) {
    console.error('Error getting user:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

