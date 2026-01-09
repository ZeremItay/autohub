import { createServerClient as createSSRServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies'

// For server-side operations (if you need service role key)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Singleton instances for cases without cookies to avoid multiple GoTrueClient instances
let anonClientInstance: ReturnType<typeof createClient> | null = null
let serviceClientInstance: ReturnType<typeof createClient> | null = null

// Track instance creation to detect multiple instances
let instanceCreationCount = 0
const MAX_INSTANCE_WARNINGS = 5

export const createServerClient = (cookieStore?: ReadonlyRequestCookies) => {
  // If cookies are provided, use @supabase/ssr for proper cookie handling
  // This must create a new instance for each request with cookies
  if (cookieStore) {
    return createSSRServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch (error) {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    )
  }
  
  // Fallback to service role key if available and no cookies
  // Use singleton to avoid multiple instances
  if (supabaseServiceKey) {
    if (!serviceClientInstance) {
      instanceCreationCount++
      if (instanceCreationCount > 1 && instanceCreationCount <= MAX_INSTANCE_WARNINGS) {
        console.warn(`[Supabase] Service client instance #${instanceCreationCount} created. This may indicate a singleton bypass.`)
      }
      serviceClientInstance = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      })
    }
    return serviceClientInstance
  }
  
  // Fallback to anon key - use singleton to avoid multiple instances
  if (!anonClientInstance) {
    instanceCreationCount++
    if (instanceCreationCount > 1 && instanceCreationCount <= MAX_INSTANCE_WARNINGS) {
      console.warn(`[Supabase] Anon client instance #${instanceCreationCount} created. This may indicate a singleton bypass.`)
    }
    anonClientInstance = createClient(supabaseUrl, supabaseAnonKey)
  }
  return anonClientInstance
}

/**
 * Get the appropriate Supabase client based on environment
 * - In browser: returns client-side singleton
 * - On server: returns server client (singleton if no cookies)
 */
export async function getSupabaseClient() {
  if (typeof window !== 'undefined') {
    // Client-side: use browser client (singleton)
    const { getSupabaseClient } = await import('./supabase');
    return getSupabaseClient();
  } else {
    // Server-side: use server client
    return createServerClient();
  }
}

