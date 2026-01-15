'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Lock, ArrowRight, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    // Check if we have the token from the URL
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const type = hashParams.get('type');

    // Also check query params (some email clients might strip the hash)
    const tokenFromQuery = searchParams.get('access_token');
    const typeFromQuery = searchParams.get('type');

    const finalToken = accessToken || tokenFromQuery;
    const finalType = type || typeFromQuery;

    if (finalType === 'recovery' && finalToken) {
      // For recovery tokens, Supabase handles the hash fragment automatically
      // We just need to wait for Supabase to process it
      // Check if we already have a session
      supabase.auth.getSession().then(({ data: sessionData, error: sessionError }: any) => {
        if (sessionError || !sessionData?.session) {
          // If no session, try to set it with the token
          // For recovery tokens, we need to use the token directly
          // Supabase should handle recovery tokens from hash fragments automatically
          // But if it doesn't, we'll try to set it manually
          if (finalToken) {
            // Try to get user with the token to verify it's valid
             supabase.auth.getUser(finalToken).then(({ data: userData, error: userError }: any) => {
              if (userError || !userData?.user) {
                console.error('Error validating recovery token:', userError);
                setError('קישור לא תקין או שפג תוקפו. אנא בקש קישור חדש לאיפוס סיסמה.');
              }
              setLoading(false);
            });
          } else {
            setLoading(false);
          }
        } else {
          // Session exists, we're good to go
          setLoading(false);
        }
      });
    } else {
      // No valid token, redirect to forgot password
      setError('קישור לא תקין או שפג תוקפו. אנא בקש קישור חדש לאיפוס סיסמה.');
      setLoading(false);
    }
  }, [searchParams]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // Validate form
      if (!formData.password || !formData.confirmPassword) {
        setError('אנא מלא את כל השדות');
        setSaving(false);
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        setError('הסיסמאות לא תואמות');
        setSaving(false);
        return;
      }

      if (formData.password.length < 6) {
        setError('הסיסמה חייבת להכיל לפחות 6 תווים');
        setSaving(false);
        return;
      }

      // Check if we have a valid session before updating password
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !sessionData?.session) {
        // Try to get token from URL and set session
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
        
        if (accessToken) {
          // Set session with recovery token
          const { data: setSessionData, error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: '' // Recovery tokens don't have refresh tokens
          });
          
          if (setSessionError || !setSessionData?.session) {
            setError('קישור לא תקין או שפג תוקפו. אנא בקש קישור חדש לאיפוס סיסמה.');
            setSaving(false);
            return;
          }
        } else {
          setError('קישור לא תקין או שפג תוקפו. אנא בקש קישור חדש לאיפוס סיסמה.');
          setSaving(false);
          return;
        }
      }

      // Update password using Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: formData.password
      });

      if (updateError) {
        setError(updateError.message || 'שגיאה באיפוס הסיסמה');
        setSaving(false);
        return;
      }

      setSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/auth/login');
      }, 3000);
    } catch (err: any) {
      console.error('Reset password error:', err);
      setError(err.message || 'שגיאה באיפוס הסיסמה');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-pink-50/30 to-purple-50/20 flex items-center justify-center px-4 py-8">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#F52F8E] mx-auto mb-4" />
          <p className="text-gray-600">בודק קישור...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-pink-50/30 to-purple-50/20 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">איפוס סיסמה</h1>
          <p className="text-gray-600">הזן סיסמה חדשה</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8">
          {success ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <CheckCircle className="w-16 h-16 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">הסיסמה שונתה בהצלחה!</h2>
              <p className="text-gray-600">
                הסיסמה שלך עודכנה. אתה מועבר לדף ההתחברות...
              </p>
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#F52F8E] text-white rounded-xl font-semibold hover:bg-[#E01E7A] transition-colors"
              >
                <span>התחבר עכשיו</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          ) : error && !formData.password ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <AlertCircle className="w-16 h-16 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">קישור לא תקין</h2>
              <p className="text-gray-600">{error}</p>
              <Link
                href="/auth/forgot-password"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#F52F8E] text-white rounded-xl font-semibold hover:bg-[#E01E7A] transition-colors"
              >
                <span>בקש קישור חדש</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-5">
              {/* New Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  סיסמה חדשה
                </label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="password"
                    dir="rtl"
                    placeholder="הזן סיסמה חדשה (לפחות 6 תווים)"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pr-11 pl-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F52F8E] focus:border-transparent text-sm"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  אישור סיסמה
                </label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="password"
                    dir="rtl"
                    placeholder="הזן שוב את הסיסמה"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full pr-11 pl-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F52F8E] focus:border-transparent text-sm"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-[#F52F8E] text-white py-3 rounded-xl font-semibold hover:bg-[#E01E7A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>מעדכן סיסמה...</span>
                  </>
                ) : (
                  <>
                    <span>עדכן סיסמה</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Back to Login Link */}
          {!success && !error && (
            <div className="mt-6 text-center">
              <Link href="/auth/login" className="text-sm text-[#F52F8E] hover:underline font-semibold">
                חזור להתחברות
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-pink-50/30 to-purple-50/20 flex items-center justify-center px-4 py-8">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#F52F8E] mx-auto mb-4" />
          <p className="text-gray-600">טוען...</p>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}

