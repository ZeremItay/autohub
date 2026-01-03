import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'

// Helper function to check admin authorization
async function checkAdminAuth(request: NextRequest): Promise<boolean> {
  const apiKey = request.headers.get('X-API-Key') || request.headers.get('Authorization')?.replace('Bearer ', '')
  const validApiKey = process.env.ADMIN_API_KEY || process.env.API_KEY

  // Option 1: Check API Key
  if (apiKey && validApiKey && apiKey === validApiKey) {
    return true
  }

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
        return true
      }
    }
  } catch (error) {
    // Session check failed
  }

  return false
}

// GET - Get all forums (including inactive) for admin
export async function GET(request: NextRequest) {
  try {
    const isAuthorized = await checkAdminAuth(request)

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Unauthorized. Provide valid API key in X-API-Key header or be logged in as admin.' },
        { status: 401 }
      )
    }

    // Use server-side client directly
    const cookieStore = await cookies()
    const supabase = createServerClient(cookieStore)
    
    const { data: forumsData, error: forumsError } = await supabase
      .from('forums')
      .select('id, name, display_name, description, header_color, logo_text, is_active, created_at, updated_at')
      .order('display_name', { ascending: true })

    if (forumsError) {
      return NextResponse.json(
        { error: forumsError.message || 'Failed to fetch forums' },
        { status: 500 }
      )
    }

    if (!forumsData) {
      return NextResponse.json({ data: [] }, { status: 200 })
    }

    // Batch count posts for all forums
    const forumIds = forumsData.map(f => f.id)
    const { data: countsData } = await supabase
      .from('forum_posts')
      .select('forum_id')
      .in('forum_id', forumIds)

    // Count posts per forum
    const countsMap = new Map<string, number>()
    if (countsData) {
      countsData.forEach((post: any) => {
        const current = countsMap.get(post.forum_id) || 0
        countsMap.set(post.forum_id, current + 1)
      })
    }

    // Map counts to forums
    const forumsWithCounts = forumsData.map((forum) => ({
      ...forum,
      posts_count: countsMap.get(forum.id) || 0
    }))

    return NextResponse.json({ data: forumsWithCounts }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create a new forum
export async function POST(request: NextRequest) {
  try {
    const isAuthorized = await checkAdminAuth(request)

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Unauthorized. Provide valid API key in X-API-Key header or be logged in as admin.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, display_name, description, header_color, logo_text } = body

    // Validation
    if (!name || !display_name) {
      return NextResponse.json(
        { error: 'name and display_name are required' },
        { status: 400 }
      )
    }

    // Check if forum with this name already exists and create forum
    const cookieStore = await cookies()
    const supabase = createServerClient(cookieStore)
    
    const { data: existingForum } = await supabase
      .from('forums')
      .select('id')
      .eq('name', name)
      .maybeSingle()

    if (existingForum) {
      return NextResponse.json(
        { error: 'Forum with this name already exists' },
        { status: 400 }
      )
    }
    
    const { data, error } = await supabase
      .from('forums')
      .insert([{
        name,
        display_name,
        description: description || null,
        header_color: header_color || 'bg-blue-900',
        logo_text: logo_text || null,
        is_active: true,
        posts_count: 0
      }])
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to create forum' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

