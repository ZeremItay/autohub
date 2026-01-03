'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to monitoring service (e.g., Sentry)
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-pink-50/30 to-purple-50/20 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center">
        <div className="text-6xl mb-4">😕</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">משהו השתבש</h1>
        <p className="text-gray-600 mb-6">
          אירעה שגיאה בלתי צפויה. אנא נסה שוב או צור קשר עם התמיכה.
        </p>
        {error.digest && (
          <p className="text-xs text-gray-400 mb-4">קוד שגיאה: {error.digest}</p>
        )}
        <div className="flex gap-3 justify-center">
          <Button onClick={reset} variant="primary">
            נסה שוב
          </Button>
          <Button onClick={() => window.location.href = '/'} variant="secondary">
            חזור לדף הבית
          </Button>
        </div>
      </div>
    </div>
  );
}

