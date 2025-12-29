  import { createServerClient } from '@/lib/supabase-server'
  import { NextResponse } from 'next/server'

  export async function GET() {
    try {
      const supabase = createServerClient()
      
      // Query information_schema to get all tables and their columns
      const { data: tablesData, error: tablesError } = await supabase
        .rpc('get_schema_info')
        .select('*')
      
      // If RPC doesn't exist, try direct SQL query
      // First, let's try to get table names by querying information_schema directly
      const schemaQuery = `
        SELECT 
          t.table_name,
          c.column_name,
          c.data_type,
          c.is_nullable,
          c.column_default,
          c.character_maximum_length
        FROM information_schema.tables t
        LEFT JOIN information_schema.columns c ON t.table_name = c.table_name
        WHERE t.table_schema = 'public' 
          AND t.table_type = 'BASE TABLE'
          AND t.table_name NOT LIKE '_prisma%'
          AND t.table_name NOT LIKE 'pg_%'
        ORDER BY t.table_name, c.ordinal_position;
      `
      
      // Try to get tables by attempting to query common tables
      const commonTables = [
        'profiles',
        'user_roles',
        'roles',
        'posts',
        'comments',
        'gamification_rules',
        'points_history',
        'live_links',
        'events'
      ]
      
      const tablesInfo: Record<string, any> = {}
      
      for (const tableName of commonTables) {
        try {
          // Try to get one row to see structure
          const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .limit(1)
          
          if (!error && data !== null) {
            // Table exists, get column info
            if (data.length > 0) {
              const columns = Object.keys(data[0]).map(key => ({
                name: key,
                sample_value: data[0][key],
                type: typeof data[0][key]
              }))
              tablesInfo[tableName] = {
                exists: true,
                row_count: 'unknown',
                columns: columns
              }
            } else {
              // Table exists but is empty, try to get structure from Supabase metadata
              tablesInfo[tableName] = {
                exists: true,
                row_count: 0,
                columns: 'Table exists but is empty - cannot determine columns'
              }
            }
          } else if (error?.code === 'PGRST116') {
            tablesInfo[tableName] = {
              exists: false,
              error: 'Table does not exist'
            }
          } else {
            tablesInfo[tableName] = {
              exists: true,
              row_count: 0,
              columns: 'Table exists but structure unknown',
              error: error?.message
            }
          }
        } catch (err: any) {
          tablesInfo[tableName] = {
            exists: false,
            error: err.message
          }
        }
      }
      
      // Also try to get row counts
      for (const tableName of Object.keys(tablesInfo)) {
        if (tablesInfo[tableName].exists) {
          try {
            const { count } = await supabase
              .from(tableName)
              .select('*', { count: 'exact', head: true })
            
            if (count !== null) {
              tablesInfo[tableName].row_count = count
            }
          } catch (err) {
            // Ignore count errors
          }
        }
      }
      
      return NextResponse.json({
        success: true,
        tables: tablesInfo,
        total_tables_found: Object.keys(tablesInfo).filter(t => tablesInfo[t].exists).length
      })
    } catch (error: any) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 })
    }
  }

