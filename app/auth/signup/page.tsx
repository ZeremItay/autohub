'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Mail, User, Lock, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    firstName: '',
    lastName: '',
    how_to_address: '',
    nocode_experience: ''
  });

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate form
      if (!formData.email || !formData.password || !formData.displayName || !formData.how_to_address || !formData.nocode_experience) {
        setError('אנא מלא את כל השדות הנדרשים');
        setLoading(false);
        return;
      }

      if (formData.password.length < 6) {
        setError('הסיסמה חייבת להכיל לפחות 6 תווים');
        setLoading(false);
        return;
      }

      // Check registration limit BEFORE creating user
      try {
        const limitResponse = await fetch('/api/admin/registration-limit');
        if (limitResponse.ok) {
          const limitData = await limitResponse.json();
          if (!limitData.available) {
            setError(`כרגע הרישום מוגבל ל-${limitData.limit} חברים בלבד. נודיע לך כאשר יהיה רישום לעוד חברים.`);
            setLoading(false);
            return;
          }
        }
      } catch (limitError) {
        // If limit check fails, allow registration (fail open)
        if (process.env.NODE_ENV === 'development') {
          console.warn('Failed to check registration limit, allowing registration:', limitError);
        }
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
      // Get free role ID - ensure it exists
      let freeRoleId = null;
      const { data: roles, error: roleError } = await supabase
        .from('roles')
        .select('id')
        .eq('name', 'free')
        .single();

      if (roleError || !roles?.id) {
        console.error('Error fetching free role or role not found:', roleError);
        // Try to create the free role if it doesn't exist
        const { data: newRole, error: createRoleError } = await supabase
          .from('roles')
          .upsert({
            name: 'free',
            display_name: 'מנוי חינמי',
            description: 'מנוי חינמי - גישה בסיסית'
          }, {
            onConflict: 'name'
          })
          .select('id')
          .single();

        if (createRoleError || !newRole?.id) {
          console.error('Failed to create free role:', createRoleError);
        } else {
          freeRoleId = newRole.id;
          console.log('Free role created/found:', freeRoleId);
        }
      } else {
        freeRoleId = roles.id;
      }

      // Ensure we have a role ID before creating profile
      if (!freeRoleId) {
        console.error('Cannot create profile without free role ID');
        setError('שגיאה בהגדרת תפקיד המשתמש. אנא פנה לתמיכה.');
        setLoading(false);
        return;
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: authData.user.id,
          email: formData.email,
          display_name: formData.displayName,
          first_name: formData.firstName || null,
          last_name: formData.lastName || null,
          nickname: formData.displayName,
          how_to_address: formData.how_to_address,
          nocode_experience: formData.nocode_experience,
          role_id: freeRoleId, // Now guaranteed to have a value
          points: 0,
          is_online: true
        });

      if (profileError) {
        console.error('Error creating profile:', profileError);
        setError('שגיאה ביצירת הפרופיל. נסה שוב.');
        setLoading(false);
        return;
      }

      // Save user to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('selectedUserId', authData.user.id);
        localStorage.setItem('userEmail', formData.email);
      }

      // Send welcome email if first_name is provided
      if (formData.firstName) {
        try {
          const siteUrl = typeof window !== 'undefined' 
            ? window.location.origin 
            : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
          
          await fetch(`${siteUrl}/api/auth/send-welcome-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: authData.user.id,
              userName: formData.firstName, // Send first_name for greeting
              userEmail: formData.email,
            }),
          }).catch(err => {
            // Silently fail - don't block user if email fails
            console.warn('Failed to send welcome email:', err);
          });
        } catch (err) {
          // Silently fail - don't block user if email fails
          console.warn('Failed to send welcome email:', err);
        }
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

  const handleGoogleSignup = async () => {
    setGoogleLoading(true);
    setError(null);

    try {
      // Check registration limit BEFORE initiating OAuth
      try {
        const limitResponse = await fetch('/api/admin/registration-limit');
        if (limitResponse.ok) {
          const limitData = await limitResponse.json();
          if (!limitData.available) {
            setError(`כרגע הרישום מוגבל ל-${limitData.limit} חברים בלבד. נודיע לך כאשר יהיה רישום לעוד חברים.`);
            setGoogleLoading(false);
            return;
          }
        }
      } catch (limitError) {
        // If limit check fails, allow registration (fail open)
        if (process.env.NODE_ENV === 'development') {
          console.warn('Failed to check registration limit, allowing registration:', limitError);
        }
      }

      // Get the current origin for redirect URL
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const redirectUrl = `${origin}/auth/callback`;

      console.log('Initiating Google OAuth signup:', {
        origin,
        redirectUrl,
        fullUrl: typeof window !== 'undefined' ? window.location.href : 'N/A'
      });

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
        setError(oauthError.message || 'שגיאה בהרשמה עם Google');
        setGoogleLoading(false);
      } else {
        console.log('OAuth signup initiated successfully:', {
          url: data?.url,
          provider: data?.provider
        });
        // Note: If successful, user will be redirected to Google, so we don't need to handle success here
        // The redirect happens automatically via data.url
      }
    } catch (err: any) {
      console.error('Google signup error:', err);
      setError(err.message || 'שגיאה בהרשמה עם Google');
      setGoogleLoading(false);
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
          {/* Error Message */}
          {error && (
            <div className="mb-5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* Google Signup Button */}
          <button
            onClick={handleGoogleSignup}
            disabled={googleLoading || loading}
            type="button"
            className="w-full bg-white border-2 border-gray-300 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-sm mb-5"
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
                <span>הרשם עם Google</span>
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

            {/* How to Address */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                איך צריך לפנות אליך בקהילה שלנו? *
              </label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  dir="rtl"
                  lang="he"
                  value={formData.how_to_address}
                  onChange={(e) => setFormData({ ...formData, how_to_address: e.target.value })}
                  className="w-full pr-11 pl-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F52F8E] focus:border-transparent text-sm bg-white appearance-none"
                  required
                >
                  <option value="">בחר אפשרות</option>
                  <option value="אוטומטור">אוטומטור</option>
                  <option value="אוטומטורית">אוטומטורית</option>
                </select>
              </div>
            </div>

            {/* NoCode Experience */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                מה הניסיון שלך עם אוטומציות No Code בטופ 100? *
              </label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  dir="rtl"
                  lang="he"
                  value={formData.nocode_experience}
                  onChange={(e) => setFormData({ ...formData, nocode_experience: e.target.value })}
                  className="w-full pr-11 pl-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F52F8E] focus:border-transparent text-sm bg-white appearance-none"
                  required
                >
                  <option value="">בחר רמת ניסיון</option>
                  <option value="מתחיל">מתחיל</option>
                  <option value="בינוני">בינוני</option>
                  <option value="מתקדם">מתקדם</option>
                </select>
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

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || googleLoading}
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

