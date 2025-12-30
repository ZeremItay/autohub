import { createServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createServerClient()
    
    // Get profiles data
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
    
    // Get user_roles data
    const { data: userRoles, error: userRolesError } = await supabase
      .from('user_roles')
      .select('*')
    
    // Get posts structure (try to see if we can get column info)
    const { data: posts } = await supabase
      .from('posts')
      .select('*')
      .limit(0)
    
    return NextResponse.json({
      success: true,
      data: {
        profiles: {
          data: profiles,
          error: profilesError?.message,
          columns: Array.isArray(profiles) && profiles.length > 0 ? Object.keys(profiles[0]) : []
        },
        user_roles: {
          data: userRoles,
          error: userRolesError?.message,
          columns: userRoles && userRoles.length > 0 ? Object.keys(userRoles[0]) : []
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

