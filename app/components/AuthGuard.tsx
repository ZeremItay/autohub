'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { Lock, ArrowRight, LogIn } from 'lucide-react';
import Link from 'next/link';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requirePremium?: boolean;
  fallbackMessage?: string;
  redirectTo?: string;
}

export default function AuthGuard({
  children,
  requireAuth = false,
  requirePremium = false,
  fallbackMessage,
  redirectTo = '/auth/login'
}: AuthGuardProps) {
  const router = useRouter();
  const { user, loading, isPremium } = useCurrentUser();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Show nothing while loading or not mounted
  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-pink-50/30 to-purple-50/20 flex items-center justify-center">
        <div className="text-center">
          <div className="text-[#F52F8E] text-xl">טוען...</div>
        </div>
      </div>
    );
  }

  // Check authentication requirement
  if (requireAuth && !user) {
    const message = fallbackMessage || 'האזור הזה הוא למחוברים בלבד';
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-pink-50/30 to-purple-50/20 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-200 p-8 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-[#F52F8E] to-pink-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-10 h-10 text-white" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-800 mb-4">גישה מוגבלת</h2>
          <p className="text-gray-600 mb-6 leading-relaxed">{message}</p>
          
          <div className="space-y-3">
            <Link
              href={redirectTo}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#F52F8E] to-pink-500 text-white rounded-lg hover:from-[#E01E7A] hover:to-pink-600 transition-all font-semibold shadow-md hover:shadow-lg"
            >
              <LogIn className="w-5 h-5" />
              <span>התחבר</span>
            </Link>
            
            <button
              onClick={() => router.back()}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowRight className="w-5 h-5" />
              <span>חזור</span>
            </button>
          </div>
          
          <p className="text-sm text-gray-500 mt-6">
            עדיין אין לך משתמש?{' '}
            <Link href="/auth/signup" className="text-[#F52F8E] hover:underline font-medium">
              הירשם עכשיו
            </Link>
          </p>
        </div>
      </div>
    );
  }

  // Check premium requirement - but first check if user is not logged in
  // If user is not logged in and premium is required, show auth message (not premium message)
  if (requirePremium && !user) {
    const message = fallbackMessage || 'האזור הזה הוא למחוברים בלבד';
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-pink-50/30 to-purple-50/20 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-200 p-8 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-[#F52F8E] to-pink-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-10 h-10 text-white" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-800 mb-4">גישה מוגבלת</h2>
          <p className="text-gray-600 mb-6 leading-relaxed">{message}</p>
          
          <div className="space-y-3">
            <Link
              href={redirectTo}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#F52F8E] to-pink-500 text-white rounded-lg hover:from-[#E01E7A] hover:to-pink-600 transition-all font-semibold shadow-md hover:shadow-lg"
            >
              <LogIn className="w-5 h-5" />
              <span>התחבר</span>
            </Link>
            
            <button
              onClick={() => router.back()}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowRight className="w-5 h-5" />
              <span>חזור</span>
            </button>
          </div>
          
          <p className="text-sm text-gray-500 mt-6">
            עדיין אין לך משתמש?{' '}
            <Link href="/auth/signup" className="text-[#F52F8E] hover:underline font-medium">
              הירשם עכשיו
            </Link>
          </p>
        </div>
      </div>
    );
  }
  
  // User is logged in but not premium
  if (requirePremium && user && !isPremium) {
    const message = fallbackMessage || 'האזור הזה זמין למנויי פרימיום בלבד';
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-pink-50/30 to-purple-50/20 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-200 p-8 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-10 h-10 text-white" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-800 mb-4">גישה מוגבלת</h2>
          <p className="text-gray-600 mb-6 leading-relaxed">{message}</p>
          
          <div className="space-y-3">
            <Link
              href="/subscription"
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-lg hover:from-yellow-500 hover:to-orange-600 transition-all font-semibold shadow-md hover:shadow-lg"
            >
              <span>שדרג לפרימיום</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
            
            <button
              onClick={() => router.back()}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowRight className="w-5 h-5" />
              <span>חזור</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // User is authenticated and meets requirements
  return <>{children}</>;
}

