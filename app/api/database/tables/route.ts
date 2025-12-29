import { createServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createServerClient()
    
    // Query pg_catalog.pg_tables through Supabase
    // Since we can't directly query pg_catalog, we'll query information_schema instead
    const { data, error } = await supabase
      .rpc('get_all_tables')
    
    // Alternative: Try to query information_schema.tables
    // But Supabase might not allow direct SQL, so let's try a different approach
    
    // We'll query common tables and see which exist
    const commonTables = [
      'profiles',
      'user_roles', 
      'roles',
      'posts',
      'comments',
      'gamification_rules',
      'points_history',
      'live_links',
      'events',
      'auth.users'
    ]
    
    const existingTables: string[] = []
    
    for (const tableName of commonTables) {
      try {
        const { error: queryError } = await supabase
          .from(tableName)
          .select('*')
          .limit(0)
        
        if (!queryError || queryError.code !== 'PGRST116') {
          existingTables.push(tableName)
        }
      } catch (err) {
        // Table doesn't exist or error
      }
    }
    
    // Also try to get tables from Supabase metadata if possible
    // Supabase PostgREST doesn't expose pg_catalog directly, but we can try
    const { data: tablesFromRPC, error: rpcError } = await supabase
      .rpc('get_public_tables')
    
    return NextResponse.json({
      success: true,
      tables: existingTables,
      tables_from_rpc: tablesFromRPC || null,
      rpc_error: rpcError?.message || null,
      note: 'These are tables we could detect. To see all tables, you may need to run SQL directly in Supabase Dashboard.'
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

