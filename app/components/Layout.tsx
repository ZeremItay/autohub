'use client';

import { 
  Search, 
  Bell, 
  MessageCircle, 
  Home as HomeIcon, 
  Users, 
  MessageSquare, 
  BookOpen, 
  User,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Settings,
  LogOut,
  UserCircle,
  Activity,
  Mail,
  Image as ImageIcon,
  CreditCard,
  ArrowRight,
  Video,
  FileText,
  Briefcase,
  PlayCircle,
  X,
  AlignJustify,
  Calendar,
  Shield,
  Radio,
  MessageCircleMore,
  Palette,
  Sun,
  Moon
} from 'lucide-react';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getAllProfiles, updateProfile } from '@/lib/queries/profiles';
import { clearCache } from '@/lib/cache';
import { awardPoints } from '@/lib/queries/gamification';
import { logError } from '@/lib/utils/errorHandler';
import { useTheme } from '@/lib/contexts/ThemeContext';
import {
  getHeaderStyles,
  getSidebarStyles,
  getSidebarLinkStyles,
  getNotificationStyles,
  getTextStyles,
  getBorderStyles,
  getBackgroundStyles,
  getBadgeStyles,
  getModalStyles,
  combineStyles
} from '@/lib/utils/themeStyles';

interface SearchResult {
  recordings: any[];
  forums: any[];
  forumPosts: any[];
  posts: any[];
  projects: any[];
  courses: any[];
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { theme, toggleTheme } = useTheme();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [hasLiveEvent, setHasLiveEvent] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchAbortControllerRef = useRef<AbortController | null>(null);
  const currentSearchQueryRef = useRef<string>('');
  const searchRef = useRef<HTMLDivElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const notificationsButtonRef = useRef<HTMLButtonElement>(null);
  const notificationsMenuRef = useRef<HTMLDivElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const toggleProfileMenu = useCallback(() => {
    setProfileMenuOpen(prev => !prev);
  }, []);

  const closeProfileMenu = useCallback(() => {
    setProfileMenuOpen(false);
  }, []);

  // Search function
  const performSearch = useCallback(async (query: string) => {
    const trimmedQuery = query.trim();
    
    if (!trimmedQuery || trimmedQuery.length < 2) {
      setSearchResults(null);
      setShowSearchResults(false);
      setIsSearching(false);
      currentSearchQueryRef.current = '';
      return;
    }

    // Cancel previous search if it exists
    if (searchAbortControllerRef.current) {
      searchAbortControllerRef.current.abort();
    }

    // Create new AbortController for this search
    const abortController = new AbortController();
    searchAbortControllerRef.current = abortController;
    currentSearchQueryRef.current = trimmedQuery;

    setIsSearching(true);
    
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(trimmedQuery)}`, {
        signal: abortController.signal
      });
      
      // Check if this search was cancelled
      if (abortController.signal.aborted) {
        return;
      }
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }
      
      const result = await response.json();
      const { data, error } = result;
      
      // Check again if this search was cancelled
      if (abortController.signal.aborted || currentSearchQueryRef.current !== trimmedQuery) {
        return;
      }
      
      if (!error && data) {
        setSearchResults(data);
        setShowSearchResults(true);
      } else {
        // Even if there's an error, set empty results to show "no results" message
        setSearchResults({
          recordings: [],
          forums: [],
          forumPosts: [],
          posts: [],
          projects: [],
          courses: []
        });
        setShowSearchResults(true);
      }
    } catch (error: any) {
      // Ignore abort errors
      if (error.name === 'AbortError' || abortController.signal.aborted) {
        return;
      }
      
      // Only update state if this is still the current search
      if (currentSearchQueryRef.current === trimmedQuery) {
        logError(error, 'handleSearch');
        // Set empty results on error
        setSearchResults({
          recordings: [],
          forums: [],
          forumPosts: [],
          posts: [],
          projects: [],
          courses: []
        });
        setShowSearchResults(true);
      }
    } finally {
      // Only update isSearching if this is still the current search
      if (currentSearchQueryRef.current === trimmedQuery && !abortController.signal.aborted) {
        setIsSearching(false);
      }
    }
  }, []);

  // Handle search input with debounce
  useEffect(() => {
    // Cancel any pending search timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }

    const trimmedQuery = searchQuery.trim();

    if (trimmedQuery.length >= 2) {
      setIsSearching(true);
      searchTimeoutRef.current = setTimeout(() => {
        // Cancel previous search before starting new one
        if (searchAbortControllerRef.current) {
          searchAbortControllerRef.current.abort();
        }
        performSearch(trimmedQuery);
        searchTimeoutRef.current = null;
      }, 300);
    } else {
      // Cancel any in-flight search when query is too short
      if (searchAbortControllerRef.current) {
        searchAbortControllerRef.current.abort();
        searchAbortControllerRef.current = null;
      }
      setSearchResults(null);
      setShowSearchResults(false);
      setIsSearching(false);
      currentSearchQueryRef.current = '';
    }

    return () => {
      // Only cancel timeout on cleanup, not the actual search
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
    };
  }, [searchQuery, performSearch]);

  // Auto-focus search input when mobile modal opens
  useEffect(() => {
    if (mobileSearchOpen && mobileSearchInputRef.current) {
      // Small delay to ensure modal is rendered
      setTimeout(() => {
        mobileSearchInputRef.current?.focus();
      }, 100);
      
      // Perform search if query exists when modal opens
      if (searchQuery.trim().length >= 2) {
        performSearch(searchQuery);
      }
      
      // Show search results if query exists and results are available
      if (searchQuery.trim().length >= 2 && searchResults) {
        setShowSearchResults(true);
      }
    } else if (!mobileSearchOpen) {
      // Cancel any in-flight search when modal closes
      if (searchAbortControllerRef.current) {
        searchAbortControllerRef.current.abort();
        searchAbortControllerRef.current = null;
      }
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
      setIsSearching(false);
      currentSearchQueryRef.current = '';
    }
  }, [mobileSearchOpen, searchQuery, searchResults, performSearch]);

  // Load current user from Supabase session
  useEffect(() => {
    async function loadUser() {
      try {
        // Use getCurrentUser utility function
        const { getCurrentUser } = await import('@/lib/utils/user');
        const user = await getCurrentUser();
        
        if (!user) {
          // Clear user state when no user
          setCurrentUser(null);
          setCurrentUserId(null);
          setAvatarUrl(null);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('selectedUserId');
          }
          return;
        }

        setCurrentUserId(user.user_id || user.id || null);
        setCurrentUser(user);
        setAvatarUrl(user.avatar_url || null);
        
        // Update is_online to true when user logs in
        if (!user.is_online && (user.user_id || user.id)) {
          try {
            const { updateProfile } = await import('@/lib/queries/profiles');
            const userId = user.user_id || user.id;
            if (userId) {
              await updateProfile(userId, { is_online: true });
            }
          } catch (error) {
            const { logError } = await import('@/lib/utils/errorHandler');
            logError(error, 'Layout:updateIsOnline');
          }
        }
            
        // Award daily login points (only once per day) - do this asynchronously to not block UI
        const userId = user.user_id || user.id;
        if (userId && typeof window !== 'undefined') {
          // Check localStorage to prevent multiple calls in the same session
          const today = new Date().toDateString();
          const lastAwardKey = `dailyLoginAward_${userId}`;
          const processingKey = `dailyLoginProcessing_${userId}`;
          const lastAwardDate = localStorage.getItem(lastAwardKey);
          const isProcessing = localStorage.getItem(processingKey);
          
          // Only award if we haven't already tried today AND we're not currently processing
          if (lastAwardDate !== today && !isProcessing) {
            // Mark that we're processing (with timestamp to auto-clear if stuck)
            localStorage.setItem(processingKey, Date.now().toString());
            
            // Run in background - don't wait for it
            // awardPoints already handles both Hebrew and English action names internally
            awardPoints(userId, 'כניסה יומית', { checkDaily: true })
              .then((result) => {
                // Clear processing flag
                localStorage.removeItem(processingKey);
                
                // If award succeeded or already awarded, mark today as done
                if (result.success || result.alreadyAwarded) {
                  localStorage.setItem(lastAwardKey, today);
                }
              })
              .catch((error) => {
                const { logError } = require('@/lib/utils/errorHandler');
                logError(error, 'Layout:dailyLoginPoints');
                // Clear processing flag on error so we can retry
                localStorage.removeItem(processingKey);
              });
          } else if (isProcessing) {
            // Check if processing flag is stuck (older than 10 seconds)
            const processingTime = parseInt(isProcessing);
            if (Date.now() - processingTime > 10000) {
              // Clear stuck flag
              localStorage.removeItem(processingKey);
            }
          }
        }
        
        // Save to localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('selectedUserId', user.user_id || user.id || '');
        }
      } catch (error) {
        const { logError } = await import('@/lib/utils/errorHandler');
        logError(error, 'Layout:loadUser');
        // Clear user state on error
        setCurrentUser(null);
        setCurrentUserId(null);
        setAvatarUrl(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('selectedUserId');
        }
      }
    }
    loadUser();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        loadUser();
      } else if (event === 'SIGNED_OUT') {
        // Update is_online to false when user logs out
        const userIdToUpdate = currentUserId;
        if (userIdToUpdate) {
          try {
            await supabase
              .from('profiles')
              .update({ is_online: false })
              .eq('user_id', userIdToUpdate);
          } catch (error) {
            logError(error, 'updateIsOnlineOnLogout');
          }
        }
        
        // Clear cache to force reload of data
        clearCache('profiles:all');
        
        setCurrentUser(null);
        setCurrentUserId(null);
        setAvatarUrl(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('selectedUserId');
        }
      }
    });

    // Listen for profile updates
    const handleProfileUpdate = async () => {
      clearCache('profiles:all');
      await loadUser();
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, []);

  // Load notifications - do this in background after initial load
  useEffect(() => {
    if (!currentUserId) return;

    // Load notifications after a short delay to not block initial page load
    const timeoutId = setTimeout(async () => {
      try {
        const response = await fetch(`/api/notifications?user_id=${currentUserId}`);
        // Always parse response, even if status is not ok
        const result = await response.json();
        if (result.data) {
          setNotifications(result.data);
          setUnreadCount(result.data.filter((n: any) => !n.is_read).length);
        } else {
          // If no data, set empty arrays
          setNotifications([]);
          setUnreadCount(0);
        }
      } catch (error) {
        // Silently fail - notifications are not critical for initial load
        setNotifications([]);
        setUnreadCount(0);
      }
    }, 500); // Load after 500ms (reduced delay for faster notification display)

    // Refresh every 30 seconds after initial load
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/notifications?user_id=${currentUserId}`);
        const result = await response.json();
        if (result.data) {
          setNotifications(result.data);
          setUnreadCount(result.data.filter((n: any) => !n.is_read).length);
        } else {
          setNotifications([]);
          setUnreadCount(0);
        }
      } catch (error) {
        // Silently fail
        setNotifications([]);
        setUnreadCount(0);
      }
    }, 30000);
    
    return () => {
      clearTimeout(timeoutId);
      clearInterval(interval);
    };
  }, [currentUserId]);

  // Function to refresh notifications (can be called from outside)
  const refreshNotifications = async () => {
    if (!currentUserId) return;
    
    try {
      const response = await fetch(`/api/notifications?user_id=${currentUserId}`);
      const result = await response.json();
      if (result.data) {
        setNotifications(result.data);
        setUnreadCount(result.data.filter((n: any) => !n.is_read).length);
      }
    } catch (error) {
      // Silently fail
    }
  };

  // Listen for notification updates
  useEffect(() => {
    const handleNotificationUpdate = () => {
      refreshNotifications();
    };

    window.addEventListener('notificationCreated', handleNotificationUpdate);
    
    return () => {
      window.removeEventListener('notificationCreated', handleNotificationUpdate);
    };
  }, [currentUserId]);

  // Load unread messages count
  useEffect(() => {
    if (!currentUserId || typeof window === 'undefined') return;

    function loadUnreadMessagesCount() {
      try {
        const savedConversations = localStorage.getItem(`conversations_${currentUserId}`);
        if (savedConversations) {
          const conversations = JSON.parse(savedConversations);
          const totalUnread = conversations.reduce((sum: number, conv: any) => {
            return sum + (conv.unreadCount || 0);
          }, 0);
          setUnreadMessagesCount(totalUnread);
        } else {
          setUnreadMessagesCount(0);
        }
      } catch (error) {
        logError(error, 'loadUnreadMessagesCount');
        setUnreadMessagesCount(0);
      }
    }

    loadUnreadMessagesCount();
    // Refresh every 10 seconds
    const interval = setInterval(loadUnreadMessagesCount, 10000);
    return () => clearInterval(interval);
  }, [currentUserId]);

  // Check for next live event (polling every 30 seconds)
  useEffect(() => {
    async function checkNextLiveEvent() {
      try {
        const { getNextLiveEvent, updateEventStatuses } = await import('@/lib/queries/events');
        // Auto-update event statuses before checking for live events
        await updateEventStatuses();
        const { data } = await getNextLiveEvent();
        setHasLiveEvent(!!data);
      } catch (error) {
        logError(error, 'checkNextLiveEvent');
        setHasLiveEvent(false);
      }
    }

    // Check immediately
    checkNextLiveEvent();
    
    // Then check every 30 seconds
    const interval = setInterval(checkNextLiveEvent, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
      if (notificationsRef.current && notificationsButtonRef.current && notificationsMenuRef.current &&
          !notificationsRef.current.contains(event.target as Node) && 
          !notificationsButtonRef.current.contains(event.target as Node) &&
          !notificationsMenuRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
      if (profileMenuRef.current && profileButtonRef.current && 
          !profileMenuRef.current.contains(event.target as Node) && 
          !profileButtonRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Calculate profile menu position
  const [profileMenuStyle, setProfileMenuStyle] = useState<React.CSSProperties>({});
  useEffect(() => {
    if (profileMenuOpen && profileButtonRef.current) {
      const buttonRect = profileButtonRef.current.getBoundingClientRect();
      const menuWidth = 288; // w-72 = 288px
      
      // For mobile, make it full width with margins
      if (window.innerWidth < 1024) {
        setProfileMenuStyle({
          top: `${buttonRect.bottom + 8}px`,
          left: '8px',
          right: '8px',
          width: 'auto',
          maxWidth: 'calc(100vw - 16px)'
        });
      } else {
        // For desktop, position it relative to button
        const leftPosition = buttonRect.left;
        const finalLeft = Math.max(8, Math.min(leftPosition, window.innerWidth - menuWidth - 8));
        
        setProfileMenuStyle({
          top: `${buttonRect.bottom + 8}px`,
          left: `${finalLeft}px`,
          width: `${menuWidth}px`
        });
      }
    }
  }, [profileMenuOpen]);

  // Calculate search dropdown position
  const [searchDropdownStyle, setSearchDropdownStyle] = useState<React.CSSProperties>({});
  useEffect(() => {
    if (showSearchResults && searchRef.current) {
      const rect = searchRef.current.getBoundingClientRect();
      setSearchDropdownStyle({
        top: `${rect.bottom + 8}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        maxWidth: '90vw'
      });
    }
  }, [showSearchResults, searchResults]);

  // Calculate notifications dropdown position
  const [notificationsDropdownStyle, setNotificationsDropdownStyle] = useState<React.CSSProperties>({});
  useEffect(() => {
    if (notificationsOpen && notificationsButtonRef.current) {
      const rect = notificationsButtonRef.current.getBoundingClientRect();
      const dropdownWidth = 384; // w-96 = 384px
      const rightPosition = window.innerWidth - rect.right;
      
      // Make sure dropdown doesn't go off screen
      const finalRight = Math.max(8, Math.min(rightPosition, window.innerWidth - dropdownWidth - 8));
      
      setNotificationsDropdownStyle({
        top: `${rect.bottom + 8}px`,
        right: `${finalRight}px`,
        width: `${dropdownWidth}px`,
        maxWidth: '90vw'
      });
    }
  }, [notificationsOpen]);

  async function markAsRead(notificationId: string) {
    try {
      await fetch(`/api/notifications/${notificationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_read: true })
      });
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, is_read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      logError(error, 'markNotificationAsRead');
    }
  }

  async function markAllAsRead() {
    if (!currentUserId) return;
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUserId, mark_all_read: true })
      });
      // Mark all as read but keep them visible
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      logError(error, 'markAllAsRead');
    }
  }

  async function handleDeleteNotification(notificationId: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    
    if (!currentUserId) return;
    
    try {
      const { deleteNotification } = await import('@/lib/queries/notifications');
      const { error } = await deleteNotification(notificationId);
      
      if (!error) {
        // Remove from local state
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        // Update unread count
        setUnreadCount(prev => {
          const deletedNotification = notifications.find(n => n.id === notificationId);
          return deletedNotification && !deletedNotification.is_read ? Math.max(0, prev - 1) : prev;
        });
      } else {
        logError(error, 'deleteNotification');
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }

  // Test function to create a notification manually
  async function createTestNotification() {
    if (!currentUserId) {
      alert('לא נמצא משתמש מחובר');
      return;
    }
    
    try {
      const response = await fetch('/api/test-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUserId,
          title: 'קיבלת נקודות! 🎉',
          message: 'קיבלת 5 נקודות עבור: כניסה יומית',
          type: 'like'
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert('התראה נוצרה בהצלחה!');
        // Reload notifications
        const notifResponse = await fetch(`/api/notifications?user_id=${currentUserId}`);
        const notifResult = await notifResponse.json();
        if (notifResult.data) {
          setNotifications(notifResult.data);
          setUnreadCount(notifResult.data.filter((n: any) => !n.is_read).length);
        }
      } else {
        alert(`שגיאה ביצירת התראה: ${result.error}`);
        logError(result, 'createTestNotification');
      }
    } catch (error) {
      logError(error, 'createTestNotification');
      alert('שגיאה ביצירת התראה');
    }
  }

  function formatTimeAgo(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `לפני ${diffMins} דקות`;
    if (diffHours < 24) return `לפני ${diffHours} שעות`;
    if (diffDays < 7) return `לפני ${diffDays} ימים`;
    return date.toLocaleDateString('he-IL');
  }

  const getTotalResults = () => {
    if (!searchResults) return 0;
    return (
      searchResults.recordings.length +
      searchResults.forums.length +
      searchResults.forumPosts.length +
      searchResults.posts.length +
      searchResults.projects.length +
      searchResults.courses.length
    );
  };

  const getLimitedResults = () => {
    if (!searchResults) return null;
    const MAX_RESULTS = 6;
    let totalShown = 0;
    
    const limited: any = {
      recordings: [],
      forums: [],
      forumPosts: [],
      posts: [],
      projects: [],
      courses: []
    };

    // Fill results until we reach MAX_RESULTS total
    const categories = [
      { key: 'recordings', items: searchResults.recordings },
      { key: 'forums', items: searchResults.forums },
      { key: 'forumPosts', items: searchResults.forumPosts },
      { key: 'posts', items: searchResults.posts },
      { key: 'projects', items: searchResults.projects },
      { key: 'courses', items: searchResults.courses }
    ];

    for (const category of categories) {
      if (totalShown >= MAX_RESULTS) break;
      
      const remaining = MAX_RESULTS - totalShown;
      const itemsToShow = category.items.slice(0, remaining);
      limited[category.key] = itemsToShow;
      totalShown += itemsToShow.length;
    }

    // Check if there are more results
    const totalResults = getTotalResults();
    const hasMore = totalResults > MAX_RESULTS;

    return {
      ...limited,
      hasMore
    };
  };

  const hasMoreResults = () => {
    if (!searchResults) return false;
    const limited = getLimitedResults();
    if (!limited) return false;
    return limited.hasMore;
  };

  // Determine active nav based on pathname
  const getActiveNav = () => {
    if (pathname === '/') return 'home';
    if (pathname === '/members') return 'members';
    if (pathname?.startsWith('/forums')) return 'forums';
    if (pathname?.startsWith('/blog')) return 'blog';
    if (pathname?.startsWith('/recordings')) return 'recordings';
    if (pathname === '/projects') return 'projects';
    if (pathname?.startsWith('/courses')) return 'courses';
    if (pathname?.startsWith('/live-log') || pathname?.startsWith('/live/')) return 'live-log';
    if (pathname === '/live-room') return 'live-room';
    if (pathname?.startsWith('/feedback')) return 'feedback';
    if (pathname?.startsWith('/admin')) return 'admin';
    return '';
  };

  // Determine active top menu item
  const getActiveTopMenu = () => {
    if (pathname === '/recordings') return 'recordings';
    if (pathname === '/projects') return 'projects';
    if (pathname === '/courses') return 'courses';
    if (pathname === '/live-log') return 'live-log';
    if (pathname?.startsWith('/forums')) return 'forums';
    return '';
  };

  const activeNav = getActiveNav();
  const activeTopMenu = getActiveTopMenu();


  return (
    <div className={`min-h-screen ${theme === 'light' ? 'bg-gradient-to-br from-slate-50 via-pink-50/30 to-purple-50/20' : 'relative'}`} suppressHydrationWarning>
      {/* Top Header - Minimal (Mobile & Desktop) */}
      <header 
        className={combineStyles(
          'sticky top-0 z-50 border-b shadow-lg backdrop-blur-xl',
          getHeaderStyles(theme),
          theme !== 'light' && 'rounded-t-none rounded-b-2xl'
        )}
        style={{ borderRadius: '0px 0px 20px 20px' }}
        suppressHydrationWarning
      >
        <div className={`px-2 sm:px-4 lg:px-6 xl:px-8 transition-all duration-300 ease-in-out ${
          sidebarOpen 
            ? 'lg:mr-64 mr-0' 
            : 'lg:mr-16 mr-0'
        }`}>
          <div className="flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-4">
            {/* Mobile Hamburger Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={combineStyles(
                'lg:hidden p-2 transition-colors',
                theme === 'light' 
                  ? 'text-gray-700 hover:text-pink-500' 
                  : 'text-white hover:text-hot-pink'
              )}
              aria-label="תפריט"
            >
              <AlignJustify className="w-6 h-6" />
            </button>

            {/* Club Name - Right side (RTL) */}
            <div className="hidden sm:flex items-center">
              <h1 className={combineStyles(
                'text-lg sm:text-xl font-bold whitespace-nowrap',
                getTextStyles(theme, 'heading')
              )}>
                מועדון האוטומטורים
              </h1>
            </div>

            {/* Search Bar - Mobile: Icon only, Desktop: Full search */}
            <div className="flex-1 max-w-md" ref={searchRef}>
              {/* Mobile: Search Icon Button */}
              <button
                onClick={() => setMobileSearchOpen(true)}
                className={combineStyles(
                  'lg:hidden p-2.5 cursor-pointer transition-all rounded-full hover:bg-hot-pink/20',
                  theme === 'light' 
                    ? 'hover:text-pink-500' 
                    : 'text-white hover:text-hot-pink'
                )}
                style={theme === 'light' ? { color: 'var(--color-gray-900)' } : undefined}
                aria-label="חיפוש"
              >
                <Search className="w-6 h-6" />
              </button>
              
              {/* Desktop: Full Search Bar */}
              <div className="hidden lg:block relative w-full">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-foreground-muted w-4 h-4 sm:w-5 sm:h-5 z-10" />
                <input
                  type="text"
                  dir="rtl"
                  placeholder="חפש במועדון..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)}
                  className="modern-input w-full pr-9 sm:pr-10 pl-3 sm:pl-4 py-1.5 sm:py-2.5 rounded-full focus:outline-none focus:ring-2 focus:ring-hot-pink/30 focus:border-hot-pink/50 shadow-md text-sm text-right"
                />
                
                {/* Search Results Dropdown - Desktop Only */}
                {showSearchResults && searchResults && (
                  <>
                    {/* Desktop: Dropdown */}
                    <div className="hidden lg:block fixed glass-card rounded-2xl shadow-2xl z-[60] max-h-[600px] overflow-y-auto" style={searchDropdownStyle}>
                      {getTotalResults() === 0 ? (
                        <div className="p-6 text-center text-foreground-muted">
                          <p className="text-sm">לא נמצאו תוצאות</p>
                        </div>
                      ) : (
                        <div className="p-3">
                          {(() => {
                            const limited = getLimitedResults();
                            if (!limited) return null;
                            return (
                              <>
                                {/* Recordings */}
                                {limited.recordings.length > 0 && (
                                  <div className="mb-5">
                                    <div className="flex items-center gap-2 mb-2 px-2">
                                      <Video className="w-4 h-4 text-[#F52F8E]" />
                                      <h3 className="text-sm font-bold text-white">הקלטות ({searchResults.recordings.length})</h3>
                                    </div>
                                    <div className="space-y-1">
                                      {limited.recordings.map((recording: any) => (
                                  <Link
                                    key={recording.id}
                                    href={`/recordings/${recording.id}`}
                                    onClick={() => {
                                      setShowSearchResults(false);
                                      setSearchQuery('');
                                    }}
                                    className="block px-3 py-2 rounded-xl hover:bg-hot-pink/20 transition-colors"
                                  >
                                    <p className="text-sm font-semibold text-white break-words">{recording.title}</p>
                                    {recording.description && (
                                      <p className="text-xs text-foreground-light line-clamp-1 mt-1 break-words">{recording.description}</p>
                                    )}
                                  </Link>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Forums */}
                                {limited.forums.length > 0 && (
                                  <div className="mb-5">
                                    <div className="flex items-center gap-2 mb-2 px-2">
                                      <MessageSquare className="w-4 h-4 text-[#F52F8E]" />
                                      <h3 className="text-sm font-bold text-white">פורומים ({searchResults.forums.length})</h3>
                                    </div>
                                    <div className="space-y-1">
                                      {limited.forums.map((forum: any) => (
                                  <Link
                                    key={forum.id}
                                    href={`/forums/${forum.id}`}
                                    onClick={() => {
                                      setShowSearchResults(false);
                                      setSearchQuery('');
                                    }}
                                    className="block px-3 py-2 rounded-xl hover:bg-hot-pink/20 transition-colors"
                                  >
                                    <p className="text-sm font-semibold text-white break-words">{forum.display_name || forum.name}</p>
                                    {forum.description && (
                                      <p className="text-xs text-foreground-light line-clamp-1 mt-1 break-words">{forum.description}</p>
                                    )}
                                  </Link>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Forum Posts */}
                                {limited.forumPosts.length > 0 && (
                                  <div className="mb-5">
                                    <div className="flex items-center gap-2 mb-2 px-2">
                                      <MessageSquare className="w-4 h-4 text-blue-600" />
                                      <h3 className="text-sm font-bold text-white">פוסטים בפורומים ({searchResults.forumPosts.length})</h3>
                                    </div>
                                    <div className="space-y-1">
                                      {limited.forumPosts.map((post: any) => (
                                  <Link
                                    key={post.id}
                                    href={`/forums/${post.forum_id}/posts/${post.id}`}
                                    onClick={() => {
                                      setShowSearchResults(false);
                                      setSearchQuery('');
                                    }}
                                    className="block px-3 py-2 rounded-xl hover:bg-hot-pink/20 transition-colors"
                                  >
                                    <p className="text-sm font-semibold text-white break-words">{post.title}</p>
                                    {post.forums && (
                                      <p className="text-xs text-foreground-light mt-1 break-words">בפורום: {post.forums.display_name}</p>
                                    )}
                                  </Link>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Posts (Announcements) */}
                                {limited.posts.length > 0 && (
                                  <div className="mb-5">
                                    <div className="flex items-center gap-2 mb-2 px-2">
                                      <FileText className="w-4 h-4 text-purple-600" />
                                      <h3 className="text-sm font-bold text-white">הכרזות ({searchResults.posts.length})</h3>
                                    </div>
                                    <div className="space-y-1">
                                      {limited.posts.map((post: any) => (
                                  <div
                                    key={post.id}
                                    className="block px-3 py-2 rounded-xl hover:bg-hot-pink/20 transition-colors"
                                  >
                                    <p className="text-sm text-white line-clamp-2 break-words">{post.content}</p>
                                    {post.profiles && (
                                      <p className="text-xs text-foreground-light mt-1 break-words">מאת: {post.profiles.display_name}</p>
                                    )}
                                  </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Projects */}
                                {limited.projects.length > 0 && (
                                  <div className="mb-5">
                                    <div className="flex items-center gap-2 mb-2 px-2">
                                      <Briefcase className="w-4 h-4 text-green-600" />
                                      <h3 className="text-sm font-bold text-white">פרויקטים ({searchResults.projects.length})</h3>
                                    </div>
                                    <div className="space-y-1">
                                      {limited.projects.map((project: any) => (
                                  <Link
                                    key={project.id}
                                    href={`/projects#${project.id}`}
                                    onClick={() => {
                                      setShowSearchResults(false);
                                      setSearchQuery('');
                                    }}
                                    className="block px-3 py-2 rounded-xl hover:bg-hot-pink/20 transition-colors"
                                  >
                                    <p className="text-sm font-semibold text-white break-words">{project.title}</p>
                                    {project.description && (
                                      <p className="text-xs text-foreground-light line-clamp-1 mt-1 break-words">{project.description}</p>
                                    )}
                                  </Link>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Courses */}
                                {limited.courses.length > 0 && (
                                  <div className="mb-5">
                                    <div className="flex items-center gap-2 mb-2 px-2">
                                      <BookOpen className="w-4 h-4 text-orange-600" />
                                      <h3 className="text-sm font-bold text-white">קורסים ({searchResults.courses.length})</h3>
                                    </div>
                                    <div className="space-y-1">
                                      {limited.courses.map((course: any) => (
                                  <Link
                                    key={course.id}
                                    href={`/courses#${course.id}`}
                                    onClick={() => {
                                      setShowSearchResults(false);
                                      setSearchQuery('');
                                    }}
                                    className="block px-3 py-2 rounded-xl hover:bg-hot-pink/20 transition-colors"
                                  >
                                    <p className="text-sm font-semibold text-white break-words">{course.title}</p>
                                    {course.description && (
                                      <p className="text-xs text-foreground-light line-clamp-1 mt-1 break-words">{course.description}</p>
                                    )}
                                  </Link>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* View All Results Link */}
                                {hasMoreResults() && (
                                  <div className="pt-3 border-t border-hot-pink/20 mt-3">
                                    <Link
                                      href={`/search?q=${encodeURIComponent(searchQuery)}`}
                                      onClick={() => {
                                        setShowSearchResults(false);
                                      }}
                                      className="block text-center px-4 py-2 text-sm font-semibold text-hot-pink hover:bg-hot-pink/20 rounded-full transition-colors"
                                    >
                                      לכל התוצאות →
                                    </Link>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Loading indicator */}
                {isSearching && (
                  <>
                    {/* Mobile: Full-screen */}
                    <div className="fixed inset-0 top-16 bg-white z-50 flex items-center justify-center lg:hidden">
                      <p className="text-sm text-gray-500">מחפש...</p>
                    </div>
                    {/* Desktop: Dropdown */}
                    <div className="hidden lg:block absolute top-full mt-2 left-0 right-0 bg-white rounded-xl shadow-2xl border border-gray-300 z-50 p-6 text-center">
                      <p className="text-sm text-gray-500">מחפש...</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Mobile Search Modal */}
            {mobileSearchOpen && (
              <div className="fixed inset-0 glass-card z-[100] flex flex-col lg:hidden overflow-hidden h-screen mobile-search-modal">
                {/* Header */}
                <div className="flex-shrink-0 glass-card sticky border-b border-hot-pink/30 px-4 py-3 flex items-center justify-between z-10 mobile-search-header">
                  <h2 className={combineStyles(
                    'text-lg font-bold',
                    theme === 'light' ? 'text-gray-800' : 'text-white'
                  )}>חיפוש</h2>
                  <button
                    onClick={() => {
                      setMobileSearchOpen(false);
                      setSearchQuery('');
                      setShowSearchResults(false);
                    }}
                    className={combineStyles(
                      'p-2 rounded-full transition-colors',
                      theme === 'light' 
                        ? 'text-gray-600 hover:text-gray-800 hover:bg-pink-100' 
                        : 'text-foreground-muted hover:text-white hover:bg-hot-pink/20'
                    )}
                    aria-label="סגור"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Search Input */}
                <div className={combineStyles(
                  'flex-shrink-0 px-4 py-3 border-b',
                  theme === 'light' ? 'border-gray-200' : 'border-hot-pink/20'
                )}>
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-foreground-muted w-5 h-5 z-10" />
                    <input
                      ref={mobileSearchInputRef}
                      type="text"
                      dir="rtl"
                      placeholder="חפש במועדון..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="modern-input w-full pr-10 pl-4 py-3 rounded-full focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500/50 shadow-md text-base text-right"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Search Results */}
                <div className="flex-1 overflow-y-auto min-h-0">
                  {isSearching && !searchResults ? (
                    <div className="flex items-center justify-center py-12">
                      <p className="text-sm text-gray-500">מחפש...</p>
                    </div>
                  ) : searchResults ? (
                    <div className="p-4">
                      {getTotalResults() === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                          <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                          <p className="text-base">לא נמצאו תוצאות</p>
                          <p className="text-sm mt-2 text-gray-400">נסה מונחי חיפוש אחרים</p>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {(() => {
                            const limited = getLimitedResults();
                            if (!limited) return null;
                            return (
                              <>
                                {/* Recordings */}
                                {limited.recordings.length > 0 && (
                                  <div className="mb-6">
                                    <div className="flex items-center gap-2 mb-3">
                                      <Video className="w-5 h-5 text-[#F52F8E]" />
                                      <h3 className="text-base font-bold text-white">הקלטות ({searchResults.recordings.length})</h3>
                                    </div>
                                    <div className="space-y-2.5">
                                      {limited.recordings.map((recording: any) => (
                                        <Link
                                          key={recording.id}
                                          href={`/recordings/${recording.id}`}
                                          onClick={() => {
                                            setMobileSearchOpen(false);
                                            setShowSearchResults(false);
                                            setSearchQuery('');
                                          }}
                                          className="block px-4 py-3 rounded-xl hover:bg-hot-pink/20 transition-colors border border-hot-pink/30 glass-card active:bg-hot-pink/30"
                                        >
                                          <p className="text-sm font-semibold text-white break-words leading-relaxed">{recording.title}</p>
                                          {recording.description && (
                                            <p className="text-xs text-foreground-light line-clamp-2 mt-1.5 break-words leading-relaxed">{recording.description}</p>
                                          )}
                                        </Link>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Forums */}
                                {limited.forums.length > 0 && (
                                  <div className="mb-6">
                                    <div className="flex items-center gap-2 mb-3">
                                      <MessageSquare className="w-5 h-5 text-[#F52F8E]" />
                                      <h3 className="text-base font-bold text-white">פורומים ({searchResults.forums.length})</h3>
                                    </div>
                                    <div className="space-y-2.5">
                                      {limited.forums.map((forum: any) => (
                                        <Link
                                          key={forum.id}
                                          href={`/forums/${forum.id}`}
                                          onClick={() => {
                                            setMobileSearchOpen(false);
                                            setShowSearchResults(false);
                                            setSearchQuery('');
                                          }}
                                          className="block px-4 py-3 rounded-xl hover:bg-hot-pink/20 transition-colors border border-hot-pink/30 glass-card active:bg-hot-pink/30"
                                        >
                                          <p className="text-sm font-semibold text-white break-words leading-relaxed">{forum.display_name || forum.name}</p>
                                          {forum.description && (
                                            <p className="text-xs text-foreground-light line-clamp-2 mt-1.5 break-words leading-relaxed">{forum.description}</p>
                                          )}
                                        </Link>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Forum Posts */}
                                {limited.forumPosts.length > 0 && (
                                  <div className="mb-6">
                                    <div className="flex items-center gap-2 mb-3">
                                      <MessageSquare className="w-5 h-5 text-blue-600" />
                                      <h3 className="text-base font-bold text-white">פוסטים בפורומים ({searchResults.forumPosts.length})</h3>
                                    </div>
                                    <div className="space-y-2.5">
                                      {limited.forumPosts.map((post: any) => (
                                        <Link
                                          key={post.id}
                                          href={`/forums/${post.forum_id}/posts/${post.id}`}
                                          onClick={() => {
                                            setMobileSearchOpen(false);
                                            setShowSearchResults(false);
                                            setSearchQuery('');
                                          }}
                                          className="block px-4 py-3 rounded-xl hover:bg-hot-pink/20 transition-colors border border-hot-pink/30 glass-card active:bg-hot-pink/30"
                                        >
                                          <p className="text-sm font-semibold text-white break-words leading-relaxed">{post.title}</p>
                                          {post.forums && (
                                            <p className="text-xs text-foreground-light mt-1.5 break-words leading-relaxed">בפורום: {post.forums.display_name}</p>
                                          )}
                                        </Link>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Posts (Announcements) */}
                                {limited.posts.length > 0 && (
                                  <div className="mb-6">
                                    <div className="flex items-center gap-2 mb-3">
                                      <FileText className="w-5 h-5 text-purple-600" />
                                      <h3 className="text-base font-bold text-white">הכרזות ({searchResults.posts.length})</h3>
                                    </div>
                                    <div className="space-y-2.5">
                                      {limited.posts.map((post: any) => (
                                        <div
                                          key={post.id}
                                          className="block px-4 py-3 rounded-xl border border-hot-pink/30 glass-card"
                                        >
                                          <p className="text-sm text-white line-clamp-3 break-words leading-relaxed">{post.content}</p>
                                          {post.profiles && (
                                            <p className="text-xs text-foreground-light mt-1.5 break-words leading-relaxed">מאת: {post.profiles.display_name}</p>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Projects */}
                                {limited.projects.length > 0 && (
                                  <div className="mb-6">
                                    <div className="flex items-center gap-2 mb-3">
                                      <Briefcase className="w-5 h-5 text-green-600" />
                                      <h3 className="text-base font-bold text-white">פרויקטים ({searchResults.projects.length})</h3>
                                    </div>
                                    <div className="space-y-2.5">
                                      {limited.projects.map((project: any) => (
                                        <Link
                                          key={project.id}
                                          href={`/projects#${project.id}`}
                                          onClick={() => {
                                            setMobileSearchOpen(false);
                                            setShowSearchResults(false);
                                            setSearchQuery('');
                                          }}
                                          className="block px-4 py-3 rounded-xl hover:bg-hot-pink/20 transition-colors border border-hot-pink/30 glass-card active:bg-hot-pink/30"
                                        >
                                          <p className="text-sm font-semibold text-white break-words leading-relaxed">{project.title}</p>
                                          {project.description && (
                                            <p className="text-xs text-foreground-light line-clamp-2 mt-1.5 break-words leading-relaxed">{project.description}</p>
                                          )}
                                        </Link>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Courses */}
                                {limited.courses.length > 0 && (
                                  <div className="mb-6">
                                    <div className="flex items-center gap-2 mb-3">
                                      <BookOpen className="w-5 h-5 text-orange-600" />
                                      <h3 className="text-base font-bold text-gray-800">קורסים ({searchResults.courses.length})</h3>
                                    </div>
                                    <div className="space-y-2.5">
                                      {limited.courses.map((course: any) => (
                                        <Link
                                          key={course.id}
                                          href={`/courses#${course.id}`}
                                          onClick={() => {
                                            setMobileSearchOpen(false);
                                            setShowSearchResults(false);
                                            setSearchQuery('');
                                          }}
                                          className="block px-4 py-3 rounded-xl hover:bg-pink-50 transition-colors border border-gray-300 bg-white shadow-sm active:bg-pink-100"
                                        >
                                          <p className="text-sm font-semibold text-gray-900 break-words leading-relaxed">{course.title}</p>
                                          {course.description && (
                                            <p className="text-xs text-gray-600 line-clamp-2 mt-1.5 break-words leading-relaxed">{course.description}</p>
                                          )}
                                        </Link>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* View All Results Link */}
                                {hasMoreResults() && (
                                  <div className="pt-4 border-t-2 border-hot-pink/30 mt-4">
                                    <Link
                                      href={`/search?q=${encodeURIComponent(searchQuery)}`}
                                      onClick={() => {
                                        setMobileSearchOpen(false);
                                        setShowSearchResults(false);
                                      }}
                                      className="block text-center px-6 py-3.5 text-base font-bold text-hot-pink hover:bg-hot-pink/20 rounded-full transition-colors border-2 border-hot-pink active:bg-hot-pink/30"
                                    >
                                      לכל התוצאות →
                                    </Link>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-foreground-muted">
                      <Search className="w-12 h-12 mx-auto mb-3 text-foreground-muted" />
                      <p className="text-base">התחל לחפש</p>
                      <p className="text-sm mt-2 text-foreground-muted">הקלד לפחות 2 תווים כדי להתחיל לחפש</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Left Side - User Actions (RTL) */}
            <div className="flex items-center gap-3">
              {/* Notifications */}
              <div className="relative" ref={notificationsRef}>
                <button 
                  ref={notificationsButtonRef}
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className={combineStyles(
                    'relative p-2.5 cursor-pointer transition-all rounded-full group',
                    theme === 'light'
                      ? 'text-gray-600 hover:text-pink-500 hover:bg-pink-50/50'
                      : 'text-white hover:text-hot-pink hover:bg-hot-pink/20'
                  )}
                >
                  <Bell className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  {unreadCount > 0 && (
                    <span 
                      className={`absolute top-1 left-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold animate-pulse-glow ${
                        theme === 'light'
                          ? 'bg-[#F52F8E]'
                          : 'bg-gradient-to-r from-pink-500 to-rose-500'
                      }`}
                      style={{ color: 'white' }}
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications - Mobile: Full Screen, Desktop: Dropdown */}
                {notificationsOpen && (
                  <>
                    {/* Mobile: Full Screen Overlay */}
                    <div className="fixed inset-0 top-16 bg-black/50 z-[60] lg:hidden" onClick={() => setNotificationsOpen(false)}></div>
                    
                    {/* Mobile: Full Screen Modal */}
                    <div className={combineStyles(
                      'fixed inset-0 top-16 z-[61] flex flex-col lg:hidden',
                      getNotificationStyles(theme)
                    )}>
                      {/* Header */}
                      <div className={combineStyles(
                        'p-4 border-b flex items-center justify-between',
                        theme === 'light' ? 'border-gray-300 bg-white' : 'border-hot-pink/30 glass-card'
                      )}>
                        <h3 className={combineStyles(
                          'text-xl font-bold',
                          getTextStyles(theme, 'heading')
                        )}>התראות</h3>
                        <div className="flex items-center gap-3">
                          {unreadCount > 0 && (
                            <button
                              onClick={markAllAsRead}
                              className={`text-sm hover:underline ${
                                theme === 'light' ? 'text-[#F52F8E]' : 'text-hot-pink'
                              }`}
                            >
                              קראתי הכל
                            </button>
                          )}
                          <button
                            onClick={() => setNotificationsOpen(false)}
                            className={`p-2 rounded transition-colors ${
                              theme === 'light'
                                ? 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                                : 'text-foreground-muted hover:text-white'
                            }`}
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {/* Notifications List */}
                      <div className="flex-1 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className={`p-6 text-center mt-20 ${
                            theme === 'light' ? 'text-gray-600' : 'text-foreground-muted'
                          }`}>
                            <Bell className={`w-16 h-16 mx-auto mb-4 ${
                              theme === 'light' ? 'text-gray-300' : 'text-foreground-muted'
                            }`} />
                            <p className={`text-lg ${
                              theme === 'light' ? 'text-gray-600' : ''
                            }`}>אין התראות חדשות</p>
                          </div>
                        ) : unreadCount === 0 && notifications.length > 0 && notifications.every(n => n.is_read) ? (
                          <div className={`p-6 text-center ${
                            theme === 'light' ? 'text-gray-600' : 'text-foreground-muted'
                          }`}>
                            <Bell className={`w-12 h-12 mx-auto mb-2 ${
                              theme === 'light' ? 'text-gray-300' : 'text-foreground-muted'
                            }`} />
                            <p className={theme === 'light' ? 'text-gray-600' : ''}>אין התראות חדשות</p>
                            <p className={`text-xs mt-1 ${
                              theme === 'light' ? 'text-gray-500' : 'text-foreground-muted'
                            }`}>כל ההתראות נקראו</p>
                          </div>
                        ) : (
                          <div className={`divide-y ${
                            theme === 'light' ? 'divide-gray-200' : 'divide-hot-pink/20'
                          }`}>
                            {notifications.map((notification) => {
                              const isPointsNotification = notification.title?.includes('נקודות') || notification.message?.includes('נקודות');
                              const NotificationContent = (
                                <div className={`flex items-start gap-4 ${
                                  !isPointsNotification ? 'cursor-pointer' : ''
                                }`}>
                                  <div className={`flex-shrink-0 w-3 h-3 rounded-full mt-2 ${
                                    !notification.is_read 
                                      ? theme === 'light' ? 'bg-[#F52F8E]' : 'bg-hot-pink'
                                      : theme === 'light' ? 'bg-gray-400' : 'bg-foreground-muted'
                                  }`}></div>
                                  <div className="flex-1 min-w-0">
                                    <p className={combineStyles(
                                      'text-base font-semibold mb-2',
                                      getTextStyles(theme, 'heading')
                                    )}>
                                      {notification.title}
                                    </p>
                                    <p className={`text-sm mb-2 ${
                                      theme === 'light' ? 'text-gray-600' : 'text-foreground-light'
                                    }`}>
                                      {notification.message}
                                    </p>
                                    <p className={combineStyles(
                                      'text-xs',
                                      getTextStyles(theme, 'muted')
                                    )}>
                                      {formatTimeAgo(notification.created_at)}
                                    </p>
                                  </div>
                                  <button
                                    onClick={(e) => handleDeleteNotification(notification.id, e)}
                                    className={`flex-shrink-0 p-1 rounded transition-colors ${
                                      theme === 'light'
                                        ? 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                                        : 'text-foreground-muted hover:text-red-400 hover:bg-red-500/20'
                                    }`}
                                    title="מחק התראה"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              );

                              if (isPointsNotification) {
                                return (
                                  <div
                                    key={notification.id}
                                    className={`block p-5 ${
                                      !notification.is_read 
                                        ? theme === 'light' ? 'bg-pink-50' : 'bg-pink-50/50'
                                        : ''
                                    }`}
                                  >
                                    {NotificationContent}
                                  </div>
                                );
                              }

                              return (
                                <Link
                                  key={notification.id}
                                  href={notification.link || '#'}
                                  onClick={() => {
                                    if (!notification.is_read) {
                                      markAsRead(notification.id);
                                    }
                                    setNotificationsOpen(false);
                                  }}
                                  className={`block p-5 transition-colors ${
                                    !notification.is_read 
                                      ? theme === 'light' ? 'bg-pink-50' : 'bg-pink-50/50'
                                      : ''
                                  } ${
                                    theme === 'light' ? 'hover:bg-gray-50' : 'hover:bg-gray-50'
                                  }`}
                                >
                                  {NotificationContent}
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Desktop: Dropdown */}
                    <div 
                      ref={notificationsMenuRef}
                      className={combineStyles(
                        'hidden lg:block fixed w-96 rounded-2xl shadow-2xl z-[60] max-h-[600px] overflow-hidden flex flex-col',
                        getNotificationStyles(theme)
                      )}
                      style={notificationsDropdownStyle}
                    >
                      {/* Header */}
                      <div className={`p-4 border-b flex items-center justify-between ${
                        theme === 'light'
                          ? 'border-gray-300'
                          : 'border-hot-pink/30'
                      }`}>
                        <h3 className={combineStyles(
                          'text-lg font-bold',
                          getTextStyles(theme, 'heading')
                        )}>התראות</h3>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllAsRead}
                            className={`text-sm hover:underline ${
                              theme === 'light' ? 'text-[#F52F8E]' : 'text-hot-pink'
                            }`}
                          >
                            קראתי הכל
                          </button>
                        )}
                      </div>

                      {/* Notifications List */}
                      <div className="flex-1 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className={`p-6 text-center ${
                            theme === 'light' ? 'text-gray-600' : 'text-foreground-muted'
                          }`}>
                            <Bell className={`w-12 h-12 mx-auto mb-2 ${
                              theme === 'light' ? 'text-gray-300' : 'text-foreground-muted'
                            }`} />
                            <p className={theme === 'light' ? 'text-gray-600' : ''}>אין התראות חדשות</p>
                          </div>
                        ) : unreadCount === 0 && notifications.length > 0 && notifications.every(n => n.is_read) ? (
                          <div className={`p-6 text-center ${
                            theme === 'light' ? 'text-gray-600' : 'text-foreground-muted'
                          }`}>
                            <Bell className={`w-12 h-12 mx-auto mb-2 ${
                              theme === 'light' ? 'text-gray-300' : 'text-foreground-muted'
                            }`} />
                            <p className={theme === 'light' ? 'text-gray-600' : ''}>אין התראות חדשות</p>
                            <p className={`text-xs mt-1 ${
                              theme === 'light' ? 'text-gray-500' : 'text-foreground-muted'
                            }`}>כל ההתראות נקראו</p>
                          </div>
                        ) : (
                          <div className={`divide-y ${
                            theme === 'light' ? 'divide-gray-200' : 'divide-hot-pink/20'
                          }`}>
                            {notifications.map((notification) => {
                              const isPointsNotification = notification.title?.includes('נקודות') || notification.message?.includes('נקודות');
                              const NotificationContent = (
                                <div className={`flex items-start gap-3 ${
                                  !isPointsNotification ? 'cursor-pointer' : ''
                                }`}>
                                  <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                                    !notification.is_read 
                                      ? theme === 'light' ? 'bg-[#F52F8E]' : 'bg-hot-pink'
                                      : theme === 'light' ? 'bg-gray-400' : 'bg-foreground-muted'
                                  }`}></div>
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-semibold mb-1 ${
                                      theme === 'light' ? 'text-gray-800' : 'text-white'
                                    }`}>
                                      {notification.title}
                                    </p>
                                    <p className={`text-sm mb-2 ${
                                      theme === 'light' ? 'text-gray-600' : 'text-foreground-light'
                                    }`}>
                                      {notification.message}
                                    </p>
                                    <p className={combineStyles(
                                      'text-xs',
                                      getTextStyles(theme, 'muted')
                                    )}>
                                      {formatTimeAgo(notification.created_at)}
                                    </p>
                                  </div>
                                  <button
                                    onClick={(e) => handleDeleteNotification(notification.id, e)}
                                    className={`flex-shrink-0 p-1 rounded transition-colors ${
                                      theme === 'light'
                                        ? 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                                        : 'text-foreground-muted hover:text-red-400 hover:bg-red-500/20'
                                    }`}
                                    title="מחק התראה"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              );

                              if (isPointsNotification) {
                                return (
                                  <div
                                    key={notification.id}
                                    className={`block p-4 ${
                                      !notification.is_read 
                                        ? theme === 'light' ? 'bg-pink-50' : 'bg-hot-pink/20'
                                        : ''
                                    }`}
                                  >
                                    {NotificationContent}
                                  </div>
                                );
                              }

                              return (
                                <Link
                                  key={notification.id}
                                  href={notification.link || '#'}
                                  onClick={() => {
                                    if (!notification.is_read) {
                                      markAsRead(notification.id);
                                    }
                                    setNotificationsOpen(false);
                                  }}
                                  className={`block p-4 transition-colors ${
                                    !notification.is_read 
                                      ? theme === 'light' ? 'bg-pink-50' : 'bg-hot-pink/20'
                                      : ''
                                  } ${
                                    theme === 'light' ? 'hover:bg-gray-50' : 'hover:bg-hot-pink/20'
                                  }`}
                                >
                                  {NotificationContent}
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Private Messages */}
              <Link href="/messages" className={`relative p-2.5 cursor-pointer transition-all rounded-lg group ${
                theme === 'light'
                  ? 'text-gray-600 hover:text-pink-500 hover:bg-pink-50/50'
                  : 'text-white hover:text-hot-pink hover:bg-hot-pink/20'
              }`}>
                <MessageCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
                {unreadMessagesCount > 0 && (
                  <span className={`absolute top-1 left-1 w-2.5 h-2.5 rounded-full animate-pulse-glow ${
                    theme === 'light'
                      ? 'bg-[#F52F8E]'
                      : 'bg-gradient-to-r from-hot-pink to-rose-500'
                  }`}></span>
                )}
              </Link>

              {/* Profile Menu or Login Button */}
              {currentUser ? (
                <div className="relative">
                  <button
                    ref={profileButtonRef}
                    onClick={toggleProfileMenu}
                    className="flex items-center gap-2 cursor-pointer hover:opacity-80"
                  >
                    <div 
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold shadow-lg ring-2 ring-white/50 ${
                        theme === 'light'
                          ? 'bg-[#F52F8E] shadow-pink-500/30'
                          : 'bg-gradient-to-br from-pink-500 via-rose-400 to-amber-300 shadow-pink-500/30'
                      }`}
                    >
                      {avatarUrl ? (
                        <img 
                          src={`${avatarUrl}?t=${Date.now()}`}
                          alt="Profile" 
                          className="w-full h-full rounded-full object-cover"
                          key={`layout-avatar-${avatarUrl}`}
                        />
                      ) : (
                        <span>{currentUser?.display_name?.charAt(0) || currentUser?.first_name?.charAt(0) || 'א'}</span>
                      )}
                    </div>
                    <span className={`text-sm font-medium ${
                      theme === 'light' ? 'text-gray-800' : 'text-white'
                    }`}>{currentUser?.display_name || currentUser?.first_name || 'משתמש'}</span>
                    <span className={`text-sm ${
                      theme === 'light' ? 'text-gray-600' : 'text-foreground-muted'
                    }`}>{currentUser?.points || 0}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${profileMenuOpen ? 'rotate-180' : ''} ${
                      theme === 'light' ? 'text-gray-600' : 'text-foreground-muted'
                    }`} />
                  </button>

                  {/* Profile Dropdown Menu */}
                  {profileMenuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-[100]" 
                      onClick={closeProfileMenu}
                    />
                      <div 
                      ref={profileMenuRef}
                      className={combineStyles(
                        'fixed rounded-2xl shadow-2xl z-[102] overflow-hidden animate-fade-in',
                        getModalStyles(theme)
                      )}
                      style={profileMenuStyle}
                    >
                      {/* User Info Header */}
                      <div className={`p-4 border-b ${
                        theme === 'light'
                          ? 'border-white/20 bg-gradient-to-r from-pink-50/50 to-rose-50/50'
                          : 'border-hot-pink/30 bg-gradient-to-r from-hot-pink/20 to-rose-500/20'
                      }`}>
                        <div className="flex items-center gap-4">
                          <div 
                            className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-semibold text-xl flex-shrink-0 shadow-lg ring-2 ring-white/50 ${
                              theme === 'light'
                                ? 'bg-gradient-to-br from-pink-500 via-rose-400 to-amber-300 shadow-pink-500/30'
                                : 'bg-gradient-to-br from-hot-pink via-rose-400 to-amber-300 shadow-hot-pink/30'
                            }`}
                          >
                            {avatarUrl ? (
                              <img 
                                src={avatarUrl} 
                                alt="Profile" 
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <span>{currentUser?.display_name?.charAt(0) || currentUser?.first_name?.charAt(0) || 'א'}</span>
                            )}
                          </div>
                          <div className="flex-1">
                            <h3 className={combineStyles(
                              'font-bold',
                              getTextStyles(theme, 'heading')
                            )}>{currentUser?.display_name || currentUser?.first_name || 'משתמש'}</h3>
                            <p className={`text-sm font-medium ${
                              theme === 'light' ? 'gradient-text' : 'gradient-text'
                            }`}>{currentUser?.email?.split('@')[0] || 'zeremitay'}@</p>
                          </div>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="py-2">
                        <Link
                          href="/profile"
                          className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-all rounded-lg group ${
                            theme === 'light'
                              ? 'text-gray-700 hover:bg-gradient-to-r hover:from-pink-50 hover:to-rose-50 hover:text-pink-600'
                              : 'text-white hover:bg-gradient-to-r hover:from-hot-pink/20 hover:to-rose-500/20 hover:text-hot-pink'
                          }`}
                          onClick={closeProfileMenu}
                        >
                          <User className={`w-5 h-5 group-hover:scale-110 transition-transform ${
                            theme === 'light' ? 'text-pink-500' : 'text-hot-pink'
                          }`} />
                          <span className="font-medium">פרופיל</span>
                        </Link>
                        <Link
                          href="/account"
                          className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-all rounded-lg group ${
                            theme === 'light'
                              ? 'text-gray-700 hover:bg-gradient-to-r hover:from-pink-50 hover:to-rose-50 hover:text-pink-600'
                              : 'text-white hover:bg-gradient-to-r hover:from-hot-pink/20 hover:to-rose-500/20 hover:text-hot-pink'
                          }`}
                          onClick={closeProfileMenu}
                        >
                          <UserCircle className={`w-5 h-5 group-hover:scale-110 transition-transform ${
                            theme === 'light' ? 'text-pink-500' : 'text-hot-pink'
                          }`} />
                          <span className="font-medium">חשבון</span>
                        </Link>
                        <Link
                          href="/timeline"
                          className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-all rounded-lg group ${
                            theme === 'light'
                              ? 'text-gray-700 hover:bg-gradient-to-r hover:from-pink-50 hover:to-rose-50 hover:text-pink-600'
                              : 'text-white hover:bg-gradient-to-r hover:from-hot-pink/20 hover:to-rose-500/20 hover:text-hot-pink'
                          }`}
                          onClick={closeProfileMenu}
                        >
                          <Activity className={`w-5 h-5 group-hover:scale-110 transition-transform ${
                            theme === 'light' ? 'text-pink-500' : 'text-hot-pink'
                          }`} />
                          <span className="font-medium">ציר זמן</span>
                        </Link>
                        <Link
                          href="/messages"
                          className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-all rounded-lg group ${
                            theme === 'light'
                              ? 'text-gray-700 hover:bg-gradient-to-r hover:from-pink-50 hover:to-rose-50 hover:text-pink-600'
                              : 'text-white hover:bg-gradient-to-r hover:from-hot-pink/20 hover:to-rose-500/20 hover:text-hot-pink'
                          }`}
                          onClick={closeProfileMenu}
                        >
                          <MessageSquare className={`w-5 h-5 group-hover:scale-110 transition-transform ${
                            theme === 'light' ? 'text-pink-500' : 'text-hot-pink'
                          }`} />
                          <span className="font-medium">הודעות</span>
                        </Link>
                        <Link
                          href="/subscription"
                          className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-all rounded-lg group ${
                            theme === 'light'
                              ? 'text-gray-700 hover:bg-gradient-to-r hover:from-pink-50 hover:to-rose-50 hover:text-pink-600'
                              : 'text-white hover:bg-gradient-to-r hover:from-hot-pink/20 hover:to-rose-500/20 hover:text-hot-pink'
                          }`}
                          onClick={closeProfileMenu}
                        >
                          <CreditCard className={`w-5 h-5 group-hover:scale-110 transition-transform ${
                            theme === 'light' ? 'text-pink-500' : 'text-hot-pink'
                          }`} />
                          <span className="font-medium">מנוי</span>
                        </Link>
                      </div>

                      {/* Divider */}
                      <div className={`border-t ${
                        theme === 'light' ? 'border-gray-300' : 'border-hot-pink/30'
                      }`}></div>

                      {/* Logout */}
                      <button
                        className={`flex items-center gap-3 px-4 py-2.5 text-sm w-full text-right transition-all rounded-lg group cursor-pointer ${
                          theme === 'light'
                            ? 'text-gray-700 hover:bg-gradient-to-r hover:from-pink-50 hover:to-rose-50 hover:text-pink-600'
                            : 'text-white hover:bg-gradient-to-r hover:from-hot-pink/20 hover:to-rose-500/20 hover:text-hot-pink'
                        }`}
                        onClick={async () => {
                          try {
                            // Update is_online to false before signing out
                            if (currentUserId) {
                              try {
                                await supabase
                                  .from('profiles')
                                  .update({ is_online: false })
                                  .eq('user_id', currentUserId);
                              } catch (error) {
                                logError(error, 'updateIsOnlineOnLogout');
                              }
                            }

                            // Sign out from Supabase Auth
                            const { error } = await supabase.auth.signOut();
                            
                            if (error) {
                              logError(error, 'signOut');
                              alert('שגיאה בהתנתקות: ' + error.message);
                              return;
                            }

                            // Clear localStorage
                            if (typeof window !== 'undefined') {
                              localStorage.removeItem('selectedUserId');
                              localStorage.removeItem('userEmail');
                            }

                            // Clear cache to force reload of data
                            clearCache('profiles:all');

                            // Close menu
                            setProfileMenuOpen(false);
                            
                            // Clear user state
                            setCurrentUser(null);
                            setCurrentUserId(null);
                            setAvatarUrl(null);

                            // Redirect to login page
                            window.location.href = '/auth/login';
                          } catch (err: any) {
                            logError(err, 'handleLogout');
                            alert('שגיאה בהתנתקות');
                          }
                        }}
                      >
                        <ArrowRight className={`w-5 h-5 group-hover:scale-110 transition-transform ${
                          theme === 'light' ? 'text-pink-500' : 'text-hot-pink'
                        }`} />
                        <span className="font-medium">התנתקות</span>
                      </button>
                    </div>
                  </>
                  )}
                </div>
              ) : (
                <Link
                  href="/auth/login"
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    theme === 'light'
                      ? 'bg-[#F52F8E] hover:bg-[#E01E7A]'
                      : 'bg-hot-pink rounded-full hover:bg-hot-pink-dark'
                  }`}
                  style={{ color: 'white' }}
                >
                  <span className="text-sm font-medium" style={{ color: 'white' }}>התחבר</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>


      {/* Left Sidebar - Navigation (Fixed) - Desktop Only */}
      <aside 
        className={combineStyles(
          'hidden lg:block fixed right-0 top-0 h-full z-40 shadow-2xl backdrop-blur-xl transition-all duration-300 ease-in-out rounded-none',
          getSidebarStyles(theme),
          sidebarOpen ? 'w-64' : 'w-16'
        )}
        suppressHydrationWarning
      >
        {/* Toggle Button - Fixed Position on Left Edge */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setSidebarOpen(prev => !prev);
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className={`absolute left-0 top-1/2 -translate-x-1/2 translate-y-[-50%] z-[100] p-3 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-110 active:scale-95 transition-all cursor-pointer border-2 ${
            theme === 'light'
              ? 'bg-[#F52F8E] border-white'
              : 'bg-gradient-to-r from-hot-pink to-rose-500 border-white'
          }`}
          title={sidebarOpen ? 'הסתר תפריט' : 'הצג תפריט'}
          type="button"
          aria-label={sidebarOpen ? 'הסתר תפריט' : 'הצג תפריט'}
        >
          {sidebarOpen ? (
            <ChevronRight className="w-5 h-5 pointer-events-none text-white" />
          ) : (
            <ChevronLeft className="w-5 h-5 pointer-events-none text-white" />
          )}
        </button>

        <div className="h-full flex flex-col" suppressHydrationWarning>
          {/* Header */}
          <div className={`p-3 border-b ${
            theme === 'light' ? 'border-gray-300 bg-white' : 'border-white/20 bg-gradient-to-r from-hot-pink/10 to-rose-500/10'
          } flex items-center ${sidebarOpen ? 'justify-between' : 'justify-center'} relative min-h-[60px]`} suppressHydrationWarning>
            {sidebarOpen && <h2 className={`text-lg font-bold ${
              theme === 'light' ? 'text-gray-800' : 'text-white'
            }`}>תפריט</h2>}
          </div>

          {/* Navigation Items */}
          {sidebarOpen && (
          <div className="flex-1 p-4 space-y-2 overflow-y-auto">
            <Link
              href="/"
              className={combineStyles(
                getSidebarLinkStyles(theme, activeNav === 'home'),
                activeNav === 'home' && 'scale-105'
              )}
              style={activeNav === 'home' ? { color: 'white' } : undefined}
            >
              <HomeIcon 
                className={`w-5 h-5 flex-shrink-0 ${
                  activeNav === 'home' ? '' : theme === 'light' ? 'text-gray-800' : 'text-white'
                }`}
                style={activeNav === 'home' ? { color: 'white' } : undefined}
              />
              <span 
                className={`font-medium ${
                  activeNav === 'home' ? '' : theme === 'light' ? 'text-gray-800' : 'text-white'
                }`}
                style={activeNav === 'home' ? { color: 'white' } : undefined}
              >בית</span>
            </Link>
            <Link
              href="/members"
              className={combineStyles(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
                getSidebarLinkStyles(theme, activeNav === 'members'),
                activeNav === 'members' && 'scale-105'
              )}
            >
              <Users className={`w-5 h-5 flex-shrink-0 ${
                activeNav === 'members' ? 'text-white' : theme === 'light' ? 'text-gray-800' : 'text-white'
              }`} />
              <span className={`font-medium ${
                activeNav === 'members' ? 'text-white' : theme === 'light' ? 'text-gray-800' : 'text-white'
              }`}>חברים</span>
            </Link>
            <Link
              href="/forums"
              className={combineStyles(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
                getSidebarLinkStyles(theme, activeNav === 'forums'),
                activeNav === 'forums' && 'scale-105'
              )}
            >
              <MessageSquare className={`w-5 h-5 flex-shrink-0 ${
                activeNav === 'forums' ? 'text-white' : theme === 'light' ? 'text-gray-800' : 'text-white'
              }`} />
              <span className={`font-medium ${
                activeNav === 'forums' ? 'text-white' : theme === 'light' ? 'text-gray-800' : 'text-white'
              }`}>פורומים</span>
            </Link>
            <Link
              href="/recordings"
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeNav === 'recordings' 
                  ? theme === 'light'
                    ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/30 scale-105'
                    : 'bg-gradient-to-r from-hot-pink to-rose-500 text-white shadow-lg shadow-hot-pink/30 scale-105'
                  : theme === 'light'
                    ? 'text-gray-800 hover:bg-pink-50 hover:text-[#F52F8E] hover:scale-[1.02]'
                    : 'text-white hover:bg-gradient-to-r hover:from-hot-pink/10 hover:to-rose-500/10 hover:text-hot-pink/80 hover:scale-[1.02]'
              }`}
            >
              <Video className={`w-5 h-5 flex-shrink-0 ${
                activeNav === 'recordings' ? 'text-white' : theme === 'light' ? 'text-gray-800' : 'text-white'
              }`} />
              <span className={`font-medium ${
                activeNav === 'recordings' ? 'text-white' : theme === 'light' ? 'text-gray-800' : 'text-white'
              }`}>הקלטות</span>
            </Link>
            <Link
              href="/projects"
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeNav === 'projects' 
                  ? theme === 'light'
                    ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/30 scale-105'
                    : 'bg-gradient-to-r from-hot-pink to-rose-500 text-white shadow-lg shadow-hot-pink/30 scale-105'
                  : theme === 'light'
                    ? 'text-gray-800 hover:bg-pink-50 hover:text-[#F52F8E] hover:scale-[1.02]'
                    : 'text-white hover:bg-gradient-to-r hover:from-hot-pink/10 hover:to-rose-500/10 hover:text-hot-pink/80 hover:scale-[1.02]'
              }`}
            >
              <Briefcase className={`w-5 h-5 flex-shrink-0 ${
                activeNav === 'projects' ? 'text-white' : theme === 'light' ? 'text-gray-800' : 'text-white'
              }`} />
              <span className={`font-medium ${
                activeNav === 'projects' ? 'text-white' : theme === 'light' ? 'text-gray-800' : 'text-white'
              }`}>פרויקטים</span>
            </Link>
            <Link
              href="/courses"
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeNav === 'courses' 
                  ? theme === 'light'
                    ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/30 scale-105'
                    : 'bg-gradient-to-r from-hot-pink to-rose-500 text-white shadow-lg shadow-hot-pink/30 scale-105'
                  : theme === 'light'
                    ? 'text-gray-800 hover:bg-pink-50 hover:text-[#F52F8E] hover:scale-[1.02]'
                    : 'text-white hover:bg-gradient-to-r hover:from-hot-pink/10 hover:to-rose-500/10 hover:text-hot-pink/80 hover:scale-[1.02]'
              }`}
            >
              <PlayCircle className={`w-5 h-5 flex-shrink-0 ${
                activeNav === 'courses' ? 'text-white' : theme === 'light' ? 'text-gray-800' : 'text-white'
              }`} />
              <span className={`font-medium ${
                activeNav === 'courses' ? 'text-white' : theme === 'light' ? 'text-gray-800' : 'text-white'
              }`}>קורסים</span>
            </Link>
            <Link
              href="/live-log"
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeNav === 'live-log' 
                  ? theme === 'light'
                    ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/30 scale-105'
                    : 'bg-gradient-to-r from-hot-pink to-rose-500 text-white shadow-lg shadow-hot-pink/30 scale-105'
                  : theme === 'light'
                    ? 'text-gray-800 hover:bg-pink-50 hover:text-[#F52F8E] hover:scale-[1.02]'
                    : 'text-white hover:bg-gradient-to-r hover:from-hot-pink/10 hover:to-rose-500/10 hover:text-hot-pink/80 hover:scale-[1.02]'
              }`}
            >
              <Calendar className={`w-5 h-5 flex-shrink-0 ${
                activeNav === 'live-log' ? 'text-white' : theme === 'light' ? 'text-gray-800' : 'text-white'
              }`} />
              <span className={`font-medium ${
                activeNav === 'live-log' ? 'text-white' : theme === 'light' ? 'text-gray-800' : 'text-white'
              }`}>יומן לייבים</span>
            </Link>
            {/* Live Room - Dynamic Menu Item (only shows when there's a live event within 1 hour) */}
            {hasLiveEvent && (
              <Link
                href="/live-room"
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  pathname === '/live-room'
                    ? theme === 'light'
                      ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/30 scale-105'
                      : 'bg-gradient-to-r from-hot-pink to-rose-500 text-white shadow-lg shadow-hot-pink/30 scale-105'
                    : theme === 'light'
                      ? 'text-gray-800 hover:bg-pink-50 hover:text-[#F52F8E] hover:scale-[1.02]'
                      : 'text-white hover:bg-gradient-to-r hover:from-hot-pink/10 hover:to-rose-500/10 hover:text-hot-pink/80 hover:scale-[1.02]'
                }`}
              >
                <Radio className={`w-5 h-5 flex-shrink-0 ${
                  pathname === '/live-room' ? 'text-white' : theme === 'light' ? 'text-gray-800' : 'text-white'
                }`} />
                <span className={`font-medium ${
                  pathname === '/live-room' ? 'text-white' : theme === 'light' ? 'text-gray-800' : 'text-white'
                }`}>חדר לייב</span>
                <span className="ml-auto w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              </Link>
            )}
            <Link
              href="/blog"
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeNav === 'blog' 
                  ? theme === 'light'
                    ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/30 scale-105'
                    : 'bg-gradient-to-r from-hot-pink to-rose-500 text-white shadow-lg shadow-hot-pink/30 scale-105'
                  : theme === 'light'
                    ? 'text-gray-800 hover:bg-pink-50 hover:text-[#F52F8E] hover:scale-[1.02]'
                    : 'text-white hover:bg-gradient-to-r hover:from-hot-pink/10 hover:to-rose-500/10 hover:text-hot-pink/80 hover:scale-[1.02]'
              }`}
            >
              <BookOpen className={`w-5 h-5 flex-shrink-0 ${
                activeNav === 'blog' ? 'text-white' : theme === 'light' ? 'text-gray-800' : 'text-white'
              }`} />
              <span className={`font-medium ${
                activeNav === 'blog' ? 'text-white' : theme === 'light' ? 'text-gray-800' : 'text-white'
              }`}>בלוג</span>
            </Link>
            <Link
              href="/feedback"
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeNav === 'feedback' 
                  ? theme === 'light'
                    ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/30 scale-105'
                    : 'bg-gradient-to-r from-hot-pink to-rose-500 text-white shadow-lg shadow-hot-pink/30 scale-105'
                  : theme === 'light'
                    ? 'text-gray-800 hover:bg-pink-50 hover:text-[#F52F8E] hover:scale-[1.02]'
                    : 'text-white hover:bg-gradient-to-r hover:from-hot-pink/10 hover:to-rose-500/10 hover:text-hot-pink/80 hover:scale-[1.02]'
              }`}
            >
              <MessageCircleMore className={`w-5 h-5 flex-shrink-0 ${
                activeNav === 'feedback' ? 'text-white' : theme === 'light' ? 'text-gray-800' : 'text-white'
              }`} />
              <span className={`font-medium ${
                activeNav === 'feedback' ? 'text-white' : theme === 'light' ? 'text-gray-800' : 'text-white'
              }`}>פידבקים</span>
            </Link>
            {/* Admin Panel Link - Only for admins */}
            {currentUser && (() => {
              const role = currentUser.roles || currentUser.role;
              const roleName = typeof role === 'object' ? role?.name : role;
              return roleName === 'admin';
            })() && (
              <Link
                href="/admin"
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  activeNav === 'admin' 
                    ? theme === 'light'
                      ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/30 scale-105'
                      : 'bg-gradient-to-r from-hot-pink to-rose-500 text-white shadow-lg shadow-hot-pink/30 scale-105'
                    : theme === 'light'
                      ? 'text-gray-800 hover:bg-pink-50 hover:text-[#F52F8E] hover:scale-[1.02]'
                      : 'text-white hover:bg-gradient-to-r hover:from-hot-pink/10 hover:to-rose-500/10 hover:text-hot-pink/80 hover:scale-[1.02]'
                }`}
              >
                <Shield className={`w-5 h-5 flex-shrink-0 ${
                  activeNav === 'admin' ? 'text-white' : theme === 'light' ? 'text-gray-800' : 'text-white'
                }`} />
                <span className={`font-medium ${
                  activeNav === 'admin' ? 'text-white' : theme === 'light' ? 'text-gray-800' : 'text-white'
                }`}>פאנל ניהול</span>
              </Link>
            )}

            {/* Theme Toggle Button - Bottom of Sidebar */}
            <div className={`p-4 border-t ${
              theme === 'light' ? 'border-gray-300' : 'border-white/20'
            }`} suppressHydrationWarning>
              <button
                onClick={toggleTheme}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  theme === 'light'
                    ? 'text-gray-700 hover:bg-gray-50'
                    : 'text-white hover:bg-gradient-to-r hover:from-hot-pink/10 hover:to-rose-500/10 hover:text-hot-pink'
                }`}
                suppressHydrationWarning
              >
                {theme === 'light' ? (
                  <Moon className={`w-5 h-5 flex-shrink-0 ${
                    theme === 'light' ? 'text-gray-800' : 'text-hot-pink'
                  }`} suppressHydrationWarning />
                ) : (
                  <Sun className={`w-5 h-5 flex-shrink-0 ${
                    theme === 'light' ? 'text-[#F52F8E]' : 'text-hot-pink'
                  }`} suppressHydrationWarning />
                )}
                <span className="font-medium">{theme === 'light' ? 'עיצוב כהה' : 'עיצוב בהיר'}</span>
              </button>
            </div>
          </div>
          )}
        </div>
      </aside>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-50"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div 
            className={`fixed right-0 top-0 h-full w-80 shadow-2xl overflow-y-auto rounded-none ${
              theme === 'light'
                ? 'bg-white border-l border-gray-300'
                : 'glass-dark'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`p-4 border-b flex items-center justify-between ${
              theme === 'light'
                ? 'border-gray-300'
                : 'border-white/20'
            }`}>
              <h2 className={`text-lg font-bold ${
                theme === 'light' ? 'text-gray-800' : 'text-white'
              }`}>תפריט</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleTheme}
                  className={`p-2 transition-colors ${
                    theme === 'light'
                      ? 'text-gray-600 hover:text-[#F52F8E] hover:bg-pink-50'
                      : 'text-gray-300 hover:text-hot-pink'
                  }`}
                  aria-label={theme === 'neon' ? 'עבור לעיצוב לבן' : 'עבור לעיצוב ניאון'}
                >
                  {theme === 'neon' ? (
                    <Sun className="w-6 h-6" />
                  ) : (
                    <Moon className="w-6 h-6" />
                  )}
                </button>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className={`p-2 transition-colors ${
                    theme === 'light'
                      ? 'text-gray-600 hover:text-[#F52F8E] hover:bg-pink-50'
                      : 'text-gray-300 hover:text-hot-pink'
                  }`}
                  aria-label="סגור תפריט"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-4 space-y-2">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className={combineStyles(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-full transition-all',
                  getSidebarLinkStyles(theme, activeNav === 'home'),
                  activeNav === 'home' && 'scale-105'
                )}
                style={activeNav === 'home' ? { color: 'white' } : undefined}
              >
                <HomeIcon 
                  className={`w-5 h-5 flex-shrink-0 ${
                    activeNav === 'home' ? '' : theme === 'light' ? 'text-gray-800' : 'text-gray-300'
                  }`}
                  style={activeNav === 'home' ? { color: 'white' } : undefined}
                />
                <span 
                  className={`font-medium ${
                    activeNav === 'home' ? '' : theme === 'light' ? 'text-gray-800' : 'text-gray-300'
                  }`}
                  style={activeNav === 'home' ? { color: 'white' } : undefined}
                >בית</span>
              </Link>
              <Link
                href="/members"
                onClick={() => setMobileMenuOpen(false)}
                className={combineStyles(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-full transition-all',
                  getSidebarLinkStyles(theme, activeNav === 'members'),
                  activeNav === 'members' && 'scale-105'
                )}
                style={activeNav === 'members' ? { color: 'white' } : undefined}
              >
                <Users 
                  className={`w-5 h-5 flex-shrink-0 ${
                    activeNav === 'members' ? '' : theme === 'light' ? 'text-gray-800' : 'text-gray-300'
                  }`}
                  style={activeNav === 'members' ? { color: 'white' } : undefined}
                />
                <span 
                  className={`font-medium ${
                    activeNav === 'members' ? '' : theme === 'light' ? 'text-gray-800' : 'text-gray-300'
                  }`}
                  style={activeNav === 'members' ? { color: 'white' } : undefined}
                >חברים</span>
              </Link>
              <Link
                href="/forums"
                onClick={() => setMobileMenuOpen(false)}
                className={combineStyles(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-full transition-all',
                  getSidebarLinkStyles(theme, activeNav === 'forums'),
                  activeNav === 'forums' && 'scale-105'
                )}
                style={activeNav === 'forums' ? { color: 'white' } : undefined}
              >
                <MessageSquare 
                  className={`w-5 h-5 flex-shrink-0 ${
                    activeNav === 'forums' ? '' : theme === 'light' ? 'text-gray-800' : 'text-gray-300'
                  }`}
                  style={activeNav === 'forums' ? { color: 'white' } : undefined}
                />
                <span 
                  className={`font-medium ${
                    activeNav === 'forums' ? '' : theme === 'light' ? 'text-gray-800' : 'text-gray-300'
                  }`}
                  style={activeNav === 'forums' ? { color: 'white' } : undefined}
                >פורומים</span>
              </Link>
              <Link
                href="/recordings"
                onClick={() => setMobileMenuOpen(false)}
                className={combineStyles(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-full transition-all',
                  getSidebarLinkStyles(theme, activeNav === 'recordings'),
                  activeNav === 'recordings' && 'scale-105'
                )}
                style={activeNav === 'recordings' ? { color: 'white' } : undefined}
              >
                <Video 
                  className={`w-5 h-5 flex-shrink-0 ${
                    activeNav === 'recordings' ? '' : theme === 'light' ? 'text-gray-800' : 'text-gray-300'
                  }`}
                  style={activeNav === 'recordings' ? { color: 'white' } : undefined}
                />
                <span 
                  className={`font-medium ${
                    activeNav === 'recordings' ? '' : theme === 'light' ? 'text-gray-800' : 'text-gray-300'
                  }`}
                  style={activeNav === 'recordings' ? { color: 'white' } : undefined}
                >הקלטות</span>
              </Link>
              <Link
                href="/projects"
                onClick={() => setMobileMenuOpen(false)}
                className={combineStyles(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-full transition-all',
                  getSidebarLinkStyles(theme, activeNav === 'projects'),
                  activeNav === 'projects' && 'scale-105'
                )}
                style={activeNav === 'projects' ? { color: 'white' } : undefined}
              >
                <Briefcase 
                  className={`w-5 h-5 flex-shrink-0 ${
                    activeNav === 'projects' ? '' : theme === 'light' ? 'text-gray-800' : 'text-gray-300'
                  }`}
                  style={activeNav === 'projects' ? { color: 'white' } : undefined}
                />
                <span 
                  className={`font-medium ${
                    activeNav === 'projects' ? '' : theme === 'light' ? 'text-gray-800' : 'text-gray-300'
                  }`}
                  style={activeNav === 'projects' ? { color: 'white' } : undefined}
                >פרויקטים</span>
              </Link>
              <Link
                href="/courses"
                onClick={() => setMobileMenuOpen(false)}
                className={combineStyles(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-full transition-all',
                  getSidebarLinkStyles(theme, activeNav === 'courses'),
                  activeNav === 'courses' && 'scale-105'
                )}
                style={activeNav === 'courses' ? { color: 'white' } : undefined}
              >
                <PlayCircle 
                  className={`w-5 h-5 flex-shrink-0 ${
                    activeNav === 'courses' ? '' : theme === 'light' ? 'text-gray-800' : 'text-gray-300'
                  }`}
                  style={activeNav === 'courses' ? { color: 'white' } : undefined}
                />
                <span 
                  className={`font-medium ${
                    activeNav === 'courses' ? '' : theme === 'light' ? 'text-gray-800' : 'text-gray-300'
                  }`}
                  style={activeNav === 'courses' ? { color: 'white' } : undefined}
                >קורסים</span>
              </Link>
              <Link
                href="/live-log"
                onClick={() => setMobileMenuOpen(false)}
                className={combineStyles(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-full transition-all',
                  getSidebarLinkStyles(theme, activeNav === 'live-log'),
                  activeNav === 'live-log' && 'scale-105'
                )}
                style={activeNav === 'live-log' ? { color: 'white' } : undefined}
              >
                <Calendar 
                  className={`w-5 h-5 flex-shrink-0 ${
                    activeNav === 'live-log' ? '' : theme === 'light' ? 'text-gray-800' : 'text-gray-300'
                  }`}
                  style={activeNav === 'live-log' ? { color: 'white' } : undefined}
                />
                <span 
                  className={`font-medium ${
                    activeNav === 'live-log' ? '' : theme === 'light' ? 'text-gray-800' : 'text-gray-300'
                  }`}
                  style={activeNav === 'live-log' ? { color: 'white' } : undefined}
                >יומן לייבים</span>
              </Link>
              {/* Live Room - Dynamic Menu Item (only shows when there's a live event within 1 hour) */}
              {hasLiveEvent && (
                <Link
                  href="/live-room"
                  onClick={() => setMobileMenuOpen(false)}
                  className={combineStyles(
                    'w-full flex items-center gap-3 px-4 py-3 rounded-full transition-all',
                    getSidebarLinkStyles(theme, pathname === '/live-room'),
                    pathname === '/live-room' && 'scale-105'
                  )}
                  style={pathname === '/live-room' ? { color: 'white' } : undefined}
                >
                  <Radio 
                    className={`w-5 h-5 flex-shrink-0 ${
                      pathname === '/live-room' ? '' : theme === 'light' ? 'text-gray-800' : 'text-gray-300'
                    }`}
                    style={pathname === '/live-room' ? { color: 'white' } : undefined}
                  />
                  <span 
                    className={`font-medium ${
                      pathname === '/live-room' ? '' : theme === 'light' ? 'text-gray-800' : 'text-gray-300'
                    }`}
                    style={pathname === '/live-room' ? { color: 'white' } : undefined}
                  >חדר לייב</span>
                  <span className="ml-auto w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                </Link>
              )}
              <Link
                href="/blog"
                onClick={() => setMobileMenuOpen(false)}
                className={combineStyles(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-full transition-all',
                  getSidebarLinkStyles(theme, activeNav === 'blog'),
                  activeNav === 'blog' && 'scale-105'
                )}
                style={activeNav === 'blog' ? { color: 'white' } : undefined}
              >
                <BookOpen 
                  className={`w-5 h-5 flex-shrink-0 ${
                    activeNav === 'blog' ? '' : theme === 'light' ? 'text-gray-800' : 'text-gray-300'
                  }`}
                  style={activeNav === 'blog' ? { color: 'white' } : undefined}
                />
                <span 
                  className={`font-medium ${
                    activeNav === 'blog' ? '' : theme === 'light' ? 'text-gray-800' : 'text-gray-300'
                  }`}
                  style={activeNav === 'blog' ? { color: 'white' } : undefined}
                >בלוג</span>
              </Link>
              <Link
                href="/feedback"
                onClick={() => setMobileMenuOpen(false)}
                className={combineStyles(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-full transition-all',
                  getSidebarLinkStyles(theme, activeNav === 'feedback'),
                  activeNav === 'feedback' && 'scale-105'
                )}
                style={activeNav === 'feedback' ? { color: 'white' } : undefined}
              >
                <MessageCircleMore 
                  className={`w-5 h-5 flex-shrink-0 ${
                    activeNav === 'feedback' ? '' : theme === 'light' ? 'text-gray-800' : 'text-gray-300'
                  }`}
                  style={activeNav === 'feedback' ? { color: 'white' } : undefined}
                />
                <span 
                  className={`font-medium ${
                    activeNav === 'feedback' ? '' : theme === 'light' ? 'text-gray-800' : 'text-gray-300'
                  }`}
                  style={activeNav === 'feedback' ? { color: 'white' } : undefined}
                >פידבקים</span>
              </Link>
              {/* Admin Panel Link - Only for admins */}
              {currentUser && (() => {
                const role = currentUser.roles || currentUser.role;
                const roleName = typeof role === 'object' ? role?.name : role;
                return roleName === 'admin';
              })() && (
                <Link
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-full transition-all ${
                    activeNav === 'admin' 
                      ? theme === 'light'
                        ? 'bg-gradient-to-r from-pink-500 to-rose-500 shadow-lg shadow-pink-500/30 scale-105'
                        : 'bg-gradient-to-r from-hot-pink to-rose-500 shadow-lg shadow-hot-pink/30 scale-105'
                      : theme === 'light'
                        ? 'text-gray-800 hover:bg-pink-50 hover:text-[#F52F8E] hover:scale-[1.02]'
                        : 'text-gray-300 hover:bg-gradient-to-r hover:from-hot-pink/10 hover:to-rose-500/10 hover:text-hot-pink/80 hover:scale-[1.02]'
                  }`}
                  style={activeNav === 'admin' ? { color: 'white' } : undefined}
                >
                  <Shield 
                    className={`w-5 h-5 flex-shrink-0 ${
                      activeNav === 'admin' ? '' : theme === 'light' ? 'text-gray-800' : 'text-gray-300'
                    }`}
                    style={activeNav === 'admin' ? { color: 'white' } : undefined}
                  />
                  <span 
                    className={`font-medium ${
                      activeNav === 'admin' ? '' : theme === 'light' ? 'text-gray-800' : 'text-gray-300'
                    }`}
                    style={activeNav === 'admin' ? { color: 'white' } : undefined}
                  >פאנל ניהול</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main id="main-content" className={`transition-all duration-300 ease-in-out ${
        pathname === '/live-room'
          ? 'lg:mr-0 mr-0' // No sidebar margin for live room to allow full screen
          : sidebarOpen 
            ? 'lg:mr-64 mr-0' 
            : 'lg:mr-16 mr-0'
      } lg:mt-0 mt-0`}>
        {children}
      </main>
    </div>
  );
}

