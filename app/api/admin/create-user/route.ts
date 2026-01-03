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
      email, 
      password, 
      display_name, 
      first_name, 
      last_name,
      auto_enroll_free_course = true // האם לשייך אוטומטית את המיני קורס החינמי
    } = body

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
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

    // Check if user already exists by listing users and filtering by email
    const { data: usersList, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (listError) {
      return NextResponse.json(
        { error: `Error checking users: ${listError.message}` },
        { status: 500 }
      )
    }
    
    // Find user by email
    const existingUser = usersList?.users?.find(u => u.email === email)
    let userId: string

    if (existingUser) {
      // User exists in Auth - check if profile exists
      userId = existingUser.id
      
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle()

      if (existingProfile) {
        return NextResponse.json(
          { error: 'User with this email already exists and has a profile' },
          { status: 400 }
        )
      }
      // User exists but no profile - we'll create the profile below
    } else {
      // 1. Create user in Auth
      const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // מאשר את האימייל אוטומטית
        user_metadata: {
          display_name: display_name || email.split('@')[0],
          first_name: first_name || '',
          last_name: last_name || ''
        }
      })

      if (authError) {
        return NextResponse.json(
          { error: `Failed to create user: ${authError.message}` },
          { status: 400 }
        )
      }

      if (!newUser?.user) {
        return NextResponse.json(
          { error: 'Failed to create user: No user returned' },
          { status: 500 }
        )
      }

      userId = newUser.user.id
    }

    // 2. Get free role ID
    const { data: freeRole, error: roleError } = await supabaseAdmin
      .from('roles')
      .select('id')
      .eq('name', 'free')
      .single()

    let freeRoleId = freeRole?.id

    // If free role doesn't exist, try to create it
    if (roleError || !freeRoleId) {
      const { data: newRole } = await supabaseAdmin
        .from('roles')
        .upsert({ 
          name: 'free', 
          display_name: 'מנוי חינמי',
          description: 'מנוי חינמי - גישה בסיסית'
        }, { onConflict: 'name' })
        .select()
        .single()

      if (newRole) {
        freeRoleId = newRole.id
      } else {
        return NextResponse.json(
          { error: 'Failed to get or create free role' },
          { status: 500 }
        )
      }
    }

    // 3. Create or update profile (use upsert to handle existing user without profile)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        user_id: userId,
        email,
        display_name: display_name || email.split('@')[0],
        first_name: first_name || '',
        last_name: last_name || '',
        nickname: display_name || email.split('@')[0],
        role_id: freeRoleId,
        points: 0,
        is_online: false
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single()

    if (profileError) {
      // Only clean up if we created a new user (not if user already existed)
      if (!existingUser) {
        await supabaseAdmin.auth.admin.deleteUser(userId)
      }
      return NextResponse.json(
        { error: `Failed to create profile: ${profileError.message}` },
        { status: 400 }
      )
    }

    let enrollment = null
    let course = null

    // 4. Auto-enroll in free mini course if requested
    if (auto_enroll_free_course) {
      // Find free mini course
      const { data: freeCourse } = await supabaseAdmin
        .from('courses')
        .select('id, title')
        .eq('is_free', true)
        .ilike('title', '%מיני קורס%')
        .limit(1)
        .maybeSingle()

      if (freeCourse) {
        course = freeCourse

        // Check if already enrolled
        const { data: existingEnrollment } = await supabaseAdmin
          .from('course_enrollments')
          .select('id')
          .eq('course_id', freeCourse.id)
          .eq('user_id', userId)
          .maybeSingle()

        if (!existingEnrollment) {
          // Create enrollment
          const { data: newEnrollment, error: enrollmentError } = await supabaseAdmin
            .from('course_enrollments')
            .insert({
              course_id: freeCourse.id,
              user_id: userId,
              status: 'enrolled',
              payment_status: 'free',
              payment_amount: null
            })
            .select()
            .single()

          if (!enrollmentError) {
            enrollment = newEnrollment

            // Create course progress
            await supabaseAdmin
              .from('course_progress')
              .upsert({
                course_id: freeCourse.id,
                user_id: userId,
                progress_percentage: 0,
                last_accessed_at: new Date().toISOString()
              })
          }
        } else {
          enrollment = existingEnrollment
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      user: {
        id: userId,
        email,
        profile: {
          id: profile.id,
          display_name: profile.display_name,
          role: 'free'
        },
        enrollment: enrollment ? {
          course_id: enrollment.course_id,
          course_title: course?.title,
          status: enrollment.status
        } : null
      }
    }, { status: 201 })

  } catch (error: any) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

