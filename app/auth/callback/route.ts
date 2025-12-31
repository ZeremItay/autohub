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

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/auth/callback/route.ts:16',message:'Auth callback received',data:{code:code?'present':'missing',error,errorDescription,errorCode,origin,pathname,href,next,allParams:Object.fromEntries(searchParams.entries()),hasCode:!!code,hasError:!!error},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  // Log all relevant information for debugging
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

  // If no code is provided, check if there's an error from OAuth provider
  if (error) {
    console.error('OAuth provider error in callback:', {
      error,
      errorDescription,
      errorCode,
      fullUrl: href
    });
    return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent(errorDescription || error || 'שגיאה בהתחברות עם Google')}`);
  }

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/auth/callback/route.ts:75',message:'No code provided in callback',data:{fullUrl:href,searchParams:Object.fromEntries(searchParams.entries()),origin,pathname,referer:request.headers.get('referer'),userAgent:request.headers.get('user-agent'),forwardedHost:request.headers.get('x-forwarded-host'),forwardedProto:request.headers.get('x-forwarded-proto'),paramCount:searchParams.size},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  // If no code is provided, log detailed information for debugging
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
  
  return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent('קוד אימות חסר. נסה להתחבר שוב.')}`);
}
