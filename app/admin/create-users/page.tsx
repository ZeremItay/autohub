'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CreateTestUsersPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const router = useRouter();

  async function handleCreateUsers() {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/create-test-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      console.log('API Response:', data);

      if (response.ok && data.success !== false) {
        setResult({
          success: true,
          ...data
        });
      } else {
        setResult({
          success: false,
          error: data.error || data.message || 'Failed to create users',
          details: data.errors || data.debug
        });
      }
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message || 'An error occurred'
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">יצירת משתמשי בדיקה</h1>
          <p className="text-gray-600 mb-6">
            זה ייצור שני משתמשי בדיקה:
            <br />
            • יוסי כהן - מנוי חינמי (100 נקודות)
            <br />
            • שרה לוי - מנוי פרימיום (500 נקודות)
          </p>

          <button
            onClick={handleCreateUsers}
            disabled={loading}
            className="w-full bg-[#F52F8E] text-white py-3 px-6 rounded-lg font-semibold hover:bg-[#E01E7A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'יוצר משתמשים...' : 'צור משתמשי בדיקה'}
          </button>

          {result && (
            <div className={`mt-6 p-4 rounded-lg ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              {result.success ? (
                <div>
                  <h3 className="font-semibold text-green-800 mb-2">✅ הצלחה!</h3>
                  <p className="text-green-700 mb-4">{result.message}</p>
                  {result.users && result.users.length > 0 && (
                    <div className="space-y-2">
                      <p className="font-semibold text-green-800">משתמשים שנוצרו:</p>
                      {result.users.map((user: any, index: number) => (
                        <div key={index} className="bg-white p-3 rounded border border-green-200">
                          <p className="font-semibold text-gray-800">{user.display_name}</p>
                          <p className="text-sm text-gray-600">Email: {user.email}</p>
                          <p className="text-sm text-gray-600">Role: {user.role}</p>
                          <p className="text-sm text-gray-600">Points: {user.points}</p>
                          <p className="text-xs text-gray-500 mt-1">User ID: {user.user_id?.substring(0, 8)}...</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {result.errors && result.errors.length > 0 && (
                    <div className="mt-4">
                      <p className="font-semibold text-yellow-800">אזהרות:</p>
                      {result.errors.map((error: any, index: number) => (
                        <p key={index} className="text-sm text-yellow-700">{error.email}: {error.error}</p>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <h3 className="font-semibold text-red-800 mb-2">❌ שגיאה</h3>
                  <p className="text-red-700">{result.error}</p>
                  {result.error?.includes('SERVICE_ROLE_KEY') && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <p className="text-sm text-yellow-800">
                        <strong>הערה:</strong> ודא שיש לך SUPABASE_SERVICE_ROLE_KEY ב-.env.local
                      </p>
                    </div>
                  )}
                  {result.details && (
                    <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded">
                      <p className="text-sm font-semibold text-gray-800 mb-2">פרטים נוספים:</p>
                      <pre className="text-xs text-gray-700 overflow-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={() => router.push('/admin')}
              className="text-[#F52F8E] hover:underline"
            >
              ← חזור לפאנל הניהול
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

