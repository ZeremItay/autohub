'use client';

import { useState, useEffect } from 'react'
import { Database, Users, Shield } from 'lucide-react'

export default function RolesStructure() {
  const [currentStructure, setCurrentStructure] = useState<any>(null)
  const [proposedStructure, setProposedStructure] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      // Check current structure
      const response = await fetch('/api/debug/user-roles')
      const result = await response.json()
      setCurrentStructure(result)
      
      // Proposed structure info
      setProposedStructure({
        roles_table: {
          description: 'טבלת תפקידים קבועה',
          roles: [
            { name: 'free', display_name: 'מנוי חינמי', description: 'גישה בסיסית' },
            { name: 'premium', display_name: 'מנוי פרימיום', description: 'גישה מלאה' },
            { name: 'admin', display_name: 'מנהל', description: 'גישה מלאה וניהול' }
          ]
        },
        profiles_table: {
          description: 'עמודה role_id שתקשר ל-roles',
          benefit: 'כל משתמש יכול להיות רק עם תפקיד אחד'
        }
      })
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="p-8">טוען...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-[#F52F8E] mb-8">מבנה תפקידים - השוואה</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Current Structure */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Database className="w-5 h-5 text-gray-500" />
              מבנה נוכחי
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">טבלת user_roles:</p>
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                  <li>קישור בין user_id ל-role (enum)</li>
                  <li>משתמש יכול להיות עם כמה תפקידים</li>
                  <li>קשה לנהל תפקידים חדשים</li>
                </ul>
              </div>
              {currentStructure?.user_roles?.count > 0 && (
                <div className="p-3 bg-gray-50 rounded">
                  <p className="text-sm font-medium">נמצאו {currentStructure.user_roles.count} תפקידים</p>
                </div>
              )}
            </div>
          </div>

          {/* Proposed Structure */}
          <div className="bg-white rounded-xl shadow-sm border-2 border-[#F52F8E] p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#F52F8E]" />
              מבנה מוצע (מומלץ)
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">טבלת roles:</p>
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 mb-3">
                  <li>מנוי חינמי</li>
                  <li>מנוי פרימיום</li>
                  <li>מנהל</li>
                </ul>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">טבלת profiles:</p>
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                  <li>עמודה role_id שתקשר ל-roles</li>
                  <li>כל משתמש עם תפקיד אחד בלבד</li>
                  <li>קל להוסיף תפקידים חדשים</li>
                  <li>קל לשנות תפקיד של משתמש</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Migration Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">📋 איך לעשות את השינוי:</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
            <li>פתח את Supabase Dashboard → SQL Editor</li>
            <li>העתק את התוכן מקובץ <code className="bg-blue-100 px-2 py-1 rounded">supabase-restructure-roles.sql</code></li>
            <li>הרץ את הסקריפט</li>
            <li>הסקריפט ייצור את טבלת roles, יוסיף role_id ל-profiles, ויעביר את הנתונים הקיימים</li>
            <li>לאחר מכן תוכל למחוק את טבלת user_roles הישנה (אופציונלי)</li>
          </ol>
        </div>

        {/* Benefits */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-green-900 mb-3">✅ יתרונות המבנה החדש:</h3>
          <ul className="list-disc list-inside space-y-2 text-sm text-green-800">
            <li><strong>פשוט יותר:</strong> כל משתמש עם תפקיד אחד - לא צריך לנהל קישורים</li>
            <li><strong>גמיש יותר:</strong> קל להוסיף תפקידים חדשים (למשל: "מנוי VIP")</li>
            <li><strong>יעיל יותר:</strong> פחות JOINs, ביצועים טובים יותר</li>
            <li><strong>קל לניהול:</strong> שינוי תפקיד = עדכון עמודה אחת</li>
            <li><strong>תואם יותר:</strong> מבנה סטנדרטי של רוב האפליקציות</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

