import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { 
      title, 
      content, 
      user_id,
      is_published = true,
      created_at
    } = body

    // Validation
    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      )
    }

    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
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

    // Verify user exists
    const { data: userProfile } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .eq('user_id', user_id)
      .maybeSingle()

    if (!userProfile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Create report
    const insertData: any = {
      title: title.trim(),
      content: content.trim(),
      user_id: user_id,
      is_published: is_published !== undefined ? is_published : true,
      views: 0
    }

    // Add created_at if provided
    if (created_at) {
      insertData.created_at = created_at
    }

    const { data: report, error: reportError } = await supabaseAdmin
      .from('reports')
      .insert([insertData])
      .select(`
        *,
        profile:profiles!reports_user_id_fkey (
          display_name,
          avatar_url,
          user_id
        )
      `)
      .single()

    if (reportError) {
      return NextResponse.json(
        { error: `Failed to create report: ${reportError.message}` },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Report created successfully',
      data: report
    }, { status: 201 })

  } catch (error: any) {
    console.error('Error creating report:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

