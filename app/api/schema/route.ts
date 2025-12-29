import { createServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createServerClient()
    
    // Get all tables by trying to query information_schema
    // Note: This might not work with anon key, but let's try
    
    // Alternative: Try to query common tables
    const tables = ['profiles', 'user_roles', 'roles', 'posts', 'comments', 'users']
    const tableInfo: Record<string, any> = {}
    
    for (const tableName of tables) {
      try {
        const { data, error, count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true })
          .limit(1)
        
        tableInfo[tableName] = {
          exists: !error,
          error: error?.message,
          rowCount: count || 0
        }
      } catch (err: any) {
        tableInfo[tableName] = {
          exists: false,
          error: err.message
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      tables: tableInfo
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

