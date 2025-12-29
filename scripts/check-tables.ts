// Script to check what tables exist in your Supabase database
// Run with: npx tsx scripts/check-tables.ts

import { createServerClient } from '../lib/supabase-server'

async function checkTables() {
  const supabase = createServerClient()
  
  console.log('🔍 Checking Supabase tables...\n')
  
  // Common table names to check
  const tablesToCheck = [
    'profiles',
    'user_roles',
    'roles',
    'posts',
    'comments',
    'users',
    'events',
    'courses',
    'projects'
  ]
  
  const results: Record<string, any> = {}
  
  for (const tableName of tablesToCheck) {
    try {
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true })
        .limit(1)
      
      if (error) {
        if (error.code === 'PGRST116') {
          results[tableName] = { exists: false, message: 'Table does not exist' }
        } else {
          results[tableName] = { exists: false, error: error.message }
        }
      } else {
        // Try to get column info by selecting one row
        const { data: sampleData } = await supabase
          .from(tableName)
          .select('*')
          .limit(1)
        
        results[tableName] = {
          exists: true,
          rowCount: count || 0,
          columns: sampleData && sampleData.length > 0 ? Object.keys(sampleData[0]) : []
        }
      }
    } catch (err: any) {
      results[tableName] = { exists: false, error: err.message }
    }
  }
  
  console.log('📊 Results:\n')
  for (const [table, info] of Object.entries(results)) {
    if (info.exists) {
      console.log(`✅ ${table}`)
      console.log(`   Rows: ${info.rowCount}`)
      if (info.columns && info.columns.length > 0) {
        console.log(`   Columns: ${info.columns.join(', ')}`)
      }
    } else {
      console.log(`❌ ${table} - ${info.message || info.error}`)
    }
    console.log('')
  }
}

checkTables().catch(console.error)

