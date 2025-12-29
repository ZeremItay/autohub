'use client';

import { useState, useEffect } from 'react'
import { Trash2, User } from 'lucide-react'

export default function DebugAdminUsers() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const response = await fetch('/api/debug/admin-users')
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function removeAdminRole(roleId: string, userId: string) {
    if (!confirm('האם אתה בטוח שברצונך להסיר את תפקיד המנהל מהמשתמש הזה?')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/roles?id=${roleId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        alert('תפקיד המנהל הוסר בהצלחה')
        loadData()
      } else {
        const error = await response.json()
        alert('שגיאה: ' + error.error)
      }
    } catch (error) {
      console.error('Error removing admin:', error)
      alert('שגיאה בהסרת תפקיד המנהל')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="text-center">טוען...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-[#F52F8E] mb-2">מנהלי המערכת</h1>
        <p className="text-gray-600 mb-8">
          נמצאו {data?.admin_count || 0} משתמשים עם תפקיד מנהל
        </p>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          {data?.admins && data.admins.length > 0 ? (
            <div className="space-y-6">
              {data.admins.map((admin: any, index: number) => (
                <div key={admin.role_id} className="border-b border-gray-200 pb-6 last:border-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#F52F8E] to-pink-400 flex items-center justify-center text-white font-bold">
                          {admin.profile?.full_name?.charAt(0) || admin.profile?.username?.charAt(0) || '?'}
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold text-gray-800">
                            {admin.profile?.full_name || admin.profile?.username || 'משתמש ללא שם'}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {admin.profile?.username && admin.profile.username !== admin.profile?.full_name && `@${admin.profile.username}`}
                          </p>
                        </div>
                        <span className="px-3 py-1 bg-[#F52F8E] text-white rounded-full text-sm font-medium">
                          מנהל
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">User ID:</span>
                          <p className="font-mono text-xs text-gray-700">{admin.user_id}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Role ID:</span>
                          <p className="font-mono text-xs text-gray-700">{admin.role_id}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">תאריך יצירה:</span>
                          <p className="text-gray-700">
                            {new Date(admin.created_at).toLocaleString('he-IL')}
                          </p>
                        </div>
                        {admin.profile?.email && (
                          <div>
                            <span className="text-gray-500">אימייל:</span>
                            <p className="text-gray-700">{admin.profile.email}</p>
                          </div>
                        )}
                      </div>

                      {admin.profile_error && (
                        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm text-yellow-700">
                            ⚠️ לא נמצא פרופיל: {admin.profile_error}
                          </p>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => removeAdminRole(admin.role_id, admin.user_id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="הסר תפקיד מנהל"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">לא נמצאו מנהלים</p>
          )}
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-semibold text-blue-900 mb-2">💡 הסבר</h3>
          <p className="text-sm text-blue-800">
            יש לך {data?.admin_count || 0} משתמשים עם תפקיד מנהל. זה תקין לחלוטין - 
            אתה יכול להיות כמה מנהלים במערכת. אם אתה רוצה להסיר תפקיד מנהל ממשתמש מסוים, 
            לחץ על כפתור המחיקה.
          </p>
        </div>
      </div>
    </div>
  )
}

