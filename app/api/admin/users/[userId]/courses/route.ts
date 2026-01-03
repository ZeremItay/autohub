import { createServerClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// GET - Get all courses for a user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const cookieStore = await cookies()
    let supabase = createServerClient(cookieStore)
    const { userId } = await params
    
    // Check authorization - get session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Session error:', sessionError)
      }
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
      if (process.env.NODE_ENV === 'development') {
        console.error('Profile error:', profileError, 'User ID:', session.user.id)
      }
      return NextResponse.json({ error: 'Unauthorized', details: profileError?.message }, { status: 401 })
    }
    
    const role = adminProfile.roles || adminProfile.role
    const roleName = typeof role === 'object' ? role?.name : role
    
    if (roleName !== 'admin') {
      return NextResponse.json({ error: 'Admin access required', details: `User role is: ${roleName}` }, { status: 403 })
    }
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }
    
    // Check if userId is actually a profile id, and if so, get the user_id
    let actualUserId = userId
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('id', userId)
      .single()
    
    if (profile) {
      // userId was actually a profile id, use the user_id instead
      actualUserId = profile.user_id
    }
    
    // Get user enrollments with course details
    const { data: enrollments, error } = await supabase
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
      .eq('user_id', actualUserId)
      .order('enrolled_at', { ascending: false })
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    return NextResponse.json({ data: enrollments || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Assign a course to a user (admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const cookieStore = await cookies()
    let supabase = createServerClient(cookieStore)
    const { userId } = await params
    const body = await request.json()
    const { courseId } = body
    
    if (!courseId) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 })
    }
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }
    
    // Check authorization - get session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Session error:', sessionError)
      }
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
      if (process.env.NODE_ENV === 'development') {
        console.error('Profile error:', profileError, 'User ID:', session.user.id)
      }
      return NextResponse.json({ error: 'Unauthorized', details: profileError?.message }, { status: 401 })
    }
    
    const role = adminProfile.roles || adminProfile.role
    const roleName = typeof role === 'object' ? role?.name : role
    
    if (roleName !== 'admin') {
      return NextResponse.json({ error: 'Admin access required', details: `User role is: ${roleName}` }, { status: 403 })
    }
    
    // Check if userId is actually a profile id, and if so, get the user_id
    let actualUserId = userId
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('id', userId)
      .single()
    
    if (targetProfile) {
      // userId was actually a profile id, use the user_id instead
      actualUserId = targetProfile.user_id
    }
    
    // Check if already enrolled
    const { data: existing } = await supabase
      .from('course_enrollments')
      .select('id')
      .eq('course_id', courseId)
      .eq('user_id', actualUserId)
      .single()
    
    if (existing) {
      return NextResponse.json({ 
        error: 'User is already enrolled in this course',
        data: existing 
      }, { status: 400 })
    }
    
    // Get course to determine payment status
    const { data: course } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single()
    
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }
    
    // Check if user is premium
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role_id, roles:role_id (name)')
      .eq('user_id', actualUserId)
      .single()
    
    const targetUserRole = (userProfile?.roles as any)?.name
    const isPremium = targetUserRole === 'premium' || targetUserRole === 'admin'
    
    // Determine payment status
    let paymentStatus: 'free' | 'paid' | 'pending' = 'free'
    let paymentAmount: number | null = null
    
    if (course.is_free) {
      paymentStatus = 'free'
    } else if (course.is_free_for_premium && isPremium) {
      paymentStatus = 'free'
    } else if (course.price && course.price > 0) {
      // Admin assignment - mark as free
      paymentStatus = 'free'
    }
    
    // Create enrollment
    // Use service role key to bypass RLS for admin operations
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
    
    const enrollmentData = {
      course_id: courseId,
      user_id: actualUserId,
      status: 'enrolled',
      payment_status: paymentStatus,
      payment_amount: paymentAmount
    }
    
    const { data, error } = await supabaseAdmin
      .from('course_enrollments')
      .insert([enrollmentData])
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
      .single()
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    // Create or update course progress
    await supabaseAdmin
      .from('course_progress')
      .upsert({
        course_id: courseId,
        user_id: actualUserId,
        progress_percentage: 0,
        last_accessed_at: new Date().toISOString()
      })
    
    return NextResponse.json({ data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Remove a course from a user (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const cookieStore = await cookies()
    let supabase = createServerClient(cookieStore)
    const { userId } = await params
    const url = new URL(request.url)
    const courseId = url.searchParams.get('courseId')
    
    if (!courseId) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 })
    }
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }
    
    // Check authorization - get session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Session error:', sessionError)
      }
      return NextResponse.json({ error: 'Unauthorized', details: sessionError?.message || 'No session' }, { status: 401 })
    }
    
    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
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
    
    if (profileError || !profile) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Profile error:', profileError, 'User ID:', session.user.id)
      }
      return NextResponse.json({ error: 'Unauthorized', details: profileError?.message }, { status: 401 })
    }
    
    const role = profile.roles || profile.role
    const roleName = typeof role === 'object' ? role?.name : role
    
    if (roleName !== 'admin') {
      return NextResponse.json({ error: 'Admin access required', details: `User role is: ${roleName}` }, { status: 403 })
    }
    
    // Check if userId is actually a profile id, and if so, get the user_id
    let actualUserId = userId
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('id', userId)
      .single()
    
    if (targetProfile) {
      // userId was actually a profile id, use the user_id instead
      actualUserId = targetProfile.user_id
    }
    
    // Delete enrollment
    const { error } = await supabase
      .from('course_enrollments')
      .delete()
      .eq('course_id', courseId)
      .eq('user_id', actualUserId)
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

