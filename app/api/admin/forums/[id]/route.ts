import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'
import { updateForum, deleteForum } from '@/lib/queries/forums'

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

// PUT - Update a forum
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAuthorized = await checkAdminAuth(request)

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Unauthorized. Provide valid API key in X-API-Key header or be logged in as admin.' },
        { status: 401 }
      )
    }

    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'Forum ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { name, display_name, description, header_color, logo_text, is_active } = body

    // Check if name is being changed and if it conflicts with existing forum
    if (name) {
      const cookieStore = await cookies()
      const supabase = createServerClient(cookieStore)
      const { data: existingForum } = await supabase
        .from('forums')
        .select('id')
        .eq('name', name)
        .neq('id', id)
        .maybeSingle()

      if (existingForum) {
        return NextResponse.json(
          { error: 'Forum with this name already exists' },
          { status: 400 }
        )
      }
    }

    const updates: any = {}
    if (name !== undefined) updates.name = name
    if (display_name !== undefined) updates.display_name = display_name
    if (description !== undefined) updates.description = description
    if (header_color !== undefined) updates.header_color = header_color
    if (logo_text !== undefined) updates.logo_text = logo_text
    if (is_active !== undefined) updates.is_active = is_active

    const { data, error } = await updateForum(id, updates)

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to update forum' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Soft delete a forum (set is_active to false)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAuthorized = await checkAdminAuth(request)

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Unauthorized. Provide valid API key in X-API-Key header or be logged in as admin.' },
        { status: 401 }
      )
    }

    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'Forum ID is required' },
        { status: 400 }
      )
    }

    const { data, error } = await deleteForum(id)

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to delete forum' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data, message: 'Forum deleted successfully' }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

