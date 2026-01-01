'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { Lock, ArrowRight, LogIn } from 'lucide-react';
import LoadingSpinner from '@/app/components/LoadingSpinner';
import Link from 'next/link';
import { useTheme } from '@/lib/contexts/ThemeContext';
import {
  getCardStyles,
  getTextStyles,
  getButtonStyles,
  combineStyles
} from '@/lib/utils/themeStyles';

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
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Show nothing while loading or not mounted
  if (!mounted || loading) {
    return <LoadingSpinner text="טוען..." size="md" />;
  }

  // Check authentication requirement
  if (requireAuth && !user) {
    const message = fallbackMessage || 'עליך להתחבר לאתר כדי לצפות בתוכן';
    
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className={combineStyles(
          'max-w-md w-full rounded-2xl shadow-xl p-8 text-center',
          getCardStyles(theme, 'glass'),
          theme !== 'light' && 'rounded-3xl'
        )}>
          <div className="w-20 h-20 bg-gradient-to-br from-[#F52F8E] to-pink-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-10 h-10 text-white" />
          </div>
          
          <h2 className={combineStyles(
            'text-2xl font-bold mb-4',
            getTextStyles(theme, 'heading')
          )}>גישה מוגבלת</h2>
          <p className={combineStyles(
            'mb-6 leading-relaxed',
            getTextStyles(theme, 'muted')
          )}>{message}</p>
          
          <div className="space-y-3">
            <Link
              href={redirectTo}
              className={`w-full flex items-center justify-center gap-2 px-6 py-3 text-white transition-all font-semibold shadow-md hover:shadow-lg ${
                theme === 'light'
                  ? 'bg-gradient-to-r from-[#F52F8E] to-pink-500 rounded-lg hover:from-[#E01E7A] hover:to-pink-600'
                  : 'bg-gradient-to-r from-[#F52F8E] to-pink-500 rounded-full hover:from-[#E01E7A] hover:to-pink-600'
              }`}
            >
              <LogIn className="w-5 h-5" />
              <span>התחבר</span>
            </Link>
            
            <button
              onClick={() => router.back()}
              className={`w-full flex items-center justify-center gap-2 px-6 py-3 transition-colors ${
                theme === 'light'
                  ? 'text-gray-600 hover:text-gray-800'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              <ArrowRight className="w-5 h-5" />
              <span>חזור</span>
            </button>
          </div>
          
          <p className={`text-sm mt-6 ${
            theme === 'light' ? 'text-gray-500' : 'text-gray-300'
          }`}>
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
    const message = fallbackMessage || 'עליך להתחבר לאתר כדי לצפות בתוכן';
    
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className={combineStyles(
          'max-w-md w-full rounded-2xl shadow-xl p-8 text-center',
          getCardStyles(theme, 'glass'),
          theme !== 'light' && 'rounded-3xl'
        )}>
          <div className="w-20 h-20 bg-gradient-to-br from-[#F52F8E] to-pink-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-10 h-10 text-white" />
          </div>
          
          <h2 className={combineStyles(
            'text-2xl font-bold mb-4',
            getTextStyles(theme, 'heading')
          )}>גישה מוגבלת</h2>
          <p className={combineStyles(
            'mb-6 leading-relaxed',
            getTextStyles(theme, 'muted')
          )}>{message}</p>
          
          <div className="space-y-3">
            <Link
              href={redirectTo}
              className={`w-full flex items-center justify-center gap-2 px-6 py-3 text-white transition-all font-semibold shadow-md hover:shadow-lg ${
                theme === 'light'
                  ? 'bg-gradient-to-r from-[#F52F8E] to-pink-500 rounded-lg hover:from-[#E01E7A] hover:to-pink-600'
                  : 'bg-gradient-to-r from-[#F52F8E] to-pink-500 rounded-full hover:from-[#E01E7A] hover:to-pink-600'
              }`}
            >
              <LogIn className="w-5 h-5" />
              <span>התחבר</span>
            </Link>
            
            <button
              onClick={() => router.back()}
              className={`w-full flex items-center justify-center gap-2 px-6 py-3 transition-colors ${
                theme === 'light'
                  ? 'text-gray-600 hover:text-gray-800'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              <ArrowRight className="w-5 h-5" />
              <span>חזור</span>
            </button>
          </div>
          
          <p className={`text-sm mt-6 ${
            theme === 'light' ? 'text-gray-500' : 'text-gray-300'
          }`}>
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
    const message = fallbackMessage || 'צריך לשדרג לפרימיום כדי לצפות בתוכן זה';
    
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full glass-card rounded-3xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-10 h-10 text-white" />
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-4">גישה מוגבלת</h2>
          <p className="text-gray-300 mb-6 leading-relaxed">{message}</p>
          
          <div className="space-y-3">
            <Link
              href="/subscription"
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-full hover:from-yellow-500 hover:to-orange-600 transition-all font-semibold shadow-md hover:shadow-lg"
            >
              <span>שדרג לפרימיום</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
            
            <button
              onClick={() => router.back()}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 text-gray-300 hover:text-white transition-colors"
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

