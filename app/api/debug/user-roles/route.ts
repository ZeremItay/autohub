import { createServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createServerClient()
    
    // Get all user_roles
    const { data: userRoles, error: userRolesError } = await supabase
      .from('user_roles')
      .select('*')
    
    // Get roles table if exists
    const { data: roles, error: rolesError } = await supabase
      .from('roles')
      .select('*')
    
    // Get profiles to see user names
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, full_name')
    
    // Enrich user_roles with profile names
    const enrichedRoles = userRoles?.map(ur => {
      const profile = (Array.isArray(profiles) ? profiles : []).find(p => p.id === ur.user_id)
      return {
        ...ur,
        user_name: profile?.full_name || profile?.username || ur.user_id,
        profile_data: profile
      }
    })
    
    return NextResponse.json({
      success: true,
      user_roles: {
        data: enrichedRoles,
        count: enrichedRoles?.length || 0,
        error: userRolesError?.message
      },
      roles_table: {
        data: roles,
        count: roles?.length || 0,
        error: rolesError?.message
      },
      raw_data: {
        user_roles: userRoles,
        roles: roles
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

