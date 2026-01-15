import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Refresh session if expired - required for Server Components
  // Handle refresh token errors gracefully
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    // If there's a refresh token error, clear the session silently
    if (authError && (authError.message?.includes('Refresh Token') || authError.message?.includes('JWT'))) {
      // Clear invalid session cookies
      response.cookies.delete('sb-access-token')
      response.cookies.delete('sb-refresh-token')
      // Continue without user - they'll need to log in again
    } else if (user) {
      // Get profile with all needed fields in ONE query (performance optimization)
      const { data: fullProfile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, first_name, how_to_address, nocode_experience, display_name')
        .eq('user_id', user.id)
        .single()

      // If user doesn't exist in profiles table, clear session (user was deleted)
      if (profileError || !fullProfile) {
        // User was deleted from database, clear session
        await supabase.auth.signOut()
        // Clear session cookies
        response.cookies.delete('sb-access-token')
        response.cookies.delete('sb-refresh-token')
        // Don't redirect if on login page - let them log in
        if (request.nextUrl.pathname !== '/auth/login') {
          return NextResponse.redirect(new URL('/auth/login', request.url))
        }
      } else {
        // User exists - check if profile is complete (user is fully registered)
        // Profile needs: how_to_address, nocode_experience (first_name is optional)
        // Only redirect to complete-profile if user came from OAuth (Google) and missing required fields

        // Only needs completion if missing required fields (how_to_address, nocode_experience)
        // first_name is optional, so don't require it
        const needsCompletion = !fullProfile?.how_to_address || !fullProfile?.nocode_experience
        
        // Check if user has display_name - if not, they probably came from OAuth
        // Regular signup users always have display_name, OAuth users might not
        const isOAuthUser = !fullProfile?.display_name || !fullProfile?.display_name.trim()
        
        // Allow access to auth pages and complete-profile page
        const authPages = ['/auth/login', '/auth/signup', '/auth/complete-profile', '/auth/forgot-password', '/auth/reset-password']
        const isAuthPage = authPages.some(page => request.nextUrl.pathname.startsWith(page))
        
        // Only redirect to complete-profile if:
        // 1. Profile needs completion (missing required fields)
        // 2. User came from OAuth (doesn't have display_name) - regular signup users already filled everything
        // 3. User is not already on an auth page
        if (needsCompletion && isOAuthUser && !isAuthPage) {
          return NextResponse.redirect(new URL('/auth/complete-profile', request.url))
        }
        
        // If profile is complete and user is on login page, redirect to home
        if (!needsCompletion && request.nextUrl.pathname === '/auth/login') {
          return NextResponse.redirect(new URL('/', request.url))
        }
        
        // If profile is complete and user is on complete-profile page, redirect to home
        if (!needsCompletion && request.nextUrl.pathname === '/auth/complete-profile') {
          return NextResponse.redirect(new URL('/', request.url))
        }
      }
    }
  } catch (error) {
    // Silently handle any auth errors in middleware
    // Don't block the request
    if (process.env.NODE_ENV === 'development') {
      console.warn('Middleware auth error (non-blocking):', error)
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Only run middleware on routes that need auth checks
     * Skip API routes to improve performance (they handle auth internally)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

