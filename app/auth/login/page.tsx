'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  useEffect(() => {
    // Check for OAuth tokens in hash fragment FIRST (before checking for errors)
    // Supabase sometimes returns tokens in hash instead of query params
    // This happens when Supabase uses implicit flow instead of PKCE flow
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash && hash.includes('access_token')) {
        // Parse hash fragment and extract tokens
        const hashParams = new URLSearchParams(hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const expiresAt = hashParams.get('expires_at');
        const tokenType = hashParams.get('token_type') || 'bearer';
        
        if (accessToken) {
          // Build a session object from the hash tokens
          // Supabase will automatically parse and validate the token
          const sessionData: any = {
            access_token: accessToken,
            refresh_token: refreshToken || '',
            expires_at: expiresAt ? parseInt(expiresAt) : undefined,
            token_type: tokenType,
            user: null, // Will be extracted from token
          };
          
          // Set session using the tokens from hash
          supabase.auth.setSession(sessionData).then(({ data, error }: any) => {
            if (error) {
              console.error('Error setting session from hash:', error);
              setError('שגיאה בהתחברות עם Google');
            } else if (data?.session && data?.user) {
              // Clear the hash from URL
              window.history.replaceState(null, '', window.location.pathname);
              // Ensure user profile exists
              const ensureProfile = async () => {
                if (data.user) {
                  const { ensureUserProfile } = await import('@/lib/utils/auth');
                  await ensureUserProfile(data.user);
                }
              };
              ensureProfile().then(async () => {
                // Check if profile needs completion
                if (data.user) {
                  const { data: profile } = await supabase
                    .from('profiles')
                    .select('first_name, how_to_address, nocode_experience')
                    .eq('user_id', data.user.id)
                    .single();
                  
                  // Profile needs completion if missing how_to_address or nocode_experience
                  // first_name is optional, so don't require it
                  const needsCompletion = !profile?.how_to_address || !profile?.nocode_experience;
                  
                  if (needsCompletion) {
                    router.push('/auth/complete-profile');
                  } else {
                    router.push('/');
                  }
                } else {
                  router.push('/');
                }
                router.refresh();
              });
            }
          });
          return; // Don't check for errors or session if we're processing hash tokens
        }
      }
    }

    // Only check for error in URL params if we didn't find tokens in hash
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
    }

    // Check if user is already logged in and still exists in database
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Verify user still exists in database (user might have been deleted)
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('user_id', session.user.id)
          .single();

        if (profileError || !profile) {
          // User was deleted from database, clear session
          await supabase.auth.signOut();
          // Don't redirect - let them log in
          return;
        }

        // User exists and is logged in, redirect to home
        router.push('/');
      }
    };
    checkSession();
  }, [router, searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate form
      if (!formData.email || !formData.password) {
        setError('אנא מלא את כל השדות');
        setLoading(false);
        return;
      }

      // Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      });

      if (authError) {
        setError(authError.message || 'שגיאה בהתחברות');
        setLoading(false);
        return;
      }

      if (!authData.user) {
        setError('לא ניתן להתחבר');
        setLoading(false);
        return;
      }

      // Ensure user profile exists
      const { ensureUserProfile } = await import('@/lib/utils/auth');
      await ensureUserProfile(authData.user);

      // Save user to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('selectedUserId', authData.user.id);
        localStorage.setItem('userEmail', formData.email);
      }

      // Redirect to home page
      router.push('/');
      router.refresh();
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'שגיאה בהתחברות');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError(null);

    try {
      // Get the current origin for redirect URL
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const redirectUrl = `${origin}/auth/callback`;

      if (process.env.NODE_ENV === 'development') {
        console.log('Initiating Google OAuth:', {
          origin,
          redirectUrl,
          fullUrl: typeof window !== 'undefined' ? window.location.href : 'N/A'
        });
      }

      // Remove queryParams that might interfere with PKCE flow
      // PKCE flow is handled automatically by Supabase
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          // PKCE flow is enabled by default in Supabase, no need for additional queryParams
        }
      });

      if (oauthError) {
        console.error('OAuth error:', oauthError);
        setError(oauthError.message || 'שגיאה בהתחברות עם Google');
        setGoogleLoading(false);
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log('OAuth initiated successfully:', {
            url: data?.url,
            provider: data?.provider
          });
        }
        // Note: If successful, user will be redirected to Google, so we don't need to handle success here
        // The redirect happens automatically via data.url
      }
    } catch (err: any) {
      console.error('Google login error:', err);
      setError(err.message || 'שגיאה בהתחברות עם Google');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-pink-50/30 to-purple-50/20 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">התחברות</h1>
          <p className="text-gray-600">התחבר לחשבון שלך</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8">
          {/* Error Message */}
          {error && (
            <div className="mb-5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* Google Login Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={googleLoading || loading}
            className="w-full bg-white border-2 border-gray-300 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-sm mb-5"
            suppressHydrationWarning
          >
            {googleLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>מתחבר...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>התחבר עם Google</span>
              </>
            )}
          </button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">או</span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleLogin} className="space-y-5" suppressHydrationWarning>
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                אימייל
              </label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  dir="rtl"
                  placeholder="הזן כתובת אימייל"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pr-11 pl-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F52F8E] focus:border-transparent text-sm"
                  required
                  suppressHydrationWarning
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                סיסמה
              </label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="password"
                  dir="rtl"
                  placeholder="הזן סיסמה"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pr-11 pl-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F52F8E] focus:border-transparent text-sm"
                  required
                  suppressHydrationWarning
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full bg-[#F52F8E] text-white py-3 rounded-xl font-semibold hover:bg-[#E01E7A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              suppressHydrationWarning
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>מתחבר...</span>
                </>
              ) : (
                <>
                  <span>התחבר</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Forgot Password Link */}
          <div className="mt-4 text-center">
            <Link href="/auth/forgot-password" className="text-sm text-[#F52F8E] hover:underline font-semibold">
              שכחתי סיסמה
            </Link>
          </div>

          {/* Signup Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              אין לך חשבון?{' '}
              <Link href="/auth/signup" className="text-[#F52F8E] hover:underline font-semibold">
                הירשם כאן
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-pink-50/30 to-purple-50/20 flex items-center justify-center px-4 py-8">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#F52F8E] mx-auto mb-4" />
          <p className="text-gray-600">טוען...</p>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}

