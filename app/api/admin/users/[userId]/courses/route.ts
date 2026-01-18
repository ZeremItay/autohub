import { createServerClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

// GET - Get all courses for a user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    
    // Security: Check authentication via API Key or Admin Session
    const apiKey = request.headers.get('X-API-Key') || request.headers.get('Authorization')?.replace('Bearer ', '')
    const validApiKey = process.env.ADMIN_API_KEY || process.env.API_KEY
    
    let isAuthorized = false
    let supabaseClient = null
    
    // Option 1: Check API Key
    if (apiKey && validApiKey && apiKey === validApiKey) {
      isAuthorized = true
      // Create admin client for API key access
      supabaseClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      )
    } else {
      // Option 2: Check Admin Session
      const cookieStore = await cookies()
      supabaseClient = createServerClient(cookieStore)
      const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession()
      
      if (!sessionError && session) {
        // Check if user is admin
        const { data: adminProfile, error: profileError } = await supabaseClient
          .from('profiles')
          .select('role_id, roles:role_id(name)')
          .eq('user_id', session.user.id)
          .single()
          
        if (!profileError && adminProfile) {
          const roles = adminProfile.roles || (adminProfile as any).role
          const rolesAny = roles as any
          const roleName = Array.isArray(rolesAny) 
            ? rolesAny[0]?.name 
            : (typeof rolesAny === 'object' ? rolesAny?.name : rolesAny)
          
          if (roleName === 'admin') {
            isAuthorized = true
          }
        }
      }
    }
    
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }
    
    // Check if userId is actually a profile id, and if so, get the user_id
    let actualUserId = userId
    // Use admin client for this check to ensure we can read profiles
    const adminDb = isAuthorized && apiKey ? supabaseClient! : createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    const { data: profile } = await adminDb
      .from('profiles')
      .select('user_id')
      .eq('id', userId)
      .single()
    
    if (profile) {
      actualUserId = profile.user_id
    }
    
    // Get user enrollments with course details
    const { data: enrollments, error } = await adminDb
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
    const { userId } = await params
    const body = await request.json()
    const { courseId } = body
    
    if (!courseId) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 })
    }
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }
    
    // Security: Check authentication via API Key or Admin Session
    const apiKey = request.headers.get('X-API-Key') || request.headers.get('Authorization')?.replace('Bearer ', '')
    const validApiKey = process.env.ADMIN_API_KEY || process.env.API_KEY
    
    let isAuthorized = false
    
    // Option 1: Check API Key
    if (apiKey && validApiKey && apiKey === validApiKey) {
      isAuthorized = true
    } else {
      // Option 2: Check Admin Session
      const cookieStore = await cookies()
      const supabase = createServerClient(cookieStore)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (!sessionError && session) {
        // Check if user is admin
        const { data: adminProfile } = await supabase
          .from('profiles')
          .select('role_id, roles:role_id(name)')
          .eq('user_id', session.user.id)
          .single()
          
        if (adminProfile) {
          const roles = adminProfile.roles || (adminProfile as any).role
          const rolesAny = roles as any
          const roleName = Array.isArray(rolesAny) 
            ? rolesAny[0]?.name 
            : (typeof rolesAny === 'object' ? rolesAny?.name : rolesAny)
          
          if (roleName === 'admin') {
            isAuthorized = true
          }
        }
      }
    }
    
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Use service role key for all admin operations to bypass RLS
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
    
    // Check if userId is actually a profile id
    let actualUserId = userId
    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .eq('id', userId)
      .single()
    
    if (targetProfile) {
      actualUserId = targetProfile.user_id
    }
    
    // Check if already enrolled
    const { data: existing } = await supabaseAdmin
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
    const { data: course } = await supabaseAdmin
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single()
    
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }
    
    // Check if user is premium (to set payment status logic, though admin assignment usually implies free/granted)
    const { data: userProfile } = await supabaseAdmin
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
      // Admin assignment - override as free
      paymentStatus = 'free'
    }
    
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
    const { userId } = await params
    const url = new URL(request.url)
    const courseId = url.searchParams.get('courseId')
    
    if (!courseId) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 })
    }
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }
    
    // Security: Check authentication
    const apiKey = request.headers.get('X-API-Key') || request.headers.get('Authorization')?.replace('Bearer ', '')
    const validApiKey = process.env.ADMIN_API_KEY || process.env.API_KEY
    
    let isAuthorized = false
    
    if (apiKey && validApiKey && apiKey === validApiKey) {
      isAuthorized = true
    } else {
      const cookieStore = await cookies()
      const supabase = createServerClient(cookieStore)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (!sessionError && session) {
        const { data: adminProfile } = await supabase
          .from('profiles')
          .select('role_id, roles:role_id(name)')
          .eq('user_id', session.user.id)
          .single()
          
        if (adminProfile) {
          const roles = adminProfile.roles || (adminProfile as any).role
          const rolesAny = roles as any
          const roleName = Array.isArray(rolesAny) 
            ? rolesAny[0]?.name 
            : (typeof rolesAny === 'object' ? rolesAny?.name : rolesAny)
          
          if (roleName === 'admin') {
            isAuthorized = true
          }
        }
      }
    }
    
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
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
    
    let actualUserId = userId
    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .eq('id', userId)
      .single()
    
    if (targetProfile) {
      actualUserId = targetProfile.user_id
    }
    
    const { error } = await supabaseAdmin
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
