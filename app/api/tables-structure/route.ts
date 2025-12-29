import { createServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createServerClient()
    
    const results: Record<string, any> = {}
    
    // Get profiles structure
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1)
    
    if (profilesData && profilesData.length > 0) {
      results.profiles = {
        exists: true,
        columns: Object.keys(profilesData[0]),
        sample: profilesData[0]
      }
    }
    
    // Get user_roles structure
    const { data: userRolesData, error: userRolesError } = await supabase
      .from('user_roles')
      .select('*')
      .limit(2)
    
    if (userRolesData && userRolesData.length > 0) {
      results.user_roles = {
        exists: true,
        columns: Object.keys(userRolesData[0]),
        sample: userRolesData,
        count: userRolesData.length
      }
    }
    
    // Get posts structure (even if empty, we can check columns)
    const { data: postsData } = await supabase
      .from('posts')
      .select('*')
      .limit(1)
    
    if (postsData !== null) {
      results.posts = {
        exists: true,
        columns: postsData.length > 0 ? Object.keys(postsData[0]) : 'Table exists but is empty'
      }
    }
    
    // Get comments structure
    const { data: commentsData } = await supabase
      .from('comments')
      .select('*')
      .limit(1)
    
    if (commentsData !== null) {
      results.comments = {
        exists: true,
        columns: commentsData.length > 0 ? Object.keys(commentsData[0]) : 'Table exists but is empty'
      }
    }
    
    return NextResponse.json({
      success: true,
      tables: results
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

