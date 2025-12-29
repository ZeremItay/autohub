'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-pink-50/30 to-purple-50/20 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">התחברות</h1>
          <p className="text-gray-600">התחבר לחשבון שלך</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8">
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

