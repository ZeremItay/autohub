import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Singleton instance to prevent multiple GoTrueClient instances
let browserClientInstance: ReturnType<typeof createBrowserClient> | null = null

/**
 * Get the browser Supabase client singleton
 * Always returns the same instance to prevent Multiple GoTrueClient instances warning
 */
export function getSupabaseClient() {
  if (!browserClientInstance) {
    browserClientInstance = createBrowserClient(supabaseUrl, supabaseAnonKey)
    
    // Log warning if somehow called multiple times (shouldn't happen)
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.log('[Supabase] Browser client singleton created')
    }
  }
  return browserClientInstance
}

// Export singleton for backward compatibility
export const supabase = getSupabaseClient()

