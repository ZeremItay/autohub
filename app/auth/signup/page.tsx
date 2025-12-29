'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Mail, User, Lock, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    firstName: '',
    lastName: ''
  });

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate form
      if (!formData.email || !formData.password || !formData.displayName) {
        setError('אנא מלא את כל השדות הנדרשים');
        setLoading(false);
        return;
      }

      if (formData.password.length < 6) {
        setError('הסיסמה חייבת להכיל לפחות 6 תווים');
        setLoading(false);
        return;
      }

      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            display_name: formData.displayName,
            first_name: formData.firstName,
            last_name: formData.lastName
          }
        }
      });

      if (authError) {
        setError(authError.message || 'שגיאה ביצירת המשתמש');
        setLoading(false);
        return;
      }

      if (!authData.user) {
        setError('לא ניתן ליצור משתמש');
        setLoading(false);
        return;
      }

      // Create profile in profiles table
      // Get free role ID
      const { data: roles } = await supabase
        .from('roles')
        .select('id')
        .eq('name', 'free')
        .single();

      const freeRoleId = roles?.id;

      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: authData.user.id,
          email: formData.email,
          display_name: formData.displayName,
          first_name: formData.firstName || null,
          last_name: formData.lastName || null,
          nickname: formData.displayName,
          role_id: freeRoleId || null,
          points: 0,
          is_online: true
        });

      if (profileError) {
        console.error('Error creating profile:', profileError);
        // Don't fail the signup if profile creation fails - user can update it later
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
      console.error('Signup error:', err);
      setError(err.message || 'שגיאה ביצירת המשתמש');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-pink-50/30 to-purple-50/20 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">הצטרף למועדון</h1>
          <p className="text-gray-600">צור חשבון חדש והתחל להנות מכל התכונות</p>
        </div>

        {/* Signup Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8">
          <form onSubmit={handleSignup} className="space-y-5">
            {/* Display Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                שם תצוגה *
              </label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  dir="rtl"
                  placeholder="הזן שם תצוגה"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className="w-full pr-11 pl-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F52F8E] focus:border-transparent text-sm"
                  required
                />
              </div>
            </div>

            {/* First Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                שם פרטי
              </label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  dir="rtl"
                  placeholder="הזן שם פרטי"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full pr-11 pl-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F52F8E] focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                שם משפחה
              </label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  dir="rtl"
                  placeholder="הזן שם משפחה"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full pr-11 pl-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F52F8E] focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                אימייל *
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
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                סיסמה *
              </label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="password"
                  dir="rtl"
                  placeholder="הזן סיסמה (לפחות 6 תווים)"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
              disabled={loading}
              className="w-full bg-[#F52F8E] text-white py-3 rounded-xl font-semibold hover:bg-[#E01E7A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>יוצר חשבון...</span>
                </>
              ) : (
                <>
                  <span>הרשמה</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              כבר יש לך חשבון?{' '}
              <Link href="/auth/login" className="text-[#F52F8E] hover:underline font-semibold">
                התחבר כאן
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>על ידי הרשמה, אתה מסכים לתנאי השימוש ומדיניות הפרטיות שלנו</p>
        </div>
      </div>
    </div>
  );
}

