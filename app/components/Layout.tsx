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
  Radio
} from 'lucide-react';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getAllProfiles, updateProfile } from '@/lib/queries/profiles';
import { clearCache } from '@/lib/cache';
import { awardPoints } from '@/lib/queries/gamification';

interface SearchResult {
  recordings: any[];
  forums: any[];
  forumPosts: any[];
  posts: any[];
  projects: any[];
  courses: any[];
}

export default function Layout({ children }: { children: React.ReactNode }) {
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
    if (!query || query.trim().length < 2) {
      setSearchResults(null);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const { data, error } = await response.json();
      
      if (!error && data) {
        setSearchResults(data);
        setShowSearchResults(true);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Handle search input with debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim().length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(searchQuery);
      }, 300);
    } else {
      setSearchResults(null);
      setShowSearchResults(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
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
    }
  }, [mobileSearchOpen]);

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
            console.error('Error updating is_online on logout:', error);
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
        console.error('Error loading unread messages count:', error);
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
        console.error('Error checking next live event:', error);
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
      console.error('Error marking notification as read:', error);
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
      console.error('Error marking all as read:', error);
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
        console.error('Error deleting notification:', error);
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
        console.error('Error creating test notification:', result);
      }
    } catch (error) {
      console.error('Error creating test notification:', error);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-pink-50/30 to-purple-50/20">
      {/* Top Header - Minimal (Mobile & Desktop) */}
      <header className="sticky top-0 z-50 glass border-b border-white/20 shadow-lg backdrop-blur-xl">
        <div className={`px-2 sm:px-4 lg:px-6 xl:px-8 transition-all duration-300 ease-in-out ${
          sidebarOpen 
            ? 'lg:mr-64 mr-0' 
            : 'lg:mr-16 mr-0'
        }`}>
          <div className="flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-4">
            {/* Mobile Hamburger Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-gray-700 hover:text-pink-500 transition-colors"
              aria-label="תפריט"
            >
              <AlignJustify className="w-6 h-6" />
            </button>

            {/* Club Name - Right side (RTL) */}
            <div className="hidden sm:flex items-center">
              <h1 className="text-lg sm:text-xl font-bold text-gray-800 whitespace-nowrap">
                מועדון האוטומטורים
              </h1>
            </div>

            {/* Search Bar - Mobile: Icon only, Desktop: Full search */}
            <div className="flex-1 max-w-md" ref={searchRef}>
              {/* Mobile: Search Icon Button */}
              <button
                onClick={() => setMobileSearchOpen(true)}
                className="lg:hidden p-2.5 text-gray-600 hover:text-pink-500 cursor-pointer transition-all rounded-lg hover:bg-pink-50/50"
                aria-label="חיפוש"
              >
                <Search className="w-6 h-6" />
              </button>
              
              {/* Desktop: Full Search Bar */}
              <div className="hidden lg:block relative w-full">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5 z-10" />
                <input
                  type="text"
                  dir="rtl"
                  placeholder="חפש במועדון..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)}
                  className="modern-input w-full pr-9 sm:pr-10 pl-3 sm:pl-4 py-1.5 sm:py-2.5 rounded-full focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500/50 shadow-md text-sm text-right"
                />
                
                {/* Search Results Dropdown - Desktop Only */}
                {showSearchResults && searchResults && (
                  <>
                    {/* Desktop: Dropdown */}
                    <div className="hidden lg:block fixed bg-white rounded-xl shadow-2xl border border-gray-200 z-[60] max-h-[600px] overflow-y-auto" style={searchDropdownStyle}>
                      {getTotalResults() === 0 ? (
                        <div className="p-6 text-center text-gray-500">
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
                                      <h3 className="text-sm font-bold text-gray-800">הקלטות ({searchResults.recordings.length})</h3>
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
                                    className="block px-3 py-2 rounded-xl hover:bg-pink-50 transition-colors"
                                  >
                                    <p className="text-sm font-semibold text-gray-900 break-words">{recording.title}</p>
                                    {recording.description && (
                                      <p className="text-xs text-gray-600 line-clamp-1 mt-1 break-words">{recording.description}</p>
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
                                      <h3 className="text-sm font-bold text-gray-800">פורומים ({searchResults.forums.length})</h3>
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
                                    className="block px-3 py-2 rounded-xl hover:bg-pink-50 transition-colors"
                                  >
                                    <p className="text-sm font-semibold text-gray-900 break-words">{forum.display_name || forum.name}</p>
                                    {forum.description && (
                                      <p className="text-xs text-gray-600 line-clamp-1 mt-1 break-words">{forum.description}</p>
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
                                      <h3 className="text-sm font-bold text-gray-800">פוסטים בפורומים ({searchResults.forumPosts.length})</h3>
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
                                    className="block px-3 py-2 rounded-xl hover:bg-pink-50 transition-colors"
                                  >
                                    <p className="text-sm font-semibold text-gray-900 break-words">{post.title}</p>
                                    {post.forums && (
                                      <p className="text-xs text-gray-600 mt-1 break-words">בפורום: {post.forums.display_name}</p>
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
                                      <h3 className="text-sm font-bold text-gray-800">הכרזות ({searchResults.posts.length})</h3>
                                    </div>
                                    <div className="space-y-1">
                                      {limited.posts.map((post: any) => (
                                  <div
                                    key={post.id}
                                    className="block px-3 py-2 rounded-xl hover:bg-pink-50 transition-colors"
                                  >
                                    <p className="text-sm text-gray-900 line-clamp-2 break-words">{post.content}</p>
                                    {post.profiles && (
                                      <p className="text-xs text-gray-600 mt-1 break-words">מאת: {post.profiles.display_name}</p>
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
                                      <h3 className="text-sm font-bold text-gray-800">פרויקטים ({searchResults.projects.length})</h3>
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
                                    className="block px-3 py-2 rounded-xl hover:bg-pink-50 transition-colors"
                                  >
                                    <p className="text-sm font-semibold text-gray-900 break-words">{project.title}</p>
                                    {project.description && (
                                      <p className="text-xs text-gray-600 line-clamp-1 mt-1 break-words">{project.description}</p>
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
                                      <h3 className="text-sm font-bold text-gray-800">קורסים ({searchResults.courses.length})</h3>
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
                                    className="block px-3 py-2 rounded-xl hover:bg-pink-50 transition-colors"
                                  >
                                    <p className="text-sm font-semibold text-gray-900 break-words">{course.title}</p>
                                    {course.description && (
                                      <p className="text-xs text-gray-600 line-clamp-1 mt-1 break-words">{course.description}</p>
                                    )}
                                  </Link>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* View All Results Link */}
                                {hasMoreResults() && (
                                  <div className="pt-3 border-t border-gray-200 mt-3">
                                    <Link
                                      href={`/search?q=${encodeURIComponent(searchQuery)}`}
                                      onClick={() => {
                                        setShowSearchResults(false);
                                      }}
                                      className="block text-center px-4 py-2 text-sm font-semibold text-[#F52F8E] hover:bg-pink-50 rounded-lg transition-colors"
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
                    <div className="hidden lg:block absolute top-full mt-2 left-0 right-0 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 p-6 text-center">
                      <p className="text-sm text-gray-500">מחפש...</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Mobile Search Modal */}
            {mobileSearchOpen && (
              <div className="fixed inset-0 bg-white z-[100] flex flex-col lg:hidden">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between z-10">
                  <h2 className="text-lg font-bold text-gray-800">חיפוש</h2>
                  <button
                    onClick={() => {
                      setMobileSearchOpen(false);
                      setSearchQuery('');
                      setShowSearchResults(false);
                    }}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                    aria-label="סגור"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Search Input */}
                <div className="px-4 py-3 border-b border-gray-200">
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
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
                <div className="flex-1 overflow-y-auto">
                  {isSearching ? (
                    <div className="flex items-center justify-center py-12">
                      <p className="text-sm text-gray-500">מחפש...</p>
                    </div>
                  ) : showSearchResults && searchResults ? (
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
                                      <h3 className="text-base font-bold text-gray-800">הקלטות ({searchResults.recordings.length})</h3>
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
                                          className="block px-4 py-3 rounded-xl hover:bg-pink-50 transition-colors border border-gray-200 bg-white shadow-sm active:bg-pink-100"
                                        >
                                          <p className="text-sm font-semibold text-gray-900 break-words leading-relaxed">{recording.title}</p>
                                          {recording.description && (
                                            <p className="text-xs text-gray-600 line-clamp-2 mt-1.5 break-words leading-relaxed">{recording.description}</p>
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
                                      <h3 className="text-base font-bold text-gray-800">פורומים ({searchResults.forums.length})</h3>
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
                                          className="block px-4 py-3 rounded-xl hover:bg-pink-50 transition-colors border border-gray-200 bg-white shadow-sm active:bg-pink-100"
                                        >
                                          <p className="text-sm font-semibold text-gray-900 break-words leading-relaxed">{forum.display_name || forum.name}</p>
                                          {forum.description && (
                                            <p className="text-xs text-gray-600 line-clamp-2 mt-1.5 break-words leading-relaxed">{forum.description}</p>
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
                                      <h3 className="text-base font-bold text-gray-800">פוסטים בפורומים ({searchResults.forumPosts.length})</h3>
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
                                          className="block px-4 py-3 rounded-xl hover:bg-pink-50 transition-colors border border-gray-200 bg-white shadow-sm active:bg-pink-100"
                                        >
                                          <p className="text-sm font-semibold text-gray-900 break-words leading-relaxed">{post.title}</p>
                                          {post.forums && (
                                            <p className="text-xs text-gray-600 mt-1.5 break-words leading-relaxed">בפורום: {post.forums.display_name}</p>
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
                                      <h3 className="text-base font-bold text-gray-800">הכרזות ({searchResults.posts.length})</h3>
                                    </div>
                                    <div className="space-y-2.5">
                                      {limited.posts.map((post: any) => (
                                        <div
                                          key={post.id}
                                          className="block px-4 py-3 rounded-xl border border-gray-200 bg-white shadow-sm"
                                        >
                                          <p className="text-sm text-gray-900 line-clamp-3 break-words leading-relaxed">{post.content}</p>
                                          {post.profiles && (
                                            <p className="text-xs text-gray-600 mt-1.5 break-words leading-relaxed">מאת: {post.profiles.display_name}</p>
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
                                      <h3 className="text-base font-bold text-gray-800">פרויקטים ({searchResults.projects.length})</h3>
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
                                          className="block px-4 py-3 rounded-xl hover:bg-pink-50 transition-colors border border-gray-200 bg-white shadow-sm active:bg-pink-100"
                                        >
                                          <p className="text-sm font-semibold text-gray-900 break-words leading-relaxed">{project.title}</p>
                                          {project.description && (
                                            <p className="text-xs text-gray-600 line-clamp-2 mt-1.5 break-words leading-relaxed">{project.description}</p>
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
                                          className="block px-4 py-3 rounded-xl hover:bg-pink-50 transition-colors border border-gray-200 bg-white shadow-sm active:bg-pink-100"
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
                                  <div className="pt-4 border-t-2 border-gray-200 mt-4">
                                    <Link
                                      href={`/search?q=${encodeURIComponent(searchQuery)}`}
                                      onClick={() => {
                                        setMobileSearchOpen(false);
                                        setShowSearchResults(false);
                                      }}
                                      className="block text-center px-6 py-3.5 text-base font-bold text-[#F52F8E] hover:bg-pink-50 rounded-xl transition-colors border-2 border-[#F52F8E] active:bg-pink-100"
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
                    <div className="p-8 text-center text-gray-500">
                      <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-base">התחל לחפש</p>
                      <p className="text-sm mt-2 text-gray-400">הקלד לפחות 2 תווים כדי להתחיל לחפש</p>
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
                  className="relative p-2.5 text-gray-600 hover:text-pink-500 cursor-pointer transition-all rounded-lg hover:bg-pink-50/50 group"
                >
                  <Bell className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 left-1 w-5 h-5 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full flex items-center justify-center text-white text-xs font-bold animate-pulse-glow">
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
                    <div className="fixed inset-0 top-16 bg-white z-[61] flex flex-col lg:hidden">
                      {/* Header */}
                      <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
                        <h3 className="text-xl font-bold text-gray-800">התראות</h3>
                        <div className="flex items-center gap-3">
                          {unreadCount > 0 && (
                            <button
                              onClick={markAllAsRead}
                              className="text-sm text-[#F52F8E] hover:underline"
                            >
                              קראתי הכל
                            </button>
                          )}
                          <button
                            onClick={() => setNotificationsOpen(false)}
                            className="p-2 text-gray-500 hover:text-gray-700"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {/* Notifications List */}
                      <div className="flex-1 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-6 text-center text-gray-500 mt-20">
                            <Bell className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                            <p className="text-lg">אין התראות חדשות</p>
                          </div>
                        ) : unreadCount === 0 && notifications.length > 0 && notifications.every(n => n.is_read) ? (
                          <div className="p-6 text-center text-gray-500">
                            <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                            <p>אין התראות חדשות</p>
                            <p className="text-xs text-gray-400 mt-1">כל ההתראות נקראו</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-gray-100">
                            {notifications.map((notification) => {
                              const isPointsNotification = notification.title?.includes('נקודות') || notification.message?.includes('נקודות');
                              const NotificationContent = (
                                <div className={`flex items-start gap-4 ${
                                  !isPointsNotification ? 'cursor-pointer' : ''
                                }`}>
                                  <div className={`flex-shrink-0 w-3 h-3 rounded-full mt-2 ${
                                    !notification.is_read ? 'bg-[#F52F8E]' : 'bg-gray-300'
                                  }`}></div>
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
                                  <button
                                    onClick={(e) => handleDeleteNotification(notification.id, e)}
                                    className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
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
                                      !notification.is_read ? 'bg-pink-50/50' : ''
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
                                  className={`block p-5 hover:bg-gray-50 transition-colors ${
                                    !notification.is_read ? 'bg-pink-50/50' : ''
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
                      className="hidden lg:block fixed w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-[60] max-h-[600px] overflow-hidden flex flex-col"
                      style={notificationsDropdownStyle}
                    >
                      {/* Header */}
                      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                        <h3 className="text-lg font-bold text-gray-800">התראות</h3>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllAsRead}
                            className="text-sm text-[#F52F8E] hover:underline"
                          >
                            קראתי הכל
                          </button>
                        )}
                      </div>

                      {/* Notifications List */}
                      <div className="flex-1 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-6 text-center text-gray-500">
                            <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                            <p>אין התראות חדשות</p>
                          </div>
                        ) : unreadCount === 0 && notifications.length > 0 && notifications.every(n => n.is_read) ? (
                          <div className="p-6 text-center text-gray-500">
                            <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                            <p>אין התראות חדשות</p>
                            <p className="text-xs text-gray-400 mt-1">כל ההתראות נקראו</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-gray-100">
                            {notifications.map((notification) => {
                              const isPointsNotification = notification.title?.includes('נקודות') || notification.message?.includes('נקודות');
                              const NotificationContent = (
                                <div className={`flex items-start gap-3 ${
                                  !isPointsNotification ? 'cursor-pointer' : ''
                                }`}>
                                  <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                                    !notification.is_read ? 'bg-[#F52F8E]' : 'bg-gray-300'
                                  }`}></div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-800 mb-1">
                                      {notification.title}
                                    </p>
                                    <p className="text-sm text-gray-600 mb-2">
                                      {notification.message}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {formatTimeAgo(notification.created_at)}
                                    </p>
                                  </div>
                                  <button
                                    onClick={(e) => handleDeleteNotification(notification.id, e)}
                                    className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
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
                                      !notification.is_read ? 'bg-pink-50/50' : ''
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
                                  className={`block p-4 hover:bg-gray-50 transition-colors ${
                                    !notification.is_read ? 'bg-pink-50/50' : ''
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
              <Link href="/messages" className="relative p-2.5 text-gray-600 hover:text-pink-500 cursor-pointer transition-all rounded-lg hover:bg-pink-50/50 group">
                <MessageCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
                {unreadMessagesCount > 0 && (
                  <span className="absolute top-1 left-1 w-2.5 h-2.5 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full animate-pulse-glow"></span>
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
                      className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 via-rose-400 to-amber-300 flex items-center justify-center text-white font-semibold shadow-lg shadow-pink-500/30 ring-2 ring-white/50"
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
                    <span className="text-sm font-medium text-gray-700">{currentUser?.display_name || currentUser?.first_name || 'משתמש'}</span>
                    <span className="text-sm text-gray-500">{currentUser?.points || 0}</span>
                    <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`} />
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
                      className="fixed bg-white rounded-2xl shadow-2xl border border-gray-200 z-[102] overflow-hidden animate-fade-in"
                      style={profileMenuStyle}
                    >
                      {/* User Info Header */}
                      <div className="p-4 border-b border-white/20 bg-gradient-to-r from-pink-50/50 to-rose-50/50">
                        <div className="flex items-center gap-4">
                          <div 
                            className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 via-rose-400 to-amber-300 flex items-center justify-center text-white font-semibold text-xl flex-shrink-0 shadow-lg shadow-pink-500/30 ring-2 ring-white/50"
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
                            <h3 className="font-bold text-gray-800">{currentUser?.display_name || currentUser?.first_name || 'משתמש'}</h3>
                            <p className="text-sm gradient-text font-medium">{currentUser?.email?.split('@')[0] || 'zeremitay'}@</p>
                          </div>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="py-2">
                        <Link
                          href="/profile"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-pink-50 hover:to-rose-50 hover:text-pink-600 transition-all rounded-lg group"
                          onClick={closeProfileMenu}
                        >
                          <User className="w-5 h-5 text-pink-500 group-hover:scale-110 transition-transform" />
                          <span className="font-medium">פרופיל</span>
                        </Link>
                        <Link
                          href="/account"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          onClick={closeProfileMenu}
                        >
                          <UserCircle className="w-5 h-5 text-[#F52F8E]" />
                          <span>חשבון</span>
                        </Link>
                        <Link
                          href="/timeline"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          onClick={closeProfileMenu}
                        >
                          <Activity className="w-5 h-5 text-[#F52F8E]" />
                          <span>ציר זמן</span>
                        </Link>
                        <Link
                          href="/messages"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          onClick={closeProfileMenu}
                        >
                          <MessageSquare className="w-5 h-5 text-[#F52F8E]" />
                          <span>הודעות</span>
                        </Link>
                        <Link
                          href="/subscription"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          onClick={closeProfileMenu}
                        >
                          <CreditCard className="w-5 h-5 text-[#F52F8E]" />
                          <span>מנוי</span>
                        </Link>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-gray-200"></div>

                      {/* Logout */}
                      <button
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 w-full text-right transition-colors"
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
                                console.error('Error updating is_online on logout:', error);
                              }
                            }

                            // Sign out from Supabase Auth
                            const { error } = await supabase.auth.signOut();
                            
                            if (error) {
                              console.error('Error signing out:', error);
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
                            console.error('Logout error:', err);
                            alert('שגיאה בהתנתקות');
                          }
                        }}
                      >
                        <ArrowRight className="w-5 h-5 text-[#F52F8E]" />
                        <span>התנתקות</span>
                      </button>
                    </div>
                  </>
                  )}
                </div>
              ) : (
                <Link
                  href="/auth/login"
                  className="flex items-center gap-2 px-4 py-2 bg-[#F52F8E] text-white rounded-lg hover:bg-[#E01E7A] transition-colors"
                >
                  <span className="text-sm font-medium">התחבר</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>


      {/* Left Sidebar - Navigation (Fixed) - Desktop Only */}
      <aside 
        className={`hidden lg:block fixed right-0 top-0 h-full glass z-40 shadow-2xl border-l border-white/20 backdrop-blur-xl transition-all duration-300 ease-in-out ${
          sidebarOpen 
            ? 'w-64' 
            : 'w-16'
        }`}
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
          className="absolute left-0 top-1/2 -translate-x-1/2 translate-y-[-50%] z-[100] p-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-110 active:scale-95 transition-all cursor-pointer border-2 border-white"
          title={sidebarOpen ? 'הסתר תפריט' : 'הצג תפריט'}
          type="button"
          aria-label={sidebarOpen ? 'הסתר תפריט' : 'הצג תפריט'}
        >
          {sidebarOpen ? (
            <ChevronRight className="w-5 h-5 pointer-events-none" />
          ) : (
            <ChevronLeft className="w-5 h-5 pointer-events-none" />
          )}
        </button>

        <div className="h-full flex flex-col">
          {/* Header */}
          <div className={`p-3 border-b border-white/20 bg-gradient-to-r from-pink-50/30 to-rose-50/30 flex items-center ${sidebarOpen ? 'justify-between' : 'justify-center'} relative min-h-[60px]`}>
            {sidebarOpen && <h2 className="text-lg font-bold gradient-text">תפריט</h2>}
          </div>

          {/* Navigation Items */}
          {sidebarOpen && (
          <div className="flex-1 p-4 space-y-2 overflow-y-auto">
            <Link
              href="/"
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeNav === 'home' 
                  ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/30 scale-105' 
                  : 'text-gray-700 hover:bg-gradient-to-r hover:from-pink-50 hover:to-rose-50 hover:text-pink-600 hover:scale-105'
              }`}
            >
              <HomeIcon className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium">בית</span>
            </Link>
            <Link
              href="/members"
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeNav === 'members' 
                  ? 'bg-[#F52F8E] text-white' 
                  : 'text-gray-700 hover:bg-white hover:text-[#F52F8E]'
              }`}
            >
              <Users className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium">חברים</span>
            </Link>
            <Link
              href="/forums"
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeNav === 'forums' 
                  ? 'bg-[#F52F8E] text-white' 
                  : 'text-gray-700 hover:bg-white hover:text-[#F52F8E]'
              }`}
            >
              <MessageSquare className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium">פורומים</span>
            </Link>
            <Link
              href="/recordings"
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeNav === 'recordings' 
                  ? 'bg-[#F52F8E] text-white' 
                  : 'text-gray-700 hover:bg-white hover:text-[#F52F8E]'
              }`}
            >
              <Video className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium">הקלטות</span>
            </Link>
            <Link
              href="/projects"
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeNav === 'projects' 
                  ? 'bg-[#F52F8E] text-white' 
                  : 'text-gray-700 hover:bg-white hover:text-[#F52F8E]'
              }`}
            >
              <Briefcase className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium">פרויקטים</span>
            </Link>
            <Link
              href="/courses"
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeNav === 'courses' 
                  ? 'bg-[#F52F8E] text-white' 
                  : 'text-gray-700 hover:bg-white hover:text-[#F52F8E]'
              }`}
            >
              <PlayCircle className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium">קורסים</span>
            </Link>
            <Link
              href="/live-log"
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeNav === 'live-log' 
                  ? 'bg-[#F52F8E] text-white' 
                  : 'text-gray-700 hover:bg-white hover:text-[#F52F8E]'
              }`}
            >
              <Calendar className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium">יומן לייבים</span>
            </Link>
            {/* Live Room - Dynamic Menu Item (only shows when there's a live event within 1 hour) */}
            {hasLiveEvent && (
              <Link
                href="/live-room"
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  pathname === '/live-room'
                    ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/30' 
                    : 'text-gray-700 hover:bg-gradient-to-r hover:from-pink-50 hover:to-rose-50 hover:text-pink-600'
                }`}
              >
                <Radio className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">חדר לייב</span>
                <span className="ml-auto w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              </Link>
            )}
            <Link
              href="/blog"
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeNav === 'blog' 
                  ? 'bg-[#F52F8E] text-white' 
                  : 'text-gray-700 hover:bg-white hover:text-[#F52F8E]'
              }`}
            >
              <BookOpen className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium">בלוג</span>
            </Link>
            {/* Admin Panel Link - Only for admins */}
            {currentUser && (() => {
              const role = currentUser.roles || currentUser.role;
              const roleName = typeof role === 'object' ? role?.name : role;
              return roleName === 'admin';
            })() && (
              <Link
                href="/admin"
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeNav === 'admin' 
                    ? 'bg-[#F52F8E] text-white' 
                    : 'text-gray-700 hover:bg-white hover:text-[#F52F8E]'
                }`}
              >
                <Shield className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">פאנל ניהול</span>
              </Link>
            )}
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
            className="fixed right-0 top-0 h-full w-80 bg-white shadow-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold gradient-text">תפריט</h2>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-gray-600 hover:text-pink-500 transition-colors"
                aria-label="סגור תפריט"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-4 space-y-2">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  activeNav === 'home' 
                    ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/30 scale-105' 
                    : 'text-gray-700 hover:bg-gradient-to-r hover:from-pink-50 hover:to-rose-50 hover:text-pink-600 hover:scale-105'
                }`}
              >
                <HomeIcon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">בית</span>
              </Link>
              <Link
                href="/members"
                onClick={() => setMobileMenuOpen(false)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeNav === 'members' 
                    ? 'bg-[#F52F8E] text-white' 
                    : 'text-gray-700 hover:bg-white hover:text-[#F52F8E]'
                }`}
              >
                <Users className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">חברים</span>
              </Link>
              <Link
                href="/forums"
                onClick={() => setMobileMenuOpen(false)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeNav === 'forums' 
                    ? 'bg-[#F52F8E] text-white' 
                    : 'text-gray-700 hover:bg-white hover:text-[#F52F8E]'
                }`}
              >
                <MessageSquare className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">פורומים</span>
              </Link>
              <Link
                href="/recordings"
                onClick={() => setMobileMenuOpen(false)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeNav === 'recordings' 
                    ? 'bg-[#F52F8E] text-white' 
                    : 'text-gray-700 hover:bg-white hover:text-[#F52F8E]'
                }`}
              >
                <Video className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">הקלטות</span>
              </Link>
              <Link
                href="/projects"
                onClick={() => setMobileMenuOpen(false)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeNav === 'projects' 
                    ? 'bg-[#F52F8E] text-white' 
                    : 'text-gray-700 hover:bg-white hover:text-[#F52F8E]'
                }`}
              >
                <Briefcase className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">פרויקטים</span>
              </Link>
              <Link
                href="/courses"
                onClick={() => setMobileMenuOpen(false)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeNav === 'courses' 
                    ? 'bg-[#F52F8E] text-white' 
                    : 'text-gray-700 hover:bg-white hover:text-[#F52F8E]'
                }`}
              >
                <PlayCircle className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">קורסים</span>
              </Link>
              <Link
                href="/live-log"
                onClick={() => setMobileMenuOpen(false)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeNav === 'live-log' 
                    ? 'bg-[#F52F8E] text-white' 
                    : 'text-gray-700 hover:bg-white hover:text-[#F52F8E]'
                }`}
              >
                <Calendar className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">יומן לייבים</span>
              </Link>
              {/* Live Room - Dynamic Menu Item (only shows when there's a live event within 1 hour) */}
              {hasLiveEvent && (
                <Link
                  href="/live-room"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    pathname === '/live-room'
                      ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/30' 
                      : 'text-gray-700 hover:bg-gradient-to-r hover:from-pink-50 hover:to-rose-50 hover:text-pink-600'
                  }`}
                >
                  <Radio className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium">חדר לייב</span>
                  <span className="ml-auto w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                </Link>
              )}
              <Link
                href="/blog"
                onClick={() => setMobileMenuOpen(false)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeNav === 'blog' 
                    ? 'bg-[#F52F8E] text-white' 
                    : 'text-gray-700 hover:bg-white hover:text-[#F52F8E]'
                }`}
              >
                <BookOpen className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">בלוג</span>
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
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeNav === 'admin' 
                      ? 'bg-[#F52F8E] text-white' 
                      : 'text-gray-700 hover:bg-white hover:text-[#F52F8E]'
                  }`}
                >
                  <Shield className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium">פאנל ניהול</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className={`transition-all duration-300 ease-in-out ${
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

