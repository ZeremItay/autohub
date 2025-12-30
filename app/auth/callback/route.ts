import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ensureUserProfile } from '@/lib/utils/auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, errorDescription);
    return NextResponse.redirect(
      new URL(`/auth/login?error=${encodeURIComponent(errorDescription || error)}`, requestUrl.origin)
    );
  }

  // Handle missing code
  if (!code) {
    return NextResponse.redirect(
      new URL('/auth/login?error=missing_code', requestUrl.origin)
    );
  }

  try {
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });

    // Exchange code for session
    const { data: authData, error: authError } = await supabase.auth.exchangeCodeForSession(code);

    if (authError) {
      console.error('Error exchanging code for session:', authError);
      return NextResponse.redirect(
        new URL(`/auth/login?error=${encodeURIComponent(authError.message)}`, requestUrl.origin)
      );
    }

    if (!authData.user) {
      return NextResponse.redirect(
        new URL('/auth/login?error=no_user', requestUrl.origin)
      );
    }

    // Ensure user profile exists (create if doesn't exist)
    const profile = await ensureUserProfile(authData.user);
    
    if (!profile) {
      console.warn('Profile creation failed, but continuing with login');
      // Don't fail the login if profile creation fails - user can update it later
    }

    // Save user to localStorage (will be done client-side, but we can set cookies here if needed)
    // The session is already set by Supabase, so the client will pick it up

    // Redirect to home page
    return NextResponse.redirect(new URL('/', requestUrl.origin));
  } catch (err: any) {
    console.error('Callback error:', err);
    return NextResponse.redirect(
      new URL(`/auth/login?error=${encodeURIComponent(err.message || 'unknown_error')}`, requestUrl.origin)
    );
  }
}

