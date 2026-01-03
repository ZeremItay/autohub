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
      user_id, 
      course_id
    } = body

    // Validation
    if (!user_id || !course_id) {
      return NextResponse.json(
        { error: 'user_id and course_id are required' },
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

    // Check if userId is actually a profile id, and if so, get the user_id
    let actualUserId = user_id
    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .eq('id', user_id)
      .maybeSingle()

    if (targetProfile) {
      // userId was actually a profile id, use the user_id instead
      actualUserId = targetProfile.user_id
    } else {
      // Verify user exists by user_id
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
    }

    // Check if already enrolled
    const { data: existing } = await supabaseAdmin
      .from('course_enrollments')
      .select('id')
      .eq('course_id', course_id)
      .eq('user_id', actualUserId)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { 
          error: 'User is already enrolled in this course',
          data: existing 
        },
        { status: 400 }
      )
    }

    // Get course to determine payment status
    const { data: course } = await supabaseAdmin
      .from('courses')
      .select('*')
      .eq('id', course_id)
      .maybeSingle()

    if (!course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      )
    }

    // Check if user is premium
    const { data: userProfile } = await supabaseAdmin
      .from('profiles')
      .select('role_id, roles:role_id (name)')
      .eq('user_id', actualUserId)
      .maybeSingle()

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
    const enrollmentData = {
      course_id: course_id,
      user_id: actualUserId,
      status: 'enrolled',
      payment_status: paymentStatus,
      payment_amount: paymentAmount
    }

    const { data: enrollment, error: enrollmentError } = await supabaseAdmin
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

    if (enrollmentError) {
      return NextResponse.json(
        { error: `Failed to enroll user: ${enrollmentError.message}` },
        { status: 400 }
      )
    }

    // Create or update course progress
    await supabaseAdmin
      .from('course_progress')
      .upsert({
        course_id: course_id,
        user_id: actualUserId,
        progress_percentage: 0,
        last_accessed_at: new Date().toISOString()
      })

    return NextResponse.json({
      success: true,
      message: 'Course assigned successfully',
      data: enrollment
    }, { status: 201 })

  } catch (error: any) {
    console.error('Error assigning course:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

