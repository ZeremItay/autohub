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
import { getAllTags, getTagById, createTag, updateTag, deleteTag, getUnapprovedTags, type Tag } from '@/lib/queries/tags'
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
    loading: () => <div className="w-full h-10 bg-white/10 rounded animate-pulse" />
  }
) as any

const RichTextEditor = dynamic(
  () => import('@/app/components/RichTextEditor'),
  { 
    ssr: false,
    loading: () => <div className="w-full h-32 bg-white/10 rounded animate-pulse" />
  }
)

const QASectionEditor = dynamic(
  () => import('@/app/components/admin/QASectionEditor'),
  { 
    ssr: false,
    loading: () => <div className="w-full h-24 bg-white/10 rounded animate-pulse" />
  }
)

const KeyPointsEditor = dynamic(
  () => import('@/app/components/admin/KeyPointsEditor'),
  { 
    ssr: false,
    loading: () => <div className="w-full h-24 bg-white/10 rounded animate-pulse" />
  }
)

// Import date-fns locale separately (lightweight)
import { he } from 'date-fns/locale'
import 'react-datepicker/dist/react-datepicker.css'

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<'users' | 'posts' | 'roles' | 'gamification' | 'recordings' | 'resources' | 'blog' | 'subscriptions' | 'payments' | 'news' | 'badges' | 'courses' | 'reports' | 'events' | 'projects' | 'tags' | 'feedbacks'>('users')
  const [users, setUsers] = useState<any[]>([])
  const [posts, setPosts] = useState<any[]>([])
  const [roles, setRoles] = useState<any[]>([])
  const [recordings, setRecordings] = useState<any[]>([])
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
  const [feedbacks, setFeedbacks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const [formData, setFormData] = useState<any>({})
  const [uploadingCourseImage, setUploadingCourseImage] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [zoomMeetings, setZoomMeetings] = useState<any[]>([])
  const [loadingZoomMeetings, setLoadingZoomMeetings] = useState(false)
  
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
        console.log('Loaded users:', usersData.length, 'users')
        console.log('First user role:', usersData[0]?.role, usersData[0]?.roles)
        setUsers(usersData)
        // Load available roles for dropdown
        const { data: rolesData } = await getAllRoles()
        setAvailableRoles(rolesData || [])
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
        const { getAllResources } = await import('@/lib/queries/resources')
        const { data, error } = await getAllResources()
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
        const { data, error } = await getAllCourses()
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
        console.log('Loading events data...')
        const { data, error } = await getAllEvents()
        console.log('getAllEvents result:', { data: data?.length || 0, error, hasError: !!error })
        if (!error && data && Array.isArray(data)) {
          console.log('Setting events:', data.length, 'events')
          setEvents(data)
          console.log('Events state updated')
        } else {
          console.error('Error loading events:', error)
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
      } else if (activeTab === 'feedbacks') {
        const { data, error } = await supabase
          .from('feedbacks')
          .select(`
            *,
            profiles:user_id (
              id,
              user_id,
              first_name,
              last_name,
              nickname
            )
          `)
          .order('created_at', { ascending: false })
        if (!error && data && Array.isArray(data)) {
          setFeedbacks(data)
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
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

        console.log('Creating post with:', {
          user_id: userIdToUse,
          content: formData.content,
          image_url: formData.image_url
        });

        const { data, error } = await createPost({
          user_id: userIdToUse,
          content: formData.content.trim(),
          image_url: formData.image_url || undefined
        })
        
        if (error) {
          console.error('Error creating post:', error);
          alert(`שגיאה ביצירת הפוסט: ${error.message || JSON.stringify(error)}`);
          return;
        }
        
        if (!error) {
          await loadData()
          setEditing(null)
          setFormData({})
        }
      } else if (activeTab === 'recordings') {
        // Parse categories from comma-separated string to array
        let categories: string[] = [];
        if (formData.category && typeof formData.category === 'string') {
          categories = formData.category
            .split(',')
            .map((c: string) => c.trim())
            .filter((c: string) => c.length > 0);
        } else if (Array.isArray(formData.category)) {
          categories = formData.category;
        }

        const { data, error } = await createRecording({
          title: formData.title || '',
          description: formData.description || '',
          video_url: formData.video_url || '',
          thumbnail_url: formData.thumbnail_url || undefined,
          category: categories.length > 0 ? categories : undefined,
          duration: formData.duration,
          views: formData.views || 0,
          // is_new will be set automatically based on creation date
          qa_section: formData.qa_section || [],
          key_points: formData.key_points || [],
          created_at: formData.created_at || undefined
        })
        if (!error) {
          await loadData()
          setEditing(null)
          setFormData({})
        }
      } else if (activeTab === 'resources') {
        const { createResource } = await import('@/lib/queries/resources')
        const { data, error } = await createResource({
          title: formData.title || '',
          description: formData.description || '',
          file_url: formData.file_url || '',
          file_name: formData.file_name || '',
          file_size: formData.file_size || 0,
          file_type: formData.file_type || '',
          category: formData.category || '',
          is_premium: formData.is_premium !== false
        })
        if (!error) {
          await loadData()
          setEditing(null)
          setFormData({})
        }
      } else if (activeTab === 'subscriptions') {
        if (!formData.user_id || !formData.role_id || !formData.start_date) {
          alert('אנא מלא את כל השדות הנדרשים')
          return
        }

        const response = await fetch('/api/admin/subscriptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: formData.user_id,
            role_id: formData.role_id,
            status: formData.status || 'active',
            start_date: formData.start_date,
            end_date: formData.end_date || null,
            auto_renew: formData.auto_renew !== false
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
        if (!formData.subscription_id || !formData.user_id || !formData.amount) {
          alert('אנא מלא את כל השדות הנדרשים')
          return
        }

        const response = await fetch('/api/admin/payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription_id: formData.subscription_id,
            user_id: formData.user_id,
            amount: formData.amount,
            currency: formData.currency || 'ILS',
            status: formData.status || 'pending',
            payment_method: formData.payment_method || null,
            payment_date: formData.payment_date || null,
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
          await loadData()
          setEditing(null)
          setFormData({})
          alert(`הפוסט "${formData.title || 'חדש'}" נוצר בהצלחה! ${formData.is_published !== false ? 'הפוסט פורסם ויופיע בבלוג.' : 'שים לב: הפוסט לא פורסם ולכן לא יופיע בבלוג עד שתסמן את התיבה "פורסם".'}`)
        } else {
          // Enhanced error display with all error details
          const errorMessage = error?.message || 'שגיאה לא ידועה'
          const errorCode = error?.code ? ` (קוד: ${error.code})` : ''
          const errorDetails = (error as any)?.details ? `\nפרטים: ${(error as any).details}` : ''
          const errorHint = (error as any)?.hint ? `\nרמז: ${(error as any).hint}` : ''
          
          console.error('Error creating blog post:', {
            message: error?.message,
            code: error?.code,
            details: (error as any)?.details,
            hint: (error as any)?.hint,
            fullError: error
          })
          
          alert(`שגיאה ביצירת הפוסט: ${errorMessage}${errorCode}${errorDetails}${errorHint}`)
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
          is_sequential: formData.is_sequential || false
        }
        
        console.log('Course data before sending:', courseData)

        console.log('Creating course with data:', courseData)

        const { data, error } = await createCourse(courseData)
        
        if (error) {
          console.error('=== ERROR IN ADMIN PAGE ===')
          console.error('Error creating course - full error:', error)
          console.error('Error type:', typeof error)
          console.error('Error stringified:', JSON.stringify(error, null, 2))
          
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
            const { createLesson } = await import('@/lib/queries/courses')
            let lessonOrder = 1
            let lessonsCreated = 0
            let lessonsFailed = 0
            
            console.log('Creating lessons for course:', data.id)
            console.log('Course sections:', courseSections)
            
            for (const section of courseSections) {
              for (const lesson of section.lessons) {
                if (lesson.title.trim()) {
                  try {
                    const lessonData = {
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
        // Parse categories from comma-separated string to array
        let categories: string[] = [];
        if (formData.category && typeof formData.category === 'string') {
          categories = formData.category
            .split(',')
            .map((c: string) => c.trim())
            .filter((c: string) => c.length > 0);
        } else if (Array.isArray(formData.category)) {
          categories = formData.category;
        }

        const updateData: any = { ...formData };
        // Remove is_new from update - it's set automatically
        delete updateData.is_new;
        
        if (categories.length > 0) {
          updateData.category = categories;
        } else {
          updateData.category = undefined;
        }

        const { error } = await updateRecording(id, updateData)
        if (!error) {
          await loadData()
          setEditing(null)
          setFormData({})
        }
      } else if (activeTab === 'resources') {
        const { updateResource } = await import('@/lib/queries/resources')
        const { error } = await updateResource(id, formData)
        if (!error) {
          await loadData()
          setEditing(null)
          setFormData({})
        }
      } else if (activeTab === 'blog') {
        const { updateBlogPost } = await import('@/lib/queries/blog')
        const { data, error } = await updateBlogPost(id, formData)
        if (!error && data) {
          await loadData()
          setEditing(null)
          setFormData({})
          alert('הפוסט עודכן בהצלחה!')
        } else {
          console.error('Error updating blog post:', error)
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
          is_sequential: formData.is_sequential || false
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
            
            // Create new lessons from sections
            const { createLesson } = await import('@/lib/queries/courses')
            let lessonOrder = 1
            let lessonsCreated = 0
            let lessonsFailed = 0
            
            console.log('Creating new lessons from sections:', courseSections)
            
            for (const section of courseSections) {
              for (const lesson of section.lessons) {
                if (lesson.title.trim()) {
                  try {
                    const lessonData = {
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
            
            console.log(`Lessons update summary: ${lessonsCreated} created, ${lessonsFailed} failed`)
            
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
        const { error } = await supabase
          .from('profiles')
          .delete()
          .eq('id', id)
        if (!error) await loadData()
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
            // Only show error if it has meaningful content
            const errorMessage = error?.message || (typeof error === 'object' && Object.keys(error).length > 0 ? 'שגיאה במחיקת הפרויקט' : null);
            if (errorMessage) {
              alert(`שגיאה במחיקת הפרויקט: ${errorMessage}`)
            }
          } else {
            console.log('Project deleted successfully:', id)
            setProjects(prevProjects => prevProjects.filter(p => p.id !== id))
            await loadData()
            alert('הפרויקט נמחק בהצלחה!')
          }
        } catch (err) {
          // Only log if error has meaningful content
          if (err && (err instanceof Error || (typeof err === 'object' && Object.keys(err).length > 0))) {
            const { logError } = await import('@/lib/utils/errorHandler');
            logError(err, 'handleDelete (projects)');
          }
          alert(`שגיאה במחיקת הפרויקט: ${err instanceof Error ? err.message : 'שגיאה לא ידועה'}`)
        }
      }
    } catch (error) {
      console.error('Error deleting:', error)
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-hot-pink mx-auto mb-4"></div>
          <p className="text-gray-300">בודק הרשאות...</p>
        </div>
      </div>
    )
  }

  // Show error if not authorized
  if (isAuthorized === false) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8 glass-card rounded-3xl shadow-2xl">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-400/50">
            <X className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">גישה נדחתה</h1>
          <p className="text-gray-300 mb-6">
            אין לך הרשאה לגשת לפאנל הניהול. רק מנהלים יכולים לגשת לדף זה.
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-hot-pink text-white rounded-full hover:bg-rose-500 transition-colors shadow-lg hover:shadow-xl"
          >
            חזור לדף הבית
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">פאנל ניהול</h1>
        </div>
        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-white/20 overflow-x-auto">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'users'
                ? 'text-white border-b-2 border-hot-pink'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            <Users className="w-5 h-5 inline-block ml-2" />
            משתמשים
          </button>
          <button
            onClick={() => setActiveTab('posts')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'posts'
                ? 'text-white border-b-2 border-hot-pink'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            <FileText className="w-5 h-5 inline-block ml-2" />
            הודעות ראשיות
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'roles'
                ? 'text-white border-b-2 border-hot-pink'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            <Settings className="w-5 h-5 inline-block ml-2" />
            תפקידים
          </button>
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'subscriptions'
                ? 'text-white border-b-2 border-hot-pink'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            <CreditCard className="w-5 h-5 inline-block ml-2" />
            מנויים
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'payments'
                ? 'text-white border-b-2 border-hot-pink'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            <CreditCard className="w-5 h-5 inline-block ml-2" />
            תשלומים
          </button>
          <button
            onClick={() => setActiveTab('recordings')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'recordings'
                ? 'text-white border-b-2 border-hot-pink'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            <Video className="w-5 h-5 inline-block ml-2" />
            הקלטות
          </button>
          <button
            onClick={() => setActiveTab('resources')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'resources'
                ? 'text-white border-b-2 border-hot-pink'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            <FileIcon className="w-5 h-5 inline-block ml-2" />
            משאבים
          </button>
          <button
            onClick={() => setActiveTab('blog')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'blog'
                ? 'text-white border-b-2 border-hot-pink'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            <FileText className="w-5 h-5 inline-block ml-2" />
            בלוג
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'reports'
                ? 'text-white border-b-2 border-hot-pink'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            <FileText className="w-5 h-5 inline-block ml-2" />
            דיווחים
          </button>
          <Link
            href="/admin/gamification"
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'gamification'
                ? 'text-white border-b-2 border-hot-pink'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            <Trophy className="w-5 h-5 inline-block ml-2" />
            גמיפיקציה
          </Link>
          <button
            onClick={() => setActiveTab('badges')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'badges'
                ? 'text-white border-b-2 border-hot-pink'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            <Star className="w-5 h-5 inline-block ml-2" />
            תגים
          </button>
          <button
            onClick={() => setActiveTab('courses')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'courses'
                ? 'text-white border-b-2 border-hot-pink'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            <BookOpen className="w-5 h-5 inline-block ml-2" />
            קורסים
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'events'
                ? 'text-white border-b-2 border-hot-pink'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            <Calendar className="w-5 h-5 inline-block ml-2" />
            לייבים
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'projects'
                ? 'text-white border-b-2 border-hot-pink'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            <FileText className="w-5 h-5 inline-block ml-2" />
            פרויקטים
          </button>
          <button
            onClick={() => setActiveTab('tags')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'tags'
                ? 'text-white border-b-2 border-hot-pink'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            <TagIcon className="w-5 h-5 inline-block ml-2" />
            תגיות
          </button>
          <button
            onClick={() => setActiveTab('feedbacks')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'feedbacks'
                ? 'text-white border-b-2 border-hot-pink'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            <MessageCircleMore className="w-5 h-5 inline-block ml-2" />
            פידבקים
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12 text-gray-300">טוען...</div>
        ) : (
          <div className="glass-card rounded-3xl shadow-2xl p-6">
            {/* Create Button */}
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">
                {activeTab === 'users' && 'משתמשים'}
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
              </h2>
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
                    className="btn-primary px-4 py-2 text-sm bg-yellow-500 hover:bg-yellow-600"
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
                    className="btn-danger px-4 py-2 text-sm"
                  >
                    בדוק מנויים שפגו
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                {activeTab === 'posts' && (
                  <button
                    onClick={handleDeleteAllForumPosts}
                    className="btn-danger flex items-center gap-2 px-4 py-2"
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
                  className="flex items-center gap-2 px-4 py-2 bg-hot-pink text-white rounded-full hover:bg-rose-500 transition-colors shadow-lg hover:shadow-xl"
                >
                  <Plus className="w-5 h-5" />
                  יצירה חדשה
                </button>
              </div>
            </div>

            {/* Create/Edit Form */}
            {editing && (
              <div className="mb-6 p-4 bg-white/10 rounded-lg border border-white/20">
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
                      className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                    />
                    <input
                      type="text"
                      placeholder="שם תצוגה"
                      value={formData.display_name || ''}
                      onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                      className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                    />
                    <input
                      type="text"
                      placeholder="כינוי"
                      value={formData.nickname || ''}
                      onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                      className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                    />
                    <input
                      type="email"
                      placeholder="אימייל"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                    />
                    <select
                      value={formData.experience_level || 'מתחיל'}
                      onChange={(e) => setFormData({ ...formData, experience_level: e.target.value })}
                      className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                    >
                      <option value="מתחיל">מתחיל</option>
                      <option value="בינוני">בינוני</option>
                      <option value="מתקדם">מתקדם</option>
                      <option value="מומחה">מומחה</option>
                    </select>
                    <select
                      value={formData.role_id || ''}
                      onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                      className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                    >
                      <option value="">בחר תפקיד</option>
                      {availableRoles.map(role => (
                        <option key={role.id} value={role.id}>
                          {role.display_name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="URL תמונה"
                      value={formData.avatar_url || ''}
                      onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                      className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                    />
                  </div>
                )}
                {activeTab === 'posts' && (
                  <div className="space-y-4">
                    <select
                      value={formData.user_id || ''}
                      onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                      className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
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
                      className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                      rows={4}
                    />
                    <input
                      type="text"
                      placeholder="URL תמונה (אופציונלי)"
                      value={formData.image_url || ''}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                    />
                    </div>
                )}
                {activeTab === 'resources' && (
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="כותרת המשאב *"
                      value={formData.title || ''}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      dir="rtl"
                      lang="he"
                      className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                      required
                    />
                    <textarea
                      placeholder="תיאור המשאב"
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      dir="rtl"
                      lang="he"
                      className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                      rows={3}
                    />
                    <input
                      type="text"
                      placeholder="קטגוריה (אופציונלי)"
                      value={formData.category || ''}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      dir="rtl"
                      lang="he"
                      className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                    />
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
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
                        className="btn-primary inline-flex items-center gap-2 px-4 py-2 cursor-pointer"
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
                        <p className="text-sm text-gray-300 mt-2">
                          קובץ נבחר: {formData.file_name}
                        </p>
                      )}
                    </div>
                    <input
                      type="url"
                      placeholder="או הזן קישור לקובץ *"
                      value={formData.file_url || ''}
                      onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                      className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                      required
                    />
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
                      className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                      required
                    />
                    <textarea
                      placeholder="תיאור ההקלטה"
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      dir="rtl"
                      lang="he"
                      className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                      rows={4}
                    />
                    <input
                      type="url"
                      placeholder="קישור לוידאו *"
                      value={formData.video_url || ''}
                      onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                      className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                      required
                    />
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
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
                          className="btn-primary inline-flex items-center gap-2 px-4 py-2 cursor-pointer"
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
                            className="w-full max-w-xs h-32 object-cover rounded-lg border border-white/20"
                            onError={(e) => {
                              // Hide image if it fails to load
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      <input
                        type="url"
                        placeholder="או הזן קישור לתמונת תצוגה מקדימה"
                        value={formData.thumbnail_url || ''}
                        onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg mt-2"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="קטגוריה (למשל: Make.com, AI, Airtable)"
                      value={formData.category || ''}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                    />
                    <input
                      type="text"
                      placeholder="משך זמן (למשל: 1:45:00)"
                      value={formData.duration || ''}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                    />
                    <input
                      type="number"
                      placeholder="מספר צפיות"
                      value={formData.views || 0}
                      onChange={(e) => setFormData({ ...formData, views: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                    />
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
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
                        className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
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
                      className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
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
                      className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
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
                      className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                    >
                      <option value="active">פעיל</option>
                      <option value="pending">ממתין</option>
                      <option value="cancelled">בוטל</option>
                      <option value="expired">פג תוקף</option>
                    </select>
                    <div>
                      <label className="block text-sm font-medium text-white mb-1">תאריך התחלה *</label>
                      <input
                        type="datetime-local"
                        value={formData.start_date || ''}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                        className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white mb-1">תאריך סיום (אופציונלי)</label>
                      <input
                        type="datetime-local"
                        value={formData.end_date || ''}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                        className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="auto_renew"
                        checked={formData.auto_renew !== false}
                        onChange={(e) => setFormData({ ...formData, auto_renew: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <label htmlFor="auto_renew" className="text-sm text-white">
                        חידוש אוטומטי
                      </label>
                    </div>
                  </div>
                )}
                {activeTab === 'payments' && (
                  <div className="space-y-4">
                    <select
                      value={formData.subscription_id || ''}
                      onChange={(e) => setFormData({ ...formData, subscription_id: e.target.value })}
                      className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
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
                    <select
                      value={formData.user_id || ''}
                      onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                      className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                      required
                    >
                      <option value="">בחר משתמש *</option>
                      {users.map(user => (
                        <option key={user.user_id || user.id} value={user.user_id || user.id}>
                          {user.display_name || user.first_name || user.email || user.user_id}
                        </option>
                      ))}
                    </select>
                    <div>
                      <label className="block text-sm font-medium text-white mb-1">סכום (₪) *</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.amount || ''}
                        onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                        required
                      />
                    </div>
                    <select
                      value={formData.currency || 'ILS'}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                    >
                      <option value="ILS">ILS (שקלים)</option>
                      <option value="USD">USD (דולרים)</option>
                      <option value="EUR">EUR (יורו)</option>
                    </select>
                    <select
                      value={formData.status || 'pending'}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                    >
                      <option value="pending">ממתין</option>
                      <option value="completed">הושלם</option>
                      <option value="failed">נכשל</option>
                      <option value="refunded">הוחזר</option>
                    </select>
                    <div>
                      <label className="block text-sm font-medium text-white mb-1">אמצעי תשלום (אופציונלי)</label>
                      <input
                        type="text"
                        value={formData.payment_method || ''}
                        onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                        className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                        placeholder="לדוגמה: Visa **** 4242"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white mb-1">תאריך תשלום (אופציונלי)</label>
                      <input
                        type="datetime-local"
                        value={formData.payment_date || ''}
                        onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                        className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white mb-1">מספר עסקה (אופציונלי)</label>
                      <input
                        type="text"
                        value={formData.transaction_id || ''}
                        onChange={(e) => setFormData({ ...formData, transaction_id: e.target.value })}
                        className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white mb-1">מספר חשבונית (אופציונלי)</label>
                      <input
                        type="text"
                        value={formData.invoice_number || ''}
                        onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                        className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white mb-1">קישור לחשבונית (אופציונלי)</label>
                      <input
                        type="url"
                        value={formData.invoice_url || ''}
                        onChange={(e) => setFormData({ ...formData, invoice_url: e.target.value })}
                        className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
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
                      className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                      required
                    />
                    <textarea
                      placeholder="תוכן החדשה (אופציונלי)"
                      value={formData.content || ''}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      dir="rtl"
                      lang="he"
                      className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                      rows={3}
                    />
                    <input
                      type="text"
                      placeholder="קישור לתמונה (אופציונלי)"
                      value={formData.image_url || ''}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                    />
                    <input
                      type="text"
                      placeholder="קישור (אופציונלי)"
                      value={formData.link_url || ''}
                      onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                      className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                    />
                    <input
                      type="number"
                      placeholder="סדר תצוגה (0 = ראשון)"
                      value={formData.display_order || 0}
                      onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
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
                    <div className="glass-card rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                      <div className="sticky top-0 glass-card border-b border-white/20 p-6 flex items-center justify-between z-10 rounded-t-3xl">
                        <h3 className="text-2xl font-bold text-white">עריכת שיעור</h3>
                        <button
                          onClick={() => {
                            setEditingLesson(null)
                            setEditingLessonData(null)
                          }}
                          className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      
                      <div className="p-6 space-y-6">
                        {/* Basic Info */}
                        <div className="space-y-4">
                          <h4 className="text-lg font-semibold text-white">פרטים בסיסיים</h4>
                          <input
                            type="text"
                            placeholder="שם השיעור *"
                            value={editingLessonData.title}
                            onChange={(e) => setEditingLessonData({...editingLessonData, title: e.target.value})}
                            className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                            dir="rtl"
                            lang="he"
                          />
                          <textarea
                            placeholder="תיאור השיעור"
                            value={editingLessonData.description}
                            onChange={(e) => setEditingLessonData({...editingLessonData, description: e.target.value})}
                            className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                            rows={3}
                            dir="rtl"
                            lang="he"
                          />
                          <input
                            type="text"
                            placeholder="קישור וידאו (YouTube, Vimeo, או קישור ישיר)"
                            value={editingLessonData.video_url}
                            onChange={(e) => setEditingLessonData({...editingLessonData, video_url: e.target.value})}
                            className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                          />
                        </div>
                        
                        {/* Q&A Section */}
                        <QASectionEditor
                          qaSection={editingLessonData.qa_section || []}
                          onChange={(qaSection) => setEditingLessonData({ ...editingLessonData, qa_section: qaSection })}
                          className="border-t border-white/20 pt-6"
                        />
                        
                        {/* Key Points Section */}
                        <KeyPointsEditor
                          keyPoints={editingLessonData.key_points || []}
                          onChange={(keyPoints) => setEditingLessonData({ ...editingLessonData, key_points: keyPoints })}
                          className="border-t border-white/20 pt-6"
                        />
                        
                        {/* Save Button */}
                        <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-6">
                          <button
                            onClick={() => {
                              setEditingLesson(null)
                              setEditingLessonData(null)
                            }}
                            className="px-6 py-2 border border-white/20 text-gray-300 rounded-full hover:bg-white/10 transition-colors"
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
                            className="btn-primary px-6 py-2"
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
                      className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                      required
                    />
                    <input
                      type="text"
                      placeholder="אייקון (emoji או טקסט) *"
                      value={formData.icon || '⭐'}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
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
                      className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                      required
                    />
                    <textarea
                      placeholder="תיאור (אופציונלי)"
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      dir="rtl"
                      lang="he"
                      className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                      rows={2}
                    />
                    <input
                      type="number"
                      placeholder="סדר תצוגה (0 = ראשון)"
                      value={formData.display_order || 0}
                      onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
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
                      className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                      required
                    />
                    <textarea
                      placeholder="תיאור הקורס *"
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      dir="rtl"
                      lang="he"
                      className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                      rows={4}
                      required
                    />
                    
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

                      <input
                        type="url"
                        placeholder="https://example.com/image.jpg"
                        value={formData.thumbnail_url || ''}
                        onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                        className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500">הזן קישור לתמונה או העלה תמונה מהמחשב</p>
                      
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
                          <label className="block text-sm font-medium text-white mb-2">מחיר (₪)</label>
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
                            className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                          />
                          <p className="text-xs text-gray-500 mt-1">השאר ריק או 0 לקורס חינם</p>
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
                      </div>
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
                      className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
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
                      className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                      rows={3}
                    />
                    <textarea
                      placeholder="תוכן הפוסט (HTML) *"
                      value={formData.content || ''}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      dir="rtl"
                      lang="he"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                      rows={10}
                      required
                    />
                    <input
                      type="url"
                      placeholder="קישור לתמונת כותרת"
                      value={formData.featured_image_url || ''}
                      onChange={(e) => setFormData({ ...formData, featured_image_url: e.target.value })}
                      className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                    />
                    <input
                      type="number"
                      placeholder="זמן קריאה (דקות)"
                      value={formData.read_time_minutes || 5}
                      onChange={(e) => setFormData({ ...formData, read_time_minutes: parseInt(e.target.value) || 5 })}
                      className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
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
                  </div>
                )}
                {activeTab === 'reports' && (
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="כותרת הדיווח *"
                      value={formData.title || ''}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
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
                      <label className="block text-sm font-medium text-white mb-2">
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
                        className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
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
                      className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                      required
                    />
                    <textarea
                      placeholder="תיאור האירוע"
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      dir="rtl"
                      lang="he"
                      className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                      rows={3}
                    />
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">תאריך ושעה של האירוע *</label>
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
                          className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                          calendarClassName="rtl"
                          isClearable
                          todayButton="היום"
                          showPopperArrow={false}
                          wrapperClassName="w-full"
                        />
                      </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">סוג האירוע</label>
                        <select
                          value={formData.event_type || 'live'}
                          onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                          className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                        >
                          <option value="live">לייב</option>
                          <option value="webinar">וובינר</option>
                          <option value="workshop">סדנה</option>
                          <option value="qa">שאלות ותשובות</option>
                          <option value="other">אחר</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">סטטוס</label>
                        <select
                          value={formData.status || 'upcoming'}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                          className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                        >
                          <option value="upcoming">קרוב</option>
                          <option value="active">פעיל (במהלך הלייב)</option>
                          <option value="completed">הושלם</option>
                          <option value="cancelled">בוטל</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">מיקום</label>
                      <input
                        type="text"
                        placeholder="מיקום (למשל: Zoom, Google Meet)"
                        value={formData.location || ''}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                      />
                    </div>
                    <div className="border-t border-gray-200 pt-4">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">Zoom Meeting</h3>
                      
                      {/* Zoom Meetings Dropdown */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-white mb-2">
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
                            className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
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
                          <label className="block text-sm font-medium text-white mb-2">Zoom Meeting ID</label>
                          <input
                            type="text"
                            placeholder="Zoom Meeting ID"
                            value={formData.zoom_meeting_id || ''}
                            onChange={(e) => setFormData({ ...formData, zoom_meeting_id: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-white mb-2">Zoom Meeting Password (אופציונלי)</label>
                          <input
                            type="text"
                            placeholder="סיסמת פגישה"
                            value={formData.zoom_meeting_password || ''}
                            onChange={(e) => setFormData({ ...formData, zoom_meeting_password: e.target.value })}
                            className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="border-t border-gray-200 pt-4">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">הקלטה</h3>
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          בחר הקלטה (אופציונלי - להצגה כשהלייב הסתיים)
                        </label>
                        {recordings.length > 0 ? (
                          <select
                            value={formData.recording_id || ''}
                            onChange={(e) => setFormData({ ...formData, recording_id: e.target.value || undefined })}
                            className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
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
                          <label className="block text-sm font-medium text-white mb-2">שם המנחה</label>
                          <input
                            type="text"
                            placeholder="שם המנחה"
                            value={formData.instructor_name || ''}
                            onChange={(e) => setFormData({ ...formData, instructor_name: e.target.value })}
                            className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-white mb-2">תפקיד המנחה</label>
                          <input
                            type="text"
                            placeholder="תפקיד"
                            value={formData.instructor_title || ''}
                            onChange={(e) => setFormData({ ...formData, instructor_title: e.target.value })}
                            className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-white mb-2">URL תמונת המנחה</label>
                          <input
                            type="url"
                            placeholder="URL תמונה"
                            value={formData.instructor_avatar_url || ''}
                            onChange={(e) => setFormData({ ...formData, instructor_avatar_url: e.target.value })}
                            className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="border-t border-gray-200 pt-4">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">תוכן נוסף</h3>
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">על האירוע</label>
                        <textarea
                          placeholder="תיאור מפורט על האירוע"
                          value={formData.about_text || ''}
                          onChange={(e) => setFormData({ ...formData, about_text: e.target.value })}
                          dir="rtl"
                          lang="he"
                          className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                          rows={4}
                        />
                      </div>
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-white mb-2">נקודות למידה (לחיצה על Enter להוספת נקודה)</label>
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
                            <label className="block text-sm font-medium text-white mb-2">תבנית חזרה</label>
                            <input
                              type="text"
                              placeholder="למשל: שבועי, חודשי"
                              value={formData.recurring_pattern || ''}
                              onChange={(e) => setFormData({ ...formData, recurring_pattern: e.target.value })}
                              className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
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
                      className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                      required
                    />
                    <textarea
                      placeholder="תיאור הפרויקט *"
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      dir="rtl"
                      lang="he"
                      className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                      rows={4}
                      required
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">מפרסם (User ID) *</label>
                        <input
                          type="text"
                          placeholder="User ID"
                          value={formData.user_id || ''}
                          onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                          className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">סטטוס</label>
                        <select
                          value={formData.status || 'open'}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                          className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
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
                        <label className="block text-sm font-medium text-white mb-2">תקציב מינימלי</label>
                        <input
                          type="number"
                          placeholder="0"
                          value={formData.budget_min || ''}
                          onChange={(e) => setFormData({ ...formData, budget_min: e.target.value })}
                          className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">תקציב מקסימלי</label>
                        <input
                          type="number"
                          placeholder="0"
                          value={formData.budget_max || ''}
                          onChange={(e) => setFormData({ ...formData, budget_max: e.target.value })}
                          className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">מטבע</label>
                        <select
                          value={formData.budget_currency || 'ILS'}
                          onChange={(e) => setFormData({ ...formData, budget_currency: e.target.value })}
                          className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                        >
                          <option value="ILS">₪ ILS</option>
                          <option value="USD">$ USD</option>
                          <option value="EUR">€ EUR</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">טכנולוגיות (מופרדות בפסיקים)</label>
                      <input
                        type="text"
                        placeholder="למשל: Make.com, Zapier, API"
                        value={formData.technologies || ''}
                        onChange={(e) => setFormData({ ...formData, technologies: e.target.value })}
                        className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                      />
                    </div>
                  </div>
                )}
                {activeTab === 'tags' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">שם התגית *</label>
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
                        className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                        dir="rtl"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">Slug</label>
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
                      <label className="block text-sm font-medium text-white mb-2">תיאור</label>
                      <textarea
                        placeholder="תיאור קצר של התגית"
                        value={formData.description || ''}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                        rows={3}
                        dir="rtl"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">צבע (Hex)</label>
                        <input
                          type="text"
                          placeholder="#F52F8E"
                          value={formData.color || ''}
                          onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                          className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">אייקון</label>
                        <input
                          type="text"
                          placeholder="למשל: 🚀, ⚡, 🔥"
                          value={formData.icon || ''}
                          onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                          className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink focus:border-transparent"
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
                    className="flex items-center gap-2 px-4 py-2 bg-hot-pink text-white rounded-full hover:bg-rose-500 transition-colors shadow-lg hover:shadow-xl"
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
                        <th className="text-right py-3 px-4">קטגוריה</th>
                        <th className="text-right py-3 px-4">משך זמן</th>
                        <th className="text-right py-3 px-4">צפיות</th>
                        <th className="text-right py-3 px-4">תאריך</th>
                        <th className="text-right py-3 px-4">פעולות</th>
                      </>
                    )}
                    {activeTab === 'resources' && (
                      <>
                        <th className="text-right py-3 px-4">כותרת</th>
                        <th className="text-right py-3 px-4">קטגוריה</th>
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
                  </tr>
                </thead>
                <tbody>
                  {activeTab === 'users' && users.map((user) => (
                    <tr key={user.id} className="border-b border-gray-100">
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
                        <span className="px-2 py-1 bg-hot-pink text-white text-xs rounded">
                          {user.roles?.display_name || user.role?.display_name || 'לא מוגדר'}
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
                        <span className="px-2 py-1 bg-hot-pink text-white text-xs rounded">
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
                          {formatDate(payment.payment_date)}
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
                          <td className="py-3 px-4">
                            {recording.category && (
                              <div className="flex flex-wrap gap-1">
                                {Array.isArray(recording.category) ? (
                                  recording.category.map((cat: string, idx: number) => (
                                    <span key={idx} className="px-2 py-1 bg-[#F52F8E] text-white text-xs rounded">
                                      {cat}
                                    </span>
                                  ))
                                ) : (
                                  <span className="px-2 py-1 bg-hot-pink text-white text-xs rounded">
                                    {recording.category}
                                  </span>
                                )}
                              </div>
                            )}
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
                                      const editData = { ...recording };
                                      if (Array.isArray(recording.category)) {
                                        editData.category = recording.category.join(', ');
                                      }
                                      editData.key_points = [];
                                      editData.qa_section = [];
                                      setFormData(editData);
                                      return;
                                    }
                                    
                                    // Convert category array to comma-separated string for editing
                                    const editData = { ...fullRecording };
                                    if (Array.isArray(fullRecording.category)) {
                                      editData.category = fullRecording.category.join(', ');
                                    }
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
                      <td className="py-3 px-4 font-medium">{resource.title || '-'}</td>
                      <td className="py-3 px-4">
                        {resource.category && (
                          <span className="px-2 py-1 bg-hot-pink text-white text-xs rounded">
                            {resource.category}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <a 
                          href={resource.file_url} 
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
                            onClick={() => {
                              setEditing(resource.id)
                              setFormData(resource)
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
                      <td className="py-3 px-4 font-medium">{post.title || '-'}</td>
                      <td className="py-3 px-4">
                        {post.category && (
                          <span className="px-2 py-1 bg-hot-pink text-white text-xs rounded">
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
                  {activeTab === 'news' && news.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100">
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
                          <span className="px-2 py-1 bg-hot-pink text-white text-xs rounded">
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
                                
                                if (lessons && lessons.length > 0) {
                                  // Group lessons into sections (for now, all in one section)
                                  // In the future, we can add a section_id field to lessons
                                  const mappedLessons = lessons.map((lesson: any) => ({
                                    id: lesson.id || `lesson-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                    title: lesson.title || '',
                                    description: lesson.description || '',
                                    video_url: lesson.video_url || '',
                                    duration_minutes: lesson.duration_minutes || 0,
                                    qa_section: lesson.qa_section || [],
                                    key_points: lesson.key_points || []
                                  }))
                                  
                                  console.log('Mapped lessons to sections:', mappedLessons)
                                  console.log('Setting courseSections with', mappedLessons.length, 'lessons')
                                  
                                  setCourseSections([{
                                    id: 'section-1',
                                    title: 'חלק א\'',
                                    lessons: mappedLessons
                                  }])
                                  
                                  // Show success message
                                  console.log('✅ Successfully loaded', mappedLessons.length, 'lessons for editing')
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
                      <td className="py-3 px-4 font-medium">{event.title || '-'}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-hot-pink text-white text-xs rounded">
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
                      <td className="py-3 px-4 font-medium">{project.title || '-'}</td>
                      <td className="py-3 px-4">
                        {project.profiles 
                          ? (project.profiles.nickname || `${project.profiles.first_name || ''} ${project.profiles.last_name || ''}`.trim() || '-')
                          : '-'}
                      </td>
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
                            onClick={() => {
                              setEditing(project.id)
                              setFormData({
                                ...project,
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
                                    <span className="font-medium">
                                      {offer.profiles 
                                        ? (offer.profiles.nickname || `${offer.profiles.first_name || ''} ${offer.profiles.last_name || ''}`.trim() || 'משתמש לא ידוע')
                                        : 'משתמש לא ידוע'}
                                    </span>
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
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Feedbacks Tab */}
        {activeTab === 'feedbacks' && (
          <div className="space-y-4">
            {feedbacks.length === 0 ? (
              <div className="text-center py-12 text-gray-300">
                <MessageCircleMore className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                <p>אין פידבקים עדיין</p>
              </div>
            ) : (
              <div className="space-y-4">
                {feedbacks.map((feedback) => (
                  <div
                    key={feedback.id}
                    className={`glass-card rounded-2xl p-6 border-l-4 ${
                      feedback.status === 'new' ? 'border-hot-pink' :
                      feedback.status === 'read' ? 'border-cyan-400' :
                      'border-gray-500'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="text-lg font-bold text-white">{feedback.subject}</h3>
                          {feedback.feedback_type && (
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                              {feedback.feedback_type}
                            </span>
                          )}
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            feedback.status === 'new' ? 'bg-hot-pink text-white' :
                            feedback.status === 'read' ? 'bg-cyan-500 text-white' :
                            'bg-gray-500 text-white'
                          }`}>
                            {feedback.status === 'new' ? 'חדש' :
                             feedback.status === 'read' ? 'נקרא' :
                             'בארכיון'}
                          </span>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < feedback.rating
                                    ? 'text-yellow-400 fill-yellow-400'
                                    : 'text-gray-500'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="text-sm text-gray-300 mb-3">
                          {feedback.profiles ? (
                            <span>
                              מ: {feedback.profiles.first_name || feedback.profiles.nickname || 'משתמש לא ידוע'}
                              {feedback.name && ` (${feedback.name})`}
                            </span>
                          ) : (
                            feedback.name && <span>מ: {feedback.name}</span>
                          )}
                          {feedback.email && <span className="mx-2">•</span>}
                          {feedback.email && <span>{feedback.email}</span>}
                          <span className="mx-2">•</span>
                          <span>{new Date(feedback.created_at).toLocaleDateString('he-IL', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}</span>
                        </div>
                        <p className="text-white leading-relaxed mb-4">{feedback.message}</p>
                        {feedback.image_url && (
                          <div className="mt-4 mb-4">
                            <p className="text-sm font-semibold text-gray-300 mb-2">תמונה/צילום מסך:</p>
                            <div className="relative w-full max-w-md rounded-lg overflow-hidden border border-white/20">
                              <img
                                src={feedback.image_url}
                                alt="תמונה מהפידבק"
                                className="w-full h-auto object-contain"
                                onClick={() => window.open(feedback.image_url, '_blank')}
                                style={{ cursor: 'pointer' }}
                              />
                            </div>
                            <a
                              href={feedback.image_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-hot-pink hover:underline mt-2 inline-block"
                            >
                              פתח בתמונה מלאה
                            </a>
                          </div>
                        )}
                        {feedback.admin_notes && (
                          <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                            <p className="text-sm font-semibold text-yellow-300 mb-1">הערות מנהל:</p>
                            <p className="text-sm text-yellow-200">{feedback.admin_notes}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 ml-4">
                        {feedback.status === 'new' && (
                          <button
                            onClick={async () => {
                              const { error } = await supabase
                                .from('feedbacks')
                                .update({ status: 'read' })
                                .eq('id', feedback.id)
                              if (!error) {
                                await loadData()
                              }
                            }}
                            className="btn-secondary px-4 py-2 text-sm"
                          >
                            סמן כנקרא
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setEditing(feedback.id)
                            setFormData({
                              status: feedback.status,
                              admin_notes: feedback.admin_notes || ''
                            })
                          }}
                          className="btn-secondary px-4 py-2 text-sm"
                        >
                          <Edit className="w-4 h-4 inline-block ml-1" />
                          ערוך
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm('האם אתה בטוח שברצונך למחוק את הפידבק הזה?')) {
                              const { error } = await supabase
                                .from('feedbacks')
                                .delete()
                                .eq('id', feedback.id)
                              if (error) {
                                console.error('Error deleting feedback:', error);
                                alert(`שגיאה במחיקת הפידבק: ${error.message || 'נסה שוב'}`);
                              } else {
                                await loadData()
                              }
                            }
                          }}
                          className="btn-danger px-4 py-2 text-sm"
                        >
                          <Trash2 className="w-4 h-4 inline-block ml-1" />
                          מחק
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Edit Feedback Modal */}
        {activeTab === 'feedbacks' && editing && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="glass-card rounded-3xl p-6 max-w-2xl w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">ערוך פידבק</h3>
                <button
                  onClick={() => {
                    setEditing(null)
                    setFormData({})
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">סטטוס</label>
                  <select
                    value={formData.status || 'new'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-hot-pink"
                  >
                    <option value="new">חדש</option>
                    <option value="read">נקרא</option>
                    <option value="archived">בארכיון</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">הערות מנהל</label>
                  <textarea
                    value={formData.admin_notes || ''}
                    onChange={(e) => setFormData({ ...formData, admin_notes: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hot-pink resize-none"
                    placeholder="הערות פנימיות (לא נראה למשתמש)"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={async () => {
                      const { error } = await supabase
                        .from('feedbacks')
                        .update({
                          status: formData.status,
                          admin_notes: formData.admin_notes || null
                        })
                        .eq('id', editing)
                      if (!error) {
                        await loadData()
                        setEditing(null)
                        setFormData({})
                        alert('הפידבק עודכן בהצלחה!')
                      } else {
                        alert('שגיאה בעדכון הפידבק')
                      }
                    }}
                    className="btn-primary flex-1"
                  >
                    <Save className="w-4 h-4 inline-block ml-2" />
                    שמור
                  </button>
                  <button
                    onClick={() => {
                      setEditing(null)
                      setFormData({})
                    }}
                    className="btn-secondary flex-1"
                  >
                    ביטול
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
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

