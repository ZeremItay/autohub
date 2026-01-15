import { createServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    const search = searchParams.get('search') // General search in name/email
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined

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

    let query = supabaseAdmin
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

    // Apply filters
    if (email) {
      query = query.eq('email', email)
    } else if (search) {
      // Search in display_name, nickname, or email
      query = query.or(`display_name.ilike.%${search}%,nickname.ilike.%${search}%,email.ilike.%${search}%`)
    }

    // Apply limit
    if (limit) {
      query = query.limit(limit)
    }

    // Order by created_at
    query = query.order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true,
      data: data || [],
      count: data?.length || 0
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

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

    const supabase = createServerClient()
    const body = await request.json()

    const { data, error } = await supabase
      .from('profiles')
      .insert([body])
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
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
    
    // Check if this is a bulk update (multiple IDs)
    if (body.ids && Array.isArray(body.ids)) {
      // Bulk update multiple users
      const { ids, ...updates } = body
      
      if (!ids || ids.length === 0) {
        return NextResponse.json({ error: 'No user IDs provided' }, { status: 400 })
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

      if (!supabaseUrl || !supabaseServiceKey) {
        return NextResponse.json(
          { error: 'Server configuration error' },
          { status: 500 }
        )
      }

      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      })

      // If points are being updated, get current points first for all users
      const pointsHistoryEntries: any[] = [];
      if (updates.points !== undefined) {
        const { data: currentProfiles } = await supabaseAdmin
          .from('profiles')
          .select('id, points')
          .in('id', ids);
        
        if (currentProfiles) {
          const newPoints = parseInt(updates.points) || 0;
          for (const profile of currentProfiles) {
            const currentPoints = profile.points || 0;
            const pointsDifference = newPoints - currentPoints;
            if (pointsDifference !== 0) {
              const historyActionName = pointsDifference > 0 
                ? 'תוספת ידנית מאדמין' 
                : 'הפחתה ידנית מאדמין';
              
              pointsHistoryEntries.push({
                user_id: profile.id,
                points: pointsDifference,
                action_name: historyActionName
              });
            }
          }
        }
      }

      // Update all users in the array
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .update(updates)
        .in('id', ids)
        .select(`
          *,
          roles:role_id (
            id,
            name,
            display_name,
            description
          )
        `)

      if (error) {
        console.error('Error bulk updating users:', error)
        return NextResponse.json({ 
          error: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        }, { status: 400 })
      }

      // Add points history entries if any
      if (pointsHistoryEntries.length > 0) {
        const { error: historyError } = await supabaseAdmin
          .from('points_history')
          .insert(pointsHistoryEntries);
        
        if (historyError) {
          // If 'action_name' column doesn't exist, try 'action'
          if (historyError.code === 'PGRST204' || historyError.message?.includes('action_name') || historyError.message?.includes('column')) {
            const historyEntriesWithAction = pointsHistoryEntries.map(entry => ({
              user_id: entry.user_id,
              points: entry.points,
              action: entry.action_name
            }));
            const { error: insertError2 } = await supabaseAdmin
              .from('points_history')
              .insert(historyEntriesWithAction);
            
            if (insertError2) {
              console.error('❌ Error adding to points history:', insertError2?.message || String(insertError2));
            } else {
            }
          } else {
            console.error('❌ Error adding to points history:', historyError?.message || String(historyError));
          }
        } else {
        }
      }

      return NextResponse.json({ 
        success: true,
        data: data || [],
        count: data?.length || 0
      })
    } else {
      // Single user update (existing behavior)
      const supabase = createServerClient()
      const { id, ...updates } = body
      
      
      // If points are being updated, get current points first to calculate difference
      let pointsDifference = 0;
      let profileIdForHistory = id;
      if (updates.points !== undefined) {
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('points, id')
          .eq('id', id)
          .single();
        
        if (currentProfile) {
          const currentPoints = currentProfile.points || 0;
          const newPoints = parseInt(updates.points) || 0;
          pointsDifference = newPoints - currentPoints;
          profileIdForHistory = currentProfile.id;
        }
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          roles:role_id (
            id,
            name,
            display_name,
            description
          )
        `)
        .single()
      
      if (error) {
        console.error('Error updating user:', error)
        return NextResponse.json({ 
          error: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        }, { status: 400 })
      }
      
      // If points were changed, add entry to points_history
      if (pointsDifference !== 0) {
        const historyActionName = pointsDifference > 0 
          ? 'תוספת ידנית מאדמין' 
          : 'הפחתה ידנית מאדמין';
        
        const historyData: any = {
          user_id: profileIdForHistory, // Use profile.id, not profile.user_id
          points: pointsDifference,
          action_name: historyActionName
        };

        // Try to insert with 'action_name' first, then fallback to 'action' if needed
        const { error: historyError } = await supabase
          .from('points_history')
          .insert([historyData]);
        
        if (historyError) {
          // If 'action_name' column doesn't exist, try 'action'
          if (historyError.code === 'PGRST204' || historyError.message?.includes('action_name') || historyError.message?.includes('column')) {
            const historyDataWithAction: any = {
              user_id: profileIdForHistory,
              points: pointsDifference,
              action: historyActionName
            };
            const { error: insertError2 } = await supabase
              .from('points_history')
              .insert([historyDataWithAction]);
            
            if (insertError2) {
              console.error('❌ Error adding to points history:', insertError2?.message || String(insertError2));
            } else {
            }
          } else {
            console.error('❌ Error adding to points history:', historyError?.message || String(historyError));
          }
        } else {
        }
      }
      
      return NextResponse.json({ data })
    }
  } catch (error: any) {
    console.error('Exception updating user:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
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
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // First, get the user_id from the profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .eq('id', id)
      .maybeSingle()

    if (profileError) {
      return NextResponse.json({ error: `Failed to find profile: ${profileError.message}` }, { status: 400 })
    }

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const userId = profile.user_id

    // Delete the user from Auth (this will cascade delete the profile due to foreign key)
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (authDeleteError) {
      // If auth delete fails, try to delete profile manually
      const { error: profileDeleteError } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', id)

      if (profileDeleteError) {
        return NextResponse.json({ 
          error: `Failed to delete user: ${authDeleteError.message}. Also failed to delete profile: ${profileDeleteError.message}` 
        }, { status: 400 })
      }

      return NextResponse.json({ 
        success: true,
        warning: 'User deleted from profiles but failed to delete from Auth',
        message: `Auth deletion failed: ${authDeleteError.message}, but profile was deleted`
      })
    }

    return NextResponse.json({ 
      success: true,
      message: 'User deleted successfully from both Auth and profiles'
    })
  } catch (error: any) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

