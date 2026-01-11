'use client';

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Settings, Save, Edit, X, Plus, Trash2 } from 'lucide-react'

interface GamificationRule {
  id?: string
  action_name: string
  point_value: number
  status: 'active' | 'inactive'
  description?: string
}

export default function GamificationAdmin() {
  const [rules, setRules] = useState<GamificationRule[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const [formData, setFormData] = useState<GamificationRule>({
    action_name: '',
    point_value: 0,
    status: 'active',
    description: ''
  })

  useEffect(() => {
    loadRules()
  }, [])

  async function loadRules() {
    setLoading(true)
    try {
      // Ensure required rules exist before loading
      try {
        const { ensureGamificationRules } = await import('@/lib/queries/gamification');
        await ensureGamificationRules();
      } catch (ensureError) {
        console.warn('Error ensuring rules (non-critical):', ensureError);
      }
      
      // Try to load from gamification_rules table
      const { data, error } = await supabase
        .from('gamification_rules')
        .select('*')
        .order('action_name', { ascending: true })
      
      if (error && error.code === 'PGRST116') {
        // Table doesn't exist, use default rules
        setRules(getDefaultRules())
      } else if (data) {
        setRules(data)
      } else {
        setRules(getDefaultRules())
      }
    } catch (error) {
      console.error('Error loading rules:', error)
      setRules(getDefaultRules())
    } finally {
      setLoading(false)
    }
  }

  function getDefaultRules(): GamificationRule[] {
    return [
      { id: '1', action_name: 'כניסה יומית', point_value: 5, status: 'active', description: 'כניסה יומית לאתר' },
      { id: '2', action_name: 'פוסט חדש', point_value: 10, status: 'active', description: 'יצירת פוסט חדש בפורום' },
      { id: '3', action_name: 'תגובה לנושא', point_value: 5, status: 'active', description: 'תגובה בפורום' },
      { id: '4', action_name: 'לייק לפוסט', point_value: 1, status: 'active', description: 'לייק לפוסט' },
      { id: '5', action_name: 'שיתוף פוסט', point_value: 3, status: 'active', description: 'שיתוף פוסט' },
      { id: '6', action_name: 'השלמת קורס', point_value: 50, status: 'active', description: 'השלמת קורס מלא' },
      { id: '7', action_name: 'העלאת פרויקט', point_value: 25, status: 'active', description: 'העלאת פרויקט חדש' }
    ]
  }

  async function saveRule(rule: GamificationRule) {
    try {
      if (rule.id && rule.id !== 'new') {
        // Update existing rule
        const { error } = await supabase
          .from('gamification_rules')
          .update({
            action_name: rule.action_name,
            point_value: rule.point_value,
            status: rule.status,
            description: rule.description
          })
          .eq('id', rule.id)
        
        if (error && error.code === 'PGRST116') {
          // Table doesn't exist, just update local state
          setRules(rules.map(r => r.id === rule.id ? rule : r))
        } else if (!error) {
          await loadRules()
        }
      } else {
        // Create new rule
        const { error } = await supabase
          .from('gamification_rules')
          .insert([{
            action_name: rule.action_name,
            point_value: rule.point_value,
            status: rule.status,
            description: rule.description
          }])
        
        if (error && error.code === 'PGRST116') {
          // Table doesn't exist, add to local state
          const newRule = { ...rule, id: Date.now().toString() }
          setRules([...rules, newRule])
        } else if (!error) {
          await loadRules()
        }
      }
      
      setEditing(null)
      setFormData({
        action_name: '',
        point_value: 0,
        status: 'active',
        description: ''
      })
    } catch (error) {
      console.error('Error saving rule:', error)
    }
  }

  async function deleteRule(id: string) {
    if (!confirm('האם אתה בטוח שברצונך למחוק את הכלל הזה?')) return
    
    try {
      const { error } = await supabase
        .from('gamification_rules')
        .delete()
        .eq('id', id)
      
      if (error && error.code === 'PGRST116') {
        // Table doesn't exist, just update local state
        setRules(rules.filter(r => r.id !== id))
      } else if (!error) {
        await loadRules()
      }
    } catch (error) {
      console.error('Error deleting rule:', error)
    }
  }

  function toggleStatus(rule: GamificationRule) {
    const updatedRule = {
      ...rule,
      status: rule.status === 'active' ? 'inactive' : 'active' as 'active' | 'inactive'
    }
    saveRule(updatedRule)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#F52F8E] mb-2">ניהול כללי גמיפיקציה</h1>
          <p className="text-gray-600">הגדר כיצד משתמשים מרוויחים נקודות</p>
        </div>

        {loading ? (
          <div className="text-center py-12">טוען...</div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800">כללי פעולות</h2>
              <button
                onClick={() => {
                  setEditing('new')
                  setFormData({
                    action_name: '',
                    point_value: 0,
                    status: 'active',
                    description: ''
                  })
                }}
                className="flex items-center gap-2 px-4 py-2 bg-[#F52F8E] text-white rounded-lg hover:bg-[#E01E7A] transition-colors"
              >
                <Plus className="w-5 h-5" />
                הוסף כלל חדש
              </button>
            </div>

            {/* Create/Edit Form */}
            {editing && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold mb-4">
                  {editing === 'new' ? 'כלל חדש' : 'עריכת כלל'}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">שם הפעולה</label>
                    <input
                      type="text"
                      value={formData.action_name}
                      onChange={(e) => setFormData({ ...formData, action_name: e.target.value })}
                      placeholder="לדוגמה: כניסה יומית"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F52F8E]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">תיאור</label>
                    <input
                      type="text"
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="תיאור קצר של הפעולה"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F52F8E]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">ערך נקודות</label>
                    <input
                      type="number"
                      value={formData.point_value}
                      onChange={(e) => setFormData({ ...formData, point_value: parseInt(e.target.value) || 0 })}
                      min="0"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F52F8E]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">סטטוס</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F52F8E]"
                    >
                      <option value="active">פעיל</option>
                      <option value="inactive">לא פעיל</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const ruleToSave = editing === 'new' 
                          ? { ...formData, id: Date.now().toString() }
                          : { ...formData, id: editing }
                        saveRule(ruleToSave)
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-[#F52F8E] text-white rounded-lg hover:bg-[#E01E7A] transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      שמור
                    </button>
                    <button
                      onClick={() => {
                        setEditing(null)
                        setFormData({
                          action_name: '',
                          point_value: 0,
                          status: 'active',
                          description: ''
                        })
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      <X className="w-4 h-4" />
                      ביטול
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Rules Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-right py-3 px-4">שם פעולה</th>
                    <th className="text-right py-3 px-4">תיאור</th>
                    <th className="text-right py-3 px-4">ערך נקודות</th>
                    <th className="text-right py-3 px-4">סטטוס</th>
                    <th className="text-right py-3 px-4">פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((rule) => (
                    <tr key={rule.id} className="border-b border-gray-100">
                      <td className="py-3 px-4 font-medium">{rule.action_name}</td>
                      <td className="py-3 px-4 text-gray-600">{rule.description || '-'}</td>
                      <td className="py-3 px-4">
                        {editing === rule.id ? (
                          <input
                            type="number"
                            value={formData.point_value}
                            onChange={(e) => setFormData({ ...formData, point_value: parseInt(e.target.value) || 0 })}
                            className="w-24 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#F52F8E]"
                          />
                        ) : (
                          <span className="font-semibold text-[#F52F8E]">{rule.point_value} נקודות</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => toggleStatus(rule)}
                          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                            rule.status === 'active'
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {rule.status === 'active' ? 'פעיל' : 'לא פעיל'}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          {editing === rule.id ? (
                            <>
                              <button
                                onClick={() => saveRule({ ...formData, id: rule.id })}
                                className="p-2 text-green-600 hover:bg-green-50 rounded"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditing(null)
                                  loadRules()
                                }}
                                className="p-2 text-gray-600 hover:bg-gray-50 rounded"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  setEditing(rule.id!)
                                  setFormData(rule)
                                }}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteRule(rule.id!)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
