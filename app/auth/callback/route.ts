import { createServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const { searchParams, origin, pathname, href } = requestUrl;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  const errorCode = searchParams.get('error_code');
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/';

  if (process.env.NODE_ENV === 'development') {
    console.log('Auth callback received:', { 
      code: code ? `present (${code.substring(0, 20)}...)` : 'missing', 
      error,
      errorDescription,
      errorCode,
      origin, 
      pathname,
      href,
      next,
      allParams: Object.fromEntries(searchParams.entries()),
      headers: {
        'user-agent': request.headers.get('user-agent'),
        'referer': request.headers.get('referer'),
        'x-forwarded-host': request.headers.get('x-forwarded-host'),
        'x-forwarded-proto': request.headers.get('x-forwarded-proto'),
      }
    });
  }

  if (code) {
    try {
      const cookieStore = await cookies();
      const supabase = createServerClient(cookieStore);
      const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error && sessionData?.session?.user) {
        // Ensure user profile exists
        const { ensureUserProfile } = await import('@/lib/utils/auth');
        await ensureUserProfile(sessionData.session.user);
        
        // Check if profile needs completion
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('first_name, how_to_address, nocode_experience')
          .eq('user_id', sessionData.session.user.id)
          .single();
        
        const forwardedHost = request.headers.get('x-forwarded-host'); // original origin before load balancer
        const isLocalEnv = process.env.NODE_ENV === 'development';
        
        // Check if profile needs completion (missing how_to_address or nocode_experience)
        // first_name is optional, so don't require it
        const needsCompletion = !profile?.how_to_address || !profile?.nocode_experience;
        
        if (process.env.NODE_ENV === 'development') {
          console.log('Code exchange successful, profile check:', { 
            needsCompletion, 
            hasFirstName: !!profile?.first_name,
            hasHowToAddress: !!profile?.how_to_address,
            hasNocodeExperience: !!profile?.nocode_experience
          });
        }
        
        // Redirect to complete-profile if profile needs completion, otherwise to home
        const redirectPath = needsCompletion ? '/auth/complete-profile' : '/';
        const redirectUrl = isLocalEnv 
          ? `${origin}${redirectPath}` 
          : forwardedHost 
            ? `https://${forwardedHost}${redirectPath}`
            : `${origin}${redirectPath}`;
        
        return NextResponse.redirect(redirectUrl);
      } else {
        // If there's an error exchanging the code, redirect to login with error message
        if (process.env.NODE_ENV === 'development') {
          console.error('Error exchanging code for session:', error);
        }
        const errorMessage = error?.message || 'שגיאה בהתחברות עם Google';
        return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent(errorMessage)}`);
      }
    } catch (err: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Exception in auth callback:', err);
      }
      return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent(err.message || 'שגיאה בהתחברות עם Google')}`);
    }
  }

  // If no code is provided, check if there's an error from OAuth provider
  if (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('OAuth provider error in callback:', {
        error,
        errorDescription,
        errorCode,
        fullUrl: href
      });
    }
    return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent(errorDescription || error || 'שגיאה בהתחברות עם Google')}`);
  }

  // If no code is provided, log detailed information for debugging
  if (process.env.NODE_ENV === 'development') {
    console.warn('No code provided in callback - detailed debug info:', {
    fullUrl: href,
    searchParams: Object.fromEntries(searchParams.entries()),
    origin,
    pathname,
    referer: request.headers.get('referer'),
    userAgent: request.headers.get('user-agent'),
    forwardedHost: request.headers.get('x-forwarded-host'),
    forwardedProto: request.headers.get('x-forwarded-proto'),
    });
  }
  
  return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent('קוד אימות חסר. נסה להתחבר שוב.')}`);
}
