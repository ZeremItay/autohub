'use client';

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
import { getUserProjects, getProjectOffersByUser, getProjectOffers, updateProject } from '@/lib/queries/projects'
import { getUserEventRegistrations } from '@/lib/queries/events'
import { BookOpen, Calendar } from 'lucide-react'
import { formatTimeAgo as formatTimeAgoUtil, formatDate as formatDateUtil } from '@/lib/utils/date'
import { isAdmin } from '@/lib/utils/user'

function ProfilePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'profile' | 'messages' | 'forums' | 'points' | 'courses' | 'notifications' | 'projects' | 'events'>('profile')
  const [editingDetails, setEditingDetails] = useState(false)
  const [editingPersonal, setEditingPersonal] = useState(false)
  const [editingHeadline, setEditingHeadline] = useState(false)
  const [headlineValue, setHeadlineValue] = useState('')
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
  const [myEventRegistrations, setMyEventRegistrations] = useState<any[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)
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
  const [selectedOffer, setSelectedOffer] = useState<any | null>(null)
  const [selectedOfferProject, setSelectedOfferProject] = useState<any | null>(null)
  const [selectedOfferUser, setSelectedOfferUser] = useState<any | null>(null)
  const [loadingOfferUser, setLoadingOfferUser] = useState(false)
  const [editingProject, setEditingProject] = useState<any | null>(null)
  const [editProjectForm, setEditProjectForm] = useState({
    title: '',
    description: '',
    budget_min: '',
    budget_max: '',
    budget_currency: 'ILS',
    status: 'open' as 'open' | 'in_progress' | 'completed' | 'closed'
  })
  const [savingProject, setSavingProject] = useState(false)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    nickname: '',
    headline: '',
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
    
    // Handle URL parameters for userId and tab
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const userId = params.get('userId')
      const tab = params.get('tab')
      
      // If userId is in URL, save it to localStorage and reload profile
      if (userId) {
        localStorage.setItem('selectedUserId', userId)
      }
      
      if (tab && ['profile', 'messages', 'forums', 'points', 'courses', 'notifications', 'projects'].includes(tab)) {
        setActiveTab(tab as any)
      }
    }
    
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
    if (profile && activeTab === 'points') {
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
    if (profile && activeTab === 'events' && isOwnerOrAdmin()) {
      loadMyEvents()
    }
  }, [profile, activeTab])

  // Handle URL parameters for opening specific offer from email
  useEffect(() => {
    if (typeof window !== 'undefined' && profile && activeTab === 'projects' && myProjects.length > 0 && Object.keys(projectOffers).length > 0) {
      const params = new URLSearchParams(window.location.search)
      const projectId = params.get('projectId')
      const offerId = params.get('offerId')
      
      if (projectId && offerId) {
        // Find the project and offer
        const project = myProjects.find((p: any) => p.id === projectId)
        const offers = projectOffers[projectId] || []
        const offer = offers.find((o: any) => o.id === offerId)
        
        if (project && offer) {
          // Expand the project
          setExpandedProjects(prev => new Set(prev).add(projectId))
          
          // Open the offer modal
          handleOpenOfferModal(offer, project).catch(console.error)
          
          // Clean up URL
          const newUrl = window.location.pathname + (window.location.search.replace(/[?&]projectId=[^&]*&offerId=[^&]*|[?&]offerId=[^&]*&projectId=[^&]*|[?&]projectId=[^&]*|[?&]offerId=[^&]*/g, '') || '')
          window.history.replaceState({}, '', newUrl)
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, activeTab, myProjects, projectOffers])

  async function handleOpenOfferModal(offer: any, project: any) {
    setSelectedOffer(offer)
    setSelectedOfferProject(project)
    setLoadingOfferUser(true)
    
    try {
      // Load full user profile
      const { getProfile } = await import('@/lib/queries/profiles')
      const { data: userProfile } = await getProfile(offer.user_id)
      setSelectedOfferUser(userProfile)
    } catch (error) {
      console.error('Error loading offer user:', error)
      setSelectedOfferUser(offer.user || null)
    } finally {
      setLoadingOfferUser(false)
    }
  }

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
      // Get selected user from URL params first, then localStorage, or use first user as default
      let savedUserId: string | null = null;
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search)
        savedUserId = params.get('userId') || localStorage.getItem('selectedUserId')
      }
      
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
          headline: profile.headline || '',
          how_to_address: profile.how_to_address || '',
          nocode_experience: profile.nocode_experience || '',
          display_name: profile.display_name || '',
          bio: profile.bio || '',
          experience_level: profile.experience_level || 'מתחיל',
          avatar_url: profile.avatar_url || '',
          instagram_url: profile.instagram_url || '',
          facebook_url: profile.facebook_url || ''
        })
        setHeadlineValue(profile.headline || '')
        
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

      // Try to use image optimization if available
      try {
        const { uploadAndOptimizeImage } = await import('@/lib/utils/image-upload');
        const result = await uploadAndOptimizeImage(
          supabase, // Pass existing supabase client with session
          file,
          'avatars',
          fileName, // Use fileName only (bucket name is separate)
          {
            optimize: true,
            quality: 82,
            convertToWebP: false,
            cacheControl: '3600',
            upsert: true,
          }
        );


        setFormData({ ...formData, avatar_url: result.url });
        await saveDetails({ avatar_url: result.url });
        setShowAvatarModal(false);
        
        // Clear cache and reload profile
        const { clearCache } = await import('@/lib/cache');
        clearCache();
        await loadProfile();
        // Notify other components
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('profileUpdated', { detail: { avatar_url: result.url } }));
          window.dispatchEvent(new Event('profileAvatarUpdated'));
        }
        setUploadingAvatar(false);
        return;
      } catch (optimizeError: any) {
        console.warn('Image optimization failed, uploading original image:', optimizeError);
        // Fallback to regular upload
      }

      // Fallback: Upload to Supabase Storage without optimization
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
        window.dispatchEvent(new Event('profileAvatarUpdated'));
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
        window.dispatchEvent(new Event('profileAvatarUpdated'));
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
        headline: formData.headline,
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
          
          // Check if social links were updated
          const hasInstagram = formData.instagram_url && formData.instagram_url.trim().length > 0;
          const hasFacebook = formData.facebook_url && formData.facebook_url.trim().length > 0;
          if (hasInstagram || hasFacebook) {
            window.dispatchEvent(new Event('profileSocialLinksUpdated'));
          }
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

  async function handleSaveHeadline() {
    if (!profile || !currentLoggedInUserId) {
      return
    }

    const profileUserId = profile.user_id || profile.id
    if (currentLoggedInUserId !== profileUserId) {
      return
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ headline: headlineValue || null })
        .eq('user_id', currentLoggedInUserId)

      if (!error) {
        setEditingHeadline(false)
        const { clearCache } = await import('@/lib/cache')
        clearCache()
        await loadProfile()
        // Dispatch event for profile completion modal
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('profileHeadlineUpdated'));
        }
      } else {
        alert('שגיאה בשמירת הכותרת')
      }
    } catch (error: any) {
      console.error('Error saving headline:', error)
      alert('שגיאה בשמירת הכותרת')
    }
  }

  async function savePersonal() {
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
        setEditingPersonal(false);
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          bio: formData.bio,
          avatar_url: formData.avatar_url
        })
        .eq('user_id', currentLoggedInUserId) // Use user_id from auth, not profile.id
      
      if (!error) {
        await loadProfile()
        setEditingPersonal(false)
        // Dispatch event for profile completion modal
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('profileAvatarUpdated'));
        }
      } else {
        alert('שגיאה בשמירת המידע האישי. נסה שוב.');
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
      
      // Check if user has points but no history - create a backfill entry
      const currentPoints = profile.points || 0
      const hasHistory = data && data.length > 0
      let historyToProcess = data || []
      
      if (currentPoints > 0 && !hasHistory) {
        // Create a backfill history entry to explain the points
        try {
          const { supabase } = await import('@/lib/supabase')
          
          // Get profile ID (points_history.user_id references profiles.id, not profiles.user_id)
          const profileIdForHistory = profile.id || userId;
          
          // Try to insert with action_name first (most common)
          const historyData: any = {
            user_id: profileIdForHistory, // Use profile.id, not profile.user_id
            points: currentPoints,
            action_name: 'נקודות קודמות',
            created_at: new Date().toISOString()
          }
          
          const { error: insertError } = await supabase
            .from('points_history')
            .insert([historyData])
            .select()
          
          if (insertError) {
            // Try with 'action' column instead
            const profileIdForHistory = profile.id || userId;
            const historyDataWithAction: any = {
              user_id: profileIdForHistory, // Use profile.id, not profile.user_id
              points: currentPoints,
              action: 'נקודות קודמות',
              created_at: new Date().toISOString()
            }
            
            const { error: insertError2 } = await supabase
              .from('points_history')
              .insert([historyDataWithAction])
              .select()
            
            if (!insertError2) {
              // Success with 'action' column - reload history
              const { data: newData } = await getUserPointsHistory(userId)
              historyToProcess = newData || []
            }
          } else {
            // Success with 'action_name' column - reload history
            const { data: newData } = await getUserPointsHistory(userId)
            historyToProcess = newData || []
          }
        } catch (createError) {
          console.error('❌ Error creating history entry:', createError)
        }
      }
      
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
      const enhancedHistory = historyToProcess.map((entry: any) => {
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
      const { getUserProjectOffers } = await import('@/lib/queries/projects')
      const { data, error } = await getUserProjectOffers(userId)
      
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

  async function loadMyEvents() {
    if (!profile?.user_id || !isOwnerOrAdmin()) return
    setLoadingEvents(true)
    try {
      const userId = profile.user_id || profile.id
      const { data, error } = await getUserEventRegistrations(userId)
      if (error) {
        console.error('Error loading event registrations:', error)
        setMyEventRegistrations([])
      } else {
        setMyEventRegistrations(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error loading event registrations:', error)
      setMyEventRegistrations([])
    } finally {
      setLoadingEvents(false)
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-[#F52F8E] text-xl">טוען...</div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl">לא נמצא פרופיל</div>
        </div>
      </div>
    )
  }

  const displayName = formData.display_name || profile.display_name || `${formData.first_name || ''} ${formData.last_name || ''}`.trim() || 'משתמש'
  const fullName = `${formData.first_name || ''} ${formData.last_name || ''}`.trim() || displayName
  const points = profile.points || 0
  const rank = profile.rank || 1

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
        {/* Profile Header */}
        <div className="bg-white border-b border-gray-200 pb-4 sm:pb-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 w-full sm:w-auto flex-1">
              <div className="flex flex-col gap-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">{fullName}</h1>
                {editingHeadline && isOwnerOrAdmin() ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={headlineValue}
                      onChange={(e) => setHeadlineValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveHeadline()
                        } else if (e.key === 'Escape') {
                          setEditingHeadline(false)
                          setHeadlineValue(profile.headline || '')
                        }
                      }}
                      placeholder="כתוב משפט קצר על עצמך..."
                      maxLength={150}
                      autoFocus
                      className="text-sm sm:text-base text-gray-700 px-2 py-1 border border-[#F52F8E] rounded focus:outline-none focus:ring-2 focus:ring-[#F52F8E] w-full max-w-md"
                    />
                    <button
                      onClick={handleSaveHeadline}
                      className="p-1.5 bg-[#F52F8E] text-white rounded hover:bg-[#E01E7A] transition-colors"
                      title="שמור"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingHeadline(false)
                        setHeadlineValue(profile.headline || '')
                      }}
                      className="p-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                      title="ביטול"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    {profile.headline ? (
                      <div 
                        onClick={() => {
                          if (isOwnerOrAdmin()) {
                            setEditingHeadline(true)
                            setHeadlineValue(profile.headline || '')
                          }
                        }}
                        className={`${isOwnerOrAdmin() ? 'cursor-pointer hover:text-gray-700 transition-colors group' : ''}`}
                      >
                        <p className="text-sm sm:text-base text-gray-500 italic group-hover:text-gray-700">
                          {profile.headline}
                          {isOwnerOrAdmin() && (
                            <Edit className="w-3 h-3 inline-block mr-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </p>
                      </div>
                    ) : (
                      isOwnerOrAdmin() && (
                        <div 
                          onClick={() => {
                            setEditingHeadline(true)
                            setHeadlineValue('')
                          }}
                          className="cursor-pointer hover:text-gray-500 transition-colors group"
                        >
                          <p className="text-sm sm:text-base text-gray-400 italic group-hover:text-gray-500">
                            השלם משפט מפתח עליך או אינטרו קצר
                            <Edit className="w-3 h-3 inline-block mr-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </p>
                        </div>
                      )
                    )}
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <div className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold text-sm sm:text-base">
                  {points} נקודות
                </div>
                <div className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold flex items-center gap-2 text-sm sm:text-base">
                  <Trophy className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500" />
                  דירוג {rank}
                </div>
                {highestBadge?.badge && (
                  <div className="relative group">
                    <span 
                      style={{ color: highestBadge.badge.icon_color || '#FFD700' }}
                      className="text-2xl sm:text-3xl cursor-pointer"
                      title={highestBadge.badge.name + (highestBadge.badge.description ? ` - ${highestBadge.badge.description}` : '')}
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
                      return 'bg-[#F52F8E]';
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
          {/* Send Message Button - Show when viewing other user's profile */}
          {currentLoggedInUserId && profile && (currentLoggedInUserId !== (profile.user_id || profile.id)) && (
            <div className="mt-4">
              <button
                onClick={() => {
                  const partnerId = profile.user_id || profile.id;
                  const partnerName = displayName;
                  if (partnerId && typeof window !== 'undefined') {
                    localStorage.setItem('messagePartnerId', partnerId);
                    localStorage.setItem('messagePartnerName', partnerName);
                    router.push('/messages');
                  }
                }}
                className="w-full lg:w-auto flex items-center justify-center gap-2 px-4 py-3 bg-[#F52F8E] text-white rounded-xl font-semibold hover:bg-[#E01E7A] transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                שלח הודעה
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* Mobile Menu Toggle */}
          <div className="lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="w-full flex items-center justify-between px-4 py-3 bg-white rounded-xl shadow-sm border border-gray-100 text-gray-700"
            >
              <span className="font-medium">
                {activeTab === 'profile' && 'פרופיל'}
                {isOwnerOrAdmin() && activeTab === 'messages' && 'הודעות'}
                {activeTab === 'forums' && 'פורומים'}
                {activeTab === 'points' && 'נקודות'}
                {isOwnerOrAdmin() && activeTab === 'courses' && 'קורסים שלי'}
                {isOwnerOrAdmin() && activeTab === 'notifications' && 'התראות'}
                {isOwnerOrAdmin() && activeTab === 'events' && 'אירועים שלי'}
                {isOwnerOrAdmin() && activeTab === 'projects' && 'פרויקטים'}
              </span>
              <Menu className="w-5 h-5" />
            </button>
            {mobileMenuOpen && (
              <div className="mt-2 bg-white rounded-xl shadow-sm border border-gray-100 p-2 space-y-1">
                <button
                  onClick={() => { setActiveTab('profile'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === 'profile'
                      ? 'bg-[#F52F8E] text-white'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-[#F52F8E]'
                  }`}
                >
                  <User className="w-5 h-5" />
                  <span className="font-medium">פרופיל</span>
                </button>
                {isOwnerOrAdmin() && (
                  <button
                    onClick={() => { setActiveTab('messages'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      activeTab === 'messages'
                        ? 'bg-[#F52F8E] text-white'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-[#F52F8E]'
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
                      ? 'bg-[#F52F8E] text-white'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-[#F52F8E]'
                  }`}
                >
                  <MessageSquare className="w-5 h-5" />
                  <span className="font-medium">פורומים</span>
                </button>
                <button
                  onClick={() => { setActiveTab('points'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === 'points'
                      ? 'bg-[#F52F8E] text-white'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-[#F52F8E]'
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
                        ? 'bg-[#F52F8E] text-white'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-[#F52F8E]'
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
                        ? 'bg-[#F52F8E] text-white'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-[#F52F8E]'
                    }`}
                  >
                    <Bell className="w-5 h-5" />
                    <span className="font-medium">התראות</span>
                  </button>
                )}
                {isOwnerOrAdmin() && (
                  <button
                    onClick={() => { setActiveTab('events'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      activeTab === 'events'
                        ? 'bg-[#F52F8E] text-white'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-[#F52F8E]'
                    }`}
                  >
                    <Calendar className="w-5 h-5" />
                    <span className="font-medium">אירועים שלי</span>
                  </button>
                )}
                {isOwnerOrAdmin() && (
                  <button
                    onClick={() => { setActiveTab('projects'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      activeTab === 'projects'
                        ? 'bg-[#F52F8E] text-white'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-[#F52F8E]'
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-2">
              <button
                onClick={() => setActiveTab('profile')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === 'profile'
                    ? 'bg-[#F52F8E] text-white'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-[#F52F8E]'
                }`}
              >
                <User className="w-5 h-5" />
                <span className="font-medium">פרופיל</span>
              </button>
              {isOwnerOrAdmin() && (
                <button
                  onClick={() => setActiveTab('messages')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === 'messages'
                      ? 'bg-[#F52F8E] text-white'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-[#F52F8E]'
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
                    ? 'bg-[#F52F8E] text-white'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-[#F52F8E]'
                }`}
              >
                <MessageSquare className="w-5 h-5" />
                <span className="font-medium">פורומים</span>
              </button>
              <button
                onClick={() => setActiveTab('points')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === 'points'
                    ? 'bg-[#F52F8E] text-white'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-[#F52F8E]'
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
                      ? 'bg-[#F52F8E] text-white'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-[#F52F8E]'
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
                      ? 'bg-[#F52F8E] text-white'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-[#F52F8E]'
                  }`}
                >
                  <Bell className="w-5 h-5" />
                  <span className="font-medium">התראות</span>
                </button>
              )}
              {isOwnerOrAdmin() && (
                <button
                  onClick={() => setActiveTab('events')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === 'events'
                      ? 'bg-[#F52F8E] text-white'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-[#F52F8E]'
                  }`}
                >
                  <Calendar className="w-5 h-5" />
                  <span className="font-medium">אירועים שלי</span>
                </button>
              )}
              {isOwnerOrAdmin() && (
                <button
                  onClick={() => setActiveTab('projects')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === 'projects'
                      ? 'bg-[#F52F8E] text-white'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-[#F52F8E]'
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
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
                    <h2 className="text-lg sm:text-xl font-semibold text-[#F52F8E]">פרטים</h2>
                    {!editingDetails && currentLoggedInUserId && profile && (currentLoggedInUserId === (profile.user_id || profile.id)) && (
                      <button
                        onClick={() => setEditingDetails(true)}
                        className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors text-sm sm:text-base"
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
                          className="w-full sm:w-3/4 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F52F8E] text-sm sm:text-base"
                        />
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                        <label className="text-sm font-medium text-[#F52F8E] sm:w-1/4">שם משפחה*</label>
                        <input
                          type="text"
                          value={formData.last_name}
                          onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                          className="w-full sm:w-3/4 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F52F8E] text-sm sm:text-base"
                        />
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                        <label className="text-sm font-medium text-[#F52F8E] sm:w-1/4">כינוי*</label>
                        <input
                          type="text"
                          value={formData.nickname}
                          onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                          className="w-full sm:w-3/4 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F52F8E] text-sm sm:text-base"
                        />
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                        <label className="text-sm font-medium text-[#F52F8E] sm:w-1/4">איך צריך לפנות אליך בקהילה שלנו?*</label>
                        <select
                          dir="rtl"
                          lang="he"
                          value={formData.how_to_address}
                          onChange={(e) => setFormData({ ...formData, how_to_address: e.target.value })}
                          className="w-full sm:w-3/4 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F52F8E] text-sm sm:text-base bg-white"
                          required
                        >
                          <option value="">בחר אפשרות</option>
                          <option value="אוטומטור">אוטומטור</option>
                          <option value="אוטומטורית">אוטומטורית</option>
                        </select>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                        <label className="text-sm font-medium text-[#F52F8E] sm:w-1/4">מה הניסיון שלך עם אוטומציות No Code*</label>
                        <select
                          dir="rtl"
                          lang="he"
                          value={formData.nocode_experience}
                          onChange={(e) => setFormData({ ...formData, nocode_experience: e.target.value })}
                          className="w-full sm:w-3/4 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F52F8E] text-sm sm:text-base bg-white"
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
                          className="w-full sm:w-3/4 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F52F8E] text-sm sm:text-base"
                        />
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                        <label className="text-sm font-medium text-[#F52F8E] sm:w-1/4">קישור פייסבוק</label>
                        <input
                          type="text"
                          value={formData.facebook_url}
                          onChange={(e) => setFormData({ ...formData, facebook_url: e.target.value })}
                          placeholder="https://facebook.com/..."
                          className="w-full sm:w-3/4 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F52F8E] text-sm sm:text-base"
                        />
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 justify-end pt-2">
                        <button
                          onClick={() => saveDetails()}
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-[#F52F8E] text-white rounded-lg hover:bg-[#E01E7A] transition-colors text-sm sm:text-base"
                        >
                          <Save className="w-4 h-4" />
                          שמור
                        </button>
                        <button
                          onClick={() => {
                            setEditingDetails(false)
                            loadProfile()
                          }}
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm sm:text-base"
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
                        <span className="text-sm sm:text-base text-gray-800 font-medium">{formData.first_name || '-'}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
                        <span className="text-xs sm:text-sm font-medium text-[#F52F8E]">שם משפחה*</span>
                        <span className="text-sm sm:text-base text-gray-800 font-medium">{formData.last_name || '-'}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
                        <span className="text-xs sm:text-sm font-medium text-[#F52F8E]">כינוי*</span>
                        <span className="text-sm sm:text-base text-gray-800 font-medium">{formData.nickname || '-'}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
                        <span className="text-xs sm:text-sm font-medium text-[#F52F8E]">איך צריך לפנות אליך בקהילה שלנו?*</span>
                        <span className="text-sm sm:text-base text-gray-800 font-medium text-right">{formData.how_to_address || '-'}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
                        <span className="text-xs sm:text-sm font-medium text-[#F52F8E]">מה הניסיון שלך עם אוטומציות No Code*</span>
                        <span className="text-sm sm:text-base text-gray-800 font-medium text-right">{formData.nocode_experience || '-'}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Personal Information Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
                    <h2 className="text-lg sm:text-xl font-semibold text-[#F52F8E]">מידע אישי</h2>
                    {!editingPersonal && currentLoggedInUserId && profile && (currentLoggedInUserId === (profile.user_id || profile.id)) && (
                      <button
                        onClick={() => setEditingPersonal(true)}
                        className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors text-sm sm:text-base"
                      >
                        <Edit className="w-4 h-4" />
                        עריכה
                      </button>
                    )}
                  </div>

                  {editingPersonal ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">ביוגרפיה</label>
                        <textarea
                          value={formData.bio}
                          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                          rows={4}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F52F8E]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">URL תמונת פרופיל</label>
                        <input
                          type="text"
                          value={formData.avatar_url}
                          onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                          placeholder="https://..."
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F52F8E]"
                        />
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 justify-end pt-2">
                        <button
                          onClick={savePersonal}
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-[#F52F8E] text-white rounded-lg hover:bg-[#E01E7A] transition-colors text-sm sm:text-base"
                        >
                          <Save className="w-4 h-4" />
                          שמור
                        </button>
                        <button
                          onClick={() => {
                            setEditingPersonal(false)
                            loadProfile()
                          }}
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm sm:text-base"
                        >
                          <X className="w-4 h-4" />
                          ביטול
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <span className="text-sm text-gray-500">ביוגרפיה:</span>
                        <p className="text-gray-800 font-medium mt-1">{formData.bio || '-'}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">אימייל:</span>
                        <p className="text-gray-800 font-medium mt-1">{profile.email || '-'}</p>
                      </div>
                    </div>
                  )}
                </div>

              </>
            )}


            {activeTab === 'messages' && (
              <>
                {isOwnerOrAdmin() ? (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">הודעות</h2>
                    <p className="text-sm sm:text-base text-gray-500">אין הודעות חדשות</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">הודעות</h2>
                    <p className="text-sm sm:text-base text-gray-500">אין גישה למידע זה</p>
                  </div>
                )}
              </>
            )}

            {activeTab === 'forums' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">פורומים שלי</h2>
                
                {/* Tabs for Posts and Replies */}
                <div className="flex gap-2 mb-6 border-b border-gray-200">
                  <button
                    onClick={() => setForumsTab('posts')}
                    className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                      forumsTab === 'posts'
                        ? 'border-[#F52F8E] text-[#F52F8E]'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    הפוסטים שלי
                  </button>
                  <button
                    onClick={() => setForumsTab('replies')}
                    className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                      forumsTab === 'replies'
                        ? 'border-[#F52F8E] text-[#F52F8E]'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
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
                            className="block p-4 border border-gray-200 rounded-lg hover:border-[#F52F8E] hover:shadow-md transition-all"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                                  {post.title}
                                </h3>
                                <div 
                                  className="text-gray-600 text-sm mb-3 overflow-hidden prose prose-sm max-w-none"
                                  style={{ maxHeight: '4rem' }}
                                  dangerouslySetInnerHTML={{ __html: post.content || '' }}
                                />
                                <div className="flex items-center gap-4 text-sm text-gray-500">
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
                            className="block p-4 border border-gray-200 rounded-lg hover:border-[#F52F8E] hover:shadow-md transition-all"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                                  {reply.forum_posts?.title || 'פוסט'}
                                </h3>
                                <div 
                                  className="text-gray-600 text-sm mb-3 overflow-hidden prose prose-sm max-w-none"
                                  style={{ maxHeight: '4rem' }}
                                  dangerouslySetInnerHTML={{ __html: reply.content || '' }}
                                />
                                <div className="flex items-center gap-4 text-sm text-gray-500">
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
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">תגים</h2>
                  {userBadges.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Star className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <p>אין תגים עדיין</p>
                      <p className="text-sm mt-2">צבר נקודות כדי לקבל תגים!</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {userBadges.map((userBadge: any) => (
                        <div
                          key={userBadge.id}
                          className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:border-[#F52F8E] transition-all bg-gradient-to-br from-white to-gray-50"
                        >
                          <span 
                            style={{ color: userBadge.badge?.icon_color || '#FFD700' }}
                            className="text-4xl mb-2"
                          >
                            {userBadge.badge?.icon || '⭐'}
                          </span>
                          <h3 className="font-semibold text-gray-800 text-sm text-center mb-1">
                            {userBadge.badge?.name || 'תג'}
                          </h3>
                          {userBadge.badge?.description && (
                            <p className="text-xs text-gray-500 text-center">
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
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">היסטוריית נקודות</h2>
                  
                  {loadingPoints ? (
                    <div className="text-center py-8 text-gray-500">טוען...</div>
                  ) : pointsHistory.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg">אין היסטוריית נקודות</p>
                      <p className="text-sm text-gray-400 mt-2">
                        פעילויות יופיעו כאן
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pointsHistory.map((entry: any) => {
                        // Use displayAction if available (from enhanced history), otherwise fallback
                        const actionText = entry.displayAction || entry.action_name || entry.action || entry.description || 'פעולה';
                        const isPositive = entry.points > 0;
                        const Icon = isPositive ? Trophy : XCircle;
                        const iconColor = isPositive ? 'text-yellow-500' : 'text-red-500';
                        
                        return (
                          <div
                            key={entry.id}
                            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-[#F52F8E] transition-all"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Icon className={`w-5 h-5 ${iconColor}`} />
                                <span className="font-semibold text-gray-800">
                                  {actionText}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-500">
                                <div className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  <span>{formatTimeAgo(entry.created_at)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-lg font-bold ${
                                isPositive ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {isPositive ? '+' : ''}{entry.points}
                              </span>
                              <span className="text-sm text-gray-500">נקודות</span>
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
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4 sm:mb-6">קורסים שלי</h2>
                
                {loadingCourses ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F52F8E] mx-auto mb-4"></div>
                    <p className="text-gray-600">טוען קורסים...</p>
                  </div>
                ) : myCourses.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg mb-2">עדיין לא נרשמת לקורסים</p>
                    <Link href="/courses" className="text-[#F52F8E] hover:underline">
                      גלה קורסים חדשים
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {myCourses.map((course: any) => (
                      <Link
                        key={course.id}
                        href={`/courses/${course.id}`}
                        className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow flex flex-col"
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
                          <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2 line-clamp-2">{course.title}</h3>
                          <p className="text-gray-600 text-sm mb-4 line-clamp-2 flex-grow">{course.description}</p>
                          
                          {/* Progress Bar */}
                          {course.totalLessons > 0 && (
                            <div className="mb-4">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-gray-600">
                                  {course.completedLessons !== undefined && course.totalLessons !== undefined
                                    ? `${course.completedLessons} מתוך ${course.totalLessons} שיעורים`
                                    : 'התקדמות'}
                                </span>
                                <span className="text-xs font-semibold text-gray-800">
                                  {course.progress !== undefined ? `${Math.round(course.progress)}%` : '0%'}
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-[#F52F8E] h-2 rounded-full transition-all"
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
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-4 sm:mb-6">
                      <h2 className="text-lg sm:text-xl font-semibold text-gray-800">התראות</h2>
                      {notifications.filter((n: any) => !n.is_read).length > 0 && (
                        <button
                          onClick={handleMarkAllNotificationsAsRead}
                          className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-[#F52F8E] text-white rounded-lg hover:bg-pink-600 transition-colors text-sm font-medium"
                        >
                          <CheckCheck className="w-4 h-4" />
                          סמן הכל כנקרא
                        </button>
                      )}
                    </div>

                {loadingNotifications ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F52F8E] mx-auto mb-4"></div>
                    <p className="text-gray-600">טוען התראות...</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Bell className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg mb-2">אין התראות</p>
                    <p className="text-sm">כשיהיו התראות חדשות, הן יופיעו כאן</p>
                  </div>
                ) : (
                  <>
                    <div className="divide-y divide-gray-100">
                      {notifications.map((notification: any) => {
                        const isPointsNotification = 
                          notification.title?.includes('נקודות') || 
                          notification.message?.includes('נקודות')

                        return (
                          <div
                            key={notification.id}
                            className={`p-4 sm:p-5 hover:bg-gray-50 transition-colors cursor-pointer ${
                              !notification.is_read ? 'bg-pink-50/50' : ''
                            }`}
                            onClick={() => !isPointsNotification && handleNotificationClick(notification)}
                          >
                            <div className="flex items-start gap-4">
                              {/* Read indicator */}
                              <div className={`flex-shrink-0 w-3 h-3 rounded-full mt-2 ${
                                !notification.is_read ? 'bg-[#F52F8E]' : 'bg-gray-300'
                              }`}></div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <p className="text-base font-semibold text-gray-800 mb-2">
                                  {notification.title}
                                </p>
                                <p className="text-sm text-gray-600 mb-2">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-gray-500">
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
                          className={`px-4 py-2 rounded-lg border transition-colors ${
                            notificationsPage === 1
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                              : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                          }`}
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-2">
                          {Array.from({ length: notificationsTotalPages }, (_, i) => i + 1).map((page) => (
                            <button
                              key={page}
                              onClick={() => handleNotificationPageChange(page)}
                              className={`px-4 py-2 rounded-lg border transition-colors ${
                                notificationsPage === page
                                  ? 'bg-[#F52F8E] text-white border-[#F52F8E]'
                                  : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                              }`}
                            >
                              {page}
                            </button>
                          ))}
                        </div>

                        <button
                          onClick={() => handleNotificationPageChange(notificationsPage + 1)}
                          disabled={notificationsPage === notificationsTotalPages}
                          className={`px-4 py-2 rounded-lg border transition-colors ${
                            notificationsPage === notificationsTotalPages
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                              : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
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
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">התראות</h2>
                    <p className="text-sm sm:text-base text-gray-500">אין גישה למידע זה</p>
                  </div>
                )}
              </>
            )}

            {activeTab === 'projects' && (
              <>
                {isOwnerOrAdmin() ? (
                  <div className="space-y-6">
                {/* פרויקטים שפרסמתי */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">פרויקטים שפרסמתי</h2>
                  {loadingProjects ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F52F8E] mx-auto mb-4"></div>
                      <p className="text-gray-600">טוען פרויקטים...</p>
                    </div>
                  ) : myProjects.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Briefcase className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg mb-2">אין פרויקטים שפרסמת</p>
                      <p className="text-sm">כשתיצור פרויקטים, הם יופיעו כאן</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {myProjects.map((project: any) => {
                        const offers = projectOffers[project.id] || []
                        const showOffers = expandedProjects.has(project.id)
                        return (
                          <div key={project.id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <h3 className="font-semibold text-gray-800 mb-1">{project.title}</h3>
                                <p className="text-sm text-gray-600 mb-2 line-clamp-2">{project.description}</p>
                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                  <span className={`px-2 py-1 rounded ${
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
                                  <span>{offers.length} הגשות</span>
                                  {project.created_at && (
                                    <span>{new Date(project.created_at).toLocaleDateString('he-IL')}</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setEditingProject(project)
                                    setEditProjectForm({
                                      title: project.title || '',
                                      description: project.description || '',
                                      budget_min: project.budget_min?.toString() || '',
                                      budget_max: project.budget_max?.toString() || '',
                                      budget_currency: project.budget_currency || 'ILS',
                                      status: project.status || 'open'
                                    })
                                  }}
                                  className="px-3 py-1 text-sm bg-[#F52F8E] text-white rounded-lg hover:bg-[#E01E7A] transition-colors flex items-center gap-1"
                                  title="ערוך פרויקט"
                                >
                                  <Edit className="w-4 h-4" />
                                  ערוך
                                </button>
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
                                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                  {showOffers ? 'הסתר' : 'הצג'} הגשות
                                </button>
                              </div>
                            </div>
                            {showOffers && offers.length > 0 && (
                              <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                                <h4 className="font-medium text-gray-700 mb-2">הגשות:</h4>
                                {offers.map((offer: any) => (
                                  <div 
                                    key={offer.id} 
                                    className="bg-gray-50 p-3 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                                    onClick={() => handleOpenOfferModal(offer, project)}
                                  >
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="font-medium text-sm">{offer.user?.display_name || 'משתמש לא ידוע'}</span>
                                          {offer.offer_amount && (
                                            <span className="text-[#F52F8E] font-semibold text-sm">
                                              {offer.offer_amount} {offer.offer_currency || 'ILS'}
                                            </span>
                                          )}
                                          <span className={`px-2 py-0.5 text-xs rounded ${
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
                                          <p className="text-sm text-gray-600 mb-1 line-clamp-2">{offer.message}</p>
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
                              <div className="mt-4 pt-4 border-t border-gray-200 text-center text-gray-500 text-sm">
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
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">פרויקטים שהגשתי להם מועמדות</h2>
                  {loadingProjects ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F52F8E] mx-auto mb-4"></div>
                      <p className="text-gray-600">טוען הגשות...</p>
                    </div>
                  ) : mySubmissions.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Briefcase className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg mb-2">אין הגשות</p>
                      <p className="text-sm">כשתיגש לפרויקטים, הם יופיעו כאן</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {mySubmissions.map((submission: any) => {
                        const isProjectDeleted = !submission.project || !submission.project.id;
                        return (
                          <div key={submission.id} className={`border rounded-lg p-4 ${isProjectDeleted ? 'border-gray-300 bg-gray-50' : 'border-gray-200'}`}>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-semibold text-gray-800">
                                    {submission.project?.title || 'פרויקט לא זמין'}
                                  </h3>
                                  {isProjectDeleted && (
                                    <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded">
                                      נסגר
                                    </span>
                                  )}
                                </div>
                                {submission.project?.description && !isProjectDeleted && (
                                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">{submission.project.description}</p>
                                )}
                                <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                                  {submission.offer_amount && (
                                    <span className="text-[#F52F8E] font-semibold">
                                      {submission.offer_amount} {submission.offer_currency || 'ILS'}
                                    </span>
                                  )}
                                  <span className={`px-2 py-1 rounded ${
                                    submission.status === 'accepted' ? 'bg-green-100 text-green-700' :
                                    submission.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                    'bg-yellow-100 text-yellow-700'
                                  }`}>
                                    {submission.status === 'accepted' ? 'אושר' :
                                     submission.status === 'rejected' ? 'נדחה' :
                                     'ממתין'}
                                  </span>
                                  {submission.created_at && (
                                    <span>{new Date(submission.created_at).toLocaleDateString('he-IL')}</span>
                                  )}
                                </div>
                                {submission.message && (
                                  <p className="text-sm text-gray-600 mb-2">{submission.message}</p>
                                )}
                              </div>
                              {isProjectDeleted ? (
                                <button
                                  disabled
                                  className="px-3 py-1 text-sm bg-gray-300 text-gray-600 rounded-lg cursor-not-allowed"
                                  title="הפרויקט נסגר"
                                >
                                  נסגר
                                </button>
                              ) : submission.project?.id ? (
                                <Link
                                  href={`/projects`}
                                  className="px-3 py-1 text-sm bg-[#F52F8E] text-white rounded-lg hover:bg-[#E01E7A] transition-colors"
                                >
                                  צפה בפרויקט
                                </Link>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">פרויקטים</h2>
                    <p className="text-sm sm:text-base text-gray-500">אין גישה למידע זה</p>
                  </div>
                )}
              </>
            )}

            {activeTab === 'events' && (
              <>
                {isOwnerOrAdmin() ? (
                  <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
                      <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">אירועים שנרשמתי אליהם</h2>
                      {loadingEvents ? (
                        <div className="text-center py-12">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F52F8E] mx-auto mb-4"></div>
                          <p className="text-gray-600">טוען אירועים...</p>
                        </div>
                      ) : myEventRegistrations.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                          <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                          <p className="text-lg mb-2">אין אירועים שנרשמת אליהם</p>
                          <p className="text-sm">כשתירשם לאירועים, הם יופיעו כאן</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {myEventRegistrations.map((registration: any) => {
                            const event = registration.events;
                            if (!event) return null;

                            const eventDate = new Date(event.event_date);
                            const now = new Date();
                            const isPast = eventDate < now;
                            const isToday = eventDate.toDateString() === now.toDateString();
                            
                            function formatTime(timeString: string): string {
                              if (!timeString) return '';
                              return timeString.substring(0, 5);
                            }

                            return (
                              <div key={registration.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <Link href={`/live/${event.id}`} className="block">
                                      <h3 className="font-semibold text-gray-800 mb-1 hover:text-[#F52F8E] transition-colors">
                                        {event.title}
                                      </h3>
                                    </Link>
                                    <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                                      <span className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {formatDateUtil(event.event_date)}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {formatTime(event.event_time)}
                                      </span>
                                      <span className={`px-2 py-1 rounded ${
                                        isPast
                                          ? 'bg-gray-100 text-gray-600'
                                          : isToday
                                          ? 'bg-green-100 text-green-700'
                                          : 'bg-blue-100 text-blue-700'
                                      }`}>
                                        {isPast ? 'עבר' : isToday ? 'היום' : 'קרוב'}
                                      </span>
                                    </div>
                                    {event.instructor_name && (
                                      <p className="text-sm text-gray-600">
                                        מנחה: {event.instructor_name}
                                        {event.instructor_title && ` - ${event.instructor_title}`}
                                      </p>
                                    )}
                                  </div>
                                  <Link
                                    href={`/live/${event.id}`}
                                    className="px-4 py-2 text-sm bg-[#F52F8E] text-white rounded-lg hover:bg-[#E01E7A] transition-colors"
                                  >
                                    צפייה באירוע
                                  </Link>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">אירועים</h2>
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
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">החלף תמונת פרופיל</h2>
              <button
                onClick={() => setShowAvatarModal(false)}
                className="text-gray-500 hover:text-gray-700"
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
                    ? 'bg-[#F52F8E] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                העלה תמונה
              </button>
              <button
                onClick={() => setAvatarMode('avatar')}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  avatarMode === 'avatar'
                    ? 'bg-[#F52F8E] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                בחר אווטר
              </button>
            </div>

            {/* Upload Mode */}
            {avatarMode === 'upload' && (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">העלה תמונה מהמחשב</p>
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
                    className="inline-block px-6 py-2 bg-[#F52F8E] text-white rounded-lg hover:bg-[#E01E7A] transition-colors cursor-pointer"
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
                <p className="text-gray-600 text-sm mb-4">בחר אווטר מוכן</p>
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
                        className="relative w-full aspect-square rounded-lg overflow-hidden border-2 border-gray-200 hover:border-[#F52F8E] transition-colors"
                      >
                        <Image 
                          src={avatarUrl} 
                          alt={style} 
                          fill 
                          className="object-cover" 
                          sizes="(max-width: 640px) 100px, 120px"
                        />
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-500 text-center mt-4">
                  אווטרים נוצרים על ידי <a href="https://dicebear.com" target="_blank" rel="noopener noreferrer" className="text-[#F52F8E] hover:underline">DiceBear</a>
                </p>
              </div>
            )}

            {/* Remove Avatar Button */}
            {(formData.avatar_url || profile.avatar_url) && (
              <div className="mt-6 pt-6 border-t border-gray-200">
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

      {/* Offer Details Modal */}
      {selectedOffer && selectedOfferProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={() => setSelectedOffer(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-gray-800">פרטי ההצעה</h2>
              <button
                onClick={() => {
                  setSelectedOffer(null)
                  setSelectedOfferProject(null)
                  setSelectedOfferUser(null)
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="סגור"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Project Info */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">פרויקט</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="font-medium text-gray-800">{selectedOfferProject.title}</p>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-3">{selectedOfferProject.description}</p>
                </div>
              </div>

              {/* Offer Details */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">פרטי ההצעה</h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  {selectedOffer.offer_amount && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">הצעת מחיר:</span>
                      <span className="text-[#F52F8E] font-bold text-lg">
                        {selectedOffer.offer_amount} {selectedOffer.offer_currency || 'ILS'}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">סטטוס:</span>
                    <span className={`px-3 py-1 text-sm rounded ${
                      selectedOffer.status === 'accepted' ? 'bg-green-100 text-green-700' :
                      selectedOffer.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {selectedOffer.status === 'accepted' ? 'אושר' :
                       selectedOffer.status === 'rejected' ? 'נדחה' :
                       'ממתין'}
                    </span>
                  </div>
                  {selectedOffer.created_at && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">תאריך הגשה:</span>
                      <span className="text-gray-800">
                        {new Date(selectedOffer.created_at).toLocaleDateString('he-IL', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  )}
                  {selectedOffer.message && (
                    <div>
                      <span className="text-gray-600 block mb-2">הודעה:</span>
                      <p className="text-gray-800 whitespace-pre-wrap bg-white p-3 rounded border border-gray-200">
                        {selectedOffer.message}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* User Info */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">מגיש ההצעה</h3>
                {loadingOfferUser ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F52F8E]"></div>
                  </div>
                ) : selectedOfferUser ? (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center gap-4 mb-3">
                      {selectedOfferUser.avatar_url ? (
                        <Image
                          src={selectedOfferUser.avatar_url}
                          alt={selectedOfferUser.display_name || 'משתמש'}
                          width={64}
                          height={64}
                          className="rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#F52F8E] to-[#E01E7A] flex items-center justify-center text-white text-xl font-bold">
                          {(selectedOfferUser.display_name || selectedOfferUser.first_name || 'מ')[0]}
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">
                          {selectedOfferUser.display_name || selectedOfferUser.first_name || 'משתמש לא ידוע'}
                        </p>
                        {selectedOfferUser.bio && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{selectedOfferUser.bio}</p>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                      {selectedOfferUser.experience_level && (
                        <div>
                          <span className="text-gray-600">רמת ניסיון:</span>
                          <span className="text-gray-800 mr-2">{selectedOfferUser.experience_level}</span>
                        </div>
                      )}
                      {selectedOfferUser.points !== undefined && (
                        <div>
                          <span className="text-gray-600">נקודות:</span>
                          <span className="text-gray-800 mr-2">{selectedOfferUser.points || 0}</span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        const userId = selectedOfferUser.user_id || selectedOfferUser.id
                        if (userId) {
                          localStorage.setItem('selectedUserId', userId)
                          // Use window.location for full page reload to ensure profile loads correctly
                          window.location.href = `/profile?userId=${userId}`
                        }
                      }}
                      className="mt-4 w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#F52F8E] text-white rounded-lg hover:bg-[#E01E7A] transition-colors font-semibold"
                    >
                      <User className="w-5 h-5" />
                      <span>צפייה בפרופיל</span>
                    </button>
                  </div>
                ) : (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-600">
                      {selectedOffer.user?.display_name || 'משתמש לא ידוע'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* מודל עריכת פרויקט */}
      {editingProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800">ערוך פרויקט</h2>
              <button
                onClick={() => {
                  setEditingProject(null)
                  setEditProjectForm({
                    title: '',
                    description: '',
                    budget_min: '',
                    budget_max: '',
                    budget_currency: 'ILS',
                    status: 'open'
                  })
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  כותרת הפרויקט *
                </label>
                <input
                  type="text"
                  value={editProjectForm.title}
                  onChange={(e) => setEditProjectForm({ ...editProjectForm, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F52F8E] focus:border-transparent"
                  placeholder="כותרת הפרויקט"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  תיאור הפרויקט *
                </label>
                <textarea
                  value={editProjectForm.description}
                  onChange={(e) => setEditProjectForm({ ...editProjectForm, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F52F8E] focus:border-transparent"
                  rows={6}
                  placeholder="תאר את הפרויקט בפירוט..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    תקציב מינימלי
                  </label>
                  <input
                    type="number"
                    value={editProjectForm.budget_min}
                    onChange={(e) => setEditProjectForm({ ...editProjectForm, budget_min: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F52F8E] focus:border-transparent"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    תקציב מקסימלי
                  </label>
                  <input
                    type="number"
                    value={editProjectForm.budget_max}
                    onChange={(e) => setEditProjectForm({ ...editProjectForm, budget_max: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F52F8E] focus:border-transparent"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    מטבע
                  </label>
                  <select
                    value={editProjectForm.budget_currency}
                    onChange={(e) => setEditProjectForm({ ...editProjectForm, budget_currency: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F52F8E] focus:border-transparent"
                  >
                    <option value="ILS">₪ ILS</option>
                    <option value="USD">$ USD</option>
                    <option value="EUR">€ EUR</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    סטטוס
                  </label>
                  <select
                    value={editProjectForm.status}
                    onChange={(e) => setEditProjectForm({ ...editProjectForm, status: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F52F8E] focus:border-transparent"
                  >
                    <option value="open">פתוח</option>
                    <option value="in_progress">בביצוע</option>
                    <option value="completed">הושלם</option>
                    <option value="closed">סגור</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setEditingProject(null)
                    setEditProjectForm({
                      title: '',
                      description: '',
                      budget_min: '',
                      budget_max: '',
                      budget_currency: 'ILS',
                      status: 'open'
                    })
                  }}
                  className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  disabled={savingProject}
                >
                  ביטול
                </button>
                <button
                  onClick={async () => {
                    if (!editProjectForm.title || !editProjectForm.description) {
                      alert('אנא מלא את כל השדות הנדרשים')
                      return
                    }

                    setSavingProject(true)
                    try {
                      const updateData: any = {
                        title: editProjectForm.title,
                        description: editProjectForm.description,
                        status: editProjectForm.status,
                        budget_currency: editProjectForm.budget_currency
                      }

                      if (editProjectForm.budget_min) {
                        updateData.budget_min = parseFloat(editProjectForm.budget_min)
                      }
                      if (editProjectForm.budget_max) {
                        updateData.budget_max = parseFloat(editProjectForm.budget_max)
                      }

                      const { data, error } = await updateProject(editingProject.id, updateData)

                      if (error) {
                        console.error('Error updating project:', error)
                        alert('שגיאה בעדכון הפרויקט. אנא נסה שוב.')
                      } else {
                        // Refresh projects list
                        const { data: updatedProjects } = await getUserProjects(profile.user_id)
                        if (updatedProjects) {
                          setMyProjects(updatedProjects)
                        }
                        
                        setEditingProject(null)
                        setEditProjectForm({
                          title: '',
                          description: '',
                          budget_min: '',
                          budget_max: '',
                          budget_currency: 'ILS',
                          status: 'open'
                        })
                        alert('הפרויקט עודכן בהצלחה!')
                      }
                    } catch (error) {
                      console.error('Error updating project:', error)
                      alert('שגיאה בעדכון הפרויקט. אנא נסה שוב.')
                    } finally {
                      setSavingProject(false)
                    }
                  }}
                  className="px-6 py-2 bg-[#F52F8E] text-white rounded-lg hover:bg-[#E01E7A] transition-colors flex items-center gap-2"
                  disabled={savingProject}
                >
                  {savingProject ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>שומר...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>שמור שינויים</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">טוען...</div>}>
      <ProfilePageContent />
    </Suspense>
  )
}

