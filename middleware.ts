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
    } else if (user && request.nextUrl.pathname === '/auth/login') {
      // If user is signed in and the current path is /login redirect the user to /
      return NextResponse.redirect(new URL('/', request.url))
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
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

