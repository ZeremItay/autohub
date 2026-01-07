'use client';

import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { getPosts, createPost } from '@/lib/queries/posts'
import { getAllProfiles, getProfile, updateProfile } from '@/lib/queries/profiles'
import { clearCache } from '@/lib/cache'
import { getAllRoles } from '@/lib/queries/roles'
import { getAllRecordings, getRecordingById, createRecording, updateRecording, deleteRecording } from '@/lib/queries/recordings'
import { getAllCourses, createCourse, type Course } from '@/lib/queries/courses'
import { getAllEvents, createEvent, updateEvent, deleteEvent, type Event } from '@/lib/queries/events'
import { getAllProjects, getProjectById, createProject, updateProject, deleteProject, getAllProjectOffers, getProjectOffers, updateProjectOffer, deleteProjectOffer, type Project, type ProjectOffer } from '@/lib/queries/projects'
import { getAllTags, getTagById, createTag, updateTag, deleteTag, getUnapprovedTags, suggestTag, type Tag } from '@/lib/queries/tags'
import { 
  Users, 
  FileText, 
  Settings, 
  Plus, 
  Edit, 
  Trash2,
  Save,
  X,
  Trophy,
  Video,
  HelpCircle,
  Star,
  File as FileIcon,
  Upload,
  CreditCard,
  Calendar,
  Download,
  BookOpen,
  Tag as TagIcon,
  MessageCircleMore
} from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'

// Lazy load heavy components
const DatePicker = dynamic(
  () => import('react-datepicker').then((mod) => mod.default as any),
  { 
    ssr: false,
    loading: () => <div className="w-full h-10 bg-gray-100 rounded animate-pulse" />
  }
) as any

const RichTextEditor = dynamic(
  () => import('@/app/components/RichTextEditor'),
  { 
    ssr: false,
    loading: () => <div className="w-full h-32 bg-gray-100 rounded animate-pulse" />
  }
)

const QASectionEditor = dynamic(
  () => import('@/app/components/admin/QASectionEditor'),
  { 
    ssr: false,
    loading: () => <div className="w-full h-24 bg-gray-100 rounded animate-pulse" />
  }
)

const KeyPointsEditor = dynamic(
  () => import('@/app/components/admin/KeyPointsEditor'),
  { 
    ssr: false,
    loading: () => <div className="w-full h-24 bg-gray-100 rounded animate-pulse" />
  }
)

const ImageGalleryModal = dynamic(
  () => import('@/components/ImageGalleryModal'),
  { 
    ssr: false,
    loading: () => null
  }
)

// Import date-fns locale separately (lightweight)
import { he } from 'date-fns/locale'
import 'react-datepicker/dist/react-datepicker.css'

// Tag Selector Component
function TagSelector({ 
  selectedTagIds, 
  onSelectionChange, 
  availableTags 
}: { 
  selectedTagIds: string[], 
  onSelectionChange: (tagIds: string[]) => void,
  availableTags: Tag[]
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredTags = useMemo(() => {
    if (!searchQuery) return availableTags
    const query = searchQuery.toLowerCase()
    return availableTags.filter(tag => 
      tag.name.toLowerCase().includes(query) ||
      tag.description?.toLowerCase().includes(query)
    )
  }, [availableTags, searchQuery])

  const selectedTags = useMemo(() => {
    return availableTags.filter(tag => selectedTagIds.includes(tag.id))
  }, [availableTags, selectedTagIds])

  function toggleTag(tagId: string) {
    const newSelection = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter(id => id !== tagId)
      : [...selectedTagIds, tagId]
    onSelectionChange(newSelection)
  }

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-2">תגיות</label>
      <div 
        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white cursor-pointer min-h-[42px] flex items-center flex-wrap gap-2"
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedTags.length > 0 ? (
          selectedTags.map(tag => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 px-2 py-1 bg-[#F52F8E] text-white text-xs rounded"
              onClick={(e) => {
                e.stopPropagation()
                toggleTag(tag.id)
              }}
            >
              {tag.name}
              <X className="w-3 h-3" />
            </span>
          ))
        ) : (
          <span className="text-gray-400">בחר תגיות...</span>
        )}
      </div>
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
            <div className="p-2 border-b border-gray-200">
              <input
                type="text"
                placeholder="חפש תגיות..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                dir="rtl"
              />
            </div>
            <div className="overflow-y-auto max-h-48">
              {filteredTags.length > 0 ? (
                filteredTags.map(tag => (
                  <div
                    key={tag.id}
                    className={`px-4 py-2 cursor-pointer hover:bg-gray-100 flex items-center justify-between ${
                      selectedTagIds.includes(tag.id) ? 'bg-[#F52F8E]/10' : ''
                    }`}
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleTag(tag.id)
                    }}
                  >
                    <div className="flex items-center gap-2">
                      {tag.icon && <span>{tag.icon}</span>}
                      <span className={selectedTagIds.includes(tag.id) ? 'font-semibold' : ''}>
                        {tag.name}
                      </span>
                      {tag.description && (
                        <span className="text-xs text-gray-500">- {tag.description}</span>
                      )}
                    </div>
                    {selectedTagIds.includes(tag.id) && (
                      <span className="text-[#F52F8E]">✓</span>
                    )}
                  </div>
                ))
              ) : (
                <div className="px-4 py-2 text-gray-500 text-sm text-center">
                  לא נמצאו תגיות
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// Tag Selector with Create capability
function TagSelectorWithCreate({ 
  selectedTagIds, 
  onSelectionChange, 
  availableTags,
  onNewTagCreate
}: { 
  selectedTagIds: string[], 
  onSelectionChange: (tagIds: string[]) => void,
  availableTags: Tag[],
  onNewTagCreate: (tagName: string) => Promise<void>
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredTags = useMemo(() => {
    if (!searchQuery) return availableTags
    const query = searchQuery.toLowerCase().trim()
    if (!query) return availableTags
    return availableTags.filter(tag => 
      tag.name.toLowerCase().includes(query) ||
      tag.description?.toLowerCase().includes(query)
    )
  }, [availableTags, searchQuery])

  const selectedTags = useMemo(() => {
    return availableTags.filter(tag => selectedTagIds.includes(tag.id))
  }, [availableTags, selectedTagIds])

  // Check if search query doesn't match any existing tag
  const shouldShowCreateOption = useMemo(() => {
    if (!searchQuery || !searchQuery.trim()) return false
    const query = searchQuery.toLowerCase().trim()
    const exists = availableTags.some(tag => 
      tag.name.toLowerCase() === query ||
      tag.name.toLowerCase().includes(query)
    )
    return !exists && query.length > 0
  }, [searchQuery, availableTags])

  function toggleTag(tagId: string) {
    const newSelection = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter(id => id !== tagId)
      : [...selectedTagIds, tagId]
    onSelectionChange(newSelection)
  }

  async function handleCreateNewTag() {
    if (!searchQuery.trim()) return
    await onNewTagCreate(searchQuery.trim())
    setSearchQuery('')
  }

  return (
    <div className="relative">
      <div 
        className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white cursor-pointer min-h-[46px] flex items-center flex-wrap gap-2"
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedTags.length > 0 ? (
          selectedTags.map(tag => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 px-2 py-1 bg-[#F52F8E] text-white text-xs rounded"
              onClick={(e) => {
                e.stopPropagation()
                toggleTag(tag.id)
              }}
            >
              {tag.name}
              <X className="w-3 h-3" />
            </span>
          ))
        ) : (
          <span className="text-gray-400 text-sm">בחר תגיות או חפש להוסיף חדשות...</span>
        )}
      </div>
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-[9998]" 
            onClick={() => {
              setIsOpen(false)
              setSearchQuery('')
            }}
          />
          <div className="absolute z-[9999] w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-2xl overflow-hidden" style={{ maxHeight: 'min(300px, calc(100vh - 200px))', maxWidth: 'calc(100vw - 2rem)' }}>
            <div className="p-2 border-b border-gray-200">
              <input
                type="text"
                placeholder="חפש תגיות..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && shouldShowCreateOption) {
                    e.preventDefault()
                    handleCreateNewTag()
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#F52F8E]"
                dir="rtl"
                autoFocus
              />
            </div>
            <div className="overflow-y-auto max-h-[240px]">
              {shouldShowCreateOption && (
                <div
                  className="px-4 py-3 cursor-pointer hover:bg-blue-50 border-b border-gray-200 bg-blue-50/50 flex items-center justify-between"
                  onClick={async (e) => {
                    e.stopPropagation()
                    await handleCreateNewTag()
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Plus className="w-4 h-4 text-[#F52F8E] flex-shrink-0" />
                    <span className="font-semibold text-[#F52F8E] truncate text-sm">
                      הוסף תגית חדשה: "{searchQuery}"
                    </span>
                  </div>
                </div>
              )}
              {filteredTags.length > 0 ? (
                filteredTags.map(tag => (
                  <div
                    key={tag.id}
                    className={`px-4 py-2 cursor-pointer hover:bg-gray-100 flex items-center justify-between ${
                      selectedTagIds.includes(tag.id) ? 'bg-[#F52F8E]/10' : ''
                    }`}
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleTag(tag.id)
                    }}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {tag.icon && <span className="flex-shrink-0">{tag.icon}</span>}
                      <span className={`flex-shrink-0 text-sm sm:text-base ${selectedTagIds.includes(tag.id) ? 'font-semibold' : ''}`}>
                        {tag.name}
                      </span>
                      {tag.description && (
                        <span className="text-xs text-gray-500 truncate hidden sm:inline">- {tag.description}</span>
                      )}
                    </div>
                    {selectedTagIds.includes(tag.id) && (
                      <span className="text-[#F52F8E] flex-shrink-0">✓</span>
                    )}
                  </div>
                ))
              ) : !shouldShowCreateOption && (
                <div className="px-4 py-2 text-gray-500 text-sm text-center">
                  {searchQuery ? 'לא נמצאו תגיות' : 'התחל להקליד כדי לחפש תגיות'}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// API Documentation Component
function ApiDocumentation() {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://autohub.com'
  
  const apiEndpoints = [
    // Admin APIs
    {
      category: 'Admin APIs',
      endpoints: [
        {
          method: 'POST',
          path: '/api/admin/create-user',
          description: 'יצירת משתמש חדש',
          auth: 'API Key או Admin Session',
          params: {
            body: {
              email: 'string (required)',
              password: 'string (required, min 6 chars)',
              display_name: 'string (optional)',
              first_name: 'string (optional)',
              last_name: 'string (optional)',
              auto_enroll_free_course: 'boolean (optional, default: true)'
            }
          }
        },
        {
          method: 'POST',
          path: '/api/admin/assign-course',
          description: 'שיוך קורס למשתמש',
          auth: 'API Key או Admin Session',
          params: {
            body: {
              user_id: 'string (required)',
              course_id: 'string (required)'
            }
          }
        },
        {
          method: 'POST',
          path: '/api/admin/create-report',
          description: 'יצירת דיווח חדש',
          auth: 'API Key או Admin Session',
          params: {
            body: {
              title: 'string (required)',
              content: 'string (required)',
              user_id: 'string (required)',
              is_published: 'boolean (optional, default: true)',
              created_at: 'string (optional, ISO date)'
            }
          }
        },
        {
          method: 'GET',
          path: '/api/admin/users',
          description: 'קבלת רשימת משתמשים',
          auth: 'API Key או Admin Session',
          params: {
            query: {
              search: 'string (optional)',
              email: 'string (optional)',
              limit: 'number (optional)'
            }
          }
        },
        {
          method: 'GET',
          path: '/api/admin/users/[userId]',
          description: 'קבלת משתמש לפי ID',
          auth: 'API Key או Admin Session',
          params: {
            path: {
              userId: 'string (required)'
            },
            query: {
              by: 'string (optional: "email" | "user_id")'
            }
          }
        },
        {
          method: 'PUT',
          path: '/api/admin/users',
          description: 'עדכון משתמש',
          auth: 'API Key או Admin Session',
          params: {
            body: {
              id: 'string (required)',
              display_name: 'string (optional)',
              role_id: 'string (optional)',
              points: 'number (optional)'
            }
          }
        },
        {
          method: 'DELETE',
          path: '/api/admin/users',
          description: 'מחיקת משתמש',
          auth: 'API Key או Admin Session',
          params: {
            query: {
              id: 'string (required)'
            }
          }
        },
        {
          method: 'GET',
          path: '/api/admin/users/[userId]/courses',
          description: 'קבלת קורסים של משתמש',
          auth: 'API Key או Admin Session',
          params: {
            path: {
              userId: 'string (required)'
            }
          }
        },
        {
          method: 'POST',
          path: '/api/admin/users/[userId]/courses',
          description: 'הוספת קורס למשתמש',
          auth: 'API Key או Admin Session',
          params: {
            path: {
              userId: 'string (required)'
            },
            body: {
              course_id: 'string (required)'
            }
          }
        },
        {
          method: 'DELETE',
          path: '/api/admin/users/[userId]/courses',
          description: 'הסרת קורס ממשתמש',
          auth: 'API Key או Admin Session',
          params: {
            path: {
              userId: 'string (required)'
            },
            query: {
              course_id: 'string (required)'
            }
          }
        },
        {
          method: 'GET',
          path: '/api/admin/feedbacks',
          description: 'קבלת כל הפידבקים',
          auth: 'Admin Session',
          params: {}
        },
        {
          method: 'DELETE',
          path: '/api/admin/feedbacks/[id]',
          description: 'מחיקת פידבק',
          auth: 'Admin Session',
          params: {
            path: {
              id: 'string (required)'
            }
          }
        }
      ]
    },
    // User APIs
    {
      category: 'User APIs',
      endpoints: [
        {
          method: 'GET',
          path: '/api/user/subscription',
          description: 'קבלת מנוי של משתמש',
          auth: 'User Session',
          params: {}
        },
        {
          method: 'GET',
          path: '/api/user/payments',
          description: 'קבלת תשלומים של משתמש',
          auth: 'User Session',
          params: {}
        }
      ]
    },
    // Public APIs
    {
      category: 'Public APIs',
      endpoints: [
        {
          method: 'POST',
          path: '/api/feedback',
          description: 'שליחת פידבק',
          auth: 'User Session (optional)',
          params: {
            body: {
              name: 'string (required)',
              email: 'string (required)',
              subject: 'string (required)',
              message: 'string (required)',
              feedback_type: 'string (optional)',
              rating: 'number (optional, 1-5)',
              image_url: 'string (optional)'
            }
          }
        },
        {
          method: 'GET',
          path: '/api/projects',
          description: 'קבלת רשימת פרויקטים',
          auth: 'None',
          params: {}
        },
        {
          method: 'GET',
          path: '/api/reports',
          description: 'קבלת רשימת דיווחים',
          auth: 'None',
          params: {}
        },
        {
          method: 'GET',
          path: '/api/reports/[id]',
          description: 'קבלת דיווח לפי ID',
          auth: 'None',
          params: {
            path: {
              id: 'string (required)'
            }
          }
        }
      ]
    },
    // Webhooks
    {
      category: 'Webhooks',
      endpoints: [
        {
          method: 'POST',
          path: '/api/payments/webhook',
          description: 'Webhook לתשלומים',
          auth: 'Webhook Secret',
          params: {
            body: {
              event: 'string (required)',
              data: 'object (required)'
            }
          }
        }
      ]
    }
  ]

  return (
    <div className="space-y-8">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-blue-900 mb-2">אימות (Authentication)</h3>
        <p className="text-sm text-blue-800 mb-2">
          רוב ה-Admin APIs דורשים אימות באמצעות:
        </p>
        <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
          <li><strong>API Key:</strong> שלח ב-header <code className="bg-blue-100 px-1 rounded">X-API-Key</code> או <code className="bg-blue-100 px-1 rounded">Authorization: Bearer YOUR_KEY</code></li>
          <li><strong>Admin Session:</strong> התחבר כאדמין דרך הדפדפן</li>
        </ul>
        <p className="text-sm text-blue-800 mt-2">
          <strong>Base URL:</strong> <code className="bg-blue-100 px-1 rounded">{baseUrl}</code>
        </p>
      </div>

      {apiEndpoints.map((category, categoryIndex) => (
        <div key={categoryIndex} className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-[#F52F8E] text-white px-6 py-3">
            <h3 className="text-lg font-semibold">{category.category}</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {category.endpoints.map((endpoint, endpointIndex) => (
              <div key={endpointIndex} className="p-6 hover:bg-gray-50">
                <div className="flex items-start gap-4 mb-3">
                  <span className={`px-3 py-1 rounded text-sm font-semibold ${
                    endpoint.method === 'GET' ? 'bg-green-100 text-green-700' :
                    endpoint.method === 'POST' ? 'bg-blue-100 text-blue-700' :
                    endpoint.method === 'PUT' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {endpoint.method}
                  </span>
                  <code className="flex-1 text-lg font-mono text-gray-800">{endpoint.path}</code>
                </div>
                <p className="text-gray-600 mb-3">{endpoint.description}</p>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-semibold text-gray-700">אימות: </span>
                    <span className="text-sm text-gray-600">{endpoint.auth}</span>
                  </div>
                  {Object.keys(endpoint.params).length > 0 && (
                    <div>
                      <span className="text-sm font-semibold text-gray-700">פרמטרים: </span>
                      <div className="mt-2 space-y-2">
                        {'path' in endpoint.params && endpoint.params.path && (
                          <div className="bg-gray-50 p-3 rounded">
                            <span className="text-sm font-medium text-gray-700">Path Parameters:</span>
                            <pre className="text-xs mt-1 text-gray-600">{JSON.stringify(endpoint.params.path, null, 2)}</pre>
                          </div>
                        )}
                        {'query' in endpoint.params && endpoint.params.query && (
                          <div className="bg-gray-50 p-3 rounded">
                            <span className="text-sm font-medium text-gray-700">Query Parameters:</span>
                            <pre className="text-xs mt-1 text-gray-600">{JSON.stringify(endpoint.params.query, null, 2)}</pre>
                          </div>
                        )}
                        {'body' in endpoint.params && endpoint.params.body && (
                          <div className="bg-gray-50 p-3 rounded">
                            <span className="text-sm font-medium text-gray-700">Body Parameters:</span>
                            <pre className="text-xs mt-1 text-gray-600">{JSON.stringify(endpoint.params.body, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<'users' | 'posts' | 'roles' | 'gamification' | 'recordings' | 'resources' | 'blog' | 'subscriptions' | 'payments' | 'news' | 'badges' | 'courses' | 'reports' | 'events' | 'projects' | 'tags' | 'feedbacks' | 'forums' | 'api-docs'>('users')
  const [users, setUsers] = useState<any[]>([])
  const [posts, setPosts] = useState<any[]>([])
  const [roles, setRoles] = useState<any[]>([])
  const [recordings, setRecordings] = useState<any[]>([])
  const [recordingTagsMap, setRecordingTagsMap] = useState<Record<string, Tag[]>>({})
  const [resources, setResources] = useState<any[]>([])
  const [blogPosts, setBlogPosts] = useState<any[]>([])
  const [availableRoles, setAvailableRoles] = useState<any[]>([])
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [badges, setBadges] = useState<any[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [reports, setReports] = useState<any[]>([])
  const [news, setNews] = useState<any[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [projectOffers, setProjectOffers] = useState<Record<string, ProjectOffer[]>>({})
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [tags, setTags] = useState<Tag[]>([])
  const [unapprovedTags, setUnapprovedTags] = useState<Tag[]>([])
  const [approvedTags, setApprovedTags] = useState<Tag[]>([])
  const [feedbacks, setFeedbacks] = useState<any[]>([])
  const [forums, setForums] = useState<any[]>([])
  const [registrationLimit, setRegistrationLimit] = useState<number>(50)
  const [currentUserCount, setCurrentUserCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const [formData, setFormData] = useState<any>({})
  const [uploadingCourseImage, setUploadingCourseImage] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [zoomMeetings, setZoomMeetings] = useState<any[]>([])
  const [loadingZoomMeetings, setLoadingZoomMeetings] = useState(false)
  const [selectedUserForCourses, setSelectedUserForCourses] = useState<string | null>(null)
  const [userEnrollments, setUserEnrollments] = useState<any[]>([])
  const [loadingEnrollments, setLoadingEnrollments] = useState(false)
  const [selectedFeedback, setSelectedFeedback] = useState<any | null>(null)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [showImageGallery, setShowImageGallery] = useState(false)
  const [imageGalleryField, setImageGalleryField] = useState<string | null>(null)
  const [showBulkEditModal, setShowBulkEditModal] = useState(false)
  const [bulkEditData, setBulkEditData] = useState<any>({})
  
  // Calculate selected date for events DatePicker
  const eventSelectedDate = useMemo(() => {
    try {
      // If we have event_datetime (from edit), use it directly
      if ((formData as any).event_datetime && (formData as any).event_datetime instanceof Date) {
        return (formData as any).event_datetime;
      }
      if (formData.event_date && formData.event_time) {
        // Combine date and time strings
        let dateStr: string;
        if ((formData.event_date as any) instanceof Date) {
          const dateObj = formData.event_date as Date;
          const year = dateObj.getFullYear();
          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
          const day = String(dateObj.getDate()).padStart(2, '0');
          dateStr = `${year}-${month}-${day}`;
        } else {
          dateStr = formData.event_date as string;
        }
        const [hours, minutes] = formData.event_time.split(':');
        const combinedDate = new Date(`${dateStr}T${hours || '00'}:${minutes || '00'}:00`);
        return isNaN(combinedDate.getTime()) ? null : combinedDate;
      }
      if ((formData.event_date as any) instanceof Date) {
        return formData.event_date as Date;
      }
      if (formData.event_date) {
        return new Date(formData.event_date);
      }
      return null;
    } catch (e) {
      console.error('Error parsing date:', e);
      return null;
    }
  }, [formData.event_date, formData.event_time, (formData as any).event_datetime]);
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [courseSections, setCourseSections] = useState<Array<{id: string, title: string, lessons: Array<{id: string, title: string, description?: string, video_url?: string, duration_minutes?: number, qa_section?: Array<{question: string, answer: string}>, key_points?: Array<{title: string, description: string, url?: string}>}>}>>([])
  const [editingLesson, setEditingLesson] = useState<{lessonId: string, sectionIndex: number, lessonIndex: number} | null>(null)
  const [editingLessonData, setEditingLessonData] = useState<{title: string, description: string, video_url: string, qa_section: Array<{question: string, answer: string}>, key_points: Array<{title: string, description: string, url?: string}>} | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)
  const router = useRouter()

  useEffect(() => {
    checkAuthorization()
  }, [])

  useEffect(() => {
    if (isAuthorized === true) {
      loadData()
    }
  }, [activeTab, isAuthorized])

  // Set default dates for subscription form when opening it
  useEffect(() => {
    if (activeTab === 'subscriptions' && !editing && (!formData.start_date || !formData.end_date)) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const startDate = `${year}-${month}-${day}T${hours}:${minutes}`;
      
      const endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() + 1);
      const endYear = endDate.getFullYear();
      const endMonth = String(endDate.getMonth() + 1).padStart(2, '0');
      const endDay = String(endDate.getDate()).padStart(2, '0');
      const endHours = String(endDate.getHours()).padStart(2, '0');
      const endMinutes = String(endDate.getMinutes()).padStart(2, '0');
      const endDateStr = `${endYear}-${endMonth}-${endDay}T${endHours}:${endMinutes}`;
      
      setFormData((prev: any) => ({
        ...prev,
        start_date: prev.start_date || startDate,
        end_date: prev.end_date || endDateStr
      }));
    }
  }, [activeTab, editing])

  // Set default payment_date for payments form when opening it
  useEffect(() => {
    if (activeTab === 'payments' && !editing && !formData.payment_date) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const paymentDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;

      setFormData((prev: any) => ({
        ...prev,
        payment_date: paymentDateTime
      }));
    }
  }, [activeTab, editing])

  async function loadZoomMeetings() {
    setLoadingZoomMeetings(true)
    try {
      const response = await fetch('/api/zoom/list-meetings')
      const data = await response.json()
      if (data.success && data.meetings) {
        setZoomMeetings(data.meetings)
      } else {
        console.error('Failed to load Zoom meetings:', data.error)
        setZoomMeetings([])
      }
    } catch (error) {
      console.error('Error loading Zoom meetings:', error)
      setZoomMeetings([])
    } finally {
      setLoadingZoomMeetings(false)
    }
  }

  function handleZoomMeetingSelect(meetingId: string) {
    const selectedMeeting = zoomMeetings.find(m => m.id === meetingId)
    if (selectedMeeting) {
      // Parse start_time from Zoom (format: "2024-01-15T14:30:00Z" or similar)
      let eventDate = null
      let eventTime = ''
      let eventDatetime = null
      
      if (selectedMeeting.start_time) {
        try {
          const startDate = new Date(selectedMeeting.start_time)
          if (!isNaN(startDate.getTime())) {
            // Extract date in YYYY-MM-DD format
            const year = startDate.getFullYear()
            const month = String(startDate.getMonth() + 1).padStart(2, '0')
            const day = String(startDate.getDate()).padStart(2, '0')
            eventDate = `${year}-${month}-${day}`
            
            // Extract time in HH:MM format (24-hour)
            const hours = String(startDate.getHours()).padStart(2, '0')
            const minutes = String(startDate.getMinutes()).padStart(2, '0')
            eventTime = `${hours}:${minutes}`
            
            // Create Date object for DatePicker
            eventDatetime = new Date(startDate)
          }
        } catch (e) {
          console.error('Error parsing meeting start_time:', e)
        }
      }
      
      setFormData({
        ...formData,
        title: selectedMeeting.topic || formData.title || '',
        zoom_meeting_id: selectedMeeting.id,
        zoom_meeting_password: selectedMeeting.password || '',
        event_date: eventDate || formData.event_date,
        event_time: eventTime || formData.event_time,
        event_datetime: eventDatetime || formData.event_datetime,
      })
    }
  }

  async function checkAuthorization() {
    try {
      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        setIsAuthorized(false)
        return
      }

      // Get user profile with role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
          *,
          roles:role_id (
            id,
            name,
            display_name,
            description
          )
        `)
        .eq('user_id', session.user.id)
        .single()

      if (profileError || !profile) {
        setIsAuthorized(false)
        return
      }

      setCurrentUser(profile)

      // Check if user is admin
      const role = profile.roles || profile.role
      const roleName = typeof role === 'object' ? role?.name : role
      
      if (roleName === 'admin') {
        setIsAuthorized(true)
      } else {
        setIsAuthorized(false)
      }
    } catch (error) {
      console.error('Error checking authorization:', error)
      setIsAuthorized(false)
    }
  }

  async function loadData() {
    setLoading(true)
    try {
      if (activeTab === 'users') {
        const { data } = await getAllProfiles()
        // Data already includes roles from the query
        const usersData = Array.isArray(data) ? data : []
        setUsers(usersData)
        setCurrentUserCount(usersData.length)
        // Load available roles for dropdown
        const { data: rolesData } = await getAllRoles()
        setAvailableRoles(rolesData || [])
        // Load registration limit
        try {
          const limitResponse = await fetch('/api/admin/registration-limit', {
            credentials: 'include'
          })
          if (limitResponse.ok) {
            const limitData = await limitResponse.json()
            setRegistrationLimit(limitData.limit || 50)
            setCurrentUserCount(limitData.currentCount || usersData.length)
          }
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Error loading registration limit:', error)
          }
        }
      } else if (activeTab === 'posts') {
        const { data } = await getPosts()
        setPosts(data || [])
      } else if (activeTab === 'roles') {
        const { data, error } = await getAllRoles()
        if (!error) setRoles(Array.isArray(data) ? data : [])
      } else if (activeTab === 'recordings') {
        const { data, error } = await getAllRecordings()
        if (!error && data && Array.isArray(data)) setRecordings(data)
      } else if (activeTab === 'resources') {
        const { getResourcesWithDetails } = await import('@/lib/queries/resources')
        const { data, error } = await getResourcesWithDetails()
        if (!error) setResources(data || [])
      } else if (activeTab === 'blog') {
        const { getAllBlogPosts } = await import('@/lib/queries/blog')
        const { data, error } = await getAllBlogPosts({})
        if (!error) setBlogPosts(data || [])
      } else if (activeTab === 'subscriptions') {
        // Load subscriptions with user and role data
        const response = await fetch('/api/admin/subscriptions')
        if (response.ok) {
          const { data } = await response.json()
          setSubscriptions(data || [])
        }
        // Also load users and roles for the form
        const { data: usersData } = await getAllProfiles()
        setUsers(Array.isArray(usersData) ? usersData : [])
        const { data: rolesData } = await getAllRoles()
        setRoles(Array.isArray(rolesData) ? rolesData : [])
      } else if (activeTab === 'payments') {
        // Load payments with subscription and user data
        const response = await fetch('/api/admin/payments')
        if (response.ok) {
          const { data } = await response.json()
          setPayments(data || [])
        }
        // Also load subscriptions and users for the form
        const subscriptionsResponse = await fetch('/api/admin/subscriptions')
        if (subscriptionsResponse.ok) {
          const { data: subscriptionsData } = await subscriptionsResponse.json()
          setSubscriptions(subscriptionsData || [])
        }
        const { data: usersData } = await getAllProfiles()
        setUsers(Array.isArray(usersData) ? usersData : [])
        const { data: rolesData } = await getAllRoles()
        setAvailableRoles(rolesData || [])
      } else if (activeTab === 'courses') {
        const { data, error } = await getAllCourses(undefined, true) // Include drafts for admin panel
        if (!error) setCourses(data || [])
      } else if (activeTab === 'badges') {
        const { getAllBadges } = await import('@/lib/queries/badges')
        const { data, error } = await getAllBadges()
        if (!error) setBadges(data || [])
      } else if (activeTab === 'news') {
        const { getAllNews } = await import('@/lib/queries/news')
        const { data, error } = await getAllNews()
        if (!error) {
          // Handle both array and object response
          const newsData = Array.isArray(data) ? data : ((data as any)?.data || [])
          setNews(newsData)
        }
      } else if (activeTab === 'reports') {
        const { getAllReportsForAdmin } = await import('@/lib/queries/reports')
        const { data, error } = await getAllReportsForAdmin()
        if (!error) setReports(Array.isArray(data) ? data : [])
      } else if (activeTab === 'events') {
        const { data, error } = await getAllEvents()
        if (!error && data && Array.isArray(data)) {
          setEvents(data)
        } else {
          if (process.env.NODE_ENV === 'development') {
          console.error('Error loading events:', error)
          }
        }
        // Load Zoom meetings when events tab is active
        loadZoomMeetings()
        // Load recordings when events tab is active
        const { data: recordingsData, error: recordingsError } = await getAllRecordings()
        if (!recordingsError && recordingsData && Array.isArray(recordingsData)) {
          setRecordings(recordingsData)
        }
      } else if (activeTab === 'projects') {
        const { data: projectsData, error: projectsError } = await getAllProjects()
        if (!projectsError && projectsData && Array.isArray(projectsData)) {
          setProjects(projectsData)
          // Load offers for all projects
          const offersMap: Record<string, ProjectOffer[]> = {}
          for (const project of projectsData) {
            const { data: offers } = await getProjectOffers(project.id)
            if (offers) {
              offersMap[project.id] = offers
            }
          }
          setProjectOffers(offersMap)
        }
      } else if (activeTab === 'tags') {
        const { data: tagsData, error: tagsError } = await getAllTags(true) // Include unapproved
        if (!tagsError && tagsData && Array.isArray(tagsData)) {
          setTags(tagsData)
        }
        const { data: unapprovedData, error: unapprovedError } = await getUnapprovedTags()
        if (!unapprovedError && unapprovedData && Array.isArray(unapprovedData)) {
          setUnapprovedTags(unapprovedData)
        }
      }
      
      // Always load approved tags for tag selector (needed for recordings, resources, projects, etc.)
      const { data: approvedTagsData, error: approvedTagsError } = await getAllTags(false) // Only approved
      if (!approvedTagsError && approvedTagsData && Array.isArray(approvedTagsData)) {
        setApprovedTags(approvedTagsData)
        // Also set tags if not already set (for recordings, resources, etc.)
        if (activeTab !== 'tags') {
          setTags(approvedTagsData)
        }
      }
      
      // Load feedbacks
      if (activeTab === 'feedbacks') {
        const response = await fetch('/api/admin/feedbacks', {
          credentials: 'include'
        })
        if (response.ok) {
          const result = await response.json()
          setFeedbacks(result.data || [])
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          if (process.env.NODE_ENV === 'development') {
            console.error('Failed to load feedbacks:', response.status, errorData)
          }
          setFeedbacks([])
        }
      }
      
      // Load forums
      if (activeTab === 'forums') {
        try {
          const response = await fetch('/api/admin/forums', {
            credentials: 'include'
          })
          if (response.ok) {
            const result = await response.json()
            if (process.env.NODE_ENV === 'development') {
              console.log('Forums loaded successfully:', result.data?.length || 0, 'forums')
            }
            setForums(result.data || [])
          } else {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
            console.error('Failed to load forums:', response.status, errorData)
            setForums([])
          }
        } catch (error) {
          console.error('Exception loading forums:', error)
          setForums([])
        }
      } else if (activeTab === 'recordings') {
        const { data: recordingsData, error: recordingsError } = await getAllRecordings()
        if (!recordingsError && recordingsData && Array.isArray(recordingsData)) {
          setRecordings(recordingsData)
          // Load tags for all recordings
          if (recordingsData.length > 0) {
            const { getTagsByContent } = await import('@/lib/queries/tags')
            const tagsPromises = recordingsData.map(async (recording: any) => {
              const { data: tagsData } = await getTagsByContent('recording', recording.id)
              const tags = (Array.isArray(tagsData) ? tagsData.map((t: any) => t.tag).filter(Boolean) : []) || []
              return { recordingId: recording.id, tags }
            })
            const tagsResults = await Promise.all(tagsPromises)
            const tagsMap: Record<string, Tag[]> = {}
            tagsResults.forEach(({ recordingId, tags }) => {
              tagsMap[recordingId] = tags
            })
            setRecordingTagsMap(tagsMap)
          }
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadUserEnrollments(userId: string) {
    setLoadingEnrollments(true)
    try {
      if (!userId) {
        console.error('No userId provided')
        setUserEnrollments([])
        return
      }
      
      const response = await fetch(`/api/admin/users/${userId}/courses`, {
        credentials: 'include'
      })
      
      if (response.ok) {
        const result = await response.json()
        setUserEnrollments(result.data || [])
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to load enrollments:', response.status, errorData)
        }
        setUserEnrollments([])
      }
    } catch (error) {
      console.error('Error loading enrollments:', error)
      setUserEnrollments([])
    } finally {
      setLoadingEnrollments(false)
    }
  }

  async function handleAssignCourse(userId: string, courseId: string) {
    try {
      const response = await fetch(`/api/admin/users/${userId}/courses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ courseId })
      })
      
      if (response.ok) {
        const { data } = await response.json()
        // Reload enrollments
        await loadUserEnrollments(userId)
        // Reload courses list to update counts if needed
        if (activeTab === 'courses') {
          const { data: coursesData, error } = await getAllCourses(undefined, true) // Include drafts for admin panel
          if (!error) setCourses(coursesData || [])
        }
        return { success: true, data }
      } else {
        const { error } = await response.json()
        return { success: false, error: error || 'Failed to assign course' }
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Error assigning course' }
    }
  }

  async function handleRemoveCourse(userId: string, courseId: string) {
    try {
      const response = await fetch(`/api/admin/users/${userId}/courses?courseId=${courseId}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      
      if (response.ok) {
        // Reload enrollments
        await loadUserEnrollments(userId)
        return { success: true }
      } else {
        const { error } = await response.json()
        return { success: false, error: error || 'Failed to remove course' }
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Error removing course' }
    }
  }

  async function openCourseAssignmentModal(userId: string) {
    setSelectedUserForCourses(userId)
    // Load courses if not already loaded
    if (courses.length === 0) {
      const { data, error } = await getAllCourses(undefined, true) // Include drafts for admin panel
      if (!error) setCourses(data || [])
    }
    loadUserEnrollments(userId)
  }

  function closeCourseAssignmentModal() {
    setSelectedUserForCourses(null)
    setUserEnrollments([])
  }

  async function handleCreate() {
    try {
      if (activeTab === 'users') {
        // Create user logic here
        alert('יצירת משתמש - צריך להוסיף לוגיקה')
      } else if (activeTab === 'posts') {
        // Validate required fields
        if (!formData.user_id) {
          alert('אנא בחר משתמש');
          return;
        }
        
        if (!formData.content || formData.content.trim() === '') {
          alert('אנא הזן תוכן לפוסט');
          return;
        }

        // Get user_id - formData.user_id should already be the correct user_id from the select
        // But we'll verify it exists in the users array
        const selectedUser = users.find((u: any) => 
          (u.user_id === formData.user_id) || (u.id === formData.user_id)
        );
        
        const userIdToUse = selectedUser?.user_id || formData.user_id;

        const { data, error } = await createPost({
          user_id: userIdToUse,
          content: formData.content.trim(),
          image_url: formData.image_url || undefined
        })
        
        if (error) {
          if (process.env.NODE_ENV === 'development') {
          console.error('Error creating post:', error);
          }
          alert(`שגיאה ביצירת הפוסט: ${error.message || JSON.stringify(error)}`);
          return;
        }
        
        if (!error) {
          await loadData()
          setEditing(null)
          setFormData({})
        }
      } else if (activeTab === 'recordings') {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin/page.tsx:1203',message:'handleCreate recordings entry',data:{selectedTagIds:formData.selectedTagIds?.length||0,tagsCount:tags.length,approvedTagsCount:approvedTags.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        // Don't use category anymore - we use tags only
        const { data, error } = await createRecording({
          title: formData.title || '',
          description: formData.description || '',
          video_url: formData.video_url || '',
          thumbnail_url: formData.thumbnail_url || undefined,
          category: undefined, // Remove category - use tags only
          duration: formData.duration,
          views: formData.views || 0,
          // is_new will be set automatically based on creation date
          qa_section: formData.qa_section || [],
          key_points: formData.key_points || [],
          created_at: formData.created_at || undefined
        })
        if (!error && data) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin/page.tsx:1225',message:'before assignTagsToContent',data:{recordingId:data.id,selectedTagIds:formData.selectedTagIds?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
          // #endregion
          // Assign tags if provided
          if (formData.selectedTagIds && formData.selectedTagIds.length > 0) {
            try {
              const { assignTagsToContent } = await import('@/lib/queries/tags')
              await assignTagsToContent('recording', data.id, formData.selectedTagIds)
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin/page.tsx:1230',message:'assignTagsToContent success',data:{recordingId:data.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
              // #endregion
            } catch (tagError: any) {
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin/page.tsx:1232',message:'assignTagsToContent error',data:{errorMessage:tagError?.message,errorStack:tagError?.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
              // #endregion
              console.warn('Error assigning tags:', tagError)
            }
          }
          await loadData()
          setEditing(null)
          setFormData({})
        }
      } else if (activeTab === 'resources') {
        const { createResource } = await import('@/lib/queries/resources')
        const { assignTagsToContent } = await import('@/lib/queries/tags')
        const { data, error } = await createResource({
          title: formData.title || '',
          description: formData.description || '',
          file_url: formData.file_url || formData.external_url || '',
          file_name: formData.file_name || formData.title || '',
          file_size: formData.file_size || 0,
          file_type: formData.file_type || '',
          category: formData.category || '',
          type: formData.type || 'document',
          thumbnail_url: formData.thumbnail_url || '',
          external_url: formData.external_url || '',
          is_premium: formData.is_premium !== false
        })
        if (!error && data) {
          // Assign tags if provided
          if (formData.selectedTagIds && formData.selectedTagIds.length > 0) {
            try {
              await assignTagsToContent('resource', data.id, formData.selectedTagIds)
            } catch (tagError) {
              console.warn('Error assigning tags:', tagError)
            }
          }
          await loadData()
          setEditing(null)
          setFormData({})
        }
      } else if (activeTab === 'subscriptions') {
        if (!formData.user_id || !formData.role_id) {
          alert('אנא מלא את כל השדות הנדרשים')
          return
        }

        // Set default dates if not provided
        const startDate = formData.start_date || (() => {
          const now = new Date();
          return now.toISOString();
        })();
        
        const endDate = formData.end_date || (() => {
          const date = new Date(startDate);
          date.setMonth(date.getMonth() + 1);
          return date.toISOString();
        })();

        const response = await fetch('/api/admin/subscriptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: formData.user_id,
            role_id: formData.role_id,
            status: formData.status || 'active',
            start_date: startDate,
            end_date: endDate,
            auto_renew: true // Always true - automatic renewal via payments
          })
        })

        if (!response.ok) {
          const error = await response.json()
          alert(`שגיאה ביצירת המנוי: ${error.error || 'שגיאה לא ידועה'}`)
          return
        }

        await loadData()
        setEditing(null)
        setFormData({})
        alert('המנוי נוצר בהצלחה!')
      } else if (activeTab === 'payments') {
        if (!formData.subscription_id) {
          alert('אנא בחר מנוי')
          return
        }

        // Get user_id from subscription
        const selectedSubscription = subscriptions.find(s => s.id === formData.subscription_id);
        if (!selectedSubscription || !selectedSubscription.user_id) {
          alert('שגיאה: לא נמצא משתמש למנוי שנבחר')
          return
        }

        // Allow amount to be 0 for free month - check if amount is provided (even if 0)
        if (formData.amount === undefined || formData.amount === null || formData.amount === '') {
          alert('אנא הזן סכום (0 לחודש חינם)')
          return
        }
        
        const amount = parseFloat(formData.amount.toString());
        if (isNaN(amount)) {
          alert('אנא הזן סכום תקין')
          return
        }

        // Convert payment_date from datetime-local format to ISO string if provided
        let paymentDate = null;
        if (formData.payment_date) {
          // If it's already in datetime-local format (YYYY-MM-DDTHH:mm), convert to ISO
          if (formData.payment_date.includes('T') && !formData.payment_date.includes('Z')) {
            const date = new Date(formData.payment_date);
            paymentDate = date.toISOString();
          } else {
            paymentDate = formData.payment_date;
          }
        } else {
          // If no payment_date provided, use current date/time
          paymentDate = new Date().toISOString();
        }

        const response = await fetch('/api/admin/payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription_id: formData.subscription_id,
            user_id: selectedSubscription.user_id,
            amount: amount,
            currency: formData.currency || 'ILS',
            status: formData.status || 'pending',
            payment_method: formData.payment_method || null,
            payment_date: paymentDate,
            invoice_url: formData.invoice_url || null,
            invoice_number: formData.invoice_number || null,
            transaction_id: formData.transaction_id || null
          })
        })

        if (!response.ok) {
          const error = await response.json()
          alert(`שגיאה ביצירת התשלום: ${error.error || 'שגיאה לא ידועה'}`)
          return
        }

        await loadData()
        setEditing(null)
        setFormData({})
        alert('התשלום נוצר בהצלחה!')
      } else if (activeTab === 'blog') {
        // Validate required fields
        if (!formData.title || formData.title.trim() === '') {
          alert('אנא הזן כותרת לפוסט')
          return
        }

        if (!formData.content || formData.content.trim() === '') {
          alert('אנא הזן תוכן לפוסט')
          return
        }

        // Use current user as author, fallback to first user if currentUser not available
        const authorId = currentUser?.user_id || currentUser?.id || users[0]?.user_id || users[0]?.id
        if (!authorId) {
          alert('שגיאה: לא נמצא משתמש מחובר. אנא התחבר מחדש.')
          return
        }

        // Import functions
        const { createBlogPost, generateSlug } = await import('@/lib/queries/blog')
        
        // Generate slug from title if slug is empty
        let slug = formData.slug || ''
        if (!slug || slug.trim() === '') {
          slug = generateSlug(formData.title)
        }

        const { data, error } = await createBlogPost({
          title: formData.title.trim(),
          slug: slug,
          excerpt: formData.excerpt?.trim() || '',
          content: formData.content.trim(),
          featured_image_url: formData.featured_image_url?.trim() || '',
          category: 'general', // Default category
          author_id: authorId,
          is_featured: false, // Always false for simplicity
          is_published: formData.is_published !== false, // Default to true if not explicitly set
          read_time_minutes: formData.read_time_minutes || 5
        })
        
        if (!error && data) {
          // Assign tags if selected
          if (formData.selectedTagIds && formData.selectedTagIds.length > 0) {
            const { assignTagsToContent } = await import('@/lib/queries/tags')
            await assignTagsToContent('blog_post', data.id, formData.selectedTagIds)
          }
          
          await loadData()
          setEditing(null)
          setFormData({})
          alert(`הפוסט "${formData.title || 'חדש'}" נוצר בהצלחה! ${formData.is_published !== false ? 'הפוסט פורסם ויופיע בבלוג.' : 'שים לב: הפוסט לא פורסם ולכן לא יופיע בבלוג עד שתסמן את התיבה "פורסם".'}`)
        } else {
          // Enhanced error display
          const errorMessage = error?.message || 'שגיאה לא ידועה'
          const errorCode = error?.code ? ` (קוד: ${error.code})` : ''
          
          if (process.env.NODE_ENV === 'development') {
          console.error('Error creating blog post:', {
            message: error?.message,
            code: error?.code,
            details: (error as any)?.details,
              hint: (error as any)?.hint
          })
          }
          
          alert(`שגיאה ביצירת הפוסט: ${errorMessage}${errorCode}`)
        }
      } else if (activeTab === 'badges') {
        const { createBadge } = await import('@/lib/queries/badges')
        const { data, error } = await createBadge({
          name: formData.name || '',
          icon: formData.icon || '⭐',
          icon_color: formData.icon_color || '#FFD700',
          points_threshold: parseInt(formData.points_threshold) || 0,
          description: formData.description || '',
          display_order: parseInt(formData.display_order) || 0,
          is_active: formData.is_active !== false
        })
        if (!error && data) {
          await loadData()
          setEditing(null)
          setFormData({})
          alert('התג נוצר בהצלחה!')
        } else {
          console.error('Error creating badge:', error)
          alert(`שגיאה ביצירת התג: ${error?.message || 'שגיאה לא ידועה'}`)
        }
      } else if (activeTab === 'reports') {
        // Validate required fields
        if (!formData.title || formData.title.trim() === '') {
          alert('אנא הזן כותרת לדיווח')
          return
        }

        if (!formData.content || formData.content.trim() === '') {
          alert('אנא הזן תוכן לדיווח')
          return
        }

        // Use current user as author
        const authorId = currentUser?.user_id || currentUser?.id || users[0]?.user_id || users[0]?.id
        if (!authorId) {
          alert('שגיאה: לא נמצא משתמש מחובר. אנא התחבר מחדש.')
          return
        }

        const requestBody = {
          title: formData.title.trim(),
          content: formData.content.trim(),
          user_id: authorId,
          is_published: formData.is_published !== false,
          created_at: formData.created_at || undefined
        }
        

        const response = await fetch('/api/reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        })


        const result = await response.json()
        

        if (response.ok && result.data) {

          await loadData()
          setEditing(null)
          setFormData({})
          alert(`הדיווח "${formData.title || 'חדש'}" נוצר בהצלחה!`)
        } else {

          console.error('Error creating report:', result.error)
          alert(`שגיאה ביצירת הדיווח: ${result.error || 'שגיאה לא ידועה'}`)
        }
      } else if (activeTab === 'courses') {
        if (!formData.title || !formData.description) {
          alert('אנא מלא שם ותיאור הקורס')
          return
        }

        // Calculate total lessons count from sections
        const totalLessons = courseSections.reduce((sum, section) => sum + section.lessons.length, 0)
        
        const courseData = {
          title: (formData.title || '').trim(),
          description: (formData.description || '').trim(),
          thumbnail_url: formData.thumbnail_url || undefined,
          category: 'כללי', // Default category
          difficulty: 'מתחילים' as 'מתחילים' | 'בינוני' | 'מתקדמים', // Default difficulty (required by DB)
          duration_hours: 1, // Default duration
          lessons_count: totalLessons || 0,
          is_recommended: false,
          is_new: false,
          price: formData.price && formData.price > 0 ? parseFloat(formData.price) : undefined,
          is_premium_only: formData.is_premium_only || false,
          is_free: formData.is_free !== false && (!formData.price || formData.price === 0) && !formData.is_free_for_premium,
          is_free_for_premium: formData.is_free_for_premium || false,
          is_sequential: formData.is_sequential || false,
          payment_url: formData.payment_url || undefined,
          status: formData.status || 'published'
        }

        const { data, error } = await createCourse(courseData)
        
        if (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Error creating course:', error)
          }
          
          // Try to extract error message
          let errorMessage = 'שגיאה לא ידועה ביצירת הקורס'
          if ((error as any)?.message) {
            errorMessage = (error as any).message
          } else if ((error as any)?.code) {
            errorMessage = `שגיאה ${(error as any).code}`
          } else if (typeof error === 'string') {
            errorMessage = error
          } else {
            try {
              errorMessage = JSON.stringify(error)
            } catch (e) {
              errorMessage = 'שגיאה לא ידועה - בדוק את הקונסול'
            }
          }
          
          console.error('Final error message:', errorMessage)
          console.error('=== END ERROR ===')
          alert(`שגיאה ביצירת הקורס: ${errorMessage}`)
          return
        }
        
        if (!error && data) {
          // Save sections and lessons
          try {
            const { createLesson, createCourseSection } = await import('@/lib/queries/courses')
            let lessonOrder = 1
            let lessonsCreated = 0
            let lessonsFailed = 0
            const sectionMap = new Map<string, string>() // Map from section id to database section id
            
            console.log('Creating lessons for course:', data.id)
            console.log('Course sections:', courseSections)
            
            // First, create all sections
            for (let i = 0; i < courseSections.length; i++) {
              const section = courseSections[i]
              if (section.title.trim()) {
                try {
                  const { data: createdSection, error: sectionError } = await createCourseSection({
                    course_id: data.id,
                    title: section.title,
                    section_order: i + 1
                  })
                  
                  if (sectionError) {
                    console.error('Error creating section:', sectionError)
                  } else if (createdSection) {
                    sectionMap.set(section.id, createdSection.id)
                    console.log('Section created successfully:', createdSection.id)
                  }
                } catch (sectionErr) {
                  console.error('Exception creating section:', sectionErr)
                }
              }
            }
            
            // Then, create lessons and link them to sections
            for (const section of courseSections) {
              const sectionDbId = sectionMap.get(section.id)
              
              for (const lesson of section.lessons) {
                if (lesson.title.trim()) {
                  try {
                    const lessonData: any = {
                      course_id: data.id,
                      title: lesson.title,
                      description: lesson.description || undefined,
                      video_url: lesson.video_url || undefined,
                      duration_minutes: lesson.duration_minutes || undefined,
                      lesson_order: lessonOrder++,
                      is_preview: false,
                      qa_section: lesson.qa_section || [],
                      key_points: lesson.key_points || []
                    }
                    
                    // Link lesson to section if section was created
                    if (sectionDbId) {
                      lessonData.section_id = sectionDbId
                    }
                    
                    console.log('Creating lesson:', lessonData)
                    const { data: createdLesson, error: lessonError } = await createLesson(lessonData)
                    
                    if (lessonError) {
                      console.error('Error creating lesson:', lessonError)
                      lessonsFailed++
                    } else {
                      console.log('Lesson created successfully:', createdLesson?.id)
                      lessonsCreated++
                    }
                  } catch (lessonErr) {
                    console.error('Exception creating lesson:', lessonErr)
                    lessonsFailed++
                  }
                }
              }
            }
            
            console.log(`Lessons creation summary: ${lessonsCreated} created, ${lessonsFailed} failed`)
            
            if (lessonsFailed > 0) {
              alert(`הקורס נוצר בהצלחה, אבל ${lessonsFailed} שיעורים נכשלו ביצירה. בדוק את הקונסול לפרטים.`)
            }
            
            // Assign tags if selected
            if (formData.selectedTagIds && formData.selectedTagIds.length > 0) {
              const { assignTagsToContent } = await import('@/lib/queries/tags')
              await assignTagsToContent('course', data.id, formData.selectedTagIds)
            }
            
            await loadData()
            setEditing(null)
            setFormData({})
            setCourseSections([])
            alert('הקורס נוצר בהצלחה!')
          } catch (lessonsErr) {
            console.error('Error saving lessons:', lessonsErr)
            alert(`הקורס נוצר, אבל הייתה שגיאה בשמירת השיעורים: ${lessonsErr instanceof Error ? lessonsErr.message : 'שגיאה לא ידועה'}`)
            await loadData()
            setEditing(null)
            setFormData({})
            setCourseSections([])
          }
        } else {
          console.error('Error creating course:', error)
          alert(`שגיאה ביצירת הקורס: ${(error as any)?.message || 'שגיאה לא ידועה'}`)
        }
      } else if (activeTab === 'events') {
        if (!formData.title || !formData.event_date || !formData.event_time) {
          alert('אנא מלא כותרת, תאריך ושעה')
          return
        }

        // Convert date to YYYY-MM-DD format using local timezone (not UTC)
        const eventDate = (() => {
          if (!formData.event_date) return '';
          if ((formData.event_date as any) instanceof Date) {
            const dateObj = formData.event_date as Date;
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          }
          return formData.event_date as string;
        })()

        const eventData = {
          title: formData.title || '',
          description: formData.description || undefined,
          event_date: eventDate,
          event_time: formData.event_time || '',
          event_type: formData.event_type || 'live',
          location: formData.location || undefined,
          instructor_name: formData.instructor_name || undefined,
          instructor_title: formData.instructor_title || undefined,
          instructor_avatar_url: formData.instructor_avatar_url || undefined,
          learning_points: Array.isArray(formData.learning_points) ? formData.learning_points : [],
          about_text: formData.about_text || undefined,
          is_recurring: formData.is_recurring || false,
          recurring_pattern: formData.recurring_pattern || undefined,
          zoom_meeting_id: formData.zoom_meeting_id || undefined,
          zoom_meeting_password: formData.zoom_meeting_password || undefined,
          recording_id: formData.recording_id || undefined,
          status: formData.status || 'upcoming'
        }

        const { data, error } = await createEvent(eventData)
        
        if (error) {
          console.error('Error creating event:', error)
          alert(`שגיאה ביצירת האירוע: ${(error as any)?.message || 'שגיאה לא ידועה'}`)
        } else {
          await loadData()
          setEditing(null)
          setFormData({})
          alert('האירוע נוצר בהצלחה!')
        }
      } else if (activeTab === 'projects') {
        if (!formData.title || !formData.description) {
          alert('אנא מלא כותרת ותיאור')
          return
        }

        // Parse technologies from comma-separated string to array
        let technologies: string[] = []
        if (formData.technologies && typeof formData.technologies === 'string') {
          technologies = formData.technologies
            .split(',')
            .map((t: string) => t.trim())
            .filter((t: string) => t.length > 0)
        } else if (Array.isArray(formData.technologies)) {
          technologies = formData.technologies
        }

        const projectData = {
          user_id: formData.user_id || '',
          title: formData.title || '',
          description: formData.description || '',
          status: formData.status || 'open',
          budget_min: formData.budget_min ? parseFloat(formData.budget_min) : undefined,
          budget_max: formData.budget_max ? parseFloat(formData.budget_max) : undefined,
          budget_currency: formData.budget_currency || 'ILS',
          technologies: technologies.length > 0 ? technologies : undefined,
          offers_count: 0,
          views: 0
        }

        const { data, error } = await createProject(projectData)
        
        if (error) {
          console.error('Error creating project:', error)
          alert(`שגיאה ביצירת הפרויקט: ${(error as any)?.message || 'שגיאה לא ידועה'}`)
        } else {
          // Assign tags if selected
          if (formData.selectedTagIds && formData.selectedTagIds.length > 0 && data?.id) {
            const { assignTagsToContent } = await import('@/lib/queries/tags')
            await assignTagsToContent('project', data.id, formData.selectedTagIds)
          }
          
          await loadData()
          setEditing(null)
          setFormData({})
          alert('הפרויקט נוצר בהצלחה!')
        }
      } else if (activeTab === 'tags') {
        if (!formData.name || formData.name.trim() === '') {
          alert('אנא הזן שם תגית')
          return
        }

        const tagData = {
          name: formData.name.trim(),
          slug: formData.slug?.trim() || undefined,
          description: formData.description?.trim() || undefined,
          color: formData.color?.trim() || undefined,
          icon: formData.icon?.trim() || undefined,
          is_approved: formData.is_approved !== false
        }

        const { data, error } = await createTag(tagData)
        if (error) {
          console.error('Error creating tag:', error)
          alert(`שגיאה ביצירת התגית: ${error?.message || 'שגיאה לא ידועה'}`)
        } else {
          await loadData()
          setEditing(null)
          setFormData({})
          alert('התגית נוצרה בהצלחה!')
        }
      } else if (activeTab === 'forums') {
        if (!formData.name || formData.name.trim() === '') {
          alert('אנא הזן שם פורום (name)')
          return
        }
        if (!formData.display_name || formData.display_name.trim() === '') {
          alert('אנא הזן שם תצוגה (display_name)')
          return
        }

        const response = await fetch('/api/admin/forums', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: formData.name.trim(),
            display_name: formData.display_name.trim(),
            description: formData.description?.trim() || undefined,
            header_color: formData.header_color?.trim() || 'bg-blue-900',
            logo_text: formData.logo_text?.trim() || undefined
          })
        })

        const result = await response.json()
        if (!response.ok || result.error) {
          alert(`שגיאה ביצירת הפורום: ${result.error || 'שגיאה לא ידועה'}`)
          return
        }

        await loadData()
        setEditing(null)
        setFormData({})
        alert('הפורום נוצר בהצלחה!')
      }
    } catch (error) {
      console.error('Error creating:', error)
    }
  }

  async function handleUpdate(id: string) {
    try {
      if (activeTab === 'users') {
        // Prepare update data - only include fields that should be updated
        const updateData: any = {
          display_name: formData.display_name,
          nickname: formData.nickname,
          email: formData.email,
          experience_level: formData.experience_level,
          avatar_url: formData.avatar_url,
          updated_at: new Date().toISOString()
        }
        
        // Always include role_id if it's provided (even if empty string, we might want to clear it)
        console.log('formData.role_id:', formData.role_id, 'type:', typeof formData.role_id);
        if (formData.role_id !== undefined && formData.role_id !== null && formData.role_id !== '') {
          // If it's a string, check if it's not empty
          if (typeof formData.role_id === 'string' && formData.role_id.trim() !== '') {
            updateData.role_id = formData.role_id.trim();
          } else if (typeof formData.role_id !== 'string') {
            // If it's not a string (e.g., already a UUID), use it directly
            updateData.role_id = formData.role_id;
          }
        } else if (formData.role_id === '') {
          // If explicitly set to empty string, set to null
          updateData.role_id = null;
        }
        
        console.log('Updating user with data:', updateData)
        console.log('User ID:', id)
        console.log('role_id in updateData:', updateData.role_id)
        
        // Use API route for admin operations to bypass RLS
        const response = await fetch('/api/admin/users', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: id,
            ...updateData
          })
        })
        
        const result = await response.json()
        
        if (!response.ok || result.error) {
          console.error('Error updating user:', result)
          console.error('Error details:', JSON.stringify(result, null, 2))
          alert(`שגיאה בעדכון המשתמש: ${result.error || result.message || 'שגיאה לא ידועה'}`)
        } else {
          console.log('User updated successfully:', result.data)
          console.log('Updated user role_id:', result.data?.role_id)
          console.log('Updated user role:', result.data?.roles)
          
          // Clear cache to force reload
          clearCache('profiles:all')
          await loadData()
          setEditing(null)
          setFormData({})
          alert('המשתמש עודכן בהצלחה!')
        }
      } else if (activeTab === 'recordings') {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin/page.tsx:1849',message:'handleUpdate recordings entry',data:{selectedTagIds:formData.selectedTagIds?.length||0,tagsCount:tags.length,approvedTagsCount:approvedTags.length,oldCategory:formData.category},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B,E'})}).catch(()=>{});
        // #endregion
        // Don't use category anymore - we use tags only
        const updateData: any = { ...formData };
        // Remove is_new from update - it's set automatically
        delete updateData.is_new;
        delete updateData.selectedTagIds; // Remove from update data - handled separately
        delete updateData.category; // Remove old category - we use tags only now
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin/page.tsx:1858',message:'updateData prepared',data:{hasCategory:!!updateData.category},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion

        const { error } = await updateRecording(id, updateData)
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin/page.tsx:1868',message:'updateRecording result',data:{hasError:!!error,errorMessage:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        if (!error) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin/page.tsx:1871',message:'before assignTagsToContent update',data:{recordingId:id,selectedTagIds:formData.selectedTagIds?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
          // #endregion
          // Update tags if provided
          if (formData.selectedTagIds !== undefined) {
            try {
              const { assignTagsToContent } = await import('@/lib/queries/tags')
              await assignTagsToContent('recording', id, formData.selectedTagIds || [])
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin/page.tsx:1877',message:'assignTagsToContent update success',data:{recordingId:id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
              // #endregion
            } catch (tagError: any) {
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin/page.tsx:1879',message:'assignTagsToContent update error',data:{errorMessage:tagError?.message,errorStack:tagError?.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
              // #endregion
              console.warn('Error assigning tags:', tagError)
            }
          }
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin/page.tsx:1884',message:'before loadData',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
          // #endregion
          await loadData()
          // Reload tags for this specific recording after update
          try {
            const { getTagsByContent } = await import('@/lib/queries/tags')
            const { data: tagsData } = await getTagsByContent('recording', id)
            const tags = (Array.isArray(tagsData) ? tagsData.map((t: any) => t.tag).filter(Boolean) : []) || []
            setRecordingTagsMap(prev => ({ ...prev, [id]: tags }))
          } catch (tagError) {
            console.warn('Error reloading tags after update:', tagError)
          }
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin/page.tsx:1886',message:'after loadData, before setEditing',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
          // #endregion
          setEditing(null)
          setFormData({})
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin/page.tsx:1889',message:'handleUpdate recordings complete',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
          // #endregion
        } else {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin/page.tsx:1892',message:'updateRecording error',data:{errorMessage:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
          // #endregion
        }
      } else if (activeTab === 'resources') {
        const { updateResource } = await import('@/lib/queries/resources')
        const { assignTagsToContent } = await import('@/lib/queries/tags')
        const { error } = await updateResource(id, {
          ...formData,
          file_url: formData.file_url || formData.external_url || '',
          external_url: formData.external_url || ''
        })
        if (!error) {
          // Update tags if provided
          if (formData.selectedTagIds !== undefined) {
            try {
              await assignTagsToContent('resource', id, formData.selectedTagIds || [])
            } catch (tagError) {
              console.warn('Error assigning tags:', tagError)
            }
          }
          await loadData()
          setEditing(null)
          setFormData({})
        }
      } else if (activeTab === 'blog') {
        const { updateBlogPost } = await import('@/lib/queries/blog')
        const { data, error } = await updateBlogPost(id, formData)
        if (!error && data) {
          // Update tags if selected
          if (formData.selectedTagIds !== undefined) {
            const { assignTagsToContent } = await import('@/lib/queries/tags')
            await assignTagsToContent('blog_post', id, formData.selectedTagIds || [])
          }
          
          await loadData()
          setEditing(null)
          setFormData({})
          alert('הפוסט עודכן בהצלחה!')
        } else {
          if (process.env.NODE_ENV === 'development') {
          console.error('Error updating blog post:', error)
          }
          alert(`שגיאה בעדכון הפוסט: ${error?.message || 'שגיאה לא ידועה'}`)
        }
      } else if (activeTab === 'badges') {
        const { updateBadge } = await import('@/lib/queries/badges')
        const { data, error } = await updateBadge(id, formData)
        if (!error && data) {
          await loadData()
          setEditing(null)
          setFormData({})
          alert('התג עודכן בהצלחה!')
        } else {
          console.error('Error updating badge:', error)
          alert(`שגיאה בעדכון התג: ${error?.message || 'שגיאה לא ידועה'}`)
        }
      } else if (activeTab === 'reports') {
        const { updateReport } = await import('@/lib/queries/reports')
        const { data, error } = await updateReport(id, {
          title: formData.title,
          content: formData.content,
          is_published: formData.is_published !== false
        })
        if (!error && data) {
          await loadData()
          setEditing(null)
          setFormData({})
          alert('הדיווח עודכן בהצלחה!')
        } else {
          console.error('Error updating report:', error)
          alert(`שגיאה בעדכון הדיווח: ${error?.message || 'שגיאה לא ידועה'}`)
        }
      } else if (activeTab === 'courses') {
        const { updateCourse, getCourseLessons, createLesson, deleteLesson } = await import('@/lib/queries/courses')
        
        // Calculate total lessons count from sections
        const totalLessons = courseSections.reduce((sum, section) => sum + section.lessons.length, 0)
        
        const { data, error } = await updateCourse(id, {
          title: formData.title || '',
          description: formData.description || '',
          thumbnail_url: formData.thumbnail_url || undefined,
          category: formData.category || 'כללי',
          difficulty: (formData.difficulty as 'מתחילים' | 'בינוני' | 'מתקדמים') || 'מתחילים',
          duration_hours: parseFloat(formData.duration_hours) || 0,
          lessons_count: totalLessons,
          is_recommended: formData.is_recommended || false,
          is_new: formData.is_new || false,
          instructor_name: formData.instructor_name || undefined,
          instructor_title: formData.instructor_title || undefined,
          instructor_avatar_url: formData.instructor_avatar_url || undefined,
          price: formData.price && formData.price > 0 ? parseFloat(formData.price) : undefined,
          is_premium_only: formData.is_premium_only || false,
          is_free: formData.is_free !== false && (!formData.price || formData.price === 0) && !formData.is_free_for_premium,
          is_free_for_premium: formData.is_free_for_premium || false,
          is_sequential: formData.is_sequential || false,
          payment_url: formData.payment_url || undefined,
          status: formData.status || 'published'
        })
        
        if (!error && data) {
          try {
            // Delete existing lessons
            console.log('Updating lessons for course:', id)
            const { data: existingLessons, error: loadError } = await getCourseLessons(id)
            
            if (loadError) {
              console.error('Error loading existing lessons:', loadError)
            } else {
              console.log(`Found ${existingLessons?.length || 0} existing lessons to delete`)
            }
            
            if (existingLessons && existingLessons.length > 0) {
              const { deleteLesson } = await import('@/lib/queries/courses')
              let deletedCount = 0
              let failedCount = 0
              
              for (const lesson of existingLessons) {
                try {
                  const { error: deleteError } = await deleteLesson(lesson.id)
                  if (deleteError) {
                    console.error('Error deleting lesson:', lesson.id, deleteError)
                    failedCount++
                  } else {
                    console.log('Deleted lesson:', lesson.id)
                    deletedCount++
                  }
                } catch (deleteErr) {
                  console.error('Exception deleting lesson:', deleteErr)
                  failedCount++
                }
              }
              
              console.log(`Deleted ${deletedCount} lessons, ${failedCount} failed`)
            }
            
            // Delete existing sections
            const { getCourseSections } = await import('@/lib/queries/courses')
            const { data: existingSections } = await getCourseSections(id)
            
            if (existingSections && existingSections.length > 0) {
              // Delete sections (lessons will be deleted via CASCADE or we delete them separately)
              for (const section of existingSections) {
                try {
                  const { error: deleteError } = await supabase
                    .from('course_sections')
                    .delete()
                    .eq('id', section.id)
                    
                  if (deleteError) {
                    console.error('Error deleting section:', section.id, deleteError)
                  } else {
                    console.log('Deleted section:', section.id)
                  }
                } catch (deleteErr) {
                  console.error('Exception deleting section:', deleteErr)
                }
              }
            }
            
            // Create new sections and lessons
            const { createLesson, createCourseSection } = await import('@/lib/queries/courses')
            let lessonOrder = 1
            let lessonsCreated = 0
            let lessonsFailed = 0
            const sectionMap = new Map<string, string>() // Map from section id to database section id
            
            console.log('Creating new lessons from sections:', courseSections)
            
            // First, create all sections
            for (let i = 0; i < courseSections.length; i++) {
              const section = courseSections[i]
              if (section.title.trim()) {
                try {
                  const { data: createdSection, error: sectionError } = await createCourseSection({
                    course_id: id,
                    title: section.title,
                    section_order: i + 1
                  })
                  
                  if (sectionError) {
                    console.error('Error creating section:', sectionError)
                    console.error('Section error details:', {
                      message: sectionError?.message || 'No message',
                      code: (sectionError as any)?.code || 'No code',
                      details: (sectionError as any)?.details || 'No details',
                      hint: (sectionError as any)?.hint || 'No hint',
                      fullError: JSON.stringify(sectionError, Object.getOwnPropertyNames(sectionError))
                    })
                  } else if (createdSection) {
                    sectionMap.set(section.id, createdSection.id)
                    console.log('Section created successfully:', createdSection.id)
                  }
                } catch (sectionErr) {
                  console.error('Exception creating section:', sectionErr)
                }
              }
            }
            
            // Then, create lessons and link them to sections
            for (const section of courseSections) {
              const sectionDbId = sectionMap.get(section.id)
              
              for (const lesson of section.lessons) {
                if (lesson.title.trim()) {
                  try {
                    const lessonData: any = {
                      course_id: id,
                      title: lesson.title,
                      description: lesson.description || undefined,
                      video_url: lesson.video_url || undefined,
                      duration_minutes: lesson.duration_minutes || undefined,
                      lesson_order: lessonOrder++,
                      is_preview: false,
                      qa_section: lesson.qa_section || [],
                      key_points: lesson.key_points || []
                    }
                    
                    // Link lesson to section if section was created
                    if (sectionDbId) {
                      lessonData.section_id = sectionDbId
                    }
                    
                    console.log('Creating lesson:', lessonData)
                    const { data: createdLesson, error: lessonError } = await createLesson(lessonData)
                    
                    if (lessonError) {
                      console.error('Error creating lesson:', lessonError)
                      console.error('Lesson error details:', {
                        message: lessonError?.message || 'No message',
                        code: (lessonError as any)?.code || 'No code',
                        details: (lessonError as any)?.details || 'No details',
                        hint: (lessonError as any)?.hint || 'No hint',
                        fullError: JSON.stringify(lessonError, Object.getOwnPropertyNames(lessonError))
                      })
                      lessonsFailed++
                    } else {
                      console.log('Lesson created successfully:', createdLesson?.id)
                      lessonsCreated++
                    }
                  } catch (lessonErr) {
                    console.error('Exception creating lesson:', lessonErr)
                    lessonsFailed++
                  }
                }
              }
            }
            
            console.log(`Lessons update summary: ${lessonsCreated} created, ${lessonsFailed} failed`)
            
            // Update tags if selected
            if (formData.selectedTagIds !== undefined) {
              const { assignTagsToContent } = await import('@/lib/queries/tags')
              await assignTagsToContent('course', id, formData.selectedTagIds || [])
            }
            
            if (lessonsFailed > 0) {
              alert(`הקורס עודכן בהצלחה, אבל ${lessonsFailed} שיעורים נכשלו ביצירה. בדוק את הקונסול לפרטים.`)
            }
            
            await loadData()
            setEditing(null)
            setFormData({})
            setCourseSections([])
            alert('הקורס עודכן בהצלחה!')
          } catch (lessonsErr) {
            console.error('Error updating lessons:', lessonsErr)
            alert(`הקורס עודכן, אבל הייתה שגיאה בעדכון השיעורים: ${lessonsErr instanceof Error ? lessonsErr.message : 'שגיאה לא ידועה'}`)
            await loadData()
            setEditing(null)
            setFormData({})
            setCourseSections([])
          }
        } else {
          console.error('Error updating course:', error)
          alert(`שגיאה בעדכון הקורס: ${error?.message || 'שגיאה לא ידועה'}`)
        }
      } else if (activeTab === 'events') {
        if (!formData.title || !formData.event_date || !formData.event_time) {
          alert('אנא מלא כותרת, תאריך ושעה')
          return
        }

        // Convert date to YYYY-MM-DD format using local timezone (not UTC)
        const eventDate = (() => {
          if (!formData.event_date) return '';
          if ((formData.event_date as any) instanceof Date) {
            const dateObj = formData.event_date as Date;
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          }
          return formData.event_date as string;
        })()

        const updateData: any = {
          title: formData.title || '',
          description: formData.description || undefined,
          event_date: eventDate,
          event_time: formData.event_time || '',
          event_type: formData.event_type || 'live',
          location: formData.location || undefined,
          instructor_name: formData.instructor_name || undefined,
          instructor_title: formData.instructor_title || undefined,
          instructor_avatar_url: formData.instructor_avatar_url || undefined,
          learning_points: Array.isArray(formData.learning_points) ? formData.learning_points : [],
          about_text: formData.about_text || undefined,
          is_recurring: formData.is_recurring || false,
          recurring_pattern: formData.recurring_pattern || undefined,
          zoom_meeting_id: formData.zoom_meeting_id || undefined,
          zoom_meeting_password: formData.zoom_meeting_password || undefined,
          recording_id: formData.recording_id || undefined,
          status: formData.status || 'upcoming'
        }

        const { data, error } = await updateEvent(id, updateData)
        
        if (error) {
          console.error('Error updating event:', error)
          alert(`שגיאה בעדכון האירוע: ${error?.message || 'שגיאה לא ידועה'}`)
        } else {
          await loadData()
          setEditing(null)
          setFormData({})
          alert('האירוע עודכן בהצלחה!')
        }
      } else if (activeTab === 'projects') {
        // Parse technologies from comma-separated string to array
        let technologies: string[] = []
        if (formData.technologies && typeof formData.technologies === 'string') {
          technologies = formData.technologies
            .split(',')
            .map((t: string) => t.trim())
            .filter((t: string) => t.length > 0)
        } else if (Array.isArray(formData.technologies)) {
          technologies = formData.technologies
        }

        const updateData: any = {
          title: formData.title || '',
          description: formData.description || '',
          status: formData.status || 'open',
          budget_min: formData.budget_min ? parseFloat(formData.budget_min) : undefined,
          budget_max: formData.budget_max ? parseFloat(formData.budget_max) : undefined,
          budget_currency: formData.budget_currency || 'ILS',
          technologies: technologies.length > 0 ? technologies : undefined
        }

        const { data, error } = await updateProject(id, updateData)
        
        if (error) {
          console.error('Error updating project:', error)
          alert(`שגיאה בעדכון הפרויקט: ${(error as any)?.message || 'שגיאה לא ידועה'}`)
        } else {
          // Update tags if selected
          if (formData.selectedTagIds !== undefined) {
            const { assignTagsToContent } = await import('@/lib/queries/tags')
            await assignTagsToContent('project', id, formData.selectedTagIds || [])
          }
          
          // Update state immediately for better UX
          if (data) {
            setProjects(prevProjects => 
              prevProjects.map(p => p.id === id ? { ...p, ...data } : p)
            )
          }
          await loadData()
          setEditing(null)
          setFormData({})
          alert('הפרויקט עודכן בהצלחה!')
        }
      } else if (activeTab === 'tags') {
        if (!formData.name || formData.name.trim() === '') {
          alert('אנא הזן שם תגית')
          return
        }

        const updateData: any = {
          name: formData.name.trim(),
          slug: formData.slug?.trim() || undefined,
          description: formData.description?.trim() || undefined,
          color: formData.color?.trim() || undefined,
          icon: formData.icon?.trim() || undefined,
          is_approved: formData.is_approved !== false
        }

        const { data, error } = await updateTag(id, updateData)
        if (error) {
          console.error('Error updating tag:', error)
          alert(`שגיאה בעדכון התגית: ${error?.message || 'שגיאה לא ידועה'}`)
        } else {
          setTags(prevTags => prevTags.map(t => t.id === id ? { ...t, ...updateData } : t))
          setUnapprovedTags(prevTags => prevTags.map(t => t.id === id ? { ...t, ...updateData } : t))
          await loadData()
          setEditing(null)
          setFormData({})
          alert('התגית עודכנה בהצלחה!')
        }
      } else if (activeTab === 'forums') {
        if (!formData.display_name || formData.display_name.trim() === '') {
          alert('אנא הזן שם תצוגה (display_name)')
          return
        }

        const response = await fetch(`/api/admin/forums/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: formData.name?.trim() || undefined,
            display_name: formData.display_name.trim(),
            description: formData.description?.trim() || undefined,
            header_color: formData.header_color?.trim() || undefined,
            logo_text: formData.logo_text?.trim() || undefined,
            is_active: formData.is_active !== undefined ? formData.is_active : undefined
          })
        })

        const result = await response.json()
        if (!response.ok || result.error) {
          alert(`שגיאה בעדכון הפורום: ${result.error || 'שגיאה לא ידועה'}`)
          return
        }

        await loadData()
        setEditing(null)
        setFormData({})
        alert('הפורום עודכן בהצלחה!')
      } else if (activeTab === 'payments') {
        const response = await fetch('/api/admin/payments', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: id,
            subscription_id: formData.subscription_id,
            user_id: formData.user_id,
            amount: formData.amount,
            currency: formData.currency || 'ILS',
            status: formData.status,
            payment_method: formData.payment_method || null,
            payment_date: formData.payment_date || null,
            invoice_url: formData.invoice_url || null,
            invoice_number: formData.invoice_number || null,
            transaction_id: formData.transaction_id || null
          })
        })

        if (!response.ok) {
          const error = await response.json()
          alert(`שגיאה בעדכון התשלום: ${error.error || 'שגיאה לא ידועה'}`)
          return
        }

        await loadData()
        setEditing(null)
        setFormData({})
        alert('התשלום עודכן בהצלחה!')
      }
    } catch (error) {
      console.error('Error updating:', error)
    }
  }

  async function handleDeleteAllForumPosts() {
    if (!confirm('האם אתה בטוח שברצונך למחוק את כל הפוסטים בפורומים? פעולה זו לא ניתנת לביטול!')) return
    
    try {
      const response = await fetch('/api/admin/forums/delete-all-posts', {
        method: 'DELETE'
      })
      
      const result = await response.json()
      
      if (response.ok && result.success) {
        alert(`✅ כל הפוסטים בפורומים נמחקו בהצלחה!\nנשארו ${result.remainingPosts || 0} פוסטים.`)
      } else {
        alert(`❌ שגיאה במחיקת הפוסטים: ${result.error || 'שגיאה לא ידועה'}`)
      }
    } catch (error: any) {
      console.error('Error deleting all forum posts:', error)
      alert(`❌ שגיאה במחיקת הפוסטים: ${error.message || 'שגיאה לא ידועה'}`)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('האם אתה בטוח שברצונך למחוק?')) return
    
    try {
      if (activeTab === 'users') {
        // Use API endpoint to delete user (which deletes from both Auth and profiles)
        const response = await fetch(`/api/admin/users?id=${id}`, {
          method: 'DELETE',
          credentials: 'include'
        })
        const result = await response.json()
        if (response.ok && result.success) {
          await loadData()
          alert('המשתמש נמחק בהצלחה!')
        } else {
          alert(`שגיאה במחיקת המשתמש: ${result.error || 'שגיאה לא ידועה'}`)
        }
      } else if (activeTab === 'posts') {
        const { error } = await supabase
          .from('posts')
          .delete()
          .eq('id', id)
        if (!error) await loadData()
      } else if (activeTab === 'news') {
        const { deleteNews } = await import('@/lib/queries/news')
        const { success, error } = await deleteNews(id)
        if (success) await loadData()
      } else if (activeTab === 'recordings') {
        const { error } = await deleteRecording(id)
        if (!error) await loadData()
      } else if (activeTab === 'resources') {
        const { deleteResource } = await import('@/lib/queries/resources')
        const { error } = await deleteResource(id)
        if (!error) await loadData()
      } else if (activeTab === 'blog') {
        const { deleteBlogPost } = await import('@/lib/queries/blog')
        const { error } = await deleteBlogPost(id)
        if (!error) await loadData()
      } else if (activeTab === 'badges') {
        const { deleteBadge } = await import('@/lib/queries/badges')
        const { success, error } = await deleteBadge(id)
        if (success) await loadData()
      } else if (activeTab === 'courses') {
        try {
          const { deleteCourse } = await import('@/lib/queries/courses')
          console.log('Deleting course:', id)
          const { error } = await deleteCourse(id)
          
          if (error) {
            console.error('Error deleting course:', error)
            alert(`שגיאה במחיקת הקורס: ${error.message || 'שגיאה לא ידועה'}`)
          } else {
            console.log('Course deleted successfully:', id)
            await loadData()
            alert('הקורס נמחק בהצלחה!')
          }
        } catch (err) {
          console.error('Exception deleting course:', err)
          alert(`שגיאה במחיקת הקורס: ${err instanceof Error ? err.message : 'שגיאה לא ידועה'}`)
        }
      } else if (activeTab === 'events') {
        try {
          console.log('Deleting event:', id)
          const { error } = await deleteEvent(id)
          console.log('Delete result:', { error, hasError: !!error })
          
          if (error) {
            console.error('Error deleting event:', error)
            alert(`שגיאה במחיקת האירוע: ${error?.message || 'שגיאה לא ידועה'}`)
          } else {
            console.log('Event deleted successfully, updating state...')
            // Update state directly by filtering out the deleted event
            setEvents(prevEvents => {
              const updated = prevEvents.filter(e => e.id !== id)
              console.log('Events updated:', prevEvents.length, '->', updated.length)
              return updated
            })
            // Also reload data to ensure consistency
            await loadData()
            alert('האירוע נמחק בהצלחה!')
          }
        } catch (err) {
          console.error('Exception deleting event:', err)
          alert(`שגיאה במחיקת האירוע: ${err instanceof Error ? err.message : 'שגיאה לא ידועה'}`)
        }
      } else if (activeTab === 'reports') {
        const { deleteReport } = await import('@/lib/queries/reports')
        const { error } = await deleteReport(id)
        if (!error) {
          await loadData()
          alert('הדיווח נמחק בהצלחה!')
        } else {
          alert(`שגיאה במחיקת הדיווח: ${error.message || 'שגיאה לא ידועה'}`)
        }
      } else if (activeTab === 'payments') {
        const response = await fetch(`/api/admin/payments?id=${id}`, {
          method: 'DELETE'
        })
        if (response.ok) {
          await loadData()
          alert('התשלום נמחק בהצלחה!')
        } else {
          const error = await response.json()
          alert(`שגיאה במחיקת התשלום: ${error.error || 'שגיאה לא ידועה'}`)
        }
      } else if (activeTab === 'projects') {
        try {
          console.log('Deleting project:', id)
          const { error } = await deleteProject(id)
          
          if (error) {
            console.error('Error deleting project:', error)
            alert(`שגיאה במחיקת הפרויקט: ${error?.message || 'שגיאה לא ידועה'}`)
          } else {
            console.log('Project deleted successfully:', id)
            setProjects(prevProjects => prevProjects.filter(p => p.id !== id))
            await loadData()
            alert('הפרויקט נמחק בהצלחה!')
          }
        } catch (err) {
          console.error('Exception deleting project:', err)
          alert(`שגיאה במחיקת הפרויקט: ${err instanceof Error ? err.message : 'שגיאה לא ידועה'}`)
        }
      } else if (activeTab === 'forums') {
        const response = await fetch(`/api/admin/forums/${id}`, {
          method: 'DELETE',
          credentials: 'include'
        })
        const result = await response.json()
        if (response.ok && !result.error) {
          await loadData()
          alert('הפורום נמחק בהצלחה!')
        } else {
          alert(`שגיאה במחיקת הפורום: ${result.error || 'שגיאה לא ידועה'}`)
        }
      }
    } catch (error) {
      console.error('Error deleting:', error)
    }
  }

  async function handleBulkEditUsers() {
    if (selectedItems.size === 0 || activeTab !== 'users') return
    
    try {
      const idsToUpdate = Array.from(selectedItems)
      const updates: any = {}
      
      // Only include fields that were actually changed
      if (bulkEditData.role_id) {
        updates.role_id = bulkEditData.role_id
      }
      
      if (Object.keys(updates).length === 0) {
        alert('אנא בחר לפחות שדה אחד לעדכון')
        return
      }
      
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ids: idsToUpdate,
          ...updates
        })
      })
      
      const result = await response.json()
      
      if (response.ok && result.success) {
        alert(`עודכנו ${result.count || idsToUpdate.length} משתמשים בהצלחה!`)
        setSelectedItems(new Set())
        setShowBulkEditModal(false)
        setBulkEditData({})
        await loadData()
      } else {
        alert(`שגיאה בעדכון המשתמשים: ${result.error || 'שגיאה לא ידועה'}`)
      }
    } catch (error: any) {
      console.error('Error bulk editing users:', error)
      alert(`שגיאה בעדכון המשתמשים: ${error.message || 'שגיאה לא ידועה'}`)
    }
  }

  async function handleDeleteSelected() {
    if (selectedItems.size === 0) return
    
    try {
      const idsToDelete = Array.from(selectedItems)
      let successCount = 0
      let errorCount = 0
      
      for (const id of idsToDelete) {
        try {
          if (activeTab === 'users') {
            // Use API endpoint to delete user (which deletes from both Auth and profiles)
            const response = await fetch(`/api/admin/users?id=${id}`, {
              method: 'DELETE',
              credentials: 'include'
            })
            const result = await response.json()
            if (response.ok && result.success) {
              successCount++
            } else {
              errorCount++
            }
          } else if (activeTab === 'posts') {
            const { error } = await supabase
              .from('posts')
              .delete()
              .eq('id', id)
            if (!error) successCount++
            else errorCount++
          } else if (activeTab === 'news') {
            const { deleteNews } = await import('@/lib/queries/news')
            const { success } = await deleteNews(id)
            if (success) successCount++
            else errorCount++
          } else if (activeTab === 'recordings') {
            const { error } = await deleteRecording(id)
            if (!error) successCount++
            else errorCount++
          } else if (activeTab === 'resources') {
            const { deleteResource } = await import('@/lib/queries/resources')
            const { error } = await deleteResource(id)
            if (!error) successCount++
            else errorCount++
          } else if (activeTab === 'blog') {
            const { deleteBlogPost } = await import('@/lib/queries/blog')
            const { error } = await deleteBlogPost(id)
            if (!error) successCount++
            else errorCount++
          } else if (activeTab === 'badges') {
            const { deleteBadge } = await import('@/lib/queries/badges')
            const { success } = await deleteBadge(id)
            if (success) successCount++
            else errorCount++
          } else if (activeTab === 'courses') {
            const { deleteCourse } = await import('@/lib/queries/courses')
            const { error } = await deleteCourse(id)
            if (!error) successCount++
            else errorCount++
          } else if (activeTab === 'events') {
            const { error } = await deleteEvent(id)
            if (!error) successCount++
            else errorCount++
          } else if (activeTab === 'reports') {
            const { deleteReport } = await import('@/lib/queries/reports')
            const { error } = await deleteReport(id)
            if (!error) successCount++
            else errorCount++
          } else if (activeTab === 'payments') {
            const response = await fetch(`/api/admin/payments?id=${id}`, {
              method: 'DELETE'
            })
            if (response.ok) successCount++
            else errorCount++
          } else if (activeTab === 'projects') {
            const { error } = await deleteProject(id)
            if (!error) successCount++
            else errorCount++
          } else if (activeTab === 'tags') {
            const { deleteTag } = await import('@/lib/queries/tags')
            const { error } = await deleteTag(id)
            if (!error) successCount++
            else errorCount++
          } else if (activeTab === 'feedbacks') {
            const response = await fetch(`/api/admin/feedbacks/${id}`, {
              method: 'DELETE',
              credentials: 'include'
            })
            if (response.ok) successCount++
            else errorCount++
          } else if (activeTab === 'forums') {
            const response = await fetch(`/api/admin/forums/${id}`, {
              method: 'DELETE',
              credentials: 'include'
            })
            if (response.ok) successCount++
            else errorCount++
          } else if (activeTab === 'subscriptions') {
            const response = await fetch(`/api/admin/subscriptions?id=${id}`, {
              method: 'DELETE'
            })
            if (response.ok) successCount++
            else errorCount++
          }
        } catch (err) {
          console.error(`Error deleting ${id}:`, err)
          errorCount++
        }
      }
      
      setSelectedItems(new Set())
      await loadData()
      
      if (errorCount > 0) {
        alert(`נמחקו ${successCount} פריטים, ${errorCount} נכשלו`)
      } else {
        alert(`נמחקו ${successCount} פריטים בהצלחה!`)
      }
    } catch (error) {
      console.error('Error deleting selected items:', error)
      alert('שגיאה במחיקת הפריטים')
    }
  }

  function getCurrentItems() {
    switch (activeTab) {
      case 'users': return users
      case 'posts': return posts
      case 'news': return news
      case 'recordings': return recordings
      case 'resources': return resources
      case 'blog': return blogPosts
      case 'badges': return badges
      case 'courses': return courses
      case 'events': return events
      case 'reports': return reports
      case 'payments': return payments
      case 'projects': return projects
      case 'tags': return tags
      case 'feedbacks': return feedbacks
      case 'forums': return forums
      case 'subscriptions': return subscriptions
      default: return []
    }
  }

  // Handle accept/reject offer
  async function handleAcceptOffer(offerId: string) {
    try {
      const { error } = await updateProjectOffer(offerId, { status: 'accepted' })
      if (error) {
        console.error('Error accepting offer:', error)
        alert(`שגיאה באישור ההגשה: ${error?.message || 'שגיאה לא ידועה'}`)
      } else {
        await loadData()
        alert('ההגשה אושרה בהצלחה!')
      }
    } catch (err) {
      console.error('Exception accepting offer:', err)
      alert(`שגיאה באישור ההגשה: ${err instanceof Error ? err.message : 'שגיאה לא ידועה'}`)
    }
  }

  async function handleRejectOffer(offerId: string) {
    try {
      const { error } = await updateProjectOffer(offerId, { status: 'rejected' })
      if (error) {
        console.error('Error rejecting offer:', error)
        alert(`שגיאה בדחיית ההגשה: ${error?.message || 'שגיאה לא ידועה'}`)
      } else {
        await loadData()
        alert('ההגשה נדחתה!')
      }
    } catch (err) {
      console.error('Exception rejecting offer:', err)
      alert(`שגיאה בדחיית ההגשה: ${err instanceof Error ? err.message : 'שגיאה לא ידועה'}`)
    }
  }

  // Show loading while checking authorization
  if (isAuthorized === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F52F8E] mx-auto mb-4"></div>
          <p className="text-gray-600">בודק הרשאות...</p>
        </div>
      </div>
    )
  }

  // Show error if not authorized
  if (isAuthorized === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8 bg-white rounded-xl shadow-lg">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">גישה נדחתה</h1>
          <p className="text-gray-600 mb-6">
            אין לך הרשאה לגשת לפאנל הניהול. רק מנהלים יכולים לגשת לדף זה.
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-[#F52F8E] text-white rounded-lg hover:bg-[#E01E7A] transition-colors"
          >
            חזור לדף הבית
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-[#F52F8E]">פאנל ניהול</h1>
        </div>
        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'users'
                ? 'text-[#F52F8E] border-b-2 border-[#F52F8E]'
                : 'text-gray-600 hover:text-[#F52F8E]'
            }`}
          >
            <Users className="w-5 h-5 inline-block ml-2" />
            משתמשים
          </button>
          <button
            onClick={() => setActiveTab('posts')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'posts'
                ? 'text-[#F52F8E] border-b-2 border-[#F52F8E]'
                : 'text-gray-600 hover:text-[#F52F8E]'
            }`}
          >
            <FileText className="w-5 h-5 inline-block ml-2" />
            הודעות ראשיות
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'roles'
                ? 'text-[#F52F8E] border-b-2 border-[#F52F8E]'
                : 'text-gray-600 hover:text-[#F52F8E]'
            }`}
          >
            <Settings className="w-5 h-5 inline-block ml-2" />
            תפקידים
          </button>
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'subscriptions'
                ? 'text-[#F52F8E] border-b-2 border-[#F52F8E]'
                : 'text-gray-600 hover:text-[#F52F8E]'
            }`}
          >
            <CreditCard className="w-5 h-5 inline-block ml-2" />
            מנויים
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'payments'
                ? 'text-[#F52F8E] border-b-2 border-[#F52F8E]'
                : 'text-gray-600 hover:text-[#F52F8E]'
            }`}
          >
            <CreditCard className="w-5 h-5 inline-block ml-2" />
            תשלומים
          </button>
          <button
            onClick={() => setActiveTab('recordings')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'recordings'
                ? 'text-[#F52F8E] border-b-2 border-[#F52F8E]'
                : 'text-gray-600 hover:text-[#F52F8E]'
            }`}
          >
            <Video className="w-5 h-5 inline-block ml-2" />
            הקלטות
          </button>
          <button
            onClick={() => setActiveTab('resources')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'resources'
                ? 'text-[#F52F8E] border-b-2 border-[#F52F8E]'
                : 'text-gray-600 hover:text-[#F52F8E]'
            }`}
          >
            <FileIcon className="w-5 h-5 inline-block ml-2" />
            משאבים
          </button>
          <button
            onClick={() => setActiveTab('blog')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'blog'
                ? 'text-[#F52F8E] border-b-2 border-[#F52F8E]'
                : 'text-gray-600 hover:text-[#F52F8E]'
            }`}
          >
            <FileText className="w-5 h-5 inline-block ml-2" />
            בלוג
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'reports'
                ? 'text-[#F52F8E] border-b-2 border-[#F52F8E]'
                : 'text-gray-600 hover:text-[#F52F8E]'
            }`}
          >
            <FileText className="w-5 h-5 inline-block ml-2" />
            דיווחים
          </button>
          <Link
            href="/admin/gamification"
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'gamification'
                ? 'text-[#F52F8E] border-b-2 border-[#F52F8E]'
                : 'text-gray-600 hover:text-[#F52F8E]'
            }`}
          >
            <Trophy className="w-5 h-5 inline-block ml-2" />
            גמיפיקציה
          </Link>
          <button
            onClick={() => setActiveTab('badges')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'badges'
                ? 'text-[#F52F8E] border-b-2 border-[#F52F8E]'
                : 'text-gray-600 hover:text-[#F52F8E]'
            }`}
          >
            <Star className="w-5 h-5 inline-block ml-2" />
            תגים
          </button>
          <button
            onClick={() => setActiveTab('courses')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'courses'
                ? 'text-[#F52F8E] border-b-2 border-[#F52F8E]'
                : 'text-gray-600 hover:text-[#F52F8E]'
            }`}
          >
            <BookOpen className="w-5 h-5 inline-block ml-2" />
            קורסים
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'events'
                ? 'text-[#F52F8E] border-b-2 border-[#F52F8E]'
                : 'text-gray-600 hover:text-[#F52F8E]'
            }`}
          >
            <Calendar className="w-5 h-5 inline-block ml-2" />
            לייבים
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'projects'
                ? 'text-[#F52F8E] border-b-2 border-[#F52F8E]'
                : 'text-gray-600 hover:text-[#F52F8E]'
            }`}
          >
            <FileText className="w-5 h-5 inline-block ml-2" />
            פרויקטים
          </button>
          <button
            onClick={() => setActiveTab('tags')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'tags'
                ? 'text-[#F52F8E] border-b-2 border-[#F52F8E]'
                : 'text-gray-600 hover:text-[#F52F8E]'
            }`}
          >
            <TagIcon className="w-5 h-5 inline-block ml-2" />
            תגיות
          </button>
          <button
            onClick={() => setActiveTab('feedbacks')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'feedbacks'
                ? 'text-[#F52F8E] border-b-2 border-[#F52F8E]'
                : 'text-gray-600 hover:text-[#F52F8E]'
            }`}
          >
            <MessageCircleMore className="w-5 h-5 inline-block ml-2" />
            פידבקים
          </button>
          <button
            onClick={() => setActiveTab('forums')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'forums'
                ? 'text-[#F52F8E] border-b-2 border-[#F52F8E]'
                : 'text-gray-600 hover:text-[#F52F8E]'
            }`}
          >
            <MessageCircleMore className="w-5 h-5 inline-block ml-2" />
            פורומים
          </button>
          <button
            onClick={() => setActiveTab('api-docs')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'api-docs'
                ? 'text-[#F52F8E] border-b-2 border-[#F52F8E]'
                : 'text-gray-600 hover:text-[#F52F8E]'
            }`}
          >
            <HelpCircle className="w-5 h-5 inline-block ml-2" />
            דוקומנטציה API
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12">טוען...</div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            {/* Create Button */}
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-xl font-semibold">
                {activeTab === 'users' && (
                  <div className="flex items-center gap-4">
                    <span>משתמשים</span>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                        {currentUserCount} / {registrationLimit}
                      </span>
                      <span className="text-xs">רשומים</span>
                    </div>
                  </div>
                )}
                {activeTab === 'posts' && 'הודעות ראשיות'}
                {activeTab === 'roles' && 'תפקידים'}
                {activeTab === 'subscriptions' && 'מנויים'}
                {activeTab === 'payments' && 'תשלומים'}
                {activeTab === 'recordings' && 'הקלטות'}
                {activeTab === 'reports' && 'דיווחים'}
                {activeTab === 'events' && 'לייבים'}
                {activeTab === 'projects' && 'פרויקטים'}
                {activeTab === 'tags' && 'תגיות'}
                {activeTab === 'feedbacks' && 'פידבקים'}
                {activeTab === 'forums' && 'פורומים'}
                {activeTab === 'api-docs' && 'דוקומנטציה API'}
              </h2>
              {selectedItems.size > 0 && (
                <div className="flex gap-2">
                  {activeTab === 'users' && (
                    <button
                      onClick={() => setShowBulkEditModal(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      ערוך נבחרים ({selectedItems.size})
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      if (confirm(`האם אתה בטוח שברצונך למחוק ${selectedItems.size} פריטים?`)) {
                        await handleDeleteSelected()
                      }
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    מחק נבחרים ({selectedItems.size})
                  </button>
                </div>
              )}
              {activeTab === 'subscriptions' && (
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/subscriptions/check-expiring');
                        const result = await response.json();
                        if (result.data) {
                          alert(`נבדקו ${result.data.checked} מנויים, נשלחו ${result.data.warnings_sent} התראות`);
                        }
                        loadData();
                      } catch (error) {
                        console.error('Error checking expiring subscriptions:', error);
                        alert('שגיאה בבדיקת מנויים שקרובים לפוג');
                      }
                    }}
                    className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors text-sm"
                  >
                    בדוק מנויים שקרובים לפוג
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/subscriptions/check-expired');
                        const result = await response.json();
                        if (result.data) {
                          alert(`נבדקו ${result.data.checked} מנויים, עובדו ${result.data.processed} מנויים`);
                        }
                        loadData();
                      } catch (error) {
                        console.error('Error checking expired subscriptions:', error);
                        alert('שגיאה בבדיקת מנויים שפגו');
                      }
                    }}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                  >
                    בדוק מנויים שפגו
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                {activeTab === 'posts' && (
                  <button
                    onClick={handleDeleteAllForumPosts}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                    מחק כל הפוסטים בפורומים
                  </button>
                )}
                <button
                  onClick={() => {
                    setEditing('new')
                    setFormData({})
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-[#F52F8E] text-white rounded-lg hover:bg-[#E01E7A] transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  יצירה חדשה
                </button>
              </div>
            </div>

            {/* Registration Limit Management - Users Tab */}
            {activeTab === 'users' && !editing && (
              <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                <h3 className="font-semibold mb-4 text-lg">הגבלת רישום משתמשים</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      משתמשים רשומים כרגע
                    </label>
                    <div className="text-2xl font-bold text-blue-600">
                      {currentUserCount}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      מקסימום רישום
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={registrationLimit}
                      onChange={(e) => setRegistrationLimit(parseInt(e.target.value) || 50)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <button
                      onClick={async () => {
                        try {
                          const response = await fetch('/api/admin/registration-limit', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({ limit: registrationLimit })
                          })
                          if (response.ok) {
                            const result = await response.json()
                            setRegistrationLimit(result.limit)
                            setCurrentUserCount(result.currentCount)
                            alert(`המגבלה עודכנה בהצלחה! ${result.currentCount} / ${result.limit} משתמשים רשומים`)
                          } else {
                            const error = await response.json()
                            alert(`שגיאה בעדכון המגבלה: ${error.error || 'שגיאה לא ידועה'}`)
                          }
                        } catch (error: any) {
                          alert(`שגיאה בעדכון המגבלה: ${error.message || 'שגיאה לא ידועה'}`)
                        }
                      }}
                      className="w-full px-4 py-2 bg-[#F52F8E] text-white rounded-lg hover:bg-[#E01E7A] transition-colors"
                    >
                      שמור מגבלה
                    </button>
                  </div>
                </div>
                {currentUserCount >= registrationLimit && (
                  <div className="mt-4 p-3 bg-yellow-100 border border-yellow-400 rounded-lg text-yellow-800 text-sm">
                    ⚠️ הרישום מוגבל - הגעת למקסימום המשתמשים המותר
                  </div>
                )}
              </div>
            )}

            {/* Create/Edit Form */}
            {editing && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold mb-4">
                  {editing === 'new' ? 'יצירה חדשה' : 'עריכה'}
                </h3>
                {activeTab === 'users' && (
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="User ID (UUID)"
                      value={formData.user_id || ''}
                      onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    <input
                      type="text"
                      placeholder="שם תצוגה"
                      value={formData.display_name || ''}
                      onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    <input
                      type="text"
                      placeholder="כינוי"
                      value={formData.nickname || ''}
                      onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    <input
                      type="email"
                      placeholder="אימייל"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    <select
                      value={formData.experience_level || 'מתחיל'}
                      onChange={(e) => setFormData({ ...formData, experience_level: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="מתחיל">מתחיל</option>
                      <option value="בינוני">בינוני</option>
                      <option value="מתקדם">מתקדם</option>
                      <option value="מומחה">מומחה</option>
                    </select>
                    <select
                      value={formData.role_id || ''}
                      onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">בחר תפקיד</option>
                      {availableRoles.map(role => (
                        <option key={role.id} value={role.id}>
                          {role.display_name}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="URL תמונה"
                        value={formData.avatar_url || ''}
                        onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                      />
                      {isAuthorized && (
                        <button
                          type="button"
                          onClick={() => {
                            setImageGalleryField('avatar_url');
                            setShowImageGallery(true);
                          }}
                          className="px-4 py-2 bg-[#F52F8E] text-white rounded-lg hover:bg-[#E01E7A] transition-colors whitespace-nowrap"
                        >
                          בחר מהגלריה
                        </button>
                      )}
                    </div>
                  </div>
                )}
                {activeTab === 'posts' && (
                  <div className="space-y-4">
                    <select
                      value={formData.user_id || ''}
                      onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      required
                    >
                      <option value="">בחר משתמש *</option>
                      {users.map(user => {
                        const userId = user.user_id || user.id;
                        const displayName = user.display_name || user.first_name || user.email || user.user_id || user.id;
                        return (
                          <option key={userId} value={userId}>
                            {displayName}
                          </option>
                        );
                      })}
                    </select>
                    <textarea
                      placeholder="תוכן הפוסט"
                      value={formData.content || ''}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      dir="rtl"
                      lang="he"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      rows={4}
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="URL תמונה (אופציונלי)"
                        value={formData.image_url || ''}
                        onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                      />
                      {isAuthorized && (
                        <button
                          type="button"
                          onClick={() => {
                            setImageGalleryField('image_url');
                            setShowImageGallery(true);
                          }}
                          className="px-4 py-2 bg-[#F52F8E] text-white rounded-lg hover:bg-[#E01E7A] transition-colors whitespace-nowrap"
                        >
                          בחר מהגלריה
                        </button>
                      )}
                    </div>
                    </div>
                )}
                {activeTab === 'resources' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        סוג משאב *
                      </label>
                      <select
                        value={formData.type || 'document'}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        dir="rtl"
                      >
                        <option value="document">מסמך</option>
                        <option value="video">וידאו</option>
                        <option value="image">תמונה</option>
                        <option value="link">קישור</option>
                        <option value="audio">אודיו</option>
                      </select>
                    </div>
                    <input
                      type="text"
                      placeholder="כותרת המשאב *"
                      value={formData.title || ''}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      dir="rtl"
                      lang="he"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        תיאור המשאב
                      </label>
                      <RichTextEditor
                        content={formData.description || ''}
                        onChange={(content) => setFormData({ ...formData, description: content })}
                        placeholder="תאר את המשאב..."
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="קטגוריה (אופציונלי)"
                      value={formData.category || ''}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      dir="rtl"
                      lang="he"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        העלה קובץ
                      </label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          
                          setUploadingFile(true);
                          try {
                            const userId = users[0]?.id || 'admin';
                            const fileExt = file.name.split('.').pop();
                            const fileName = `${userId}-${Date.now()}.${fileExt}`;
                            const filePath = `resources/${fileName}`;

                            // Upload to Supabase Storage
                            const { error: uploadError } = await supabase.storage
                              .from('resources')
                              .upload(filePath, file, {
                                cacheControl: '3600',
                                upsert: true
                              });

                            if (uploadError) {
                              console.error('Upload error:', uploadError);
                              alert('שגיאה בהעלאת הקובץ. אנא השתמש בקישור ידני.');
                              setUploadingFile(false);
                              return;
                            }

                            // Get public URL
                            const { data: { publicUrl } } = supabase.storage
                              .from('resources')
                              .getPublicUrl(filePath);

                            setFormData({
                              ...formData,
                              file_url: publicUrl,
                              file_name: file.name,
                              file_size: file.size,
                              file_type: file.type
                            });
                          } catch (error) {
                            console.error('Error uploading file:', error);
                            alert('שגיאה בהעלאת הקובץ');
                          } finally {
                            setUploadingFile(false);
                          }
                        }}
                        className="hidden"
                        id="resource-file-upload"
                      />
                      <label
                        htmlFor="resource-file-upload"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#F52F8E] text-white rounded-lg hover:bg-[#E01E7A] transition-colors cursor-pointer"
                      >
                        {uploadingFile ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>מעלה...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4" />
                            <span>בחר קובץ</span>
                          </>
                        )}
                      </label>
                      {formData.file_name && (
                        <p className="text-sm text-gray-600 mt-2">
                          קובץ נבחר: {formData.file_name}
                        </p>
                      )}
                    </div>
                    {formData.type === 'link' ? (
                      <input
                        type="url"
                        placeholder="קישור חיצוני *"
                        value={formData.external_url || ''}
                        onChange={(e) => setFormData({ ...formData, external_url: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        required
                      />
                    ) : (
                    <input
                      type="url"
                      placeholder="או הזן קישור לקובץ *"
                      value={formData.file_url || ''}
                      onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        תמונת תצוגה מקדימה (אופציונלי)
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          
                          setUploadingFile(true);
                          try {
                            const userId = users[0]?.id || 'admin';
                            const fileExt = file.name.split('.').pop();
                            const fileName = `thumb_${userId}-${Date.now()}.${fileExt}`;
                            const filePath = `resources/thumbnails/${fileName}`;

                            const { error: uploadError } = await supabase.storage
                              .from('resources')
                              .upload(filePath, file, {
                                cacheControl: '3600',
                                upsert: true
                              });

                            if (uploadError) {
                              console.error('Upload error:', uploadError);
                              alert('שגיאה בהעלאת התמונה');
                              setUploadingFile(false);
                              return;
                            }

                            const { data: { publicUrl } } = supabase.storage
                              .from('resources')
                              .getPublicUrl(filePath);

                            setFormData({
                              ...formData,
                              thumbnail_url: publicUrl
                            });
                          } catch (error) {
                            console.error('Error uploading thumbnail:', error);
                            alert('שגיאה בהעלאת התמונה');
                          } finally {
                            setUploadingFile(false);
                          }
                        }}
                        className="hidden"
                        id="resource-thumbnail-upload"
                      />
                      <label
                        htmlFor="resource-thumbnail-upload"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors cursor-pointer"
                      >
                        {uploadingFile ? (
                          <>
                            <div className="w-4 h-4 border-2 border-gray-700 border-t-transparent rounded-full animate-spin"></div>
                            <span>מעלה...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4" />
                            <span>בחר תמונה</span>
                          </>
                        )}
                      </label>
                      {formData.thumbnail_url && (
                        <p className="text-sm text-gray-600 mt-2">
                          תמונה נבחרה
                        </p>
                      )}
                    </div>
                    {activeTab === 'resources' && tags.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          תגיות
                        </label>
                        <TagSelector
                          selectedTagIds={formData.selectedTagIds || []}
                          onSelectionChange={(tagIds) => setFormData({ ...formData, selectedTagIds: tagIds })}
                          availableTags={tags}
                        />
                      </div>
                    )}
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.is_premium !== false}
                        onChange={(e) => setFormData({ ...formData, is_premium: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <span>רק למשתמשי פרימיום</span>
                    </label>
                  </div>
                )}
                {activeTab === 'recordings' && (
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="כותרת ההקלטה *"
                      value={formData.title || ''}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      dir="rtl"
                      lang="he"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        תיאור ההקלטה
                      </label>
                      <RichTextEditor
                        content={formData.description || ''}
                        onChange={(content) => setFormData({ ...formData, description: content })}
                        placeholder="תאר את ההקלטה..."
                      />
                    </div>
                    <input
                      type="url"
                      placeholder="קישור לוידאו *"
                      value={formData.video_url || ''}
                      onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        תמונת תצוגה מקדימה
                      </label>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            
                            // Validate file type
                            if (!file.type.startsWith('image/')) {
                              alert('אנא בחר קובץ תמונה בלבד');
                              return;
                            }
                            
                            // Validate file size (max 5MB)
                            if (file.size > 5 * 1024 * 1024) {
                              alert('גודל הקובץ גדול מדי. מקסימום 5MB');
                              return;
                            }
                            
                            setUploadingFile(true);
                            try {
                              const fileExt = file.name.split('.').pop();
                              const fileName = `recording-thumbnail-${Date.now()}.${fileExt}`;
                              const filePath = `recordings/${fileName}`;

                              // Try to upload to Supabase Storage
                              const { error: uploadError } = await supabase.storage
                                .from('recordings')
                                .upload(filePath, file, {
                                  cacheControl: '3600',
                                  upsert: true
                                });

                              if (uploadError) {
                                // If bucket doesn't exist, try 'thumbnails' bucket
                                const { error: uploadError2 } = await supabase.storage
                                  .from('thumbnails')
                                  .upload(filePath, file, {
                                    cacheControl: '3600',
                                    upsert: true
                                  });
                                
                                if (uploadError2) {
                                  // If both fail, use base64 as fallback
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    const base64 = reader.result as string;
                                    setFormData({ ...formData, thumbnail_url: base64 });
                                  };
                                  reader.readAsDataURL(file);
                                  setUploadingFile(false);
                                  return;
                                } else {
                                  // Get public URL from thumbnails bucket
                                  const { data: { publicUrl } } = supabase.storage
                                    .from('thumbnails')
                                    .getPublicUrl(filePath);
                                  setFormData({ ...formData, thumbnail_url: publicUrl });
                                }
                              } else {
                                // Get public URL from recordings bucket
                                const { data: { publicUrl } } = supabase.storage
                                  .from('recordings')
                                  .getPublicUrl(filePath);
                                setFormData({ ...formData, thumbnail_url: publicUrl });
                              }
                            } catch (error) {
                              console.error('Error uploading thumbnail:', error);
                              alert('שגיאה בהעלאת התמונה');
                            } finally {
                              setUploadingFile(false);
                            }
                          }}
                          className="hidden"
                          id="recording-thumbnail-upload"
                        />
                        <label
                          htmlFor="recording-thumbnail-upload"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-[#F52F8E] text-white rounded-lg hover:bg-[#E01E7A] transition-colors cursor-pointer"
                        >
                          {uploadingFile ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              <span>מעלה...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4" />
                              <span>העלה תמונה</span>
                            </>
                          )}
                        </label>
                      </div>
                      {formData.thumbnail_url && (
                        <div className="mt-2">
                          <img 
                            src={formData.thumbnail_url} 
                            alt="תצוגה מקדימה" 
                            className="w-full max-w-xs h-32 object-cover rounded-lg border border-gray-200"
                            onError={(e) => {
                              // Hide image if it fails to load
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      <div className="flex gap-2 mt-2">
                        <input
                          type="url"
                          placeholder="או הזן קישור לתמונת תצוגה מקדימה"
                          value={formData.thumbnail_url || ''}
                          onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                        />
                        {isAuthorized && (
                          <button
                            type="button"
                            onClick={() => {
                              setImageGalleryField('thumbnail_url');
                              setShowImageGallery(true);
                            }}
                            className="px-4 py-2 bg-[#F52F8E] text-white rounded-lg hover:bg-[#E01E7A] transition-colors whitespace-nowrap"
                          >
                            בחר מהגלריה
                          </button>
                        )}
                      </div>
                    </div>
                    {activeTab === 'recordings' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          תגיות
                        </label>
                        {approvedTags.length > 0 ? (
                          <>
                            <TagSelectorWithCreate
                              selectedTagIds={formData.selectedTagIds || []}
                              onSelectionChange={(tagIds) => setFormData({ ...formData, selectedTagIds: tagIds })}
                              availableTags={approvedTags}
                              onNewTagCreate={async (tagName: string) => {
                                // #region agent log
                                fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin/page.tsx:3585',message:'onNewTagCreate entry',data:{tagName},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                                // #endregion
                                try {
                                  const { data: newTag, error: tagError } = await suggestTag(tagName)
                                  // #region agent log
                                  fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin/page.tsx:3588',message:'suggestTag result',data:{newTag:newTag?.id,error:tagError?.message,hasNewTag:!!newTag,hasError:!!tagError},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                                  // #endregion
                                  if (newTag && !tagError) {
                                    // #region agent log
                                    fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin/page.tsx:3589',message:'before setApprovedTags',data:{approvedTagsCount:approvedTags.length,isApproved:newTag.is_approved},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                                    // #endregion
                                    // Only add to approvedTags if the tag is approved (admin-created tags are auto-approved)
                                    if (newTag.is_approved) {
                                      setApprovedTags(prev => [...prev, newTag])
                                    }
                                    setTags(prev => [...prev, newTag])
                                    // #region agent log
                                    fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin/page.tsx:3591',message:'after setTags, before setFormData',data:{newTagId:newTag.id,currentSelectedTagIds:formData.selectedTagIds?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                                    // #endregion
                                    setFormData((prev: any) => ({
                                      ...prev,
                                      selectedTagIds: [...(prev.selectedTagIds || []), newTag.id]
                                    }))
                                    // #region agent log
                                    fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin/page.tsx:3595',message:'onNewTagCreate success',data:{newTagId:newTag.id,isApproved:newTag.is_approved},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                                    // #endregion
                                  } else {
                                    // #region agent log
                                    fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin/page.tsx:3597',message:'onNewTagCreate failed',data:{hasNewTag:!!newTag,hasError:!!tagError,errorMessage:tagError?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                                    // #endregion
                                  }
                                } catch (error: any) {
                                  // #region agent log
                                  fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin/page.tsx:3600',message:'onNewTagCreate exception',data:{errorMessage:error?.message,errorStack:error?.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                                  // #endregion
                                }
                              }}
                            />
                            <p className="text-xs text-gray-500 mt-1">בחר תגיות קיימות או חפש תגית חדשה להוספה</p>
                          </>
                        ) : (
                          <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm">
                            טוען תגיות...
                          </div>
                        )}
                      </div>
                    )}
                    <input
                      type="text"
                      placeholder="משך זמן (למשל: 1:45:00)"
                      value={formData.duration || ''}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        מספר צפיות
                      </label>
                    <input
                      type="number"
                      placeholder="מספר צפיות"
                      value={formData.views || 0}
                      onChange={(e) => setFormData({ ...formData, views: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                      <p className="text-xs text-gray-500 mt-1">מספר הצפיות של ההקלטה (מתעדכן אוטומטית כשמישהו צופה)</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        תאריך יצירה (אופציונלי - אם לא תזין, יישמר התאריך הנוכחי)
                      </label>
                      <DatePicker
                        selected={formData.created_at ? new Date(formData.created_at) : null}
                        onChange={(date: Date | null) => {
                          if (date) {
                            setFormData({ ...formData, created_at: date.toISOString() });
                          } else {
                            const { created_at, ...rest } = formData;
                            setFormData(rest);
                          }
                        }}
                        locale={he}
                        dateFormat="dd/MM/yyyy HH:mm"
                        showTimeSelect
                        timeFormat="HH:mm"
                        timeIntervals={15}
                        placeholderText="בחר תאריך ושעה"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        calendarClassName="rtl"
                        isClearable
                        todayButton="היום"
                        showPopperArrow={false}
                        wrapperClassName="w-full"
                        popperClassName="rtl-calendar"
                        popperPlacement="bottom-end"
                      />
                    </div>
                    <p className="text-sm text-gray-500">
                      💡 התגית "חדש" תופיע אוטומטית על ההקלטה החדשה ביותר (פחות מ-30 יום)
                    </p>
                    <p className="text-sm text-gray-500">
                      💡 אם לא תזין תמונת תצוגה מקדימה, יוצג gradient עם כפתור play
                    </p>

                    {/* Q&A Section */}
                    <QASectionEditor
                      qaSection={formData.qa_section || []}
                      onChange={(qaSection) => setFormData({ ...formData, qa_section: qaSection })}
                    />

                    {/* Key Points Section */}
                    <KeyPointsEditor
                      keyPoints={formData.key_points || []}
                      onChange={(keyPoints) => setFormData({ ...formData, key_points: keyPoints })}
                    />
                  </div>
                )}
                {activeTab === 'subscriptions' && (
                  <div className="space-y-4">
                    <select
                      value={formData.user_id || ''}
                      onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      required
                    >
                      <option value="">בחר משתמש *</option>
                      {users.map(user => (
                        <option key={user.user_id || user.id} value={user.user_id || user.id}>
                          {user.display_name || user.first_name || user.email || user.user_id}
                        </option>
                      ))}
                    </select>
                    <select
                      value={formData.role_id || ''}
                      onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      required
                    >
                      <option value="">בחר מנוי בתשלום *</option>
                      {roles
                        .filter(role => role.name !== 'free' && role.name !== 'admin' && (role.price || 0) > 0)
                        .map(role => (
                          <option key={role.id} value={role.id}>
                            {role.display_name} (₪{role.price || 0}/חודש)
                          </option>
                        ))}
                    </select>
                    <p className="text-xs text-gray-500">
                      💡 רק מנויים בתשלום יכולים להיות ב-subscriptions. מנוי חינמי מוגדר רק ב-role_id של המשתמש.
                    </p>
                    <select
                      value={formData.status || 'active'}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="active">פעיל</option>
                      <option value="pending">ממתין</option>
                      <option value="cancelled">בוטל</option>
                      <option value="expired">פג תוקף</option>
                    </select>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">תאריך התחלה *</label>
                      <input
                        type="datetime-local"
                        value={formData.start_date || (() => {
                          const now = new Date();
                          const year = now.getFullYear();
                          const month = String(now.getMonth() + 1).padStart(2, '0');
                          const day = String(now.getDate()).padStart(2, '0');
                          const hours = String(now.getHours()).padStart(2, '0');
                          const minutes = String(now.getMinutes()).padStart(2, '0');
                          return `${year}-${month}-${day}T${hours}:${minutes}`;
                        })()}
                        onChange={(e) => {
                          const startDate = e.target.value;
                          // Auto-calculate end_date as 1 month from start_date
                          let calculatedEndDate = '';
                          if (startDate) {
                            try {
                              const date = new Date(startDate);
                              if (!isNaN(date.getTime())) {
                                date.setMonth(date.getMonth() + 1);
                                const year = date.getFullYear();
                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                const day = String(date.getDate()).padStart(2, '0');
                                const hours = String(date.getHours()).padStart(2, '0');
                                const minutes = String(date.getMinutes()).padStart(2, '0');
                                calculatedEndDate = `${year}-${month}-${day}T${hours}:${minutes}`;
                              }
                            } catch (err) {
                              console.error('Error calculating end date:', err);
                            }
                          }
                          setFormData({ 
                            ...formData, 
                            start_date: startDate,
                            end_date: calculatedEndDate || formData.end_date
                          });
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">תאריך סיום (אופציונלי)</label>
                      <input
                        type="datetime-local"
                        value={formData.end_date || (() => {
                          const now = new Date();
                          now.setMonth(now.getMonth() + 1);
                          const year = now.getFullYear();
                          const month = String(now.getMonth() + 1).padStart(2, '0');
                          const day = String(now.getDate()).padStart(2, '0');
                          const hours = String(now.getHours()).padStart(2, '0');
                          const minutes = String(now.getMinutes()).padStart(2, '0');
                          return `${year}-${month}-${day}T${hours}:${minutes}`;
                        })()}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                )}
                {activeTab === 'payments' && (
                  <div className="space-y-4">
                    <select
                      value={formData.subscription_id || ''}
                      onChange={(e) => {
                        const selectedSubscription = subscriptions.find(s => s.id === e.target.value);
                        setFormData({ 
                          ...formData, 
                          subscription_id: e.target.value,
                          // Automatically set user_id from subscription
                          user_id: selectedSubscription?.user_id || null
                        });
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      required
                    >
                      <option value="">בחר מנוי *</option>
                      {subscriptions.map(subscription => {
                        const user = subscription.profiles || {};
                        const role = subscription.roles || {};
                        return (
                          <option key={subscription.id} value={subscription.id}>
                            {user.display_name || user.first_name || user.email || subscription.user_id} - {role.display_name || role.name || 'ללא מנוי'}
                          </option>
                        );
                      })}
                    </select>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">סכום (₪) *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.amount !== undefined && formData.amount !== null ? formData.amount : ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Allow empty string, 0, or positive numbers
                          if (value === '') {
                            setFormData({ ...formData, amount: '' });
                          } else {
                            const numValue = parseFloat(value);
                            if (!isNaN(numValue) && numValue >= 0) {
                              setFormData({ ...formData, amount: numValue });
                            }
                          }
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        required
                        placeholder="0 לחודש חינם"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        💡 הזן 0 לחודש חינם במתנה
                      </p>
                    </div>
                    <select
                      value={formData.currency || 'ILS'}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="ILS">ILS (שקלים)</option>
                      <option value="USD">USD (דולרים)</option>
                      <option value="EUR">EUR (יורו)</option>
                    </select>
                    <select
                      value={formData.status || 'pending'}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="pending">ממתין</option>
                      <option value="completed">הושלם</option>
                      <option value="failed">נכשל</option>
                      <option value="refunded">הוחזר</option>
                    </select>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">אמצעי תשלום (אופציונלי)</label>
                      <input
                        type="text"
                        value={formData.payment_method || ''}
                        onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="לדוגמה: Visa **** 4242"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">תאריך תשלום</label>
                      <DatePicker
                        selected={formData.payment_date ? new Date(formData.payment_date) : new Date()}
                        onChange={(date: Date | null) => {
                          if (date) {
                            // Convert to datetime-local format (YYYY-MM-DDTHH:mm)
                            const year = date.getFullYear();
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const day = String(date.getDate()).padStart(2, '0');
                            const hours = String(date.getHours()).padStart(2, '0');
                            const minutes = String(date.getMinutes()).padStart(2, '0');
                            const dateTimeString = `${year}-${month}-${day}T${hours}:${minutes}`;
                            setFormData({ ...formData, payment_date: dateTimeString });
                          } else {
                            setFormData({ ...formData, payment_date: null });
                          }
                        }}
                        locale={he}
                        dateFormat="dd/MM/yyyy HH:mm"
                        showTimeSelect
                        timeFormat="HH:mm"
                        timeIntervals={15}
                        placeholderText="בחר תאריך ושעה"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        calendarClassName="rtl"
                        isClearable
                        todayButton="היום"
                        showPopperArrow={false}
                        wrapperClassName="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">מספר עסקה (אופציונלי)</label>
                      <input
                        type="text"
                        value={formData.transaction_id || ''}
                        onChange={(e) => setFormData({ ...formData, transaction_id: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">מספר חשבונית (אופציונלי)</label>
                      <input
                        type="text"
                        value={formData.invoice_number || ''}
                        onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">קישור לחשבונית (אופציונלי)</label>
                      <input
                        type="url"
                        value={formData.invoice_url || ''}
                        onChange={(e) => setFormData({ ...formData, invoice_url: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                )}
                {activeTab === 'news' && (
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="כותרת החדשה *"
                      value={formData.title || ''}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      dir="rtl"
                      lang="he"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                    <textarea
                      placeholder="תוכן החדשה (אופציונלי)"
                      value={formData.content || ''}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      dir="rtl"
                      lang="he"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="קישור לתמונה (אופציונלי)"
                        value={formData.image_url || ''}
                        onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                      />
                      {isAuthorized && (
                        <button
                          type="button"
                          onClick={() => {
                            setImageGalleryField('image_url');
                            setShowImageGallery(true);
                          }}
                          className="px-4 py-2 bg-[#F52F8E] text-white rounded-lg hover:bg-[#E01E7A] transition-colors whitespace-nowrap"
                        >
                          בחר מהגלריה
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="קישור (אופציונלי)"
                      value={formData.link_url || ''}
                      onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    <input
                      type="number"
                      placeholder="סדר תצוגה (0 = ראשון)"
                      value={formData.display_order || 0}
                      onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.is_active !== false}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <span>פעיל</span>
                    </label>
                    </div>
                )}
                
                {/* Lesson Editing Modal */}
                {editingLesson && editingLessonData && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                      <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between z-10">
                        <h3 className="text-2xl font-bold text-gray-800">עריכת שיעור</h3>
                        <button
                          onClick={() => {
                            setEditingLesson(null)
                            setEditingLessonData(null)
                          }}
                          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      
                      <div className="p-6 space-y-6">
                        {/* Basic Info */}
                        <div className="space-y-4">
                          <h4 className="text-lg font-semibold text-gray-800">פרטים בסיסיים</h4>
                          <input
                            type="text"
                            placeholder="שם השיעור *"
                            value={editingLessonData.title}
                            onChange={(e) => setEditingLessonData({...editingLessonData, title: e.target.value})}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            dir="rtl"
                            lang="he"
                          />
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              תיאור השיעור
                            </label>
                            <RichTextEditor
                              content={editingLessonData.description || ''}
                              onChange={(content) => setEditingLessonData({...editingLessonData, description: content})}
                              placeholder="תאר את השיעור..."
                            />
                          </div>
                          <input
                            type="text"
                            placeholder="קישור וידאו (YouTube, Vimeo, או קישור ישיר)"
                            value={editingLessonData.video_url}
                            onChange={(e) => setEditingLessonData({...editingLessonData, video_url: e.target.value})}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                          />
                        </div>
                        
                        {/* Q&A Section */}
                        <QASectionEditor
                          qaSection={editingLessonData.qa_section || []}
                          onChange={(qaSection) => setEditingLessonData({ ...editingLessonData, qa_section: qaSection })}
                          className="border-t border-gray-200 pt-6"
                        />
                        
                        {/* Key Points Section */}
                        <KeyPointsEditor
                          keyPoints={editingLessonData.key_points || []}
                          onChange={(keyPoints) => setEditingLessonData({ ...editingLessonData, key_points: keyPoints })}
                          className="border-t border-gray-200 pt-6"
                        />
                        
                        {/* Save Button */}
                        <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-6">
                          <button
                            onClick={() => {
                              setEditingLesson(null)
                              setEditingLessonData(null)
                            }}
                            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            ביטול
                          </button>
                          <button
                            onClick={async () => {
                              if (!editingLesson || !editingLessonData) return
                              
                              try {
                                // Update the lesson in courseSections
                                const updated = [...courseSections]
                                const lesson = updated[editingLesson.sectionIndex].lessons[editingLesson.lessonIndex]
                                
                                updated[editingLesson.sectionIndex].lessons[editingLesson.lessonIndex] = {
                                  ...lesson,
                                  title: editingLessonData.title,
                                  description: editingLessonData.description,
                                  video_url: editingLessonData.video_url,
                                  qa_section: editingLessonData.qa_section.filter(qa => qa.question.trim() || qa.answer.trim()),
                                  key_points: editingLessonData.key_points.filter(point => point.title.trim() || point.description.trim())
                                }
                                
                                setCourseSections(updated)
                                
                                // If lesson has an ID (already saved), update it in database
                                if (lesson.id && !lesson.id.startsWith('lesson-')) {
                                  console.log('Updating lesson in database:', lesson.id)
                                  const { updateLesson } = await import('@/lib/queries/courses')
                                  const filteredQa = editingLessonData.qa_section.filter(qa => qa.question.trim() || qa.answer.trim())
                                  const filteredKeyPoints = editingLessonData.key_points.filter(point => point.title.trim() || point.description.trim())
                                  
                                  console.log('Saving Q&A:', filteredQa)
                                  console.log('Saving Key Points:', filteredKeyPoints)
                                  
                                  const { data: updatedLesson, error: updateError } = await updateLesson(lesson.id, {
                                    title: editingLessonData.title,
                                    description: editingLessonData.description,
                                    video_url: editingLessonData.video_url,
                                    qa_section: filteredQa,
                                    key_points: filteredKeyPoints
                                  })
                                  
                                  if (updateError) {
                                    console.error('Error updating lesson in database:', updateError)
                                    alert(`שגיאה בעדכון השיעור במסד הנתונים: ${updateError.message || 'שגיאה לא ידועה'}`)
                                    return
                                  }
                                  
                                  console.log('Lesson updated successfully in database:', updatedLesson)
                                } else {
                                  console.log('Lesson not yet saved to database, will be saved when course is saved')
                                }
                                
                                setEditingLesson(null)
                                setEditingLessonData(null)
                                alert('השיעור עודכן בהצלחה!')
                              } catch (error) {
                                console.error('Error updating lesson:', error)
                                alert(`שגיאה בעדכון השיעור: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}`)
                              }
                            }}
                            className="px-6 py-2 bg-[#F52F8E] text-white rounded-lg hover:bg-[#E01E7A] transition-colors"
                          >
                            שמור
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {activeTab === 'badges' && (
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="שם התג *"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      dir="rtl"
                      lang="he"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                    <input
                      type="text"
                      placeholder="אייקון (emoji או טקסט) *"
                      value={formData.icon || '⭐'}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                    <input
                      type="color"
                      placeholder="צבע האייקון"
                      value={formData.icon_color || '#FFD700'}
                      onChange={(e) => setFormData({ ...formData, icon_color: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg h-12"
                    />
                    <input
                      type="number"
                      placeholder="סף נקודות *"
                      value={formData.points_threshold || 0}
                      onChange={(e) => setFormData({ ...formData, points_threshold: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        תיאור (אופציונלי)
                      </label>
                      <RichTextEditor
                        content={formData.description || ''}
                        onChange={(content) => setFormData({ ...formData, description: content })}
                        placeholder="תאר את הסקשן..."
                      />
                    </div>
                    <input
                      type="number"
                      placeholder="סדר תצוגה (0 = ראשון)"
                      value={formData.display_order || 0}
                      onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.is_active !== false}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <span>פעיל</span>
                    </label>
                  </div>
                )}
                {activeTab === 'courses' && (
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="שם הקורס *"
                      value={formData.title || ''}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      dir="rtl"
                      lang="he"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          תיאור הקורס *
                        </label>
                        <RichTextEditor
                          content={formData.description || ''}
                          onChange={(content) => setFormData({ ...formData, description: content })}
                          placeholder="תאר את הקורס..."
                        />
                      </div>
                    
                    {/* Course Image */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">תמונה ראשית לקורס</label>
                      
                      {/* Upload Option */}
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                          <Upload className="w-4 h-4 text-gray-600" />
                          <span className="text-sm text-gray-700">
                            {uploadingCourseImage ? 'מעלה תמונה...' : 'העלה תמונה מהמחשב'}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;

                              // Validate file type
                              if (!file.type.startsWith('image/')) {
                                alert('אנא בחר קובץ תמונה בלבד');
                                return;
                              }

                              // Validate file size (max 5MB)
                              if (file.size > 5 * 1024 * 1024) {
                                alert('גודל הקובץ גדול מדי. מקסימום 5MB');
                                return;
                              }

                              setUploadingCourseImage(true);
                              try {
                                const fileExt = file.name.split('.').pop();
                                const fileName = `course-thumbnail-${Date.now()}.${fileExt}`;
                                const filePath = `course-thumbnails/${fileName}`;

                                // Try to upload to Supabase Storage
                                const { error: uploadError } = await supabase.storage
                                  .from('course-thumbnails')
                                  .upload(filePath, file, {
                                    cacheControl: '3600',
                                    upsert: true
                                  });

                                if (uploadError) {
                                  // If bucket doesn't exist, try 'avatars' bucket as fallback
                                  const fallbackPath = `course-thumbnails/${fileName}`;
                                  const { error: uploadError2 } = await supabase.storage
                                    .from('avatars')
                                    .upload(fallbackPath, file, {
                                      cacheControl: '3600',
                                      upsert: true
                                    });

                                  if (uploadError2) {
                                    // If both fail, use base64 as fallback
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      const base64 = reader.result as string;
                                      setFormData({ ...formData, thumbnail_url: base64 });
                                      setUploadingCourseImage(false);
                                    };
                                    reader.readAsDataURL(file);
                                    return;
                                  } else {
                                    const { data: { publicUrl } } = supabase.storage
                                      .from('avatars')
                                      .getPublicUrl(fallbackPath);
                                    setFormData({ ...formData, thumbnail_url: publicUrl });
                                  }
                                } else {
                                  const { data: { publicUrl } } = supabase.storage
                                    .from('course-thumbnails')
                                    .getPublicUrl(filePath);
                                  setFormData({ ...formData, thumbnail_url: publicUrl });
                                }
                              } catch (error: any) {
                                console.error('Error uploading course image:', error?.message || String(error));
                                alert('שגיאה בהעלאת התמונה. נסה שוב.');
                              } finally {
                                setUploadingCourseImage(false);
                              }
                            }}
                            disabled={uploadingCourseImage}
                          />
                        </label>
                      </div>

                      {/* Or URL Input */}
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-gray-300"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                          <span className="px-2 bg-white text-gray-500">או</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="url"
                          placeholder="https://example.com/image.jpg"
                          value={formData.thumbnail_url || ''}
                          onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                        />
                        {isAuthorized && (
                          <button
                            type="button"
                            onClick={() => {
                              setImageGalleryField('thumbnail_url');
                              setShowImageGallery(true);
                            }}
                            className="px-4 py-2 bg-[#F52F8E] text-white rounded-lg hover:bg-[#E01E7A] transition-colors whitespace-nowrap"
                          >
                            בחר מהגלריה
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">הזן קישור לתמונה או העלה תמונה מהמחשב{isAuthorized && ' או בחר מהגלריה'}</p>
                      
                      {/* Preview */}
                      {formData.thumbnail_url && (
                        <div className="mt-2 relative">
                          <img
                            src={formData.thumbnail_url}
                            alt="תצוגה מקדימה"
                            className="w-full h-48 object-cover rounded-lg border border-gray-200"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, thumbnail_url: '' })}
                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                            title="הסר תמונה"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {/* Pricing Fields */}
                    <div className="space-y-4 border-t border-gray-200 pt-4">
                      <h3 className="text-lg font-semibold text-gray-800">מחיר והרשאות</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">מחיר (₪)</label>
                          <input
                            type="number"
                            placeholder="0"
                            value={formData.price || ''}
                            onChange={(e) => {
                              const price = e.target.value ? parseFloat(e.target.value) : null;
                              setFormData({ 
                                ...formData, 
                                price: price,
                                is_free: !price || price === 0
                              });
                            }}
                            min="0"
                            step="0.01"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                          />
                          <p className="text-xs text-gray-500 mt-1">השאר ריק או 0 לקורס חינם</p>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">קישור תשלום (Sumit)</label>
                        <input
                          type="url"
                          placeholder="https://pay.sumit.co.il/eaxdrn/merd7f/merd7g/payment/"
                          value={formData.payment_url || ''}
                          onChange={(e) => setFormData({ ...formData, payment_url: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        />
                        <p className="text-xs text-gray-500 mt-1">קישור לדף התשלום מ-Sumit. אם לא מוגדר, ישתמש בקישור ברירת מחדל.</p>
                      </div>
                      
                      <div className="space-y-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.is_free !== false && (!formData.price || formData.price === 0)}
                              onChange={(e) => {
                                setFormData({ 
                                  ...formData, 
                                  is_free: e.target.checked,
                                  price: e.target.checked ? 0 : (formData.price || null)
                                });
                              }}
                              className="w-4 h-4 text-[#F52F8E] border-gray-300 rounded focus:ring-[#F52F8E]"
                            />
                            <span className="text-sm font-medium text-gray-700">קורס חינם</span>
                          </label>
                          
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.is_premium_only || false}
                              onChange={(e) => {
                                const isPremiumOnly = e.target.checked;
                                setFormData({ 
                                  ...formData, 
                                  is_premium_only: isPremiumOnly,
                                  // If premium only is checked, uncheck free for premium
                                  is_free_for_premium: isPremiumOnly ? false : formData.is_free_for_premium
                                });
                              }}
                              className="w-4 h-4 text-[#F52F8E] border-gray-300 rounded focus:ring-[#F52F8E]"
                            />
                            <span className="text-sm font-medium text-gray-700">קורס לפרימיום בלבד</span>
                          </label>
                          
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.is_free_for_premium || false}
                              onChange={(e) => {
                                const isFreeForPremium = e.target.checked;
                                setFormData({ 
                                  ...formData, 
                                  is_free_for_premium: isFreeForPremium,
                                  // If free for premium is checked, uncheck premium only and ensure price is set
                                  is_premium_only: isFreeForPremium ? false : formData.is_premium_only,
                                  is_free: isFreeForPremium ? false : formData.is_free
                                });
                              }}
                              disabled={!formData.price || formData.price === 0}
                              className="w-4 h-4 text-[#F52F8E] border-gray-300 rounded focus:ring-[#F52F8E] disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <span className="text-sm font-medium text-gray-700">
                              חינם לפרימיום בלבד
                              {(!formData.price || formData.price === 0) && (
                                <span className="text-xs text-gray-500 block mt-1">(נדרש להגדיר מחיר)</span>
                              )}
                            </span>
                          </label>
                          
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.is_sequential || false}
                              onChange={(e) => setFormData({ ...formData, is_sequential: e.target.checked })}
                              className="w-4 h-4 text-[#F52F8E] border-gray-300 rounded focus:ring-[#F52F8E]"
                            />
                            <span className="text-sm font-medium text-gray-700">קורס היררכי</span>
                          </label>
                          <p className="text-xs text-gray-500 mt-1 mr-6">בקורס היררכי, התלמידים חייבים לסיים שיעור לפני מעבר לשיעור הבא</p>
                        </div>
                      
                      {/* Status */}
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">סטטוס הקורס</label>
                        <select
                          value={formData.status || 'published'}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value as 'draft' | 'published' })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F52F8E]"
                        >
                          <option value="published">מפורסם</option>
                          <option value="draft">טיוטה</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">קורסים בטיוטה לא יוצגו לקהל הרחב, רק למנהלים</p>
                      </div>
                    </div>
                    
                    {/* Tags */}
                    
                    {/* Tags */}
                    <div className="space-y-4 border-t border-gray-200 pt-4">
                      <TagSelector
                        selectedTagIds={formData.selectedTagIds || []}
                        onSelectionChange={(tagIds) => setFormData({ ...formData, selectedTagIds: tagIds })}
                        availableTags={approvedTags}
                      />
                    </div>
                    
                    {/* Course Sections */}
                    <div className="space-y-4 border-t border-gray-200 pt-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-800">חלקים ושיעורים</h3>
                        <button
                          type="button"
                          onClick={() => {
                            const newSection = {
                              id: `section-${Date.now()}`,
                              title: `חלק ${courseSections.length + 1}`,
                              lessons: []
                            }
                            setCourseSections([...courseSections, newSection])
                          }}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          הוסף חלק
                        </button>
                      </div>
                      
                      {courseSections.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 border border-gray-200 rounded-lg bg-gray-50">
                          <p className="text-sm mb-2">אין חלקים ושיעורים</p>
                          <p className="text-xs">לחץ על "הוסף חלק" כדי להתחיל להוסיף שיעורים</p>
                        </div>
                      ) : (
                        courseSections.map((section, sectionIndex) => (
                        <div key={section.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                          <div className="flex items-center gap-2 mb-3">
                            <input
                              type="text"
                              placeholder="שם החלק (למשל: חלק א')"
                              value={section.title}
                              onChange={(e) => {
                                const updated = [...courseSections]
                                updated[sectionIndex].title = e.target.value
                                setCourseSections(updated)
                              }}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                              dir="rtl"
                              lang="he"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const updated = courseSections.filter((_, i) => i !== sectionIndex)
                                setCourseSections(updated)
                              }}
                              className="p-2 text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <div className="space-y-2">
                            {section.lessons.length === 0 ? (
                              <div className="text-center py-4 text-gray-400 text-sm">
                                אין שיעורים בחלק זה
                              </div>
                            ) : (
                              section.lessons.map((lesson, lessonIndex) => (
                              <div key={lesson.id} className="flex items-center gap-2 bg-white p-3 rounded border border-gray-200">
                                <input
                                  type="text"
                                  placeholder="שם השיעור"
                                  value={lesson.title}
                                  onChange={(e) => {
                                    const updated = [...courseSections]
                                    updated[sectionIndex].lessons[lessonIndex].title = e.target.value
                                    setCourseSections(updated)
                                  }}
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                  dir="rtl"
                                  lang="he"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingLesson({lessonId: lesson.id, sectionIndex, lessonIndex})
                                    setEditingLessonData({
                                      title: lesson.title || '',
                                      description: lesson.description || '',
                                      video_url: lesson.video_url || '',
                                      qa_section: lesson.qa_section || [],
                                      key_points: lesson.key_points || []
                                    })
                                  }}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                  title="ערוך שיעור"
                                >
                                  <Edit className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...courseSections]
                                    updated[sectionIndex].lessons = updated[sectionIndex].lessons.filter((_, i) => i !== lessonIndex)
                                    setCourseSections(updated)
                                  }}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...courseSections]
                                updated[sectionIndex].lessons.push({
                                  id: `lesson-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                  title: '',
                                  description: '',
                                  video_url: '',
                                  duration_minutes: 0
                                })
                                setCourseSections(updated)
                              }}
                              className="w-full px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm flex items-center justify-center gap-2"
                            >
                              <Plus className="w-3 h-3" />
                              הוסף שיעור לחלק זה
                            </button>
                          </div>
                        </div>
                      ))
                      )}
                    </div>
                  </div>
                )}
                {activeTab === 'blog' && (
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="כותרת הפוסט *"
                      value={formData.title || ''}
                      onChange={(e) => {
                        const slug = e.target.value
                          .toLowerCase()
                          .replace(/[^\u0590-\u05FF\w\s-]/g, '')
                          .replace(/\s+/g, '-')
                          .replace(/-+/g, '-')
                          .trim();
                        setFormData({ ...formData, title: e.target.value, slug })
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Slug (אוטומטי)"
                      value={formData.slug || ''}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    />
                    <textarea
                      placeholder="תקציר (excerpt)"
                      value={formData.excerpt || ''}
                      onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                      dir="rtl"
                      lang="he"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      rows={3}
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        תוכן הפוסט *
                      </label>
                      <div className="relative" dir="rtl">
                        <RichTextEditor
                          content={formData.content || ''}
                          onChange={(content) => setFormData({ ...formData, content })}
                          placeholder="כתוב את תוכן הפוסט כאן..."
                          userId={currentUser?.user_id || currentUser?.id}
                        />
                      </div>
                    </div>
                    <input
                      type="url"
                      placeholder="קישור לתמונת כותרת"
                      value={formData.featured_image_url || ''}
                      onChange={(e) => setFormData({ ...formData, featured_image_url: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    <input
                      type="number"
                      placeholder="זמן קריאה (דקות)"
                      value={formData.read_time_minutes || 5}
                      onChange={(e) => setFormData({ ...formData, read_time_minutes: parseInt(e.target.value) || 5 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.is_published !== false}
                        onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <span>פורסם (חובה כדי שהפוסט יופיע בבלוג)</span>
                    </label>
                    <TagSelector
                      selectedTagIds={formData.selectedTagIds || []}
                      onSelectionChange={(tagIds) => setFormData({ ...formData, selectedTagIds: tagIds })}
                      availableTags={approvedTags}
                    />
                  </div>
                )}
                {activeTab === 'reports' && (
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="כותרת הדיווח *"
                      value={formData.title || ''}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                    <div className="relative" dir="rtl">
                      <RichTextEditor
                        content={formData.content || ''}
                        onChange={(content) => setFormData({ ...formData, content })}
                        placeholder="תוכן הדיווח..."
                        userId={currentUser?.user_id || currentUser?.id}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        תאריך יצירה (אופציונלי - אם לא תזין, יישמר התאריך הנוכחי)
                      </label>
                      <DatePicker
                        selected={formData.created_at ? new Date(formData.created_at) : null}
                        onChange={(date: Date | null) => {
                          if (date) {
                            setFormData({ ...formData, created_at: date.toISOString() });
                          } else {
                            const { created_at, ...rest } = formData;
                            setFormData(rest);
                          }
                        }}
                        locale={he}
                        dateFormat="dd/MM/yyyy HH:mm"
                        showTimeSelect
                        timeFormat="HH:mm"
                        timeIntervals={15}
                        placeholderText="בחר תאריך ושעה"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        calendarClassName="rtl"
                        isClearable
                        todayButton="היום"
                        showPopperArrow={false}
                        wrapperClassName="w-full"
                      />
                    </div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.is_published !== false}
                        onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <span>פורסם (חובה כדי שהדיווח יופיע בקרוסלה)</span>
                    </label>
                  </div>
                )}
                {activeTab === 'events' && (
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="כותרת האירוע *"
                      value={formData.title || ''}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      dir="rtl"
                      lang="he"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        תיאור האירוע
                      </label>
                      <RichTextEditor
                        content={formData.description || ''}
                        onChange={(content) => setFormData({ ...formData, description: content })}
                        placeholder="תאר את האירוע..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">תאריך ושעה של האירוע *</label>
                      <DatePicker
                        selected={eventSelectedDate}
                        onChange={(date: Date | null) => {
                            if (date) {
                              // Convert date to YYYY-MM-DD format using local timezone
                              const year = date.getFullYear();
                              const month = String(date.getMonth() + 1).padStart(2, '0');
                              const day = String(date.getDate()).padStart(2, '0');
                              const eventDate = `${year}-${month}-${day}`;
                              const eventTime = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:00`;
                              setFormData({ 
                                ...formData, 
                                event_date: eventDate,
                                event_time: eventTime
                              });
                            } else {
                              setFormData({ 
                                ...formData, 
                                event_date: null,
                                event_time: ''
                              });
                            }
                          }}
                          locale={he}
                          dateFormat="dd/MM/yyyy HH:mm"
                          showTimeSelect
                          timeFormat="HH:mm"
                          timeIntervals={15}
                          placeholderText="בחר תאריך ושעה"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                          calendarClassName="rtl"
                          isClearable
                          todayButton="היום"
                          showPopperArrow={false}
                          wrapperClassName="w-full"
                        />
                      </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">סוג האירוע</label>
                        <select
                          value={formData.event_type || 'live'}
                          onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="live">לייב</option>
                          <option value="webinar">וובינר</option>
                          <option value="workshop">סדנה</option>
                          <option value="qa">שאלות ותשובות</option>
                          <option value="other">אחר</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">סטטוס</label>
                        <select
                          value={formData.status || 'upcoming'}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="upcoming">קרוב</option>
                          <option value="active">פעיל (במהלך הלייב)</option>
                          <option value="completed">הושלם</option>
                          <option value="cancelled">בוטל</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">מיקום</label>
                      <input
                        type="text"
                        placeholder="מיקום (למשל: Zoom, Google Meet)"
                        value={formData.location || ''}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div className="border-t border-gray-200 pt-4">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">Zoom Meeting</h3>
                      
                      {/* Zoom Meetings Dropdown */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          בחר פגישת Zoom (אופציונלי)
                        </label>
                        {loadingZoomMeetings ? (
                          <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                            טוען פגישות...
                          </div>
                        ) : zoomMeetings.length > 0 ? (
                          <select
                            value={formData.zoom_meeting_id || ''}
                            onChange={(e) => {
                              if (e.target.value) {
                                handleZoomMeetingSelect(e.target.value)
                              } else {
                                setFormData({ ...formData, zoom_meeting_id: '', zoom_meeting_password: '' })
                              }
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                          >
                            <option value="">-- בחר פגישה --</option>
                            {zoomMeetings.map((meeting: any) => {
                              const startDate = meeting.start_time ? new Date(meeting.start_time) : null
                              const dateStr = startDate ? startDate.toLocaleDateString('he-IL', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : 'תאריך לא זמין'
                              return (
                                <option key={meeting.id} value={meeting.id}>
                                  {meeting.topic} - {dateStr}
                                </option>
                              )
                            })}
                          </select>
                        ) : (
                          <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                            לא נמצאו פגישות Zoom או שגיאה בטעינה
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={loadZoomMeetings}
                          className="mt-2 text-sm text-[#F52F8E] hover:text-[#E01E7A] transition-colors"
                        >
                          רענן רשימת פגישות
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Zoom Meeting ID</label>
                          <input
                            type="text"
                            placeholder="Zoom Meeting ID"
                            value={formData.zoom_meeting_id || ''}
                            onChange={(e) => setFormData({ ...formData, zoom_meeting_id: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Zoom Meeting Password (אופציונלי)</label>
                          <input
                            type="text"
                            placeholder="סיסמת פגישה"
                            value={formData.zoom_meeting_password || ''}
                            onChange={(e) => setFormData({ ...formData, zoom_meeting_password: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="border-t border-gray-200 pt-4">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">הקלטה</h3>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          בחר הקלטה (אופציונלי - להצגה כשהלייב הסתיים)
                        </label>
                        {recordings.length > 0 ? (
                          <select
                            value={formData.recording_id || ''}
                            onChange={(e) => setFormData({ ...formData, recording_id: e.target.value || undefined })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                          >
                            <option value="">-- בחר הקלטה --</option>
                            {recordings.map((recording: any) => (
                              <option key={recording.id} value={recording.id}>
                                {recording.title}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                            אין הקלטות זמינות. הוסף הקלטות בטאב "הקלטות"
                          </div>
                        )}
                        <p className="mt-2 text-xs text-gray-500">
                          💡 הקלטה תוצג רק כשהלייב הושלם (status = completed)
                        </p>
                      </div>
                    </div>
                    <div className="border-t border-gray-200 pt-4">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">מנחה</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">שם המנחה</label>
                          <input
                            type="text"
                            placeholder="שם המנחה"
                            value={formData.instructor_name || ''}
                            onChange={(e) => setFormData({ ...formData, instructor_name: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">תפקיד המנחה</label>
                          <input
                            type="text"
                            placeholder="תפקיד"
                            value={formData.instructor_title || ''}
                            onChange={(e) => setFormData({ ...formData, instructor_title: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">URL תמונת המנחה</label>
                          <div className="flex gap-2">
                            <input
                              type="url"
                              placeholder="URL תמונה"
                              value={formData.instructor_avatar_url || ''}
                              onChange={(e) => setFormData({ ...formData, instructor_avatar_url: e.target.value })}
                              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                            />
                            {isAuthorized && (
                              <button
                                type="button"
                                onClick={() => {
                                  setImageGalleryField('instructor_avatar_url');
                                  setShowImageGallery(true);
                                }}
                                className="px-4 py-2 bg-[#F52F8E] text-white rounded-lg hover:bg-[#E01E7A] transition-colors whitespace-nowrap"
                              >
                                בחר מהגלריה
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="border-t border-gray-200 pt-4">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">תוכן נוסף</h3>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">על האירוע</label>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            תיאור מפורט על האירוע
                          </label>
                          <RichTextEditor
                            content={formData.about_text || ''}
                            onChange={(content) => setFormData({ ...formData, about_text: content })}
                            placeholder="תאר את האירוע בפירוט..."
                          />
                        </div>
                      </div>
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">נקודות למידה (לחיצה על Enter להוספת נקודה)</label>
                        <div className="space-y-2">
                          {(formData.learning_points || []).map((point: string, index: number) => (
                            <div key={index} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={point}
                                onChange={(e) => {
                                  const updated = [...(formData.learning_points || [])]
                                  updated[index] = e.target.value
                                  setFormData({ ...formData, learning_points: updated })
                                }}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                                dir="rtl"
                                lang="he"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = (formData.learning_points || []).filter((_: any, i: number) => i !== index)
                                  setFormData({ ...formData, learning_points: updated })
                                }}
                                className="p-2 text-red-600 hover:bg-red-50 rounded"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({ 
                                ...formData, 
                                learning_points: [...(formData.learning_points || []), ''] 
                              })
                            }}
                            className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center gap-2"
                          >
                            <Plus className="w-4 h-4" />
                            הוסף נקודת למידה
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="border-t border-gray-200 pt-4">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">הגדרות נוספות</h3>
                      <div className="space-y-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.is_recurring || false}
                            onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                            className="w-4 h-4 text-[#F52F8E] border-gray-300 rounded focus:ring-[#F52F8E]"
                          />
                          <span>אירוע חוזר</span>
                        </label>
                        {formData.is_recurring && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">תבנית חזרה</label>
                            <input
                              type="text"
                              placeholder="למשל: שבועי, חודשי"
                              value={formData.recurring_pattern || ''}
                              onChange={(e) => setFormData({ ...formData, recurring_pattern: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {activeTab === 'projects' && (
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="כותרת הפרויקט *"
                      value={formData.title || ''}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      dir="rtl"
                      lang="he"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        תיאור הפרויקט *
                      </label>
                      <RichTextEditor
                        content={formData.description || ''}
                        onChange={(content) => setFormData({ ...formData, description: content })}
                        placeholder="תאר את הפרויקט..."
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">מפרסם (User ID) *</label>
                        <input
                          type="text"
                          placeholder="User ID"
                          value={formData.user_id || ''}
                          onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">סטטוס</label>
                        <select
                          value={formData.status || 'open'}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="open">פתוח</option>
                          <option value="in_progress">בביצוע</option>
                          <option value="completed">הושלם</option>
                          <option value="closed">סגור</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">תקציב מינימלי</label>
                        <input
                          type="number"
                          placeholder="0"
                          value={formData.budget_min || ''}
                          onChange={(e) => setFormData({ ...formData, budget_min: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">תקציב מקסימלי</label>
                        <input
                          type="number"
                          placeholder="0"
                          value={formData.budget_max || ''}
                          onChange={(e) => setFormData({ ...formData, budget_max: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">מטבע</label>
                        <select
                          value={formData.budget_currency || 'ILS'}
                          onChange={(e) => setFormData({ ...formData, budget_currency: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="ILS">₪ ILS</option>
                          <option value="USD">$ USD</option>
                          <option value="EUR">€ EUR</option>
                        </select>
                      </div>
                    </div>
                    <TagSelector
                      selectedTagIds={formData.selectedTagIds || []}
                      onSelectionChange={(tagIds) => setFormData({ ...formData, selectedTagIds: tagIds })}
                      availableTags={approvedTags}
                    />
                  </div>
                )}
                {activeTab === 'tags' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">שם התגית *</label>
                      <input
                        type="text"
                        placeholder="למשל: Make.com, API, Automation"
                        value={formData.name || ''}
                        onChange={(e) => {
                          const name = e.target.value
                          // Auto-generate slug from name if slug is empty or if name changed
                          let slug = formData.slug || ''
                          if (!slug || slug === generateSlug(formData.name || '')) {
                            slug = name.toLowerCase()
                              .replace(/[^a-z0-9\s-]/g, '')
                              .replace(/\s+/g, '-')
                              .replace(/-+/g, '-')
                              .trim()
                          }
                          setFormData({ ...formData, name, slug })
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        dir="rtl"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Slug</label>
                      <input
                        type="text"
                        placeholder="make-com, api, automation"
                        value={formData.slug || ''}
                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono"
                      />
                      <p className="mt-1 text-xs text-gray-500">נוצר אוטומטית משם התגית (אופציונלי)</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">תיאור</label>
                      <textarea
                        placeholder="תיאור קצר של התגית"
                        value={formData.description || ''}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        rows={3}
                        dir="rtl"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">צבע (Hex)</label>
                        <input
                          type="text"
                          placeholder="#F52F8E"
                          value={formData.color || ''}
                          onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">אייקון</label>
                        <input
                          type="text"
                          placeholder="למשל: 🚀, ⚡, 🔥"
                          value={formData.icon || ''}
                          onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.is_approved !== false}
                          onChange={(e) => setFormData({ ...formData, is_approved: e.target.checked })}
                          className="w-4 h-4 text-[#F52F8E] border-gray-300 rounded focus:ring-[#F52F8E]"
                        />
                        <span>מאושר (תגית מאושרת תוצג לכל המשתמשים)</span>
                      </label>
                    </div>
                    {unapprovedTags.length > 0 && (
                      <div className="border-t border-gray-200 pt-4">
                        <h4 className="font-semibold text-gray-800 mb-3">תגיות ממתינות לאישור ({unapprovedTags.length})</h4>
                      </div>
                    )}
                  </div>
                )}
                {activeTab === 'forums' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">שם פורום (name) *</label>
                      <input
                        type="text"
                        placeholder="למשל: n8n, crm, make-com"
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        dir="ltr"
                        disabled={editing !== 'new'}
                      />
                      <p className="mt-1 text-xs text-gray-500">מזהה ייחודי לפורום (לא ניתן לשנות לאחר יצירה)</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">שם תצוגה (display_name) *</label>
                      <input
                        type="text"
                        placeholder="למשל: N8N, עבודה עם CRM"
                        value={formData.display_name || ''}
                        onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        dir="rtl"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">תיאור</label>
                      <textarea
                        placeholder="תיאור קצר של הפורום"
                        value={formData.description || ''}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        rows={3}
                        dir="rtl"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">צבע רקע (header_color)</label>
                      <input
                        type="text"
                        placeholder="bg-blue-900 או bg-gradient-to-r from-green-600 to-blue-600"
                        value={formData.header_color || ''}
                        onChange={(e) => setFormData({ ...formData, header_color: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        dir="ltr"
                      />
                      <p className="mt-1 text-xs text-gray-500">Tailwind CSS classes - ניתן להשתמש בגרדיאנטים</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">טקסט לוגו (logo_text)</label>
                      <input
                        type="text"
                        placeholder="למשל: N8N, CRM"
                        value={formData.logo_text || ''}
                        onChange={(e) => setFormData({ ...formData, logo_text: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.is_active !== false}
                          onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                          className="w-4 h-4 text-[#F52F8E] border-gray-300 rounded focus:ring-[#F52F8E]"
                        />
                        <span>פעיל (פורום פעיל יוצג למשתמשים)</span>
                      </label>
                    </div>
                  </div>
                )}
                {activeTab === 'tags' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">שם התגית *</label>
                      <input
                        type="text"
                        placeholder="למשל: Make.com, API, Automation"
                        value={formData.name || ''}
                        onChange={(e) => {
                          const name = e.target.value
                          // Auto-generate slug from name if slug is empty or if name changed
                          let slug = formData.slug || ''
                          if (!slug || slug === generateSlug(formData.name || '')) {
                            slug = name.toLowerCase()
                              .replace(/[^a-z0-9\s-]/g, '')
                              .replace(/\s+/g, '-')
                              .replace(/-+/g, '-')
                              .trim()
                          }
                          setFormData({ ...formData, name, slug })
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        dir="rtl"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Slug</label>
                      <input
                        type="text"
                        placeholder="make-com, api, automation"
                        value={formData.slug || ''}
                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono"
                      />
                      <p className="mt-1 text-xs text-gray-500">נוצר אוטומטית משם התגית (אופציונלי)</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">תיאור</label>
                      <textarea
                        placeholder="תיאור קצר של התגית"
                        value={formData.description || ''}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        rows={3}
                        dir="rtl"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">צבע (Hex)</label>
                        <input
                          type="text"
                          placeholder="#F52F8E"
                          value={formData.color || ''}
                          onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">אייקון</label>
                        <input
                          type="text"
                          placeholder="למשל: 🚀, ⚡, 🔥"
                          value={formData.icon || ''}
                          onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.is_approved !== false}
                          onChange={(e) => setFormData({ ...formData, is_approved: e.target.checked })}
                          className="w-4 h-4 text-[#F52F8E] border-gray-300 rounded focus:ring-[#F52F8E]"
                        />
                        <span>מאושר (תגית מאושרת תוצג לכל המשתמשים)</span>
                      </label>
                    </div>
                    {unapprovedTags.length > 0 && (
                      <div className="border-t border-gray-200 pt-4">
                        <h4 className="font-semibold text-gray-800 mb-3">תגיות ממתינות לאישור ({unapprovedTags.length})</h4>
                        <div className="space-y-2">
                          {unapprovedTags.map((tag) => (
                            <div key={tag.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                              <div>
                                <span className="font-medium">{tag.name}</span>
                                {tag.description && (
                                  <p className="text-sm text-gray-600 mt-1">{tag.description}</p>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={async () => {
                                    const { error } = await updateTag(tag.id, { is_approved: true })
                                    if (error) {
                                      alert(`שגיאה באישור התגית: ${error.message}`)
                                    } else {
                                      await loadData()
                                      alert('התגית אושרה בהצלחה!')
                                    }
                                  }}
                                  className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                                >
                                  אישר
                                </button>
                                <button
                                  onClick={() => handleDelete(tag.id)}
                                  className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                                >
                                  דחה
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => editing === 'new' ? handleCreate() : handleUpdate(editing)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#F52F8E] text-white rounded-lg hover:bg-[#E01E7A] transition-colors"
                  >
                    <Save className="w-5 h-5" />
                    שמור
                  </button>
                  <button
                    onClick={() => {
                      setEditing(null)
                      setFormData({})
                      setCourseSections([])
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    <X className="w-5 h-5" />
                    ביטול
                  </button>
                </div>
              </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-right py-3 px-4 w-12">
                      <input
                        type="checkbox"
                        checked={selectedItems.size > 0 && selectedItems.size === getCurrentItems().length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            const allIds = getCurrentItems().map(item => item.id || item.user_id)
                            setSelectedItems(new Set(allIds))
                          } else {
                            setSelectedItems(new Set())
                          }
                        }}
                        className="w-4 h-4 text-[#F52F8E] border-gray-300 rounded focus:ring-[#F52F8E]"
                      />
                    </th>
                    {activeTab === 'users' && (
                      <>
                        <th className="text-right py-3 px-4">ID</th>
                        <th className="text-right py-3 px-4">User ID</th>
                        <th className="text-right py-3 px-4">שם תצוגה</th>
                        <th className="text-right py-3 px-4">כינוי</th>
                        <th className="text-right py-3 px-4">אימייל</th>
                        <th className="text-right py-3 px-4">רמת ניסיון</th>
                        <th className="text-right py-3 px-4">תפקיד</th>
                        <th className="text-right py-3 px-4">נקודות</th>
                        <th className="text-right py-3 px-4">פעולות</th>
                      </>
                    )}
                    {activeTab === 'posts' && (
                      <>
                        <th className="text-right py-3 px-4">ID</th>
                        <th className="text-right py-3 px-4">תוכן</th>
                        <th className="text-right py-3 px-4">משתמש</th>
                        <th className="text-right py-3 px-4">תאריך</th>
                        <th className="text-right py-3 px-4">פעולות</th>
                      </>
                    )}
                    {activeTab === 'roles' && (
                      <>
                        <th className="text-right py-3 px-4"></th>
                        <th className="text-right py-3 px-4">ID</th>
                        <th className="text-right py-3 px-4">שם</th>
                        <th className="text-right py-3 px-4">שם תצוגה</th>
                        <th className="text-right py-3 px-4">תיאור</th>
                        <th className="text-right py-3 px-4">פעולות</th>
                      </>
                    )}
                    {activeTab === 'subscriptions' && (
                      <>
                        <th className="text-right py-3 px-4">משתמש</th>
                        <th className="text-right py-3 px-4">מנוי</th>
                        <th className="text-right py-3 px-4">מחיר</th>
                        <th className="text-right py-3 px-4">תאריך התחלה</th>
                        <th className="text-right py-3 px-4">תאריך סיום</th>
                        <th className="text-right py-3 px-4">סטטוס</th>
                        <th className="text-right py-3 px-4">תשלומים</th>
                      </>
                    )}
                    {activeTab === 'payments' && (
                      <>
                        <th className="text-right py-3 px-4">משתמש</th>
                        <th className="text-right py-3 px-4">מנוי</th>
                        <th className="text-right py-3 px-4">סכום</th>
                        <th className="text-right py-3 px-4">תאריך תשלום</th>
                        <th className="text-right py-3 px-4">סטטוס</th>
                        <th className="text-right py-3 px-4">אמצעי תשלום</th>
                        <th className="text-right py-3 px-4">חשבונית</th>
                        <th className="text-right py-3 px-4">פעולות</th>
                      </>
                    )}
                    {activeTab === 'recordings' && (
                      <>
                        <th className="text-right py-3 px-4">כותרת</th>
                        <th className="text-right py-3 px-4">משך זמן</th>
                        <th className="text-right py-3 px-4">צפיות</th>
                        <th className="text-right py-3 px-4">תאריך</th>
                        <th className="text-right py-3 px-4">פעולות</th>
                      </>
                    )}
                    {activeTab === 'resources' && (
                      <>
                        <th className="text-right py-3 px-4">סוג</th>
                        <th className="text-right py-3 px-4">כותרת</th>
                        <th className="text-right py-3 px-4">קטגוריה</th>
                        <th className="text-right py-3 px-4">מחבר</th>
                        <th className="text-right py-3 px-4">לייקים</th>
                        <th className="text-right py-3 px-4">קובץ</th>
                        <th className="text-right py-3 px-4">הורדות</th>
                        <th className="text-right py-3 px-4">פעולות</th>
                      </>
                    )}
                    {activeTab === 'blog' && (
                      <>
                        <th className="text-right py-3 px-4">כותרת</th>
                        <th className="text-right py-3 px-4">קטגוריה</th>
                        <th className="text-right py-3 px-4">מחבר</th>
                        <th className="text-right py-3 px-4">צפיות</th>
                        <th className="text-right py-3 px-4">תאריך</th>
                        <th className="text-right py-3 px-4">פעולות</th>
                      </>
                    )}
                    {activeTab === 'badges' && (
                      <>
                        <th className="text-right py-3 px-4">תג</th>
                        <th className="text-right py-3 px-4">סף נקודות</th>
                        <th className="text-right py-3 px-4">תיאור</th>
                        <th className="text-right py-3 px-4">סדר תצוגה</th>
                        <th className="text-right py-3 px-4">סטטוס</th>
                        <th className="text-right py-3 px-4">פעולות</th>
                      </>
                    )}
                    {activeTab === 'reports' && (
                      <>
                        <th className="text-right py-3 px-4">כותרת</th>
                        <th className="text-right py-3 px-4">צפיות</th>
                        <th className="text-right py-3 px-4">פורסם</th>
                        <th className="text-right py-3 px-4">תאריך</th>
                        <th className="text-right py-3 px-4">פעולות</th>
                      </>
                    )}
                    {activeTab === 'courses' && (
                      <>
                        <th className="text-right py-3 px-4">כותרת</th>
                        <th className="text-right py-3 px-4">קטגוריה</th>
                        <th className="text-right py-3 px-4">רמת קושי</th>
                        <th className="text-right py-3 px-4">משך זמן</th>
                        <th className="text-right py-3 px-4">שיעורים</th>
                        <th className="text-right py-3 px-4">סטטוס</th>
                        <th className="text-right py-3 px-4">פעולות</th>
                      </>
                    )}
                    {activeTab === 'events' && (
                      <>
                        <th className="text-right py-3 px-4">כותרת</th>
                        <th className="text-right py-3 px-4">סוג</th>
                        <th className="text-right py-3 px-4">תאריך</th>
                        <th className="text-right py-3 px-4">שעה</th>
                        <th className="text-right py-3 px-4">סטטוס</th>
                        <th className="text-right py-3 px-4">מיקום</th>
                        <th className="text-right py-3 px-4">Zoom ID</th>
                        <th className="text-right py-3 px-4">פעולות</th>
                      </>
                    )}
                    {activeTab === 'projects' && (
                      <>
                        <th className="text-right py-3 px-4">כותרת</th>
                        <th className="text-right py-3 px-4">מפרסם</th>
                        <th className="text-right py-3 px-4">סטטוס</th>
                        <th className="text-right py-3 px-4">תאריך</th>
                        <th className="text-right py-3 px-4">הגשות</th>
                        <th className="text-right py-3 px-4">פעולות</th>
                      </>
                    )}
                    {activeTab === 'tags' && (
                      <>
                        <th className="text-right py-3 px-4">שם</th>
                        <th className="text-right py-3 px-4">Slug</th>
                        <th className="text-right py-3 px-4">תיאור</th>
                        <th className="text-right py-3 px-4">שימושים</th>
                        <th className="text-right py-3 px-4">סטטוס</th>
                        <th className="text-right py-3 px-4">פעולות</th>
                      </>
                    )}
                    {activeTab === 'feedbacks' && (
                      <>
                        <th className="text-right py-3 px-4">נושא</th>
                        <th className="text-right py-3 px-4">סוג</th>
                        <th className="text-right py-3 px-4">תאריך</th>
                        <th className="text-right py-3 px-4">פעולות</th>
                      </>
                    )}
                    {activeTab === 'forums' && (
                      <>
                        <th className="text-right py-3 px-4">שם</th>
                        <th className="text-right py-3 px-4">שם תצוגה</th>
                        <th className="text-right py-3 px-4">תיאור</th>
                        <th className="text-right py-3 px-4">פוסטים</th>
                        <th className="text-right py-3 px-4">סטטוס</th>
                        <th className="text-right py-3 px-4">פעולות</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {activeTab === 'users' && users.map((user) => (
                    <tr key={user.id} className="border-b border-gray-100">
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(user.id)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedItems)
                            if (e.target.checked) {
                              newSelected.add(user.id)
                            } else {
                              newSelected.delete(user.id)
                            }
                            setSelectedItems(newSelected)
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 text-[#F52F8E] border-gray-300 rounded focus:ring-[#F52F8E]"
                        />
                      </td>
                      <td className="py-3 px-4 text-sm font-mono">{user.id.substring(0, 8)}...</td>
                      <td className="py-3 px-4 font-mono text-xs">{user.user_id?.substring(0, 8)}...</td>
                      <td className="py-3 px-4">{user.display_name || '-'}</td>
                      <td className="py-3 px-4">{user.nickname || '-'}</td>
                      <td className="py-3 px-4">{user.email || '-'}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                          {user.experience_level || 'מתחיל'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-[#F52F8E] text-white text-xs rounded">
                          {(() => {
                            // Handle different possible structures of roles data
                            const role = user.roles;
                            if (role && typeof role === 'object') {
                              // If roles is an object with display_name
                              if ('display_name' in role) {
                                return role.display_name;
                              }
                              // If roles is an array, get first item
                              if (Array.isArray(role) && role.length > 0 && role[0]?.display_name) {
                                return role[0].display_name;
                              }
                            }
                            // Fallback to role (singular) or default
                            return user.role?.display_name || 'מנוי חינמי';
                          })()}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                          {user.points || 0} נק'
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openCourseAssignmentModal(user.user_id || user.id)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded"
                            title="נהל קורסים"
                          >
                            <BookOpen className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditing(user.id)
                              // Make sure role_id is set correctly
                              setFormData({
                                ...user,
                                role_id: user.role_id || user.roles?.id || user.role?.id || ''
                              })
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {activeTab === 'posts' && posts.map((post) => (
                    <tr key={post.id} className="border-b border-gray-100">
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(post.id)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedItems)
                            if (e.target.checked) {
                              newSelected.add(post.id)
                            } else {
                              newSelected.delete(post.id)
                            }
                            setSelectedItems(newSelected)
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 text-[#F52F8E] border-gray-300 rounded focus:ring-[#F52F8E]"
                        />
                      </td>
                      <td className="py-3 px-4 text-sm">{post.id.substring(0, 8)}...</td>
                      <td className="py-3 px-4 max-w-md truncate">{post.content || '-'}</td>
                      <td className="py-3 px-4">{post.profiles?.full_name || post.user_id}</td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {new Date(post.created_at).toLocaleDateString('he-IL')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditing(post.id)
                              setFormData(post)
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(post.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {activeTab === 'roles' && roles.map((role) => (
                    <tr key={role.id} className="border-b border-gray-100">
                      <td className="py-3 px-4 text-sm font-mono">{role.id?.substring(0, 8)}...</td>
                      <td className="py-3 px-4 font-medium">{role.name}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-[#F52F8E] text-white text-xs rounded">
                          {role.display_name}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{role.description || '-'}</td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditing(role.id)
                              setFormData(role)
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {activeTab === 'subscriptions' && subscriptions.map((subscription: any) => {
                    const user = subscription.profiles || {};
                    const role = subscription.roles || {};
                    const payments = subscription.payments || [];
                    
                    function formatDate(dateString: string | null | undefined): string {
                      if (!dateString) return '-';
                      return new Date(dateString).toLocaleDateString('he-IL', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      });
                    }

                    // Check if subscription needs warning (end_date passed + 2 days)
                    function needsWarning(endDate: string | null | undefined): boolean {
                      if (!endDate) return false;
                      const end = new Date(endDate);
                      const today = new Date();
                      const daysSinceExpiry = Math.floor((today.getTime() - end.getTime()) / (1000 * 60 * 60 * 24));
                      return daysSinceExpiry >= 2 && daysSinceExpiry < 5; // Between 2-5 days after expiry
                    }

                    // Check if subscription needs downgrade (end_date passed + 5 days)
                    function needsDowngrade(endDate: string | null | undefined): boolean {
                      if (!endDate) return false;
                      const end = new Date(endDate);
                      const today = new Date();
                      const daysSinceExpiry = Math.floor((today.getTime() - end.getTime()) / (1000 * 60 * 60 * 24));
                      return daysSinceExpiry >= 5;
                    }

                    // Check if subscription has expired
                    function isExpired(endDate: string | null | undefined): boolean {
                      if (!endDate) return false;
                      return new Date(endDate) < new Date();
                    }

                    const needsWarningFlag = needsWarning(subscription.end_date);
                    const needsDowngradeFlag = needsDowngrade(subscription.end_date);
                    const expired = isExpired(subscription.end_date);
                    
                    return (
                      <tr key={subscription.id} className={`border-b border-gray-100 hover:bg-gray-50 ${needsWarningFlag ? 'bg-yellow-50' : needsDowngradeFlag ? 'bg-red-50' : expired ? 'bg-gray-50' : ''}`}>
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={selectedItems.has(subscription.id)}
                            onChange={(e) => {
                              const newSelected = new Set(selectedItems)
                              if (e.target.checked) {
                                newSelected.add(subscription.id)
                              } else {
                                newSelected.delete(subscription.id)
                              }
                              setSelectedItems(newSelected)
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 text-[#F52F8E] border-gray-300 rounded focus:ring-[#F52F8E]"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-medium">{user.display_name || user.first_name || 'ללא שם'}</div>
                            <div className="text-xs text-gray-500">{user.email || '-'}</div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 text-xs rounded ${
                            role.name === 'premium' ? 'bg-pink-100 text-pink-700' :
                            role.name === 'admin' ? 'bg-purple-100 text-purple-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {role.display_name || role.name || 'ללא מנוי'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium">₪{role.price || 0} / חודש</span>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {formatDate(subscription.start_date)}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <div className="flex items-center gap-2">
                            {subscription.end_date ? (
                              <>
                                {formatDate(subscription.end_date)}
                                {needsWarningFlag && (
                                  <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded" title="מנוי צריך התראה (פג + 2 ימים)">
                                    ⚠️
                                  </span>
                                )}
                                {needsDowngradeFlag && subscription.status === 'active' && (
                                  <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded" title="מנוי צריך הורדה (פג + 5 ימים)">
                                    ⛔
                                  </span>
                                )}
                                {expired && subscription.status === 'active' && !needsDowngradeFlag && (
                                  <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded" title="מנוי פג">
                                    ⏰
                                  </span>
                                )}
                              </>
                            ) : (
                              'ללא הגבלה'
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 text-xs rounded ${
                            subscription.status === 'active' ? 'bg-green-100 text-green-700' :
                            subscription.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                            subscription.status === 'expired' ? 'bg-gray-100 text-gray-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {subscription.status === 'active' ? 'פעיל' :
                             subscription.status === 'cancelled' ? 'בוטל' :
                             subscription.status === 'expired' ? 'פג תוקף' :
                             'ממתין'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            {payments.length > 0 ? (
                              payments.slice(0, 3).map((payment: any) => (
                                <div key={payment.id} className="flex items-center gap-2 text-xs">
                                  <span className="font-medium">₪{payment.amount}</span>
                                  <span className="text-gray-500">
                                    {payment.payment_date ? formatDate(payment.payment_date) : '-'}
                                  </span>
                                  {payment.invoice_url ? (
                                    <a
                                      href={payment.invoice_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[#F52F8E] hover:underline"
                                      title="הורד חשבונית"
                                    >
                                      <Download className="w-3 h-3 inline" />
                                    </a>
                                  ) : (
                                    <span className="text-gray-400" title="אין קישור לחשבונית">-</span>
                                  )}
                                </div>
                              ))
                            ) : (
                              <span className="text-gray-400 text-xs">אין תשלומים</span>
                            )}
                            {payments.length > 3 && (
                              <span className="text-xs text-gray-500">+{payments.length - 3} נוספים</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {activeTab === 'payments' && payments.map((payment: any) => {
                    const user = payment.profiles || {};
                    const subscription = payment.subscriptions || {};
                    const subscriptionUser = subscription.profiles || {};
                    const subscriptionRole = subscription.roles || {};
                    
                    function formatDate(dateString: string | null | undefined): string {
                      if (!dateString) return '-';
                      return new Date(dateString).toLocaleDateString('he-IL', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      });
                    }
                    
                    return (
                      <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={selectedItems.has(payment.id)}
                            onChange={(e) => {
                              const newSelected = new Set(selectedItems)
                              if (e.target.checked) {
                                newSelected.add(payment.id)
                              } else {
                                newSelected.delete(payment.id)
                              }
                              setSelectedItems(newSelected)
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 text-[#F52F8E] border-gray-300 rounded focus:ring-[#F52F8E]"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-medium">{user.display_name || user.first_name || 'ללא שם'}</div>
                            <div className="text-xs text-gray-500">{user.email || '-'}</div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-medium">{subscriptionUser.display_name || subscriptionUser.first_name || 'ללא שם'}</div>
                            <div className="text-xs text-gray-500">
                              {subscriptionRole.display_name || subscriptionRole.name || 'ללא מנוי'}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium">₪{payment.amount} {payment.currency || 'ILS'}</span>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {payment.payment_date ? formatDate(payment.payment_date) : '-'}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 text-xs rounded ${
                            payment.status === 'completed' ? 'bg-green-100 text-green-700' :
                            payment.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            payment.status === 'failed' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {payment.status === 'completed' ? 'הושלם' :
                             payment.status === 'pending' ? 'ממתין' :
                             payment.status === 'failed' ? 'נכשל' :
                             'הוחזר'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {payment.payment_method || '-'}
                        </td>
                        <td className="py-3 px-4">
                          {payment.invoice_url ? (
                            <a
                              href={payment.invoice_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#F52F8E] hover:underline flex items-center gap-1"
                            >
                              <Download className="w-4 h-4" />
                              {payment.invoice_number || 'חשבונית'}
                            </a>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditing(payment.id)
                                setFormData({
                                  subscription_id: payment.subscription_id,
                                  user_id: payment.user_id,
                                  amount: payment.amount,
                                  currency: payment.currency || 'ILS',
                                  status: payment.status,
                                  payment_method: payment.payment_method || '',
                                  payment_date: payment.payment_date ? new Date(payment.payment_date).toISOString().slice(0, 16) : '',
                                  invoice_url: payment.invoice_url || '',
                                  invoice_number: payment.invoice_number || '',
                                  transaction_id: payment.transaction_id || ''
                                })
                              }}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(payment.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {activeTab === 'recordings' && (() => {
                    // Find the newest recording (most recent created_at)
                    const sortedRecordings = [...recordings].sort((a, b) => {
                      const aDate = new Date(a.created_at || 0).getTime();
                      const bDate = new Date(b.created_at || 0).getTime();
                      return bDate - aDate;
                    });
                    const newestRecordingId = sortedRecordings.length > 0 ? sortedRecordings[0].id : null;
                    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
                    
                    return recordings.map((recording) => {
                      const isNewest = recording.id === newestRecordingId;
                      const isRecent = recording.created_at && new Date(recording.created_at).getTime() > thirtyDaysAgo;
                      const showNewBadge = isNewest && isRecent;
                      
                      return (
                        <tr key={recording.id} className="border-b border-gray-100">
                          <td className="py-3 px-4">
                            <input
                              type="checkbox"
                              checked={selectedItems.has(recording.id)}
                              onChange={(e) => {
                                const newSelected = new Set(selectedItems)
                                if (e.target.checked) {
                                  newSelected.add(recording.id)
                                } else {
                                  newSelected.delete(recording.id)
                                }
                                setSelectedItems(newSelected)
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="w-4 h-4 text-[#F52F8E] border-gray-300 rounded focus:ring-[#F52F8E]"
                            />
                          </td>
                          <td className="py-3 px-4 font-medium">
                            <div className="flex items-center gap-2">
                              <span>{recording.title || '-'}</span>
                              {showNewBadge && (
                                <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-semibold rounded">
                                  חדש
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">{recording.duration || '-'}</td>
                          <td className="py-3 px-4">{recording.views || 0}</td>
                          <td className="py-3 px-4 text-sm text-gray-500">
                            {recording.created_at ? new Date(recording.created_at).toLocaleDateString('he-IL') : '-'}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-2">
                              <button
                                onClick={async () => {
                                  setEditing(recording.id)
                                  // Load full recording data (including qa_section and key_points) for editing
                                  try {
                                    const { data: fullRecording, error } = await getRecordingById(recording.id);
                                    if (error || !fullRecording) {
                                      console.error('Error loading full recording:', error);
                                      // Fallback to basic recording data
                                      const editData: any = { ...recording };
                                      // Load tags for this recording
                                      const { getTagsByContent } = await import('@/lib/queries/tags')
                                      const { data: recordingTags } = await getTagsByContent('recording', recording.id)
                                      editData.selectedTagIds = (Array.isArray(recordingTags) ? recordingTags.map((t: any) => t.tag?.id).filter(Boolean) : []) || []
                                      editData.key_points = [];
                                      editData.qa_section = [];
                                      setFormData(editData);
                                      return;
                                    }
                                    
                                    // Load tags for this recording
                                    const { getTagsByContent } = await import('@/lib/queries/tags')
                                    const { data: recordingTags } = await getTagsByContent('recording', fullRecording.id)
                                    
                                    // Convert category array to comma-separated string for editing (for backward compatibility)
                                    const editData: any = { ...fullRecording };
                                    if (Array.isArray(fullRecording.category)) {
                                      editData.category = fullRecording.category.join(', ');
                                    }
                                    editData.selectedTagIds = (Array.isArray(recordingTags) ? recordingTags.map((t: any) => t.tag?.id).filter(Boolean) : []) || []
                                    // Ensure key_points and qa_section are properly loaded
                                    // Parse if they are JSON strings, or use as-is if already arrays
                                    if (fullRecording.key_points) {
                                      editData.key_points = typeof fullRecording.key_points === 'string' 
                                        ? JSON.parse(fullRecording.key_points) 
                                        : fullRecording.key_points;
                                    } else {
                                      editData.key_points = [];
                                    }
                                    if (fullRecording.qa_section) {
                                      editData.qa_section = typeof fullRecording.qa_section === 'string' 
                                        ? JSON.parse(fullRecording.qa_section) 
                                        : fullRecording.qa_section;
                                    } else {
                                      editData.qa_section = [];
                                    }
                                    console.log('Loading recording for edit:', {
                                      id: fullRecording.id,
                                      title: fullRecording.title,
                                      key_points: editData.key_points,
                                      qa_section: editData.qa_section,
                                      raw_key_points: fullRecording.key_points,
                                      raw_qa_section: fullRecording.qa_section
                                    });
                                    setFormData(editData);
                                  } catch (error) {
                                    console.error('Error loading recording for edit:', error);
                                    // Fallback to basic recording data
                                    const editData = { ...recording };
                                    if (Array.isArray(recording.category)) {
                                      editData.category = recording.category.join(', ');
                                    }
                                    editData.key_points = [];
                                    editData.qa_section = [];
                                    setFormData(editData);
                                  }
                                }}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(recording.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                  {activeTab === 'resources' && resources.map((resource) => (
                    <tr key={resource.id} className="border-b border-gray-100">
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(resource.id)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedItems)
                            if (e.target.checked) {
                              newSelected.add(resource.id)
                            } else {
                              newSelected.delete(resource.id)
                            }
                            setSelectedItems(newSelected)
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 text-[#F52F8E] border-gray-300 rounded focus:ring-[#F52F8E]"
                        />
                      </td>
                      <td className="py-3 px-4">
                        {resource.type && (
                          <span className={`px-2 py-1 text-white text-xs rounded ${
                            resource.type === 'document' ? 'bg-blue-500' :
                            resource.type === 'video' ? 'bg-pink-500' :
                            resource.type === 'image' ? 'bg-green-500' :
                            resource.type === 'link' ? 'bg-purple-500' :
                            resource.type === 'audio' ? 'bg-orange-500' : 'bg-gray-500'
                          }`}>
                            {resource.type === 'document' ? 'מסמך' :
                             resource.type === 'video' ? 'וידאו' :
                             resource.type === 'image' ? 'תמונה' :
                             resource.type === 'link' ? 'קישור' :
                             resource.type === 'audio' ? 'אודיו' : resource.type}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-medium">{resource.title || '-'}</td>
                      <td className="py-3 px-4">
                        {resource.category && (
                          <span className="px-2 py-1 bg-[#F52F8E] text-white text-xs rounded">
                            {resource.category}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {resource.author?.display_name || resource.author?.first_name || '-'}
                      </td>
                      <td className="py-3 px-4">{resource.likes_count || 0}</td>
                      <td className="py-3 px-4">
                        <a 
                          href={resource.file_url || resource.external_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline text-sm"
                        >
                          {resource.file_name || 'קובץ'}
                        </a>
                      </td>
                      <td className="py-3 px-4">{resource.download_count || 0}</td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              setEditing(resource.id)
                              // Load tags for this resource
                              const { getTagsByContent } = await import('@/lib/queries/tags')
                              const { data: resourceTags } = await getTagsByContent('resource', resource.id)
                              setFormData({
                                ...resource,
                                selectedTagIds: (Array.isArray(resourceTags) ? resourceTags.map((t: any) => t.tag?.id).filter(Boolean) : []) || []
                              })
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(resource.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {activeTab === 'blog' && blogPosts.map((post) => (
                    <tr key={post.id} className="border-b border-gray-100">
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(post.id)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedItems)
                            if (e.target.checked) {
                              newSelected.add(post.id)
                            } else {
                              newSelected.delete(post.id)
                            }
                            setSelectedItems(newSelected)
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 text-[#F52F8E] border-gray-300 rounded focus:ring-[#F52F8E]"
                        />
                      </td>
                      <td className="py-3 px-4 font-medium">{post.title || '-'}</td>
                      <td className="py-3 px-4">
                        {post.category && (
                          <span className="px-2 py-1 bg-[#F52F8E] text-white text-xs rounded">
                            {post.category}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">{post.profile?.display_name || '-'}</td>
                      <td className="py-3 px-4">{post.views || 0}</td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {post.created_at ? new Date(post.created_at).toLocaleDateString('he-IL') : '-'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              setEditing(post.id)
                              
                              // Load existing tags
                              const { getTagsByContent } = await import('@/lib/queries/tags')
                              const { data: existingTags } = await getTagsByContent('blog_post', post.id)
                              const tagIds = existingTags && Array.isArray(existingTags) 
                                ? existingTags.map((ta: any) => ta.tag_id || ta.tag?.id).filter(Boolean)
                                : []
                              
                              setFormData({ ...post, selectedTagIds: tagIds })
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(post.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {activeTab === 'news' && news.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100">
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(item.id)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedItems)
                            if (e.target.checked) {
                              newSelected.add(item.id)
                            } else {
                              newSelected.delete(item.id)
                            }
                            setSelectedItems(newSelected)
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 text-[#F52F8E] border-gray-300 rounded focus:ring-[#F52F8E]"
                        />
                      </td>
                      <td className="py-3 px-4 font-medium">{item.title || '-'}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 text-xs rounded ${
                          item.is_active 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {item.is_active ? 'פעיל' : 'לא פעיל'}
                        </span>
                      </td>
                      <td className="py-3 px-4">{item.display_order || 0}</td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {item.created_at ? new Date(item.created_at).toLocaleDateString('he-IL') : '-'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditing(item.id)
                              setFormData(item)
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {activeTab === 'reports' && reports.map((report) => (
                    <tr key={report.id} className="border-b border-gray-100">
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(report.id)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedItems)
                            if (e.target.checked) {
                              newSelected.add(report.id)
                            } else {
                              newSelected.delete(report.id)
                            }
                            setSelectedItems(newSelected)
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 text-[#F52F8E] border-gray-300 rounded focus:ring-[#F52F8E]"
                        />
                      </td>
                      <td className="py-3 px-4 font-medium">{report.title || '-'}</td>
                      <td className="py-3 px-4">{report.views || 0}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 text-xs rounded ${
                          report.is_published 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {report.is_published ? 'פורסם' : 'לא פורסם'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {report.created_at ? new Date(report.created_at).toLocaleDateString('he-IL') : '-'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditing(report.id)
                              setFormData(report)
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(report.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {activeTab === 'badges' && badges.map((badge) => (
                    <tr key={badge.id} className="border-b border-gray-100">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span style={{ color: badge.icon_color || '#FFD700' }} className="text-2xl">
                            {badge.icon || '⭐'}
                          </span>
                          <span className="font-medium">{badge.name || '-'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">{badge.points_threshold || 0}</td>
                      <td className="py-3 px-4">{badge.description || '-'}</td>
                      <td className="py-3 px-4">{badge.display_order || 0}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 text-xs rounded ${
                          badge.is_active 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {badge.is_active ? 'פעיל' : 'לא פעיל'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditing(badge.id)
                              setFormData(badge)
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(badge.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {activeTab === 'courses' && courses.map((course) => (
                    <tr key={course.id} className="border-b border-gray-100">
                      <td className="py-3 px-4 font-medium">{course.title || '-'}</td>
                      <td className="py-3 px-4">
                        {course.category && (
                          <span className="px-2 py-1 bg-[#F52F8E] text-white text-xs rounded">
                            {course.category}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 text-xs rounded ${
                          course.difficulty === 'מתחילים' 
                            ? 'bg-green-100 text-green-700'
                            : course.difficulty === 'בינוני'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {course.difficulty || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4">{course.duration_hours || 0} שעות</td>
                      <td className="py-3 px-4">{course.lessons_count || 0}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1">
                          {course.is_recommended && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded w-fit">
                              מומלץ
                            </span>
                          )}
                          {course.is_new && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded w-fit">
                              חדש
                            </span>
                          )}
                          {!course.is_recommended && !course.is_new && (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              try {
                                setEditing(course.id)
                                setFormData(course)
                                
                                // Load existing tags
                                const { getTagsByContent } = await import('@/lib/queries/tags')
                                const { data: existingTags } = await getTagsByContent('course', course.id)
                                if (existingTags && Array.isArray(existingTags)) {
                                  const tagIds = existingTags.map((ta: any) => ta.tag_id || ta.tag?.id).filter(Boolean)
                                  setFormData({ ...course, selectedTagIds: tagIds })
                                }
                                
                                // Load course lessons
                                console.log('Loading lessons for course:', course.id)
                                const { getCourseLessons } = await import('@/lib/queries/courses')
                                const { data: lessons, error: lessonsError } = await getCourseLessons(course.id)
                                
                                if (lessonsError) {
                                  console.error('Error loading lessons:', lessonsError)
                                  alert(`שגיאה בטעינת השיעורים: ${lessonsError.message || 'שגיאה לא ידועה'}`)
                                  setCourseSections([])
                                  return
                                }
                                
                                console.log('Loaded lessons:', lessons)
                                console.log('Lessons count:', lessons?.length || 0)
                                
                                // Load sections first
                                const { getCourseSections } = await import('@/lib/queries/courses')
                                const { data: sectionsData } = await getCourseSections(course.id)
                                
                                if (lessons && lessons.length > 0) {
                                  if (sectionsData && sectionsData.length > 0) {
                                    // Group lessons by sections
                                    const sectionsWithLessons = sectionsData.map((section: any) => ({
                                      id: section.id,
                                      title: section.title,
                                      lessons: lessons
                                        .filter((lesson: any) => lesson.section_id === section.id)
                                        .map((lesson: any) => ({
                                    id: lesson.id || `lesson-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                    title: lesson.title || '',
                                    description: lesson.description || '',
                                    video_url: lesson.video_url || '',
                                    duration_minutes: lesson.duration_minutes || 0,
                                    qa_section: lesson.qa_section || [],
                                    key_points: lesson.key_points || []
                                        }))
                                    }))
                                    
                                    // Add lessons without section
                                    const lessonsWithoutSection = lessons
                                      .filter((lesson: any) => !lesson.section_id)
                                      .map((lesson: any) => ({
                                        id: lesson.id || `lesson-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                        title: lesson.title || '',
                                        description: lesson.description || '',
                                        video_url: lesson.video_url || '',
                                        duration_minutes: lesson.duration_minutes || 0,
                                        qa_section: lesson.qa_section || [],
                                        key_points: lesson.key_points || []
                                      }))
                                    
                                    if (lessonsWithoutSection.length > 0) {
                                      sectionsWithLessons.push({
                                        id: 'no-section',
                                        title: 'שיעורים נוספים',
                                        lessons: lessonsWithoutSection
                                      })
                                    }
                                    
                                    setCourseSections(sectionsWithLessons)
                                    console.log('✅ Successfully loaded', sectionsWithLessons.length, 'sections with', lessons.length, 'lessons')
                                  } else {
                                    // No sections - group all lessons into one section (backward compatibility)
                                    const mappedLessons = lessons.map((lesson: any) => ({
                                      id: lesson.id || `lesson-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                      title: lesson.title || '',
                                      description: lesson.description || '',
                                      video_url: lesson.video_url || '',
                                      duration_minutes: lesson.duration_minutes || 0,
                                      qa_section: lesson.qa_section || [],
                                      key_points: lesson.key_points || []
                                    }))
                                  
                                  setCourseSections([{
                                    id: 'section-1',
                                    title: 'חלק א\'',
                                    lessons: mappedLessons
                                  }])
                                  
                                    console.log('✅ Successfully loaded', mappedLessons.length, 'lessons for editing (no sections)')
                                  }
                                } else {
                                  console.log('⚠️ No lessons found for course, initializing empty sections')
                                  console.log('Course ID:', course.id)
                                  console.log('Lessons data:', lessons)
                                  setCourseSections([])
                                  // Show info message
                                  alert('לא נמצאו שיעורים לקורס זה. הוסף שיעורים בחלק "חלקים ושיעורים" למטה.')
                                }
                              } catch (error) {
                                console.error('Error in edit button click:', error)
                                alert(`שגיאה בטעינת הקורס לעריכה: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}`)
                                setCourseSections([])
                              }
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(course.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {activeTab === 'events' && events.map((event) => (
                    <tr key={event.id} className="border-b border-gray-100">
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(event.id)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedItems)
                            if (e.target.checked) {
                              newSelected.add(event.id)
                            } else {
                              newSelected.delete(event.id)
                            }
                            setSelectedItems(newSelected)
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 text-[#F52F8E] border-gray-300 rounded focus:ring-[#F52F8E]"
                        />
                      </td>
                      <td className="py-3 px-4 font-medium">{event.title || '-'}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-[#F52F8E] text-white text-xs rounded">
                          {event.event_type === 'live' ? 'לייב' : 
                           event.event_type === 'webinar' ? 'וובינר' :
                           event.event_type === 'workshop' ? 'סדנה' :
                           event.event_type === 'qa' ? 'שאלות ותשובות' : 'אחר'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {event.event_date ? new Date(event.event_date).toLocaleDateString('he-IL') : '-'}
                      </td>
                      <td className="py-3 px-4">{event.event_time ? event.event_time.substring(0, 5) : '-'}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 text-xs rounded ${
                          event.status === 'completed' ? 'bg-green-100 text-green-700' :
                          event.status === 'active' ? 'bg-purple-100 text-purple-700' :
                          event.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                          event.status === 'deleted' ? 'bg-gray-100 text-gray-500 line-through' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {event.status === 'completed' ? 'הושלם' :
                           event.status === 'active' ? 'פעיל' :
                           event.status === 'cancelled' ? 'בוטל' :
                           event.status === 'deleted' ? 'נמחק' :
                           'קרוב'}
                        </span>
                      </td>
                      <td className="py-3 px-4">{event.location || '-'}</td>
                      <td className="py-3 px-4">
                        {event.zoom_meeting_id ? (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded font-mono">
                            {event.zoom_meeting_id.substring(0, 10)}...
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditing(event.id)
                              // Combine event_date and event_time into a single Date object for the DatePicker
                              let combinedDateTime: Date | null = null;
                              if (event.event_date && event.event_time) {
                                try {
                                  // Convert event_date to string format YYYY-MM-DD
                                  const dateStr = typeof event.event_date === 'string' 
                                    ? event.event_date
                                    : (() => {
                                        const dateObj = event.event_date as any;
                                        if (dateObj instanceof Date) {
                                          const year = dateObj.getFullYear();
                                          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                                          const day = String(dateObj.getDate()).padStart(2, '0');
                                          return `${year}-${month}-${day}`;
                                        }
                                        return String(event.event_date);
                                      })();
                                  const [hours, minutes] = event.event_time.split(':');
                                  combinedDateTime = new Date(`${dateStr}T${hours || '00'}:${minutes || '00'}:00`);
                                  if (isNaN(combinedDateTime.getTime())) {
                                    combinedDateTime = null;
                                  }
                                } catch (e) {
                                  console.error('Error combining date and time:', e);
                                  combinedDateTime = null;
                                }
                              }
                              const formDataUpdate: any = {
                                ...event,
                                event_date: event.event_date || null,
                                event_time: event.event_time || '',
                                learning_points: event.learning_points || [],
                                status: event.status || 'upcoming',
                                recording_id: event.recording_id || undefined
                              };
                              if (combinedDateTime) {
                                formDataUpdate.event_datetime = combinedDateTime;
                              }
                              setFormData(formDataUpdate);
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(event.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {activeTab === 'projects' && projects.map((project) => (
                    <tr key={project.id} className="border-b border-gray-100">
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(project.id)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedItems)
                            if (e.target.checked) {
                              newSelected.add(project.id)
                            } else {
                              newSelected.delete(project.id)
                            }
                            setSelectedItems(newSelected)
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 text-[#F52F8E] border-gray-300 rounded focus:ring-[#F52F8E]"
                        />
                      </td>
                      <td className="py-3 px-4 font-medium">{project.title || '-'}</td>
                      <td className="py-3 px-4">{project.user?.display_name || '-'}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 text-xs rounded ${
                          project.status === 'completed' ? 'bg-green-100 text-green-700' :
                          project.status === 'in_progress' ? 'bg-purple-100 text-purple-700' :
                          project.status === 'closed' ? 'bg-red-100 text-red-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {project.status === 'completed' ? 'הושלם' :
                           project.status === 'in_progress' ? 'בביצוע' :
                           project.status === 'closed' ? 'סגור' :
                           'פתוח'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {project.created_at ? new Date(project.created_at).toLocaleDateString('he-IL') : '-'}
                      </td>
                      <td className="py-3 px-4">{project.offers_count || 0}</td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedProject(selectedProject === project.id ? null : project.id)
                            }}
                            className="p-2 text-green-600 hover:bg-green-50 rounded"
                            title="הצג הגשות"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            onClick={async () => {
                              setEditing(project.id)
                              
                              // Load existing tags
                              const { getTagsByContent } = await import('@/lib/queries/tags')
                              const { data: existingTags } = await getTagsByContent('project', project.id)
                              const tagIds = existingTags && Array.isArray(existingTags) 
                                ? existingTags.map((ta: any) => ta.tag_id || ta.tag?.id).filter(Boolean)
                                : []
                              
                              setFormData({
                                ...project,
                                selectedTagIds: tagIds,
                                technologies: Array.isArray(project.technologies) 
                                  ? project.technologies.join(', ') 
                                  : project.technologies || '',
                                budget_min: project.budget_min?.toString() || '',
                                budget_max: project.budget_max?.toString() || ''
                              })
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(project.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {activeTab === 'projects' && selectedProject && projectOffers[selectedProject] && (
                    <tr>
                      <td colSpan={6} className="py-4 px-4 bg-gray-50">
                        <div className="space-y-3">
                          <h4 className="font-semibold text-gray-700 mb-2">הגשות לפרויקט:</h4>
                          {projectOffers[selectedProject].map((offer) => (
                            <div key={offer.id} className="bg-white p-4 rounded-lg border border-gray-200">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="font-medium">{offer.user?.display_name || 'משתמש לא ידוע'}</span>
                                    {offer.offer_amount && (
                                      <span className="text-[#F52F8E] font-semibold">
                                        {offer.offer_amount} {offer.offer_currency || 'ILS'}
                                      </span>
                                    )}
                                    <span className={`px-2 py-1 text-xs rounded ${
                                      offer.status === 'accepted' ? 'bg-green-100 text-green-700' :
                                      offer.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                      'bg-yellow-100 text-yellow-700'
                                    }`}>
                                      {offer.status === 'accepted' ? 'אושר' :
                                       offer.status === 'rejected' ? 'נדחה' :
                                       'ממתין'}
                                    </span>
                                  </div>
                                  {offer.message && (
                                    <p className="text-sm text-gray-600 mb-2">{offer.message}</p>
                                  )}
                                  <span className="text-xs text-gray-400">
                                    {offer.created_at ? new Date(offer.created_at).toLocaleDateString('he-IL') : '-'}
                                  </span>
                                </div>
                                {offer.status === 'pending' && (
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleAcceptOffer(offer.id)}
                                      className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                                    >
                                      אשר
                                    </button>
                                    <button
                                      onClick={() => handleRejectOffer(offer.id)}
                                      className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                                    >
                                      דחה
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                          {projectOffers[selectedProject].length === 0 && (
                            <p className="text-gray-500 text-sm">אין הגשות לפרויקט זה</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                  {activeTab === 'tags' && tags.map((tag) => (
                    <tr key={tag.id} className="border-b border-gray-100">
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(tag.id)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedItems)
                            if (e.target.checked) {
                              newSelected.add(tag.id)
                            } else {
                              newSelected.delete(tag.id)
                            }
                            setSelectedItems(newSelected)
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 text-[#F52F8E] border-gray-300 rounded focus:ring-[#F52F8E]"
                        />
                      </td>
                      <td className="py-3 px-4 font-medium">{tag.name || '-'}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded font-mono">
                          {tag.slug || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4">{tag.description || '-'}</td>
                      <td className="py-3 px-4">{tag.usage_count || 0}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 text-xs rounded ${
                          tag.is_approved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {tag.is_approved ? 'מאושר' : 'ממתין לאישור'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditing(tag.id)
                              setFormData({
                                ...tag
                              })
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(tag.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {activeTab === 'feedbacks' && feedbacks.map((feedback) => (
                    <tr 
                      key={feedback.id} 
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedFeedback(feedback)}
                    >
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedItems.has(feedback.id)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedItems)
                            if (e.target.checked) {
                              newSelected.add(feedback.id)
                            } else {
                              newSelected.delete(feedback.id)
                            }
                            setSelectedItems(newSelected)
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 text-[#F52F8E] border-gray-300 rounded focus:ring-[#F52F8E]"
                        />
                      </td>
                      <td className="py-3 px-4 font-medium">{feedback.subject || '-'}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                          {feedback.feedback_type || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {feedback.created_at
                          ? new Date(feedback.created_at).toLocaleDateString('he-IL', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : '-'}
                      </td>
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={async () => {
                            if (confirm('האם אתה בטוח שברצונך למחוק את הפידבק הזה?')) {
                              try {
                                const response = await fetch(`/api/admin/feedbacks/${feedback.id}`, {
                                  method: 'DELETE',
                                  credentials: 'include'
                                })
                                if (response.ok) {
                                  await loadData()
                                } else {
                                  const error = await response.json()
                                  alert(`שגיאה במחיקת הפידבק: ${error.error || 'שגיאה לא ידועה'}`)
                                }
                              } catch (error: any) {
                                alert(`שגיאה במחיקת הפידבק: ${error.message || 'שגיאה לא ידועה'}`)
                              }
                            }
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                          title="מחק פידבק"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {activeTab === 'forums' && forums.map((forum) => (
                    <tr key={forum.id} className="border-b border-gray-100">
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(forum.id)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedItems)
                            if (e.target.checked) {
                              newSelected.add(forum.id)
                            } else {
                              newSelected.delete(forum.id)
                            }
                            setSelectedItems(newSelected)
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 text-[#F52F8E] border-gray-300 rounded focus:ring-[#F52F8E]"
                        />
                      </td>
                      <td className="py-3 px-4 font-mono text-sm">{forum.name || '-'}</td>
                      <td className="py-3 px-4 font-medium">{forum.display_name || '-'}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{forum.description || '-'}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                          {forum.posts_count || 0}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 text-xs rounded ${
                          forum.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {forum.is_active ? 'פעיל' : 'לא פעיל'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditing(forum.id)
                              setFormData({
                                name: forum.name,
                                display_name: forum.display_name,
                                description: forum.description || '',
                                header_color: forum.header_color || 'bg-blue-900',
                                logo_text: forum.logo_text || '',
                                is_active: forum.is_active !== false
                              })
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(forum.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {activeTab === 'api-docs' && (
                    <tr>
                      <td colSpan={100} className="py-8 px-4">
                        <ApiDocumentation />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {activeTab === 'api-docs' && (
              <div className="mt-6">
                <ApiDocumentation />
          </div>
        )}
      </div>
        )}
      </div>

      {/* Feedback Details Modal */}
      {selectedFeedback && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setSelectedFeedback(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[#F52F8E]">
                פרטי פידבק
              </h2>
              <button
                onClick={() => setSelectedFeedback(null)}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">שם</label>
                  <p className="text-gray-900">{selectedFeedback.name || '-'}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">אימייל</label>
                  <p className="text-gray-900">{selectedFeedback.email || '-'}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">נושא</label>
                  <p className="text-gray-900 font-medium">{selectedFeedback.subject || '-'}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">הודעה</label>
                  <p className="text-gray-900 whitespace-pre-wrap">{selectedFeedback.message || '-'}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">דירוג</label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-5 h-5 ${
                          star <= (selectedFeedback.rating || 0)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                    <span className="mr-2 text-sm text-gray-500">({selectedFeedback.rating || 0}/5)</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">סוג</label>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded">
                    {selectedFeedback.feedback_type || '-'}
                  </span>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">תמונה</label>
                  {selectedFeedback.image_url ? (
                    <div className="mt-2">
                      <a
                        href={selectedFeedback.image_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block"
                      >
                        <img
                          src={selectedFeedback.image_url}
                          alt="Feedback image"
                          className="max-w-full max-h-96 h-auto rounded-lg border-2 border-gray-300 cursor-pointer hover:opacity-90 shadow-md"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                            e.currentTarget.nextElementSibling?.classList.remove('hidden')
                          }}
                        />
                      </a>
                      <p className="text-xs text-gray-500 mt-1">לחץ על התמונה להגדלה</p>
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm">אין תמונה מצורפת</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">תאריך</label>
                  <p className="text-gray-900">
                    {selectedFeedback.created_at
                      ? new Date(selectedFeedback.created_at).toLocaleDateString('he-IL', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : '-'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setSelectedFeedback(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                סגור
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Course Assignment Modal */}
      {selectedUserForCourses && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[#F52F8E]">
                ניהול קורסים למשתמש
              </h2>
              <button
                onClick={closeCourseAssignmentModal}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {loadingEnrollments ? (
                <div className="text-center py-8">טוען...</div>
              ) : (
                <>
                  {/* Current Enrollments */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800">
                      קורסים משויכים ({userEnrollments.length})
                    </h3>
                    {userEnrollments.length === 0 ? (
                      <p className="text-gray-500 text-sm">אין קורסים משויכים למשתמש זה</p>
                    ) : (
                      <div className="space-y-2">
                        {userEnrollments.map((enrollment: any) => {
                          const course = enrollment.courses || {}
                          return (
                            <div
                              key={enrollment.id}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                            >
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-800">{course.title || 'ללא כותרת'}</h4>
                                <p className="text-sm text-gray-500">{course.category || ''}</p>
                                <span className={`text-xs px-2 py-1 rounded mt-1 inline-block ${
                                  enrollment.status === 'completed' ? 'bg-green-100 text-green-700' :
                                  enrollment.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                  'bg-blue-100 text-blue-700'
                                }`}>
                                  {enrollment.status === 'completed' ? 'הושלם' :
                                   enrollment.status === 'cancelled' ? 'בוטל' :
                                   'רשום'}
                                </span>
                              </div>
                              <button
                                onClick={async () => {
                                  if (confirm('האם אתה בטוח שברצונך להסיר את הקורס הזה מהמשתמש?')) {
                                    const result = await handleRemoveCourse(selectedUserForCourses, enrollment.course_id)
                                    if (result.success) {
                                      alert('הקורס הוסר בהצלחה')
                                    } else {
                                      alert('שגיאה: ' + result.error)
                                    }
                                  }
                                }}
                                className="p-2 text-red-600 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Available Courses to Assign */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-gray-800">
                      הוסף קורס חדש
                    </h3>
                    {courses.length === 0 ? (
                      <p className="text-gray-500 text-sm">אין קורסים זמינים</p>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {courses
                          .filter((course) => 
                            !userEnrollments.some((e: any) => e.course_id === course.id)
                          )
                          .map((course) => (
                            <div
                              key={course.id}
                              className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-[#F52F8E] transition-colors"
                            >
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-800">{course.title}</h4>
                                <p className="text-sm text-gray-500">{course.category || ''}</p>
                                <span className={`text-xs px-2 py-1 rounded mt-1 inline-block ${
                                  course.difficulty === 'מתחילים' ? 'bg-green-100 text-green-700' :
                                  course.difficulty === 'בינוני' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {course.difficulty}
                                </span>
                              </div>
                              <button
                                onClick={async () => {
                                  const result = await handleAssignCourse(selectedUserForCourses, course.id)
                                  if (result.success) {
                                    alert('הקורס נוסף בהצלחה')
                                  } else {
                                    alert('שגיאה: ' + result.error)
                                  }
                                }}
                                className="px-4 py-2 bg-[#F52F8E] text-white rounded hover:bg-[#E01E7A] transition-colors"
                              >
                                הוסף
                              </button>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bulk Edit Users Modal */}
      {showBulkEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
              ערוך {selectedItems.size} משתמשים
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  שנה תפקיד
                </label>
                <select
                  value={bulkEditData.role_id || ''}
                  onChange={(e) => setBulkEditData({ ...bulkEditData, role_id: e.target.value || null })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F52F8E]"
                >
                  <option value="">-- בחר תפקיד --</option>
                  {availableRoles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.display_name || role.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  השאר ריק כדי לא לשנות את התפקיד
                </p>
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleBulkEditUsers}
                className="flex-1 px-4 py-2 bg-[#F52F8E] text-white rounded-lg hover:bg-[#E01E7A] transition-colors flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                שמור שינויים
              </button>
              <button
                onClick={() => {
                  setShowBulkEditModal(false)
                  setBulkEditData({})
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Gallery Modal */}
      {isAuthorized && (
        <ImageGalleryModal
          isOpen={showImageGallery}
          onClose={() => {
            setShowImageGallery(false);
            setImageGalleryField(null);
          }}
          onSelect={(imageUrl) => {
            if (imageGalleryField) {
              setFormData({ ...formData, [imageGalleryField]: imageUrl });
            }
            setShowImageGallery(false);
            setImageGalleryField(null);
          }}
          isAdmin={isAuthorized}
        />
      )}
    </div>
  )
}

// Helper function to generate slug (same as in tags.ts)
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

