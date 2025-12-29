'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Mail, ArrowRight, Loader2, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState('');

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      if (!email) {
        setError('אנא הזן כתובת אימייל');
        setLoading(false);
        return;
      }

      // Get the current URL to use as redirect
      const redirectUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}/auth/reset-password`
        : 'http://localhost:3000/auth/reset-password';

      // Send password reset email
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (resetError) {
        setError(resetError.message || 'שגיאה בשליחת אימייל איפוס סיסמה');
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch (err: any) {
      console.error('Reset password error:', err);
      setError(err.message || 'שגיאה בשליחת אימייל איפוס סיסמה');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-pink-50/30 to-purple-50/20 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">שכחתי סיסמה</h1>
          <p className="text-gray-600">הזן את כתובת האימייל שלך ונשלח לך קישור לאיפוס הסיסמה</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8">
          {success ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <CheckCircle className="w-16 h-16 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">אימייל נשלח בהצלחה!</h2>
              <p className="text-gray-600">
                שלחנו לך קישור לאיפוס הסיסמה לכתובת <strong>{email}</strong>.
                אנא בדוק את תיבת הדואר הנכנס שלך ולחץ על הקישור.
              </p>
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#F52F8E] text-white rounded-xl font-semibold hover:bg-[#E01E7A] transition-colors"
              >
                <span>חזור להתחברות</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-5">
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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pr-11 pl-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F52F8E] focus:border-transparent text-sm"
                    required
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
                disabled={loading}
                className="w-full bg-[#F52F8E] text-white py-3 rounded-xl font-semibold hover:bg-[#E01E7A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>שולח...</span>
                  </>
                ) : (
                  <>
                    <span>שלח קישור איפוס סיסמה</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Back to Login Link */}
          {!success && (
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

