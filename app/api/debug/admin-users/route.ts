import { createServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createServerClient()
    
    // Get all admin users from user_roles
    const { data: adminRoles, error: adminError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('role', 'admin')
    
    if (adminError) {
      return NextResponse.json({ error: adminError.message }, { status: 400 })
    }
    
    // Get profile details for each admin user
    const adminUsers = await Promise.all(
      (adminRoles || []).map(async (role) => {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', role.user_id)
          .single()
        
        return {
          role_id: role.id,
          user_id: role.user_id,
          role: role.role,
          created_at: role.created_at,
          profile: profile || null,
          profile_error: profileError?.message || null
        }
      })
    )
    
    return NextResponse.json({
      success: true,
      admin_count: adminUsers.length,
      admins: adminUsers,
      summary: adminUsers.map(au => ({
        user_id: au.user_id.substring(0, 8) + '...',
        username: au.profile?.username || 'לא נמצא',
        full_name: au.profile?.full_name || 'לא נמצא',
        email: au.profile?.email || 'לא נמצא',
        role_created: au.created_at
      }))
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

