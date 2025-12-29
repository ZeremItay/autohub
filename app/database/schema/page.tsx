'use client';

import { useState, useEffect } from 'react'
import { Database, Table, Columns } from 'lucide-react'

export default function DatabaseSchema() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSchema()
  }, [])

  async function loadSchema() {
    try {
      const response = await fetch('/api/database/schema')
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Error loading schema:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="text-center">טוען סכמת מסד הנתונים...</div>
      </div>
    )
  }

  const existingTables = data?.tables ? Object.entries(data.tables).filter(([_, info]: [string, any]) => info.exists) : []

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#F52F8E] mb-2">סכמת מסד הנתונים</h1>
          <p className="text-gray-600">
            נמצאו {data?.total_tables_found || 0} טבלאות במסד הנתונים
          </p>
        </div>

        <div className="space-y-6">
          {existingTables.map(([tableName, tableInfo]: [string, any]) => (
            <div key={tableName} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Table className="w-6 h-6 text-[#F52F8E]" />
                <h2 className="text-2xl font-semibold text-gray-800">{tableName}</h2>
                <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                  {tableInfo.row_count !== undefined ? `${tableInfo.row_count} שורות` : 'מספר שורות לא ידוע'}
                </span>
              </div>

              {tableInfo.columns && Array.isArray(tableInfo.columns) ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-right py-3 px-4">שם עמודה</th>
                        <th className="text-right py-3 px-4">סוג</th>
                        <th className="text-right py-3 px-4">דוגמה</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableInfo.columns.map((column: any, index: number) => (
                        <tr key={index} className="border-b border-gray-100">
                          <td className="py-3 px-4 font-medium">
                            <div className="flex items-center gap-2">
                              <Columns className="w-4 h-4 text-gray-400" />
                              {column.name}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                              {column.type}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {column.sample_value !== null && column.sample_value !== undefined ? (
                              <span className="text-sm text-gray-600 font-mono">
                                {typeof column.sample_value === 'object' 
                                  ? JSON.stringify(column.sample_value).substring(0, 50) + '...'
                                  : String(column.sample_value).substring(0, 50)}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-sm">NULL</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-700">
                    {typeof tableInfo.columns === 'string' 
                      ? tableInfo.columns 
                      : 'לא ניתן לקבוע את מבנה הטבלה'}
                  </p>
                </div>
              )}

              {tableInfo.error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm">שגיאה: {tableInfo.error}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Tables that don't exist */}
        {data?.tables && (
          <div className="mt-8 bg-gray-100 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">טבלאות שלא קיימות</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(data.tables)
                .filter(([_, info]: [string, any]) => !info.exists)
                .map(([tableName]) => (
                  <span key={tableName} className="px-3 py-1 bg-gray-200 text-gray-600 rounded text-sm">
                    {tableName}
                  </span>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

