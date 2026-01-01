'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { User, Loader2, ArrowRight } from 'lucide-react';

export default function CompleteProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    displayName: '',
    firstName: '',
    lastName: '',
    how_to_address: '',
    nocode_experience: ''
  });

  useEffect(() => {
    const checkProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/auth/login');
          return;
        }

        // Get current profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .single();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          router.push('/');
          return;
        }

        // Check if profile needs completion
        const needsCompletion = !profile.how_to_address || !profile.nocode_experience;
        
        if (!needsCompletion) {
          // Profile is complete, redirect to home
          router.push('/');
          return;
        }

        // Pre-fill form with existing data
        setFormData({
          displayName: profile.display_name || profile.nickname || '',
          firstName: profile.first_name || '',
          lastName: profile.last_name || '',
          how_to_address: profile.how_to_address || '',
          nocode_experience: profile.nocode_experience || ''
        });

        setChecking(false);
      } catch (err: any) {
        console.error('Error checking profile:', err);
        router.push('/');
      }
    };

    checkProfile();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate form
      if (!formData.displayName || !formData.how_to_address || !formData.nocode_experience) {
        setError('אנא מלא את כל השדות הנדרשים');
        setLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('אין לך הרשאה לעדכן את הפרופיל');
        setLoading(false);
        return;
      }

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          display_name: formData.displayName,
          first_name: formData.firstName || null,
          last_name: formData.lastName || null,
          nickname: formData.displayName,
          how_to_address: formData.how_to_address,
          nocode_experience: formData.nocode_experience
        })
        .eq('user_id', session.user.id);

      if (updateError) {
        console.error('Error updating profile:', updateError);
        setError('שגיאה בעדכון הפרופיל. נסה שוב.');
        setLoading(false);
        return;
      }

      // Dispatch event to update profile in other components
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('profileUpdated', { 
          detail: { 
            display_name: formData.displayName,
            first_name: formData.firstName,
            last_name: formData.lastName,
            how_to_address: formData.how_to_address,
            nocode_experience: formData.nocode_experience
          } 
        }));
      }

      // Redirect to home
      router.push('/');
      router.refresh();
    } catch (err: any) {
      console.error('Error completing profile:', err);
      setError(err.message || 'שגיאה בהשלמת הפרופיל');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-hot-pink mb-4" />
          <p className="text-gray-300">בודק פרופיל...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">השלם את הפרופיל שלך</h1>
          <p className="text-gray-300">אנא מלא את הפרטים הבאים כדי להמשיך</p>
        </div>

        {/* Form */}
        <div className="glass-card rounded-3xl shadow-2xl p-6 sm:p-8">
          {/* Error Message */}
          {error && (
            <div className="mb-5 bg-red-500/20 border border-red-400/50 text-red-300 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Display Name */}
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
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
                  className="w-full pr-11 pl-4 py-3 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent text-sm bg-white/5 text-white placeholder-gray-400"
                  required
                />
              </div>
            </div>

            {/* First Name */}
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
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
                  className="w-full pr-11 pl-4 py-3 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent text-sm bg-white/5 text-white placeholder-gray-400"
                />
              </div>
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
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
                  className="w-full pr-11 pl-4 py-3 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent text-sm bg-white/5 text-white placeholder-gray-400"
                />
              </div>
            </div>

            {/* How to Address */}
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                איך צריך לפנות אליך בקהילה שלנו? *
              </label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  dir="rtl"
                  lang="he"
                  value={formData.how_to_address}
                  onChange={(e) => setFormData({ ...formData, how_to_address: e.target.value })}
                  className="w-full pr-11 pl-4 py-3 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent text-sm bg-white/5 text-white appearance-none"
                  required
                >
                  <option value="" className="bg-[#1e293b] text-white">בחר אפשרות</option>
                  <option value="אוטומטור" className="bg-[#1e293b] text-white">אוטומטור</option>
                  <option value="אוטומטורית" className="bg-[#1e293b] text-white">אוטומטורית</option>
                </select>
              </div>
            </div>

            {/* NoCode Experience */}
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                מה הניסיון שלך עם אוטומציות No Code בטופ 100? *
              </label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  dir="rtl"
                  lang="he"
                  value={formData.nocode_experience}
                  onChange={(e) => setFormData({ ...formData, nocode_experience: e.target.value })}
                  className="w-full pr-11 pl-4 py-3 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent text-sm bg-white/5 text-white appearance-none"
                  required
                >
                  <option value="" className="bg-[#1e293b] text-white">בחר רמת ניסיון</option>
                  <option value="מתחיל" className="bg-[#1e293b] text-white">מתחיל</option>
                  <option value="בינוני" className="bg-[#1e293b] text-white">בינוני</option>
                  <option value="מתקדם" className="bg-[#1e293b] text-white">מתקדם</option>
                  <option value="מומחה" className="bg-[#1e293b] text-white">מומחה</option>
                </select>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>שומר...</span>
                </>
              ) : (
                <>
                  <span>המשך</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

