import { createServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createServerClient()
    
    // Try to read from profiles table
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(5)
    
    // Try to read from user_roles table (or roles, or user_roles - checking common names)
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('*')
      .limit(5)
    
    // If user_roles doesn't exist, try 'roles'
    let rolesData = userRoles
    let rolesErrorData = rolesError
    if (rolesError?.code === 'PGRST116') {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .limit(5)
      rolesData = data
      rolesErrorData = error
    }
    
    return NextResponse.json({
      success: true,
      tables: {
        profiles: {
          exists: !profilesError,
          error: profilesError?.message,
          sample: profiles,
          count: profiles?.length || 0
        },
        user_roles: {
          exists: !rolesErrorData,
          error: rolesErrorData?.message,
          sample: rolesData,
          count: rolesData?.length || 0
        }
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

