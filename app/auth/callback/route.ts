import { createServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/';

  console.log('Auth callback received:', { code: code ? 'present' : 'missing', origin, next });

  if (code) {
    try {
      const cookieStore = await cookies();
      const supabase = createServerClient(cookieStore);
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        const forwardedHost = request.headers.get('x-forwarded-host'); // original origin before load balancer
        const isLocalEnv = process.env.NODE_ENV === 'development';
        console.log('Code exchange successful, redirecting:', { isLocalEnv, forwardedHost, next });
        
        if (isLocalEnv) {
          // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
          return NextResponse.redirect(`${origin}${next}`);
        } else if (forwardedHost) {
          return NextResponse.redirect(`https://${forwardedHost}${next}`);
        } else {
          return NextResponse.redirect(`${origin}${next}`);
        }
      } else {
        // If there's an error exchanging the code, redirect to login with error message
        console.error('Error exchanging code for session:', error);
        return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent(error.message || 'שגיאה בהתחברות עם Google')}`);
      }
    } catch (err: any) {
      console.error('Exception in auth callback:', err);
      return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent(err.message || 'שגיאה בהתחברות עם Google')}`);
    }
  }

  // If no code is provided, redirect to login with error message
  console.warn('No code provided in callback');
  return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent('קוד אימות חסר. נסה להתחבר שוב.')}`);
}
