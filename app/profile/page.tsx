'use client';

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getProfileWithRole } from '@/lib/queries/profiles'
import { 
  User, 
  Edit, 
  Trophy, 
  Settings,
  Bell,
  MessageSquare,
  History,
  Instagram,
  Facebook,
  Save,
  X,
  Activity,
  Mail,
  Menu,
  Camera,
  Upload,
  Eye,
  MessageCircle,
  Clock,
  Star,
  Linkedin,
  Twitter,
  Youtube,
  Github,
  Globe,
  Link as LinkIcon,
  Briefcase,
  CheckCircle,
  XCircle,
  Clock as ClockIcon,
  ChevronRight,
  ChevronLeft,
  CheckCheck
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useRef } from 'react'
import { getUserForumPosts, getUserForumReplies } from '@/lib/queries/forums'
import { getUserPointsHistory } from '@/lib/queries/gamification'
import { getEnrolledCourses, getCompletedLessons, getCourseLessons } from '@/lib/queries/courses'
import { getUserProjects, getProjectOffersByUser, getProjectOffers } from '@/lib/queries/projects'
import { BookOpen } from 'lucide-react'
import { formatTimeAgo as formatTimeAgoUtil } from '@/lib/utils/date'
import { isAdmin } from '@/lib/utils/user'

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'profile' | 'timeline' | 'messages' | 'forums' | 'points' | 'courses' | 'notifications' | 'projects'>('profile')
  const [editingDetails, setEditingDetails] = useState(false)
  const [editingPersonal, setEditingPersonal] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [forumsTab, setForumsTab] = useState<'posts' | 'replies'>('posts')
  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [avatarMode, setAvatarMode] = useState<'upload' | 'avatar'>('upload')
  const [myPosts, setMyPosts] = useState<any[]>([])
  const [myReplies, setMyReplies] = useState<any[]>([])
  const [pointsHistory, setPointsHistory] = useState<any[]>([])
  const [loadingForums, setLoadingForums] = useState(false)
  const [loadingPoints, setLoadingPoints] = useState(false)
  const [myCourses, setMyCourses] = useState<any[]>([])
  const [loadingCourses, setLoadingCourses] = useState(false)
  const [myOffers, setMyOffers] = useState<any[]>([])
  const [loadingOffers, setLoadingOffers] = useState(false)
  const [myProjects, setMyProjects] = useState<any[]>([])
  const [mySubmissions, setMySubmissions] = useState<any[]>([])
  const [projectOffers, setProjectOffers] = useState<Record<string, any[]>>({})
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [userBadges, setUserBadges] = useState<any[]>([])
  const [highestBadge, setHighestBadge] = useState<any>(null)
  const [currentLoggedInUserId, setCurrentLoggedInUserId] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isCurrentUserAdmin, setIsCurrentUserAdmin] = useState(false)
  const [showAvatarLightbox, setShowAvatarLightbox] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [loadingNotifications, setLoadingNotifications] = useState(false)
  const [notificationsPage, setNotificationsPage] = useState(1)
  const [notificationsTotalPages, setNotificationsTotalPages] = useState(1)
  const [notificationsTotal, setNotificationsTotal] = useState(0)
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    nickname: '',
    how_to_address: '',
    nocode_experience: '',
    display_name: '',
    bio: '',
    experience_level: '',
    avatar_url: '',
    instagram_url: '',
    facebook_url: ''
  })

  useEffect(() => {
    loadCurrentLoggedInUser()
    loadProfile()
  }, [])

  async function loadCurrentLoggedInUser() {
    try {
      // Use getCurrentUser utility function
      const { getCurrentUser } = await import('@/lib/utils/user');
      const user = await getCurrentUser();
      
      if (user) {
        setCurrentLoggedInUserId(user.user_id || user.id || null);
        setCurrentUser(user);
        setIsCurrentUserAdmin(isAdmin(user));
      } else {
        setCurrentLoggedInUserId(null);
        setCurrentUser(null);
        setIsCurrentUserAdmin(false);
      }
    } catch (error) {
      const { logError } = await import('@/lib/utils/errorHandler');
      logError(error, 'loadCurrentLoggedInUser');
      setCurrentLoggedInUserId(null);
      setCurrentUser(null);
      setIsCurrentUserAdmin(false);
    }
  }

  useEffect(() => {
    // Redirect to profile tab if user tries to access private tab without permission
    if (profile && !isOwnerOrAdmin()) {
      const privateTabs = ['courses', 'notifications', 'messages', 'projects'];
      if (privateTabs.includes(activeTab)) {
        setActiveTab('profile');
      }
    }
    
    if (profile && activeTab === 'forums') {
      loadForumsData()
    }
    if (profile && activeTab === 'courses' && isOwnerOrAdmin()) {
      loadMyCourses()
    }
  }, [profile, activeTab, forumsTab])

  useEffect(() => {
    if (profile && activeTab === 'points' && isOwnerOrAdmin()) {
      loadPointsHistory()
    }
  }, [profile, activeTab])

  useEffect(() => {
    if (profile && activeTab === 'courses' && isOwnerOrAdmin()) {
      loadMyCourses()
    }
    if (profile && activeTab === 'profile' && isOwnerOrAdmin()) {
      loadMyOffers()
    }
    if (profile && activeTab === 'projects' && isOwnerOrAdmin()) {
      loadProjectsData()
    }
  }, [profile, activeTab])

  // Helper function to check if current user is owner or admin
  function isOwnerOrAdmin(): boolean {
    if (!profile || !currentLoggedInUserId) return false;
    const profileUserId = profile.user_id || profile.id;
    const isOwner = currentLoggedInUserId === profileUserId;
    return isOwner || isCurrentUserAdmin;
  }

  async function loadProfile() {
    setLoading(true)
    try {
      // Get selected user from localStorage, or use first user as default
      const savedUserId = typeof window !== 'undefined' ? localStorage.getItem('selectedUserId') : null;
      
      let profile;
      if (savedUserId) {
        // Load specific user profile using query function
        const { getProfile } = await import('@/lib/queries/profiles');
        const { data, error } = await getProfile(savedUserId);
        
        if (error || !data) {
          // If user not found, fall back to first user
          const { getAllProfiles } = await import('@/lib/queries/profiles');
          const { data: allProfiles } = await getAllProfiles();
          profile = Array.isArray(allProfiles) && allProfiles.length > 0 ? allProfiles[0] : null;
        } else {
          profile = data;
        }
      } else {
        // Use first profile as default
        const { getAllProfiles } = await import('@/lib/queries/profiles');
        const { data: allProfiles } = await getAllProfiles();
        profile = Array.isArray(allProfiles) && allProfiles.length > 0 ? allProfiles[0] : null;
      }
      
      if (profile) {
        setProfile(profile)
        setFormData({
          first_name: profile.first_name || '',
          last_name: profile.last_name || '',
          nickname: profile.nickname || '',
          how_to_address: profile.how_to_address || '',
          nocode_experience: profile.nocode_experience || '',
          display_name: profile.display_name || '',
          bio: profile.bio || '',
          experience_level: profile.experience_level || 'מתחיל',
          avatar_url: profile.avatar_url || '',
          instagram_url: profile.instagram_url || '',
          facebook_url: profile.facebook_url || ''
        })
        
        // Save to localStorage
        if (typeof window !== 'undefined' && profile.user_id) {
          localStorage.setItem('selectedUserId', profile.user_id);
        }
        
        // Load user badges
        const { getUserBadges, getUserHighestBadge } = await import('@/lib/queries/badges');
        const userId = profile.user_id || profile.id;
        if (userId) {
          const [badgesResult, highestBadgeResult] = await Promise.all([
            getUserBadges(userId),
            getUserHighestBadge(userId)
          ]);
          if (badgesResult.data) {
            setUserBadges(badgesResult.data);
          }
          if (highestBadgeResult.data) {
            setHighestBadge(highestBadgeResult.data);
          }
        }
      }
    } catch (error: any) {
      console.error('Error loading profile:', error?.message || String(error))
    } finally {
      setLoading(false)
    }
  }

  async function handleAvatarUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Security check: Only allow editing own profile
    if (!profile) {
      alert('שגיאה: פרופיל לא נמצא');
      return;
    }

    // Check if user is logged in
    if (!currentLoggedInUserId) {
      alert('שגיאה: אתה לא מחובר. אנא התחבר כדי לערוך את הפרופיל.');
      return;
    }

    // Check if the logged-in user is the owner of this profile
    const profileUserId = profile.user_id || profile.id;
    if (currentLoggedInUserId !== profileUserId) {
      alert('שגיאה: אתה יכול לערוך רק את הפרופיל שלך!');
      return;
    }

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

    setUploadingAvatar(true);
    try {
      if (!profile) return;

      const userId = profile.user_id || profile.id;
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Upload error:', uploadError?.message || String(uploadError));
        // If bucket doesn't exist, use base64 as fallback
        if (uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('not found') || uploadError.message?.includes('Bucket')) {
          console.warn('Bucket "avatars" not found, using base64 fallback');
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64 = reader.result as string;
      setFormData({ ...formData, avatar_url: base64 });
      await saveDetails({ avatar_url: base64 });
      setShowAvatarModal(false);
      // Clear cache and reload profile
      const { clearCache } = await import('@/lib/cache');
      clearCache();
      await loadProfile();
      // Notify other components
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('profileUpdated', { detail: { avatar_url: base64 } }));
      }
          };
          reader.readAsDataURL(file);
          setUploadingAvatar(false);
          return;
        } else {
          alert('שגיאה בהעלאת התמונה. נסה שוב.');
          setUploadingAvatar(false);
          return;
        }
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setFormData({ ...formData, avatar_url: publicUrl });
      await saveDetails({ avatar_url: publicUrl });
      setShowAvatarModal(false);
      // Clear cache and reload profile
      const { clearCache } = await import('@/lib/cache');
      clearCache();
      await loadProfile();
      // Notify other components
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('profileUpdated', { detail: { avatar_url: publicUrl } }));
      }
    } catch (error: any) {
      console.error('Error uploading avatar:', error?.message || String(error));
      alert('שגיאה בהעלאת התמונה');
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleAvatarSelect(avatarUrl: string) {
    try {
      setFormData({ ...formData, avatar_url: avatarUrl });
      await saveDetails({ avatar_url: avatarUrl });
      setShowAvatarModal(false);
      // Clear cache and reload profile
      const { clearCache } = await import('@/lib/cache');
      clearCache();
      await loadProfile();
      // Notify other components
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('profileUpdated', { detail: { avatar_url: avatarUrl } }));
      }
    } catch (error: any) {
      console.error('Error setting avatar:', error?.message || String(error));
      alert('שגיאה בשמירת האווטר');
    }
  }

  async function saveDetails(additionalUpdates?: any) {
    try {
      // Security check: Only allow editing own profile
      if (!profile) {
        alert('שגיאה: פרופיל לא נמצא');
        return;
      }

      // Check if user is logged in
      if (!currentLoggedInUserId) {
        alert('שגיאה: אתה לא מחובר. אנא התחבר כדי לערוך את הפרופיל.');
        return;
      }

      // Check if the logged-in user is the owner of this profile
      const profileUserId = profile.user_id || profile.id;
      if (currentLoggedInUserId !== profileUserId) {
        alert('שגיאה: אתה יכול לערוך רק את הפרופיל שלך!');
        return;
      }

      // Safely prepare update data to avoid circular references
      const updateData: any = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        nickname: formData.nickname,
        how_to_address: formData.how_to_address,
        nocode_experience: formData.nocode_experience,
        display_name: formData.display_name,
        bio: formData.bio,
        experience_level: formData.experience_level,
        avatar_url: formData.avatar_url,
        instagram_url: formData.instagram_url,
        facebook_url: formData.facebook_url,
      };
      
      // Safely merge additionalUpdates if provided
      if (additionalUpdates) {
        Object.keys(additionalUpdates).forEach(key => {
          const value = additionalUpdates[key];
          // Only include primitive values to avoid circular references
          // Also exclude React internal fields
          if (value !== null && value !== undefined && 
              !key.startsWith('_') && !key.startsWith('__react') &&
              (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')) {
            updateData[key] = value;
          }
        });
      }

      let error: any = null;
      try {
        const result = await supabase
          .from('profiles')
          .update(updateData)
          .eq('user_id', currentLoggedInUserId); // Use user_id from auth, not profile.id
        
        error = result.error;
      } catch (supabaseError: any) {
        // Catch any errors from Supabase client itself
        error = supabaseError;
      }
      
      if (!error) {
        // Clear cache to force reload
        const { clearCache } = await import('@/lib/cache');
        clearCache();
        await loadProfile();
        setEditingDetails(false);
        // Force page reload to update all avatars
        if (typeof window !== 'undefined') {
          // Trigger a custom event to notify other components
          const avatarUrl = formData.avatar_url || additionalUpdates?.avatar_url || '';
          window.dispatchEvent(new CustomEvent('profileUpdated', { detail: { avatar_url: avatarUrl } }));
        }
      } else {
        // Safely log error
        const errorMsg = error?.message || (typeof error === 'string' ? error : 'שגיאה בשמירת הפרופיל');
        if (!errorMsg.includes('circular') && !errorMsg.includes('HTMLButtonElement')) {
          console.warn('Error updating profile:', errorMsg);
        }
        alert('שגיאה בשמירת הפרופיל. נסה שוב.');
      }
    } catch (error: any) {
      // Safely extract error message to avoid circular reference issues
      let errorMessage = 'שגיאה בשמירת הפרופיל';
      try {
        // Check if error is a TypeError about circular structure
        if (error instanceof TypeError && error.message?.includes('circular')) {
          errorMessage = 'שגיאה בשמירת הפרופיל - בעיית מבנה נתונים';
        } else if (error?.message && typeof error.message === 'string') {
          // Only use message if it's a string and doesn't contain circular reference info
          if (!error.message.includes('circular') && !error.message.includes('HTMLButtonElement')) {
            errorMessage = error.message;
          }
        } else if (typeof error === 'string') {
          if (!error.includes('circular') && !error.includes('HTMLButtonElement')) {
            errorMessage = error;
          }
        }
      } catch (e) {
        // If anything fails, use default message
        errorMessage = 'שגיאה בשמירת הפרופיל';
      }
      
      // Use console.warn instead of console.error to avoid JSON.stringify issues
      try {
        console.warn('Error saving details:', errorMessage);
      } catch {
        // If even console.warn fails, just show alert
      }
      
      alert('שגיאה בשמירת הפרופיל. נסה שוב.');
    }
  }

  async function savePersonal() {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          bio: formData.bio,
          avatar_url: formData.avatar_url
        })
        .eq('id', profile.id)
      
      if (!error) {
        await loadProfile()
        setEditingPersonal(false)
      }
    } catch (error: any) {
      // Safely extract error message to avoid circular reference issues
      let errorMessage = 'שגיאה לא ידועה';
      try {
        if (error?.message) {
          errorMessage = error.message;
        } else if (typeof error === 'string') {
          errorMessage = error;
        } else {
          errorMessage = String(error?.toString?.() || error?.name || 'שגיאה בשמירת המידע האישי');
        }
      } catch {
        errorMessage = 'שגיאה בשמירת המידע האישי';
      }
      console.error('Error saving personal info:', errorMessage);
    }
  }

  async function loadForumsData() {
    if (!profile) return
    setLoadingForums(true)
    try {
      const userId = profile.user_id || profile.id
      if (forumsTab === 'posts') {
        const { data } = await getUserForumPosts(userId)
        setMyPosts(data || [])
      } else {
        const { data } = await getUserForumReplies(userId)
        setMyReplies(data || [])
      }
    } catch (error: any) {
      console.error('Error loading forums data:', error?.message || String(error))
    } finally {
      setLoadingForums(false)
    }
  }

  async function loadPointsHistory() {
    if (!profile) return
    setLoadingPoints(true)
    try {
      const userId = profile.user_id || profile.id
      const { data } = await getUserPointsHistory(userId)
      
      // Load gamification rules to get descriptions
      let rulesMap = new Map()
      try {
        const { getActiveRules } = await import('@/lib/queries/gamification')
        const { data: rules, error: rulesError } = await getActiveRules()
        
        if (!rulesError && rules && Array.isArray(rules) && rules.length > 0) {
          // Map action names to descriptions (prefer description, fallback to Hebrew name)
          rules.forEach((rule: any) => {
            const actionName = rule.trigger_action || rule.action_name || ''
            const actionKey = actionName.toLowerCase()
            // Prefer description, then use Hebrew name if available
            const displayText = rule.description || 
                               (rule.trigger_action && rule.trigger_action !== 'daily_login' ? rule.trigger_action : null) ||
                               rule.action_name ||
                               actionKey
            
            if (actionKey) {
              // Store both lowercase and original (for Hebrew actions)
              rulesMap.set(actionKey, displayText)
              if (actionName && actionName !== actionKey) {
                rulesMap.set(actionName, displayText)
              }
            }
          })
        }
      } catch (rulesError) {
        // Silently fail - we'll use fallback mapping
        console.warn('Could not load gamification rules for descriptions:', rulesError)
      }
      
      // Fallback mapping for common actions (both English and Hebrew)
      const fallbackMap: Record<string, string> = {
        'daily_login': 'כניסה יומית',
        'כניסה יומית': 'כניסה יומית',
        'create_post': 'יצירת פוסט',
        'יצירת פוסט': 'יצירת פוסט',
        'create_forum_post': 'יצירת פוסט בפורום',
        'יצירת פוסט בפורום': 'יצירת פוסט בפורום',
        'reply_to_post': 'תגובה לפוסט',
        'תגובה לפוסט': 'תגובה לפוסט',
        'like_post': 'לייק לפוסט',
        'לייק לפוסט': 'לייק לפוסט',
        'complete_course': 'השלמת קורס',
        'השלמת קורס': 'השלמת קורס',
        'סיום שיעור': 'סיום שיעור',
        'lesson_completion': 'סיום שיעור',
        'course_completion': 'השלמת קורס',
        'create_project': 'יצירת פרויקט',
        'יצירת פרויקט': 'יצירת פרויקט',
        'submit_offer': 'הגשת הצעה לפרויקט',
        'הגשת הצעה לפרויקט': 'הגשת הצעה לפרויקט'
      }
      
      // Enhance points history with descriptions
      const enhancedHistory = (data || []).map((entry: any) => {
        const actionName = entry.action_name || entry.action || ''
        const actionKey = actionName.toLowerCase()
        
        // Try to get from rules map first (by lowercase key)
        let displayText = rulesMap.get(actionKey)
        
        // If not found in rules map, try fallback map with both lowercase and original
        if (!displayText) {
          displayText = fallbackMap[actionKey] || fallbackMap[actionName] || null
        }
        
        // If still not found, try to find in rules by original name (for Hebrew actions)
        if (!displayText && actionName) {
          // Check if any rule matches the original action name (case-insensitive for Hebrew)
          for (const [key, value] of rulesMap.entries()) {
            if (key === actionName || key === actionKey) {
              displayText = value
              break
            }
          }
        }
        
        // Final fallback
        if (!displayText) {
          displayText = actionName || 'פעולה'
        }
        
        return {
          ...entry,
          displayAction: displayText
        }
      })
      
      setPointsHistory(enhancedHistory)
    } catch (error: any) {
      console.error('Error loading points history:', error?.message || String(error))
      // Still set the history even if enhancement fails
      const userId = profile.user_id || profile.id
      const { data } = await getUserPointsHistory(userId)
      setPointsHistory(data || [])
    } finally {
      setLoadingPoints(false)
    }
  }

  async function loadMyOffers() {
    if (!profile || !isOwnerOrAdmin()) return
    setLoadingOffers(true)
    try {
      const userId = profile.user_id || profile.id
      const { data, error } = await getProjectOffersByUser(userId)
      
      if (error) {
        console.error('Error loading offers:', error?.message || String(error))
        setMyOffers([])
      } else {
        setMyOffers(data || [])
      }
    } catch (error: any) {
      console.error('Error loading offers:', error?.message || String(error))
      setMyOffers([])
    } finally {
      setLoadingOffers(false)
    }
  }

  async function loadProjectsData() {
    if (!profile || !isOwnerOrAdmin()) return
    setLoadingProjects(true)
    try {
      const userId = profile.user_id || profile.id
      
      // טעינת פרויקטים שהמשתמש פרסם
      const { data: projects, error: projectsError } = await getUserProjects(userId)
      if (projectsError) {
        console.error('Error loading projects:', projectsError)
        setMyProjects([])
      } else {
        setMyProjects(Array.isArray(projects) ? projects : [])
        
        // טעינת כל ההגשות לכל פרויקט של המשתמש
        if (Array.isArray(projects) && projects.length > 0) {
          const offersPromises = projects.map(async (project: any) => {
            const { data } = await getProjectOffers(project.id)
            return { projectId: project.id, offers: data || [] }
          })
          const offersResults = await Promise.all(offersPromises)
          const offersMap = offersResults.reduce((acc, { projectId, offers }) => {
            acc[projectId] = offers
            return acc
          }, {} as Record<string, any[]>)
          setProjectOffers(offersMap)
        }
      }
      
      // טעינת הגשות שהמשתמש הגיש
      const { data: submissions, error: submissionsError } = await getProjectOffersByUser(userId)
      if (submissionsError) {
        console.error('Error loading submissions:', submissionsError)
        setMySubmissions([])
      } else {
        setMySubmissions(Array.isArray(submissions) ? submissions : [])
      }
    } catch (error: any) {
      console.error('Error loading projects data:', error?.message || String(error))
      setMyProjects([])
      setMySubmissions([])
    } finally {
      setLoadingProjects(false)
    }
  }

  async function loadMyCourses() {
    if (!profile || !isOwnerOrAdmin()) return
    setLoadingCourses(true)
    try {
      const userId = profile.user_id || profile.id
      const { data, error } = await getEnrolledCourses(userId)
      
      if (error) {
        console.error('Error loading courses:', error?.message || String(error))
        setMyCourses([])
      } else {
        // Load progress for each course (completed lessons)
        const coursesWithProgress = await Promise.all(
          (data || []).map(async (course: any) => {
            try {
              // Get all lessons for the course
              const { data: lessons } = await getCourseLessons(course.id)
              const totalLessons = lessons?.length || 0
              
              // Get completed lessons
              const { data: completedLessonIds } = await getCompletedLessons(course.id, userId)
              const completedCount = completedLessonIds?.length || 0
              
              // Calculate progress percentage
              const progressPercentage = totalLessons > 0 
                ? Math.round((completedCount / totalLessons) * 100) 
                : 0
              
              return {
                ...course,
                progress: progressPercentage,
                completedLessons: completedCount,
                totalLessons: totalLessons
              }
            } catch (error: any) {
              console.error(`Error loading progress for course ${course.id}:`, error?.message || String(error))
              return {
                ...course,
                progress: 0,
                completedLessons: 0,
                totalLessons: 0
              }
            }
          })
        )
        
        setMyCourses(coursesWithProgress)
      }
    } catch (error: any) {
      console.error('Error loading courses:', error?.message || String(error))
      setMyCourses([])
    } finally {
      setLoadingCourses(false)
    }
  }

  function formatTimeAgo(dateString: string): string {
    return formatTimeAgoUtil(dateString)
  }

  const loadNotifications = useCallback(async (page: number = 1) => {
    if (!currentLoggedInUserId || !isOwnerOrAdmin()) {
      setLoadingNotifications(false)
      return
    }

    setLoadingNotifications(true)
    try {
      const params = new URLSearchParams({
        user_id: currentLoggedInUserId,
        page: page.toString(),
        pageSize: '10',
        maxNotifications: '60'
      })

      const response = await fetch(`/api/notifications?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()

      if (result.data) {
        setNotifications(result.data)
        setNotificationsTotal(result.total)
        setNotificationsTotalPages(result.totalPages)
        setNotificationsPage(result.page)
      } else {
        setNotifications([])
        setNotificationsTotal(0)
        setNotificationsTotalPages(0)
      }
    } catch (error: any) {
      console.error('Error loading notifications:', error?.message || String(error))
      setNotifications([])
      setNotificationsTotal(0)
      setNotificationsTotalPages(0)
    } finally {
      setLoadingNotifications(false)
    }
  }, [currentLoggedInUserId])

  useEffect(() => {
    if (activeTab === 'notifications' && currentLoggedInUserId && isOwnerOrAdmin()) {
      loadNotifications(1)
    }
  }, [activeTab, currentLoggedInUserId, loadNotifications])

  const handleNotificationPageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= notificationsTotalPages) {
      loadNotifications(newPage)
    }
  }

  const handleMarkNotificationAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_read: true })
      })

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
        )
      }
    } catch (error: any) {
      console.error('Error marking notification as read:', error?.message || String(error))
    }
  }

  const handleMarkAllNotificationsAsRead = async () => {
    if (!currentLoggedInUserId) return

    try {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentLoggedInUserId, mark_all_read: true })
      })

      if (response.ok) {
        loadNotifications(notificationsPage)
      }
    } catch (error: any) {
      console.error('Error marking all as read:', error?.message || String(error))
    }
  }

  const handleNotificationClick = (notification: any) => {
    if (!notification.is_read) {
      handleMarkNotificationAsRead(notification.id)
    }
    
    if (notification.link) {
      router.push(notification.link)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen relative flex items-center justify-center">
        <div className="text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-4 border-hot-pink border-t-transparent rounded-full animate-spin"></div>
            <div className="text-hot-pink text-xl font-medium">טוען...</div>
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen relative flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl">לא נמצא פרופיל</div>
        </div>
      </div>
    )
  }

  const displayName = formData.display_name || profile.display_name || `${formData.first_name || ''} ${formData.last_name || ''}`.trim() || 'משתמש'
  const fullName = `${formData.first_name || ''} ${formData.last_name || ''}`.trim() || displayName
  const points = profile.points || 0
  const rank = profile.rank || 1

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
        {/* Profile Header */}
        <div className="glass-card rounded-3xl shadow-2xl p-4 sm:p-6 mb-4 sm:mb-6 border-b-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 w-full sm:w-auto">
              <h1 className="text-2xl sm:text-3xl font-bold text-white">{fullName}</h1>
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <div className="px-3 sm:px-4 py-1.5 sm:py-2 bg-hot-pink/20 text-white border border-hot-pink/30 rounded-full font-semibold text-sm sm:text-base">
                  {points} נקודות
                </div>
                {highestBadge?.badge && (
                  <div className="relative group">
                    <span 
                      style={{ color: highestBadge.badge.icon_color || '#FFD700' }}
                      className="text-2xl sm:text-3xl cursor-pointer"
                      title={`${highestBadge.badge.name}${highestBadge.badge.description ? ` - ${highestBadge.badge.description}` : ''} | דירוג ${rank}`}
                    >
                      {highestBadge.badge.icon || '⭐'}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Display social links from new system */}
              {profile?.social_links && profile.social_links.length > 0 && profile.social_links.map((link: any, index: number) => {
                const getSocialIcon = (platform: string) => {
                  switch (platform.toLowerCase()) {
                    case 'instagram':
                      return Instagram;
                    case 'facebook':
                      return Facebook;
                    case 'linkedin':
                      return Linkedin;
                    case 'twitter':
                      return Twitter;
                    case 'youtube':
                      return Youtube;
                    case 'tiktok':
                      return LinkIcon;
                    case 'github':
                      return Github;
                    case 'website':
                      return Globe;
                    default:
                      return LinkIcon;
                  }
                };

                const getSocialColor = (platform: string) => {
                  switch (platform.toLowerCase()) {
                    case 'instagram':
                      return 'bg-gradient-to-br from-purple-600 to-pink-500';
                    case 'facebook':
                      return 'bg-blue-600';
                    case 'linkedin':
                      return 'bg-blue-700';
                    case 'twitter':
                      return 'bg-black';
                    case 'youtube':
                      return 'bg-red-600';
                    case 'tiktok':
                      return 'bg-black';
                    case 'github':
                      return 'bg-gray-800';
                    case 'website':
                      return 'bg-gray-600';
                    default:
                      return 'bg-hot-pink';
                  }
                };

                const Icon = getSocialIcon(link.platform);
                const colorClass = getSocialColor(link.platform);

                return (
                  <a
                    key={index}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full ${colorClass} flex items-center justify-center text-white hover:opacity-90 transition-opacity`}
                    title={link.platform}
                  >
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </a>
                );
              })}
              
              {/* Fallback to old system if new system is empty */}
              {(!profile?.social_links || profile.social_links.length === 0) && (
                <>
                  {formData.instagram_url && (
                    <a 
                      href={formData.instagram_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center text-white hover:opacity-90 transition-opacity"
                    >
                      <Instagram className="w-4 h-4 sm:w-5 sm:h-5" />
                    </a>
                  )}
                  {formData.facebook_url && (
                    <a 
                      href={formData.facebook_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-600 flex items-center justify-center text-white hover:opacity-90 transition-opacity"
                    >
                      <Facebook className="w-4 h-4 sm:w-5 sm:h-5" />
                    </a>
                  )}
                </>
              )}
              <div className="relative group">
                {currentLoggedInUserId && profile && (currentLoggedInUserId === (profile.user_id || profile.id)) ? (
                  // Own profile - allow editing
                  <button
                    onClick={() => setShowAvatarModal(true)}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-[#F52F8E] to-pink-400 flex items-center justify-center text-white text-xl sm:text-2xl font-bold flex-shrink-0 overflow-hidden hover:opacity-90 transition-opacity cursor-pointer relative"
                  >
                    {formData.avatar_url || profile.avatar_url ? (
                      <Image 
                        src={`${formData.avatar_url || profile.avatar_url}?t=${Date.now()}`} 
                        alt={fullName} 
                        fill
                        className="rounded-full object-cover"
                        key={`profile-avatar-${formData.avatar_url || profile.avatar_url}`}
                      />
                    ) : (
                      <span>{fullName.charAt(0)}</span>
                    )}
                  </button>
                ) : (
                  // Other user's profile - allow viewing only
                  <button
                    onClick={() => setShowAvatarLightbox(true)}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-[#F52F8E] to-pink-400 flex items-center justify-center text-white text-xl sm:text-2xl font-bold flex-shrink-0 overflow-hidden hover:opacity-90 transition-opacity cursor-pointer relative"
                  >
                    {formData.avatar_url || profile?.avatar_url ? (
                      <Image 
                        src={`${formData.avatar_url || profile.avatar_url}?t=${Date.now()}`} 
                        alt={fullName} 
                        fill
                        className="rounded-full object-cover"
                        key={`profile-avatar-${formData.avatar_url || profile?.avatar_url}`}
                      />
                    ) : (
                      <span>{fullName.charAt(0)}</span>
                    )}
                  </button>
                )}
                {currentLoggedInUserId && profile && (currentLoggedInUserId === (profile.user_id || profile.id)) && (
                  <div className="absolute inset-0 w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-black/0 hover:bg-black/20 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-all pointer-events-none">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* Mobile Menu Toggle */}
          <div className="lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="w-full flex items-center justify-between px-4 py-3 glass-card rounded-3xl text-white"
            >
              <span className="font-medium">
                {activeTab === 'profile' && 'פרופיל'}
                {activeTab === 'timeline' && 'ציר זמן'}
                {isOwnerOrAdmin() && activeTab === 'messages' && 'הודעות'}
                {activeTab === 'forums' && 'פורומים'}
                {activeTab === 'points' && 'נקודות'}
                {isOwnerOrAdmin() && activeTab === 'courses' && 'קורסים שלי'}
                {isOwnerOrAdmin() && activeTab === 'notifications' && 'התראות'}
                {isOwnerOrAdmin() && activeTab === 'projects' && 'פרויקטים'}
              </span>
              <Menu className="w-5 h-5" />
            </button>
            {mobileMenuOpen && (
              <div className="mt-2 glass-card rounded-3xl p-2 space-y-1">
                <button
                  onClick={() => { setActiveTab('profile'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === 'profile'
                      ? 'bg-hot-pink text-white'
                      : 'text-gray-300 hover:bg-white/10 hover:text-hot-pink'
                  }`}
                >
                  <User className="w-5 h-5" />
                  <span className="font-medium">פרופיל</span>
                </button>
                <button
                  onClick={() => { setActiveTab('timeline'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === 'timeline'
                      ? 'bg-hot-pink text-white'
                      : 'text-gray-300 hover:bg-white/10 hover:text-hot-pink'
                  }`}
                >
                  <Activity className="w-5 h-5" />
                  <span className="font-medium">ציר זמן</span>
                </button>
                {isOwnerOrAdmin() && (
                  <button
                    onClick={() => { setActiveTab('messages'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      activeTab === 'messages'
                        ? 'bg-hot-pink text-white'
                        : 'text-gray-300 hover:bg-white/10 hover:text-hot-pink'
                    }`}
                  >
                    <MessageSquare className="w-5 h-5" />
                    <span className="font-medium">הודעות</span>
                  </button>
                )}
                <button
                  onClick={() => { setActiveTab('forums'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === 'forums'
                      ? 'bg-hot-pink text-white'
                      : 'text-gray-300 hover:bg-white/10 hover:text-hot-pink'
                  }`}
                >
                  <MessageSquare className="w-5 h-5" />
                  <span className="font-medium">פורומים</span>
                </button>
                <button
                  onClick={() => { setActiveTab('points'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === 'points'
                      ? 'bg-hot-pink text-white'
                      : 'text-gray-300 hover:bg-white/10 hover:text-hot-pink'
                  }`}
                >
                  <History className="w-5 h-5" />
                  <span className="font-medium">נקודות</span>
                </button>
                {isOwnerOrAdmin() && (
                  <button
                    onClick={() => { setActiveTab('courses'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      activeTab === 'courses'
                        ? 'bg-hot-pink text-white'
                        : 'text-gray-300 hover:bg-white/10 hover:text-hot-pink'
                    }`}
                  >
                    <BookOpen className="w-5 h-5" />
                    <span className="font-medium">קורסים שלי</span>
                  </button>
                )}
                {isOwnerOrAdmin() && (
                  <button
                    onClick={() => { setActiveTab('notifications'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      activeTab === 'notifications'
                        ? 'bg-hot-pink text-white'
                        : 'text-gray-300 hover:bg-white/10 hover:text-hot-pink'
                    }`}
                  >
                    <Bell className="w-5 h-5" />
                    <span className="font-medium">התראות</span>
                  </button>
                )}
                {isOwnerOrAdmin() && (
                  <button
                    onClick={() => { setActiveTab('projects'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      activeTab === 'projects'
                        ? 'bg-hot-pink text-white'
                        : 'text-gray-300 hover:bg-white/10 hover:text-hot-pink'
                    }`}
                  >
                    <Briefcase className="w-5 h-5" />
                    <span className="font-medium">פרויקטים</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right Sidebar - Menu (Desktop) */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="glass-card rounded-3xl p-4 space-y-2">
              <button
                onClick={() => setActiveTab('profile')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === 'profile'
                    ? 'bg-hot-pink text-white'
                    : 'text-gray-300 hover:bg-white/10 hover:text-hot-pink'
                }`}
              >
                <User className="w-5 h-5" />
                <span className="font-medium">פרופיל</span>
              </button>
              <button
                onClick={() => setActiveTab('timeline')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === 'timeline'
                    ? 'bg-hot-pink text-white'
                    : 'text-gray-300 hover:bg-white/10 hover:text-hot-pink'
                }`}
              >
                <Activity className="w-5 h-5" />
                <span className="font-medium">ציר זמן</span>
              </button>
              {isOwnerOrAdmin() && (
                <button
                  onClick={() => setActiveTab('messages')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === 'messages'
                      ? 'bg-hot-pink text-white'
                      : 'text-gray-300 hover:bg-white/10 hover:text-hot-pink'
                  }`}
                >
                  <MessageSquare className="w-5 h-5" />
                  <span className="font-medium">הודעות</span>
                </button>
              )}
              <button
                onClick={() => setActiveTab('forums')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === 'forums'
                    ? 'bg-hot-pink text-white'
                    : 'text-gray-300 hover:bg-white/10 hover:text-hot-pink'
                }`}
              >
                <MessageSquare className="w-5 h-5" />
                <span className="font-medium">פורומים</span>
              </button>
              <button
                onClick={() => setActiveTab('points')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === 'points'
                    ? 'bg-hot-pink text-white'
                    : 'text-gray-300 hover:bg-white/10 hover:text-hot-pink'
                }`}
              >
                <History className="w-5 h-5" />
                <span className="font-medium">נקודות</span>
              </button>
              {isOwnerOrAdmin() && (
                <button
                  onClick={() => setActiveTab('courses')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === 'courses'
                      ? 'bg-hot-pink text-white'
                      : 'text-gray-300 hover:bg-white/10 hover:text-hot-pink'
                  }`}
                >
                  <BookOpen className="w-5 h-5" />
                  <span className="font-medium">קורסים שלי</span>
                </button>
              )}
              {isOwnerOrAdmin() && (
                <button
                  onClick={() => setActiveTab('notifications')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === 'notifications'
                      ? 'bg-hot-pink text-white'
                      : 'text-gray-300 hover:bg-white/10 hover:text-hot-pink'
                  }`}
                >
                  <Bell className="w-5 h-5" />
                  <span className="font-medium">התראות</span>
                </button>
              )}
              {isOwnerOrAdmin() && (
                <button
                  onClick={() => setActiveTab('projects')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === 'projects'
                      ? 'bg-hot-pink text-white'
                      : 'text-gray-300 hover:bg-white/10 hover:text-hot-pink'
                  }`}
                >
                  <Briefcase className="w-5 h-5" />
                  <span className="font-medium">פרויקטים</span>
                </button>
              )}
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0 space-y-4 sm:space-y-6">

            {/* Content based on active tab */}
            {activeTab === 'profile' && (
              <>
                {/* Details Card */}
                <div className="glass-card rounded-3xl shadow-2xl p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
                    <h2 className="text-lg sm:text-xl font-semibold text-hot-pink">פרטים</h2>
                    {!editingDetails && currentLoggedInUserId && profile && (currentLoggedInUserId === (profile.user_id || profile.id)) && (
                      <button
                        onClick={() => setEditingDetails(true)}
                        className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-white/10 text-white hover:bg-white/20 border border-white/20 rounded-full transition-colors text-sm sm:text-base"
                      >
                        <Edit className="w-4 h-4" />
                        עריכה
                      </button>
                    )}
                  </div>

                  {editingDetails ? (
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                        <label className="text-sm font-medium text-[#F52F8E] sm:w-1/4">שם פרטי*</label>
                        <input
                          type="text"
                          value={formData.first_name}
                          onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                          className="w-full sm:w-3/4 px-3 sm:px-4 py-2 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-hot-pink bg-white/5 text-white placeholder-gray-400 text-sm sm:text-base"
                        />
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                        <label className="text-sm font-medium text-[#F52F8E] sm:w-1/4">שם משפחה*</label>
                        <input
                          type="text"
                          value={formData.last_name}
                          onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                          className="w-full sm:w-3/4 px-3 sm:px-4 py-2 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-hot-pink bg-white/5 text-white placeholder-gray-400 text-sm sm:text-base"
                        />
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                        <label className="text-sm font-medium text-[#F52F8E] sm:w-1/4">כינוי*</label>
                        <input
                          type="text"
                          value={formData.nickname}
                          onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                          className="w-full sm:w-3/4 px-3 sm:px-4 py-2 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-hot-pink bg-white/5 text-white placeholder-gray-400 text-sm sm:text-base"
                        />
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                        <label className="text-sm font-medium text-[#F52F8E] sm:w-1/4">איך צריך לפנות אליך בקהילה שלנו?*</label>
                        <select
                          dir="rtl"
                          lang="he"
                          value={formData.how_to_address}
                          onChange={(e) => setFormData({ ...formData, how_to_address: e.target.value })}
                          className="w-full sm:w-3/4 px-3 sm:px-4 py-2 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-hot-pink bg-white/5 text-white text-sm sm:text-base"
                          required
                        >
                          <option value="">בחר אפשרות</option>
                          <option value="אוטומטור">אוטומטור</option>
                          <option value="אוטומטורית">אוטומטורית</option>
                        </select>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                        <label className="text-sm font-medium text-[#F52F8E] sm:w-1/4">מה הניסיון שלך עם אוטומציות No Code בטופ 100*</label>
                        <select
                          dir="rtl"
                          lang="he"
                          value={formData.nocode_experience}
                          onChange={(e) => setFormData({ ...formData, nocode_experience: e.target.value })}
                          className="w-full sm:w-3/4 px-3 sm:px-4 py-2 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-hot-pink bg-white/5 text-white text-sm sm:text-base"
                          required
                        >
                          <option value="">בחר רמת ניסיון</option>
                          <option value="מתחיל">מתחיל</option>
                          <option value="בינוני">בינוני</option>
                          <option value="מתקדם">מתקדם</option>
                        </select>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                        <label className="text-sm font-medium text-[#F52F8E] sm:w-1/4">קישור אינסטגרם</label>
                        <input
                          type="text"
                          value={formData.instagram_url}
                          onChange={(e) => setFormData({ ...formData, instagram_url: e.target.value })}
                          placeholder="https://instagram.com/..."
                          className="w-full sm:w-3/4 px-3 sm:px-4 py-2 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-hot-pink bg-white/5 text-white placeholder-gray-400 text-sm sm:text-base"
                        />
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                        <label className="text-sm font-medium text-[#F52F8E] sm:w-1/4">קישור פייסבוק</label>
                        <input
                          type="text"
                          value={formData.facebook_url}
                          onChange={(e) => setFormData({ ...formData, facebook_url: e.target.value })}
                          placeholder="https://facebook.com/..."
                          className="w-full sm:w-3/4 px-3 sm:px-4 py-2 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-hot-pink bg-white/5 text-white placeholder-gray-400 text-sm sm:text-base"
                        />
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 justify-end pt-2">
                        <button
                          onClick={() => saveDetails()}
                          className="btn-primary flex items-center justify-center gap-2 px-4 py-2 text-sm sm:text-base"
                        >
                          <Save className="w-4 h-4" />
                          שמור
                        </button>
                        <button
                          onClick={() => {
                            setEditingDetails(false)
                            loadProfile()
                          }}
                          className="btn-secondary flex items-center justify-center gap-2 px-4 py-2 text-sm sm:text-base"
                        >
                          <X className="w-4 h-4" />
                          ביטול
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 sm:space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
                        <span className="text-xs sm:text-sm font-medium text-[#F52F8E]">שם פרטי*</span>
                        <span className="text-sm sm:text-base text-white font-medium">{formData.first_name || '-'}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
                        <span className="text-xs sm:text-sm font-medium text-[#F52F8E]">שם משפחה*</span>
                        <span className="text-sm sm:text-base text-white font-medium">{formData.last_name || '-'}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
                        <span className="text-xs sm:text-sm font-medium text-[#F52F8E]">כינוי*</span>
                        <span className="text-sm sm:text-base text-white font-medium">{formData.nickname || '-'}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
                        <span className="text-xs sm:text-sm font-medium text-[#F52F8E]">איך צריך לפנות אליך בקהילה שלנו?*</span>
                        <span className="text-sm sm:text-base text-white font-medium text-right">{formData.how_to_address || '-'}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
                        <span className="text-xs sm:text-sm font-medium text-[#F52F8E]">מה הניסיון שלך עם אוטומציות No Code בטופ 100*</span>
                        <span className="text-sm sm:text-base text-white font-medium text-right">{formData.nocode_experience || '-'}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Personal Information Card */}
                <div className="glass-card rounded-3xl shadow-2xl p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
                    <h2 className="text-lg sm:text-xl font-semibold text-[#F52F8E]">מידע אישי</h2>
                    {!editingPersonal && (
                      <button
                        onClick={() => setEditingPersonal(true)}
                        className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-white/10 text-white hover:bg-white/20 rounded-full transition-colors text-sm sm:text-base"
                      >
                        <Edit className="w-4 h-4" />
                        עריכה
                      </button>
                    )}
                  </div>

                  {editingPersonal ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">ביוגרפיה</label>
                        <textarea
                          value={formData.bio}
                          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                          rows={4}
                          className="w-full px-4 py-2 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-hot-pink bg-white/5 text-white placeholder-gray-400"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">URL תמונת פרופיל</label>
                        <input
                          type="text"
                          value={formData.avatar_url}
                          onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                          placeholder="https://..."
                          className="w-full px-4 py-2 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-hot-pink bg-white/5 text-white placeholder-gray-400"
                        />
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 justify-end pt-2">
                        <button
                          onClick={savePersonal}
                          className="btn-primary flex items-center justify-center gap-2 px-4 py-2 text-sm sm:text-base"
                        >
                          <Save className="w-4 h-4" />
                          שמור
                        </button>
                        <button
                          onClick={() => {
                            setEditingPersonal(false)
                            loadProfile()
                          }}
                          className="btn-secondary flex items-center justify-center gap-2 px-4 py-2 text-sm sm:text-base"
                        >
                          <X className="w-4 h-4" />
                          ביטול
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <span className="text-sm text-gray-400">ביוגרפיה:</span>
                        <p className="text-white font-medium mt-1">{formData.bio || '-'}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-400">אימייל:</span>
                        <p className="text-white font-medium mt-1">{profile.email || '-'}</p>
                      </div>
                    </div>
                  )}
                </div>

              </>
            )}

            {activeTab === 'timeline' && (
              <div className="glass-card rounded-3xl shadow-2xl p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold text-white mb-4">ציר זמן</h2>
                <p className="text-sm sm:text-base text-gray-400">אין פעילות עדיין</p>
              </div>
            )}

            {activeTab === 'messages' && (
              <>
                {isOwnerOrAdmin() ? (
                  <div className="glass-card rounded-3xl shadow-2xl p-4 sm:p-6">
                    <h2 className="text-lg sm:text-xl font-semibold text-white mb-4">הודעות</h2>
                    <p className="text-sm sm:text-base text-gray-500">אין הודעות חדשות</p>
                  </div>
                ) : (
                  <div className="glass-card rounded-3xl shadow-2xl p-4 sm:p-6">
                    <h2 className="text-lg sm:text-xl font-semibold text-white mb-4">הודעות</h2>
                    <p className="text-sm sm:text-base text-gray-500">אין גישה למידע זה</p>
                  </div>
                )}
              </>
            )}

            {activeTab === 'forums' && (
              <div className="glass-card rounded-3xl shadow-2xl p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold text-white mb-4">פורומים שלי</h2>
                
                {/* Tabs for Posts and Replies */}
                <div className="flex gap-2 mb-6 border-b border-white/20">
                  <button
                    onClick={() => setForumsTab('posts')}
                    className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                      forumsTab === 'posts'
                        ? 'border-hot-pink text-hot-pink'
                        : 'border-transparent text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    הפוסטים שלי
                  </button>
                  <button
                    onClick={() => setForumsTab('replies')}
                    className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                      forumsTab === 'replies'
                        ? 'border-hot-pink text-hot-pink'
                        : 'border-transparent text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    התגובות שלי
                  </button>
                </div>

                {loadingForums ? (
                  <div className="text-center py-8 text-gray-500">טוען...</div>
                ) : forumsTab === 'posts' ? (
                  <div>
                    {myPosts.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <p>עדיין לא פרסמת פוסטים</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {myPosts.map((post: any) => (
                          <Link
                            key={post.id}
                            href={`/forums/${post.forum_id}/posts/${post.id}`}
                            className="block p-4 border border-white/20 rounded-lg hover:border-hot-pink hover:shadow-md transition-all glass-card"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <h3 className="text-lg font-semibold text-white mb-2">
                                  {post.title}
                                </h3>
                                <p className="text-gray-300 text-sm mb-3 line-clamp-2">{post.content}</p>
                                <div className="flex items-center gap-4 text-sm text-gray-400">
                                  <span>בפורום: {post.forums?.display_name || post.forums?.name || 'לא ידוע'}</span>
                                  <span>•</span>
                                  <div className="flex items-center gap-1">
                                    <Eye className="w-4 h-4" />
                                    <span>{post.views || 0} צפיות</span>
                                  </div>
                                  <span>•</span>
                                  <div className="flex items-center gap-1">
                                    <MessageCircle className="w-4 h-4" />
                                    <span>{post.replies_count || 0} תגובות</span>
                                  </div>
                                  <span>•</span>
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    <span>{formatTimeAgo(post.created_at)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    {myReplies.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <p>עדיין לא הגבת על דיונים</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {myReplies.map((reply: any) => (
                          <Link
                            key={reply.id}
                            href={`/forums/${reply.forum_posts?.forum_id}/posts/${reply.post_id}`}
                            className="block p-4 border border-white/20 rounded-lg hover:border-hot-pink hover:shadow-md transition-all glass-card"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <h3 className="text-lg font-semibold text-white mb-2">
                                  {reply.forum_posts?.title || 'פוסט'}
                                </h3>
                                <p className="text-gray-300 text-sm mb-3 line-clamp-2">{reply.content}</p>
                                <div className="flex items-center gap-4 text-sm text-gray-400">
                                  <span>בפורום: {reply.forum_posts?.forums?.display_name || reply.forum_posts?.forums?.name || 'לא ידוע'}</span>
                                  <span>•</span>
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    <span>{formatTimeAgo(reply.created_at)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'points' && (
              <div className="space-y-6">
                {/* Badges Section */}
                <div className="glass-card rounded-3xl shadow-2xl p-4 sm:p-6">
                  <h2 className="text-lg sm:text-xl font-semibold text-white mb-4">תגים</h2>
                  {userBadges.length === 0 ? (
                    <div className="text-center py-8 text-gray-300">
                      <Star className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                      <p className="text-white">אין תגים עדיין</p>
                      <p className="text-sm mt-2 text-gray-400">צבר נקודות כדי לקבל תגים!</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {userBadges.map((userBadge: any) => (
                        <div
                          key={userBadge.id}
                          className="flex flex-col items-center p-4 glass-card rounded-xl border-white/20 hover:border-hot-pink/50 transition-all"
                        >
                          <span 
                            style={{ color: userBadge.badge?.icon_color || '#FFD700' }}
                            className="text-4xl mb-2"
                          >
                            {userBadge.badge?.icon || '⭐'}
                          </span>
                          <h3 className="font-semibold text-white text-sm text-center mb-1">
                            {userBadge.badge?.name || 'תג'}
                          </h3>
                          {userBadge.badge?.description && (
                            <p className="text-xs text-gray-300 text-center">
                              {userBadge.badge.description}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-2">
                            {new Date(userBadge.earned_at).toLocaleDateString('he-IL')}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Points History Section */}
                <div className="glass-card rounded-3xl shadow-2xl p-4 sm:p-6">
                  <h2 className="text-lg sm:text-xl font-semibold text-white mb-4">היסטוריית נקודות</h2>
                  
                  {loadingPoints ? (
                    <div className="text-center py-8 text-gray-300">טוען...</div>
                  ) : pointsHistory.length === 0 ? (
                    <div className="text-center py-12 text-gray-300">
                      <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-300">אין היסטוריית נקודות</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pointsHistory.map((entry: any) => {
                        // Use displayAction if available (from enhanced history), otherwise fallback
                        const actionText = entry.displayAction || entry.action_name || entry.action || entry.description || 'פעולה';
                        
                        return (
                          <div
                            key={entry.id}
                            className="flex items-center justify-between p-4 glass-card rounded-xl border-white/20 hover:border-hot-pink/50 transition-all"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Trophy className="w-5 h-5 text-yellow-400" />
                                <span className="font-semibold text-white">
                                  {actionText}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-300">
                                <div className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  <span>{formatTimeAgo(entry.created_at)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-lg font-bold ${
                                entry.points > 0 ? 'text-green-400' : 'text-red-400'
                              }`}>
                                {entry.points > 0 ? '+' : ''}{entry.points}
                              </span>
                              <span className="text-sm text-gray-300">נקודות</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'courses' && (
              <div className="glass-card rounded-3xl shadow-2xl p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold text-white mb-4 sm:mb-6">קורסים שלי</h2>
                
                {loadingCourses ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-hot-pink mx-auto mb-4"></div>
                    <p className="text-gray-300">טוען קורסים...</p>
                  </div>
                ) : myCourses.length === 0 ? (
                  <div className="text-center py-12 text-gray-300">
                    <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg mb-2 text-white">עדיין לא נרשמת לקורסים</p>
                    <Link href="/courses" className="text-hot-pink hover:underline">
                      גלה קורסים חדשים
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {myCourses.map((course: any) => (
                      <Link
                        key={course.id}
                        href={`/courses/${course.id}`}
                        className="glass-card rounded-xl border-white/20 overflow-hidden hover:border-hot-pink/50 transition-all flex flex-col"
                      >
                        <div className="relative">
                          {course.thumbnail_url ? (
                            <img
                              src={course.thumbnail_url}
                              alt={course.title}
                              className="w-full h-48 object-cover"
                            />
                          ) : (
                            <div className="w-full h-48 bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                              <span className="text-white text-2xl font-bold">{course.title.charAt(0)}</span>
                            </div>
                          )}
                          {course.enrollment?.status === 'completed' && (
                            <span className="absolute top-3 right-3 px-3 py-1 bg-green-500 text-white text-xs font-semibold rounded-full">
                              הושלם
                            </span>
                          )}
                        </div>
                        <div className="p-4 sm:p-5 flex flex-col flex-grow">
                          <h3 className="text-lg sm:text-xl font-bold text-white mb-2 line-clamp-2">{course.title}</h3>
                          <p className="text-gray-300 text-sm mb-4 line-clamp-2 flex-grow">{course.description}</p>
                          
                          {/* Progress Bar */}
                          {course.totalLessons > 0 && (
                            <div className="mb-4">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-gray-300">
                                  {course.completedLessons !== undefined && course.totalLessons !== undefined
                                    ? `${course.completedLessons} מתוך ${course.totalLessons} שיעורים`
                                    : 'התקדמות'}
                                </span>
                                <span className="text-xs font-semibold text-white">
                                  {course.progress !== undefined ? `${Math.round(course.progress)}%` : '0%'}
                                </span>
                              </div>
                              <div className="w-full bg-white/10 rounded-full h-2">
                                <div
                                  className="bg-hot-pink h-2 rounded-full transition-all"
                                  style={{ width: `${course.progress || 0}%` }}
                                ></div>
                              </div>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between mt-auto">
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Clock className="w-4 h-4" />
                              <span>{course.duration_hours} שעות</span>
                            </div>
                            <span className="text-[#F52F8E] font-semibold text-sm">
                              {course.enrollment?.status === 'completed' ? 'הצג קורס' : 'המשך ללמוד'}
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'notifications' && (
              <>
                {isOwnerOrAdmin() ? (
                  <div className="glass-card rounded-3xl shadow-2xl p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-4 sm:mb-6">
                      <h2 className="text-lg sm:text-xl font-semibold text-white">התראות</h2>
                      {notifications.filter((n: any) => !n.is_read).length > 0 && (
                        <button
                          onClick={handleMarkAllNotificationsAsRead}
                          className="btn-primary flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-medium"
                        >
                          <CheckCheck className="w-4 h-4" />
                          סמן הכל כנקרא
                        </button>
                      )}
                    </div>

                {loadingNotifications ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-hot-pink mx-auto mb-4"></div>
                    <p className="text-gray-300">טוען התראות...</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="text-center py-12 text-gray-300">
                    <Bell className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg mb-2 text-white">אין התראות</p>
                    <p className="text-sm text-gray-400">כשיהיו התראות חדשות, הן יופיעו כאן</p>
                  </div>
                ) : (
                  <>
                    <div className="divide-y divide-white/10">
                      {notifications.map((notification: any) => {
                        const isPointsNotification = 
                          notification.title?.includes('נקודות') || 
                          notification.message?.includes('נקודות')

                        return (
                          <div
                            key={notification.id}
                            className={`p-4 sm:p-5 hover:bg-white/10 transition-colors cursor-pointer ${
                              !notification.is_read ? 'bg-hot-pink/10' : ''
                            }`}
                            onClick={() => !isPointsNotification && handleNotificationClick(notification)}
                          >
                            <div className="flex items-start gap-4">
                              {/* Read indicator */}
                              <div className={`flex-shrink-0 w-3 h-3 rounded-full mt-2 ${
                                !notification.is_read ? 'bg-hot-pink' : 'bg-gray-500'
                              }`}></div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <p className="text-base font-semibold text-white mb-2">
                                  {notification.title}
                                </p>
                                <p className="text-sm text-gray-300 mb-2">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {formatTimeAgo(notification.created_at)}
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Pagination */}
                    {notificationsTotalPages > 1 && (
                      <div className="mt-6 flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleNotificationPageChange(notificationsPage - 1)}
                          disabled={notificationsPage === 1}
                          className={`px-4 py-2 rounded-full border transition-colors ${
                            notificationsPage === 1
                              ? 'bg-white/10 text-gray-500 cursor-not-allowed border-white/20'
                              : 'glass-card text-white hover:bg-white/10 border-white/20'
                          }`}
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-2">
                          {Array.from({ length: notificationsTotalPages }, (_, i) => i + 1).map((page) => (
                            <button
                              key={page}
                              onClick={() => handleNotificationPageChange(page)}
                              className={`px-4 py-2 rounded-full border transition-colors ${
                                notificationsPage === page
                                  ? 'bg-hot-pink text-white border-hot-pink'
                                  : 'glass-card text-white hover:bg-white/10 border-white/20'
                              }`}
                            >
                              {page}
                            </button>
                          ))}
                        </div>

                        <button
                          onClick={() => handleNotificationPageChange(notificationsPage + 1)}
                          disabled={notificationsPage === notificationsTotalPages}
                          className={`px-4 py-2 rounded-full border transition-colors ${
                            notificationsPage === notificationsTotalPages
                              ? 'bg-white/10 text-gray-500 cursor-not-allowed border-white/20'
                              : 'glass-card text-white hover:bg-white/10 border-white/20'
                          }`}
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </>
                )}
                  </div>
                ) : (
                  <div className="glass-card rounded-3xl shadow-2xl p-4 sm:p-6">
                    <h2 className="text-lg sm:text-xl font-semibold text-white mb-4">התראות</h2>
                    <p className="text-sm sm:text-base text-gray-300">אין גישה למידע זה</p>
                  </div>
                )}
              </>
            )}

            {activeTab === 'projects' && (
              <>
                {isOwnerOrAdmin() ? (
                  <div className="space-y-6">
                {/* פרויקטים שפרסמתי */}
                <div className="glass-card rounded-3xl shadow-2xl p-4 sm:p-6">
                  <h2 className="text-lg sm:text-xl font-semibold text-white mb-4">פרויקטים שפרסמתי</h2>
                  {loadingProjects ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-hot-pink mx-auto mb-4"></div>
                      <p className="text-gray-300">טוען פרויקטים...</p>
                    </div>
                  ) : myProjects.length === 0 ? (
                    <div className="text-center py-12 text-gray-300">
                      <Briefcase className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                      <p className="text-lg mb-2 text-white">אין פרויקטים שפרסמת</p>
                      <p className="text-sm text-gray-400">כשתיצור פרויקטים, הם יופיעו כאן</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {myProjects.map((project: any) => {
                        const offers = projectOffers[project.id] || []
                        const showOffers = expandedProjects.has(project.id)
                        return (
                          <div key={project.id} className="glass-card rounded-xl border-white/20 p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <h3 className="font-semibold text-white mb-1">{project.title}</h3>
                                <p className="text-sm text-gray-300 mb-2 line-clamp-2">{project.description}</p>
                                <div className="flex items-center gap-3 text-xs text-gray-400">
                                  <span className={`px-2 py-1 rounded-full ${
                                    project.status === 'completed' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                                    project.status === 'in_progress' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                                    project.status === 'closed' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                    'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                  }`}>
                                    {project.status === 'completed' ? 'הושלם' :
                                     project.status === 'in_progress' ? 'בביצוע' :
                                     project.status === 'closed' ? 'סגור' :
                                     'פתוח'}
                                  </span>
                                  <span className="text-gray-300">{offers.length} הגשות</span>
                                  {project.created_at && (
                                    <span className="text-gray-400">{new Date(project.created_at).toLocaleDateString('he-IL')}</span>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  setExpandedProjects(prev => {
                                    const next = new Set(prev)
                                    if (next.has(project.id)) {
                                      next.delete(project.id)
                                    } else {
                                      next.add(project.id)
                                    }
                                    return next
                                  })
                                }}
                                className="btn-secondary px-3 py-1 text-sm rounded-full"
                              >
                                {showOffers ? 'הסתר' : 'הצג'} הגשות
                              </button>
                            </div>
                            {showOffers && offers.length > 0 && (
                              <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                                <h4 className="font-medium text-white mb-2">הגשות:</h4>
                                {offers.map((offer: any) => (
                                  <div key={offer.id} className="glass-card rounded-xl border-white/10 p-3">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                          <span className="font-medium text-sm text-white">{offer.user?.display_name || 'משתמש לא ידוע'}</span>
                                          {offer.offer_amount && (
                                            <span className="text-hot-pink font-semibold text-sm">
                                              {offer.offer_amount} {offer.offer_currency || 'ILS'}
                                            </span>
                                          )}
                                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                                            offer.status === 'accepted' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                                            offer.status === 'rejected' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                            'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                                          }`}>
                                            {offer.status === 'accepted' ? 'אושר' :
                                             offer.status === 'rejected' ? 'נדחה' :
                                             'ממתין'}
                                          </span>
                                        </div>
                                        {offer.message && (
                                          <p className="text-sm text-gray-300 mb-1">{offer.message}</p>
                                        )}
                                        <span className="text-xs text-gray-400">
                                          {offer.created_at ? new Date(offer.created_at).toLocaleDateString('he-IL') : '-'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            {showOffers && offers.length === 0 && (
                              <div className="mt-4 pt-4 border-t border-white/10 text-center text-gray-300 text-sm">
                                אין הגשות לפרויקט זה
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* פרויקטים שהגשתי להם מועמדות */}
                <div className="glass-card rounded-3xl shadow-2xl p-4 sm:p-6">
                  <h2 className="text-lg sm:text-xl font-semibold text-white mb-4">פרויקטים שהגשתי להם מועמדות</h2>
                  {loadingProjects ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-hot-pink mx-auto mb-4"></div>
                      <p className="text-gray-300">טוען הגשות...</p>
                    </div>
                  ) : mySubmissions.length === 0 ? (
                    <div className="text-center py-12 text-gray-300">
                      <Briefcase className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                      <p className="text-lg mb-2 text-white">אין הגשות</p>
                      <p className="text-sm text-gray-400">כשתיגש לפרויקטים, הם יופיעו כאן</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {mySubmissions.map((submission: any) => (
                        <div key={submission.id} className="glass-card rounded-xl border-white/20 p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-white mb-1">
                                {submission.project?.title || 'פרויקט לא זמין'}
                              </h3>
                              {submission.project?.description && (
                                <p className="text-sm text-gray-300 mb-2 line-clamp-2">{submission.project.description}</p>
                              )}
                              <div className="flex items-center gap-3 text-xs text-gray-400 mb-2 flex-wrap">
                                {submission.offer_amount && (
                                  <span className="text-hot-pink font-semibold">
                                    {submission.offer_amount} {submission.offer_currency || 'ILS'}
                                  </span>
                                )}
                                <span className={`px-2 py-1 rounded-full ${
                                  submission.status === 'accepted' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                                  submission.status === 'rejected' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                  'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                                }`}>
                                  {submission.status === 'accepted' ? 'אושר' :
                                   submission.status === 'rejected' ? 'נדחה' :
                                   'ממתין'}
                                </span>
                                {submission.created_at && (
                                  <span className="text-gray-400">{new Date(submission.created_at).toLocaleDateString('he-IL')}</span>
                                )}
                              </div>
                              {submission.message && (
                                <p className="text-sm text-gray-300 mb-2">{submission.message}</p>
                              )}
                            </div>
                            {submission.project?.id && (
                              <Link
                                href={`/projects`}
                                className="btn-primary px-3 py-1 text-sm rounded-full"
                              >
                                צפה בפרויקט
                              </Link>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                  </div>
                ) : (
                  <div className="glass-card rounded-3xl shadow-2xl p-4 sm:p-6">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">פרויקטים</h2>
                    <p className="text-sm sm:text-base text-gray-500">אין גישה למידע זה</p>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {/* Avatar Lightbox for viewing other users' avatars */}
      {showAvatarLightbox && (formData.avatar_url || profile?.avatar_url) && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setShowAvatarLightbox(false)}
        >
          <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowAvatarLightbox(false)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-10 bg-black/50 rounded-full p-2 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <img 
              src={`${formData.avatar_url || profile.avatar_url}?t=${Date.now()}`} 
              alt={fullName} 
              className="w-full h-auto rounded-lg shadow-2xl max-h-[90vh] object-contain"
            />
          </div>
        </div>
      )}

      {/* Avatar Modal */}
      {showAvatarModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAvatarModal(false)}>
          <div className="glass-card rounded-3xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">החלף תמונת פרופיל</h2>
              <button
                onClick={() => setShowAvatarModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Tabs */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setAvatarMode('upload')}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  avatarMode === 'upload'
                    ? 'bg-hot-pink text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                העלה תמונה
              </button>
              <button
                onClick={() => setAvatarMode('avatar')}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  avatarMode === 'avatar'
                    ? 'bg-hot-pink text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                בחר אווטר
              </button>
            </div>

            {/* Upload Mode */}
            {avatarMode === 'upload' && (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-white/20 rounded-lg p-8 text-center">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-300 mb-4">העלה תמונה מהמחשב</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                    id="avatar-upload-modal"
                  />
                  <label
                    htmlFor="avatar-upload-modal"
                    className="btn-primary inline-block px-6 py-2 cursor-pointer"
                  >
                    {uploadingAvatar ? 'מעלה...' : 'בחר קובץ'}
                  </label>
                  {uploadingAvatar && (
                    <div className="mt-4">
                      <div className="w-8 h-8 border-2 border-[#F52F8E] border-t-transparent rounded-full animate-spin mx-auto"></div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Avatar Mode */}
            {avatarMode === 'avatar' && (
              <div className="space-y-4">
                <p className="text-gray-300 text-sm mb-4">בחר אווטר מוכן</p>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    'adventurer', 'avataaars', 'big-smile', 'bottts',
                    'fun-emoji', 'lorelei', 'micah', 'miniavs',
                    'open-peeps', 'personas', 'pixel-art', 'shapes'
                  ].map((style) => {
                    const avatarUrl = `https://api.dicebear.com/7.x/${style}/svg?seed=${profile?.user_id || profile?.id || 'default'}`;
                    return (
                      <button
                        key={style}
                        onClick={() => handleAvatarSelect(avatarUrl)}
                        className="relative w-full aspect-square rounded-lg overflow-hidden border-2 border-white/20 hover:border-hot-pink transition-colors"
                      >
                        <Image src={avatarUrl} alt={style} fill className="object-cover" />
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-400 text-center mt-4">
                  אווטרים נוצרים על ידי <a href="https://dicebear.com" target="_blank" rel="noopener noreferrer" className="text-hot-pink hover:underline">DiceBear</a>
                </p>
              </div>
            )}

            {/* Remove Avatar Button */}
            {(formData.avatar_url || profile.avatar_url) && (
              <div className="mt-6 pt-6 border-t border-white/10">
                <button
                  onClick={async () => {
                    setFormData({ ...formData, avatar_url: '' });
                    await saveDetails({ avatar_url: '' });
                    setShowAvatarModal(false);
                  }}
                  className="w-full px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  הסר תמונה
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

