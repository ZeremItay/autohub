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
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">שכחתי סיסמה</h1>
          <p className="text-gray-300">הזן את כתובת האימייל שלך ונשלח לך קישור לאיפוס הסיסמה</p>
        </div>

        {/* Form */}
        <div className="glass-card rounded-3xl shadow-2xl p-6 sm:p-8">
          {success ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <CheckCircle className="w-16 h-16 text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">אימייל נשלח בהצלחה!</h2>
              <p className="text-gray-300">
                שלחנו לך קישור לאיפוס הסיסמה לכתובת <strong className="text-white">{email}</strong>.
                אנא בדוק את תיבת הדואר הנכנס שלך ולחץ על הקישור.
              </p>
              <Link
                href="/auth/login"
                className="btn-primary inline-flex items-center gap-2 px-6 py-3 font-semibold"
              >
                <span>חזור להתחברות</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
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
                    className="w-full pr-11 pl-4 py-3 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent text-sm bg-white/5 text-white placeholder-gray-400"
                    required
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-500/20 border border-red-400/50 text-red-300 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
              <Link href="/auth/login" className="text-sm text-hot-pink hover:text-rose-400 hover:underline font-semibold transition-colors">
                חזור להתחברות
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

