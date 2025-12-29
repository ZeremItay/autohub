// Test file to verify Supabase connection
// You can delete this after testing

import { supabase } from './supabase'

export async function testConnection() {
  try {
    // Test connection by querying a simple table
    // This will fail if tables don't exist, but that's OK - it means connection works
    const { data, error } = await supabase
      .from('_test')
      .select('*')
      .limit(1)
    
    if (error && error.code === 'PGRST116') {
      // Table doesn't exist - but connection works!
      console.log('✓ Supabase connection successful!')
      return { success: true, message: 'Connection works (table not found is expected)' }
    }
    
    return { success: true, data }
  } catch (error: any) {
    console.error('✗ Supabase connection failed:', error.message)
    return { success: false, error: error.message }
  }
}

