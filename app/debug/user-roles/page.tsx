'use client';

import { useState, useEffect } from 'react'

export default function DebugUserRoles() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const response = await fetch('/api/debug/user-roles')
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
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
        <h1 className="text-3xl font-bold text-[#F52F8E] mb-8">בדיקת User Roles</h1>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">User Roles ({data?.user_roles?.count || 0})</h2>
          
          {data?.user_roles?.data && data.user_roles.data.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-right py-3 px-4">ID</th>
                    <th className="text-right py-3 px-4">User ID</th>
                    <th className="text-right py-3 px-4">שם משתמש</th>
                    <th className="text-right py-3 px-4">Role ID</th>
                    <th className="text-right py-3 px-4">Role Name</th>
                    <th className="text-right py-3 px-4">Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {data.user_roles.data.map((ur: any, index: number) => (
                    <tr key={ur.id || index} className="border-b border-gray-100">
                      <td className="py-3 px-4 text-sm font-mono">{ur.id?.substring(0, 8)}...</td>
                      <td className="py-3 px-4 text-sm font-mono">{ur.user_id?.substring(0, 8)}...</td>
                      <td className="py-3 px-4">{ur.user_name || '-'}</td>
                      <td className="py-3 px-4">
                        {ur.role_id ? (
                          <span className="font-mono text-sm">{ur.role_id}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {ur.role ? (
                          <span className="px-2 py-1 bg-[#F52F8E] text-white rounded text-sm">
                            {ur.role}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {ur.created_at ? new Date(ur.created_at).toLocaleString('he-IL') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">אין נתונים</p>
          )}

          {data?.user_roles?.error && (
            <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg">
              שגיאה: {data.user_roles.error}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Roles Table ({data?.roles_table?.count || 0})</h2>
          
          {data?.roles_table?.data && data.roles_table.data.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-right py-3 px-4">ID</th>
                    <th className="text-right py-3 px-4">Name</th>
                    <th className="text-right py-3 px-4">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {data.roles_table.data.map((role: any, index: number) => (
                    <tr key={role.id || index} className="border-b border-gray-100">
                      <td className="py-3 px-4 text-sm font-mono">{role.id?.substring(0, 8)}...</td>
                      <td className="py-3 px-4 font-medium">{role.name || role.role_name || '-'}</td>
                      <td className="py-3 px-4 text-gray-600">{role.description || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">טבלת roles ריקה או לא קיימת</p>
          )}
        </div>

        <div className="bg-gray-50 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4">Raw Data (JSON)</h2>
          <pre className="bg-gray-800 text-green-400 p-4 rounded-lg overflow-auto text-xs">
            {JSON.stringify(data?.raw_data, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}

