'use client';

import { useState, useEffect } from 'react';
import { CreditCard, Lock, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function PaymentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        // Redirect to login if not authenticated
        router.push('/auth/login?redirect=/payment');
        return;
      }

      // Get user profile
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (profiles) {
        setCurrentUser(profiles);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error checking auth:', error);
      router.push('/auth/login?redirect=/payment');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-pink-50/30 to-purple-50/20">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#F52F8E] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">טוען...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-pink-50/30 to-purple-50/20 py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-right mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-2">תשלום מאובטח</h1>
          <p className="text-gray-600 text-sm sm:text-base">השלם את התשלום שלך בצורה בטוחה ומאובטחת</p>
        </div>

        {/* Payment Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 sm:p-8">
          {/* Security Badge */}
          <div className="flex items-center justify-center gap-2 mb-6 pb-6 border-b border-gray-200">
            <Lock className="w-5 h-5 text-green-600" />
            <span className="text-sm text-gray-600">תשלום מאובטח באמצעות SSL</span>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>

          {/* Payment Iframe */}
          <div className="w-full flex justify-center mb-6">
            <div className="w-full max-w-2xl">
              <iframe 
                src="https://pay.sumit.co.il/eaxdrn/hsclm5/c/payment" 
                style={{
                  width: '100%',
                  height: '800px',
                  minHeight: '600px',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                }}
                title="Payment Form"
                allow="payment *"
                sandbox="allow-forms allow-scripts allow-same-origin allow-top-navigation allow-popups allow-popups-to-escape-sandbox allow-modals"
                loading="lazy"
              />
            </div>
          </div>

          {/* Info Section */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                מידע חשוב
              </h3>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>התשלום מתבצע בצורה מאובטחת דרך מערכת Sumit</li>
                <li>לא נשמרים פרטי כרטיס אשראי במערכת שלנו</li>
                <li>תוכל לקבל חשבונית במייל לאחר התשלום</li>
                <li>לכל שאלה, צור קשר עם התמיכה</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-6 text-center">
          <button
            onClick={() => router.back()}
            className="text-[#F52F8E] hover:text-[#E01E7A] font-medium transition-colors"
          >
            ← חזור
          </button>
        </div>
      </div>
    </div>
  );
}

