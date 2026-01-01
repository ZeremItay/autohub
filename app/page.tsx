'use client';

import { 
  Heart,
  Share2,
  MessageCircle,
  Calendar,
  Briefcase,
  MessageSquare,
  Users,
  Video,
  BookOpen,
  PlayCircle,
  Send,
  Plus,
  X,
  Trash2,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Radio,
  Megaphone,
} from 'lucide-react';
import { useState, useEffect, useRef, useMemo } from 'react';
import { getPosts, createPost, deletePost, toggleLike, checkUserLikedPost, type PostWithProfile } from '@/lib/queries/posts';
import { getAllProfiles, getFriendsList, type ProfileWithRole } from '@/lib/queries/profiles';
import { getUpcomingEvents, type Event } from '@/lib/queries/events';
import { getAllRecordings } from '@/lib/queries/recordings';
import { getAllForums, getForumPosts } from '@/lib/queries/forums';
import { getAllProjects } from '@/lib/queries/projects';
import { getPostComments, createPostComment, deletePostComment, type PostComment } from '@/lib/queries/post-comments';
import { CommentsList } from '@/app/components/comments';
import { getActiveNews, type News } from '@/lib/queries/news';
import { getAllReports, type Report } from '@/lib/queries/reports';
import { supabase } from '@/lib/supabase';
import { clearCache } from '@/lib/cache';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { useOnlineUsers } from '@/lib/hooks/useOnlineUsers';
import { isAdmin } from '@/lib/utils/user';
import { formatTimeAgo, formatTimeFromDate, formatCurrentDate } from '@/lib/utils/date';
import { logError } from '@/lib/utils/errorHandler';
import { getInitials } from '@/lib/utils/display';
import { lazyLoad } from '@/lib/utils/lazyLoad';
import { useTheme } from '@/lib/contexts/ThemeContext';
import {
  getCardStyles,
  getTextStyles,
  getBadgeStyles,
  getButtonStyles,
  getBorderStyles,
  getBackgroundStyles,
  getEmptyStateStyles,
  combineStyles
} from '@/lib/utils/themeStyles';
import Link from 'next/link';

interface RecentUpdate {
  type: 'forum' | 'project' | 'recording' | 'event';
  text: string;
  time: string;
  icon: string;
  link?: string;
  id?: string;
}

// SessionStorage keys and TTL (outside component to avoid re-creation)
const HOMEPAGE_CACHE_KEY = 'homepage-data';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export default function Home() {
  // Use custom hooks for user data
  const { user: currentUser, isAdmin: userIsAdmin, refetch: refetchUser } = useCurrentUser();
  const { users: onlineUsers } = useOnlineUsers();
  const { theme } = useTheme();
  
  const [announcements, setAnnouncements] = useState<PostWithProfile[]>([]);
  const [friends, setFriends] = useState<ProfileWithRole[]>([]);
  const [activeFriendsTab, setActiveFriendsTab] = useState<'active' | 'new'>('active');
  const [friendsBadges, setFriendsBadges] = useState<Record<string, any>>({});
  const [recentUpdates, setRecentUpdates] = useState<RecentUpdate[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPostForm, setShowPostForm] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImageUrl, setNewPostImageUrl] = useState('');
  const [postComments, setPostComments] = useState<Record<string, PostComment[]>>({});
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingTo] = useState<Record<string, string | null>>({});
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [news, setNews] = useState<News[]>([]);
  const [currentNewsIndex, setCurrentNewsIndex] = useState(0);
  const [reports, setReports] = useState<Report[]>([]);
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});

  // Save data to sessionStorage
  function saveToSessionStorage(data: {
    announcements: PostWithProfile[];
    friends: ProfileWithRole[];
    upcomingEvents: Event[];
    news: News[];
    reports: Report[];
    timestamp: number;
  }) {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.setItem(HOMEPAGE_CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      logError(error, 'saveToSessionStorage');
    }
  }

  // Load data from sessionStorage
  function loadFromSessionStorage(): {
    announcements: PostWithProfile[];
    friends: ProfileWithRole[];
    upcomingEvents: Event[];
    news: News[];
    reports: Report[];
    timestamp: number;
  } | null {
    if (typeof window === 'undefined') return null;
    try {
      const cached = sessionStorage.getItem(HOMEPAGE_CACHE_KEY);
      if (!cached) return null;
      
      const data = JSON.parse(cached);
      const now = Date.now();
      
      // Check if cache is still valid (not older than TTL)
      if (now - data.timestamp > CACHE_TTL) {
        sessionStorage.removeItem(HOMEPAGE_CACHE_KEY);
        return null;
      }
      
      return data;
    } catch (error) {
      logError(error, 'loadFromSessionStorage');
      return null;
    }
  }

  // Use ref to store refetchUser to avoid re-running useEffect when it changes
  const refetchUserRef = useRef(refetchUser);
  useEffect(() => {
    refetchUserRef.current = refetchUser;
  }, [refetchUser]);

  useEffect(() => {
    let isMounted = true;
    
    // Try to load from sessionStorage first (stale-while-revalidate pattern)
    const cachedData = loadFromSessionStorage();
    if (cachedData && isMounted) {
      // Set data immediately from cache (no loading state)
      setAnnouncements(cachedData.announcements || []);
      setFriends(cachedData.friends || []);
      setUpcomingEvents(cachedData.upcomingEvents || []);
      setNews(cachedData.news || []);
      setReports(cachedData.reports || []);
      setLoading(false); // Don't show loading if we have cached data
      
      // Update data in background (stale-while-revalidate)
      loadData().catch(() => {
        // Silently fail - we already have cached data
      });
    } else {
      // No cached data - load fresh
      if (isMounted) {
        loadData();
      }
    }
    
    // Auto-rotate news carousel every 5 seconds
    let newsInterval: NodeJS.Timeout | null = null;
    if (news.length > 1) {
      newsInterval = setInterval(() => {
        setCurrentNewsIndex((prev) => (prev === news.length - 1 ? 0 : prev + 1));
      }, 5000);
    }
    
    // Listen for auth state changes to reload data when user logs out
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (!isMounted) return;
      
      if (event === 'SIGNED_OUT') {
        // Clear cache and sessionStorage when user logs out
        clearCache('profiles:all');
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem(HOMEPAGE_CACHE_KEY);
        }
        loadData();
        refetchUserRef.current();
      } else if (event === 'SIGNED_IN') {
        // Clear cache and sessionStorage when user logs in
        clearCache('profiles:all');
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem(HOMEPAGE_CACHE_KEY);
        }
        refetchUserRef.current();
        loadData();
      }
    });

    // Listen for profile updates
    const handleProfileUpdate = () => {
      if (!isMounted) return;
      clearCache('profiles:all');
      // Clear sessionStorage on profile update to force fresh load
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(HOMEPAGE_CACHE_KEY);
      }
      loadData();
      refetchUserRef.current();
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      window.removeEventListener('profileUpdated', handleProfileUpdate);
      if (newsInterval) clearInterval(newsInterval);
    };
  }, []); // Empty dependencies - run only once on mount

  // Auto-rotate news carousel every 5 seconds
  useEffect(() => {
    if (!news || !Array.isArray(news) || news.length <= 1) return;
    
    const newsInterval = setInterval(() => {
      setCurrentNewsIndex((prev) => (prev === news.length - 1 ? 0 : prev + 1));
    }, 5000);

    return () => {
      clearInterval(newsInterval);
    };
  }, [news]);

  // Poll for new reports every 10 seconds to keep ticker updated
  useEffect(() => {
    const reportsInterval = setInterval(async () => {
      try {
        const { getAllReports } = await import('@/lib/queries/reports');
        const reportsResult = await getAllReports(10);
        
        if (reportsResult?.data && Array.isArray(reportsResult.data) && reportsResult.data.length > 0) {
          const publishedReports = reportsResult.data.filter((r: any) => r.is_published === true);
          setReports(publishedReports);
        } else {
          setReports([]);
        }
      } catch (error) {
        logError(error, 'pollReports');
      }
    }, 10000); // Poll every 10 seconds

    return () => {
      clearInterval(reportsInterval);
    };
  }, []);



  async function loadData() {
    setLoading(true);
    try {
      // Load ALL data in parallel including data needed for recent updates
      // Use optimized getFriendsList for friends section
      const [
        postsResult, 
        profilesResult, 
        eventsResult, 
        newsResult, 
        reportsResult,
        forumsResult,
        recordingsResult,
        projectsResult
      ] = await Promise.all([
        getPosts(),
        getFriendsList(), // Use optimized function for friends
        getUpcomingEvents(5),
        getActiveNews(),
        getAllReports(10),
        getAllForums(),
        getAllRecordings(),
        getAllProjects()
      ]);

      // Process announcements
      if (postsResult?.data && Array.isArray(postsResult.data)) {
        const adminPosts = postsResult.data.filter((post: any) => {
          const role = post.profile?.roles || post.profile?.role;
          const roleName = typeof role === 'object' ? role?.name : role;
          return roleName === 'admin' || post.is_announcement === true;
        });
        setAnnouncements(adminPosts);
        
        // Load liked posts for current user - do this in background after page loads
        if (currentUser) {
          const userId = currentUser.user_id || currentUser.id;
          if (userId) {
            // Load in background - don't block page load
            lazyLoad(async () => {
              try {
                const likedPostsMap: Record<string, boolean> = {};
                await Promise.all(
                  adminPosts.map(async (post: any) => {
                    try {
                      const { liked } = await checkUserLikedPost(post.id, userId);
                      likedPostsMap[post.id] = liked;
                    } catch (error) {
                      // Silently fail
                    }
                  })
                );
                setLikedPosts(likedPostsMap);
              } catch (error) {
                // Silently fail
              }
            }, 500).catch(() => {
              // Silently fail
            });
          }
        }
      }

      // Process profiles
      if (profilesResult?.data && Array.isArray(profilesResult.data)) {
        setFriends(profilesResult.data);
        
        // Load badges lazily after initial render - completely in background
        // This will be done much later to not block anything - DISABLED FOR NOW TO IMPROVE PERFORMANCE
        // setTimeout(async () => {
        //   try {
        //     const { getUserHighestBadge } = await import('@/lib/queries/badges');
        //     const badgesMap: Record<string, any> = {};
        //     // Only load badges for first 3 friends to avoid too many requests
        //     await Promise.all(
        //       profilesResult.data.slice(0, 3).map(async (friend: any) => {
        //         const friendUserId = friend.user_id || friend.id;
        //         if (friendUserId) {
        //           try {
        //             const { data: badgeData } = await getUserHighestBadge(friendUserId);
        //             if (badgeData) {
        //               badgesMap[friendUserId] = badgeData;
        //             }
        //           } catch (error) {
        //             // Silently fail - badges are not critical
        //           }
        //         }
        //       })
        //     );
        //     setFriendsBadges(badgesMap);
        //   } catch (error) {
        //     // Silently fail - badges are not critical
        //   }
        // }, 5000); // Load after 5 seconds - completely non-blocking
      }

      // Process events
      if (eventsResult?.data && Array.isArray(eventsResult.data)) {
        setUpcomingEvents(eventsResult.data);
      }

      // Load news
      if (newsResult?.data && Array.isArray(newsResult.data)) {
        setNews(newsResult.data);
      }

      // Load reports from database - only published reports, sorted by created_at DESC, limit 10
      // Query already filters for is_published=true, orders by created_at DESC
        if (reportsResult?.data && Array.isArray(reportsResult.data) && reportsResult.data.length > 0) {
          // Filter to ensure all are published (query should already do this, but double-check)
          const publishedReports = reportsResult.data.filter((r: any) => r.is_published === true);
          setReports(publishedReports);
        } else {
          // No reports found in database
          setReports([]);
        }

      // Process recent updates immediately with data we already loaded
      // This ensures "עדכונים אחרונים" appears with all other data
      try {
        await loadRecentUpdates(
          eventsResult.data || [],
          forumsResult,
          recordingsResult,
          projectsResult
        );
      } catch (error) {
        // Silently fail - recent updates are not critical
        logError(error, 'loadRecentUpdates');
      }

      // Set loading to false after all data is processed
      setLoading(false);

      // Save to sessionStorage after successful load (non-blocking)
      saveToSessionStorage({
        announcements: postsResult?.data ? postsResult.data.filter((post: any) => {
          const role = post.profile?.roles || post.profile?.role;
          const roleName = typeof role === 'object' ? role?.name : role;
          return roleName === 'admin' || post.is_announcement === true;
        }) : [],
        friends: profilesResult?.data || [],
        upcomingEvents: eventsResult?.data || [],
        news: newsResult?.data || [],
        reports: reportsResult?.data ? reportsResult.data.filter((r: any) => r.is_published === true) : [],
        timestamp: Date.now()
      });
    } catch (error) {
      logError(error, 'loadData');
      setLoading(false);
    }
  }


  async function loadRecentUpdates(
    eventsData: Event[] = [],
    forumsResult?: any,
    recordingsResult?: any,
    projectsResult?: any
  ) {
    try {
      const updates: RecentUpdate[] = [];
      
      // If data wasn't provided, load it (fallback for backward compatibility)
      let forums = forumsResult;
      let recordings = recordingsResult;
      let projects = projectsResult;
      
      if (!forums || !recordings || !projects) {
        const [forumsRes, recordingsRes, projectsRes] = await Promise.all([
          getAllForums(),
          getAllRecordings(),
          getAllProjects()
        ]);
        forums = forums || forumsRes;
        recordings = recordings || recordingsRes;
        projects = projects || projectsRes;
      }

      // Type guard for results
      const hasData = (result: any): result is { data: any[] } => {
        return result && result.data && Array.isArray(result.data);
      };

      // Get recent forum posts - limit to first 2 forums and load posts in parallel
      if (forums?.data && forums.data.length > 0) {
        const forumsToLoad = forums.data.slice(0, 2);
        const forumPostsPromises = forumsToLoad.map(forum => getForumPosts(forum.id));
        const forumPostsResults = await Promise.all(forumPostsPromises);
        
        forumPostsResults.forEach((result, index) => {
          if (result.data && result.data.length > 0) {
            const recentPost = result.data[0];
            const forum = forumsToLoad[index];
            updates.push({
              type: 'forum',
              text: `${recentPost.profile?.display_name || 'משתמש'} פרסם פוסט: ${recentPost.title}`,
              time: formatTimeAgo(recentPost.created_at),
              icon: '💬',
              link: `/forums/${forum.id}/posts/${recentPost.id}`,
              id: recentPost.id
            });
          }
        });
      }

      // Get recent recordings
      if (recordings?.data && recordings.data.length > 0) {
        const recentRecording = recordings.data[0];
        updates.push({
          type: 'recording',
          text: `העלתה הדרכה חדשה: ${recentRecording.title}`,
          time: formatTimeAgo(recentRecording.created_at),
          icon: '🎥',
          link: `/recordings/${recentRecording.id}`,
          id: recentRecording.id
        });
      }

      // Get recent projects
      if (projects?.data && Array.isArray(projects.data) && projects.data.length > 0) {
        const recentProject = projects.data[0];
        updates.push({
          type: 'project',
          text: `${recentProject.user?.display_name || 'משתמש'} העלה פרויקט חדש: ${recentProject.title}`,
          time: formatTimeAgo(recentProject.created_at),
          icon: '📄',
          link: `/projects#${recentProject.id}`,
          id: recentProject.id
        });
      }

      // Get recent events (from parameter)
      if (eventsData.length > 0) {
        const recentEvent = eventsData[0];
        updates.push({
          type: 'event',
          text: `נוסף אירוע חדש: ${recentEvent.title}`,
          time: formatTimeAgo(recentEvent.created_at),
          icon: '📅',
          link: `/live/${recentEvent.id}`,
          id: recentEvent.id
        });
      }

      // Sort by time (most recent first) and take first 5
      updates.sort((a, b) => {
        // Parse dates for proper sorting - use created_at if available
        try {
          const dateA = a.id ? new Date(a.id).getTime() : 0;
          const dateB = b.id ? new Date(b.id).getTime() : 0;
          return dateB - dateA;
        } catch {
          return 0;
        }
      });
      
      setRecentUpdates(updates.slice(0, 5));
    } catch (error) {
      console.error('Error loading recent updates:', error);
    }
  }


  async function handleCreatePost() {
    if (!newPostContent.trim() || !currentUser) return;
    
    try {
      // Use user_id from currentUser (should match auth.uid())
      const userId = currentUser.user_id || currentUser.id;
      if (!userId) {
        alert('שגיאה: לא נמצא משתמש מחובר');
        return;
      }
      
      const postData: any = {
        user_id: userId,
        content: newPostContent,
        is_announcement: true
      };
      
      if (newPostImageUrl.trim()) {
        // Use media_url if image_url doesn't exist in the table
        postData.media_url = newPostImageUrl.trim();
        postData.media_type = 'image';
      }
      
      const { data, error } = await createPost(postData);
      
      if (!error && data) {
        setNewPostContent('');
        setNewPostImageUrl('');
        setShowPostForm(false);
        await loadData();
      } else {
        const errorMessage = (error as any)?.message || (error as any)?.details || 'שגיאה לא ידועה';
        logError(error, 'handleCreatePost:fullError');
        alert(`שגיאה ביצירת הפוסט: ${errorMessage}`);
      }
    } catch (error) {
      logError(error, 'handleCreatePost');
      alert('שגיאה ביצירת הפוסט. אנא נסה שוב.');
    }
  }

  async function loadPostComments(postId: string) {
    try {
      const { data, error } = await getPostComments(postId);
      if (!error && data) {
        setPostComments(prev => ({ ...prev, [postId]: data }));
      }
    } catch (error) {
      logError(error, 'loadComments');
    }
  }

  async function handleToggleComments(postId: string) {
    const isExpanded = expandedComments[postId];
    setExpandedComments(prev => ({ ...prev, [postId]: !isExpanded }));
    
    if (!isExpanded && !postComments[postId]) {
      await loadPostComments(postId);
    }
  }

  async function handleSubmitComment(postId: string, text?: string) {
    const commentText = text || commentTexts[postId];
    if (!commentText?.trim() || !currentUser) return;
    
    try {
      const userId = currentUser.user_id || currentUser.id;
      if (!userId) {
        alert('שגיאה: לא נמצא משתמש מחובר');
        return;
      }
      
      const { data, error } = await createPostComment(
        postId,
        userId,
        commentText
      );
      
      if (!error && data) {
        if (!text) {
          setCommentTexts(prev => ({ ...prev, [postId]: '' }));
        }
        // Update comments count locally
        setAnnouncements(prev => prev.map(post => 
          post.id === postId 
            ? { ...post, comments_count: (post.comments_count || 0) + 1 }
            : post
        ));
        // Reload comments
        await loadPostComments(postId);
      } else {
        alert('שגיאה ביצירת התגובה. אנא נסה שוב.');
      }
    } catch (error) {
      logError(error, 'handleSubmitComment');
      alert('שגיאה ביצירת התגובה. אנא נסה שוב.');
    }
  }

  async function handleSubmitReply(postId: string, parentId: string, text?: string) {
    const replyText = text || replyTexts[`${postId}-${parentId}`];
    if (!replyText?.trim() || !currentUser) return;
    
    try {
      const userId = currentUser.user_id || currentUser.id;
      if (!userId) {
        alert('שגיאה: לא נמצא משתמש מחובר');
        return;
      }
      
      const { data, error } = await createPostComment(
        postId,
        userId,
        replyText,
        parentId
      );
      
      if (!error && data) {
        if (!text) {
          setReplyTexts(prev => ({ ...prev, [`${postId}-${parentId}`]: '' }));
          setReplyingTo(prev => ({ ...prev, [postId]: null }));
        }
        // Update comments count locally
        setAnnouncements(prev => prev.map(post => 
          post.id === postId 
            ? { ...post, comments_count: (post.comments_count || 0) + 1 }
            : post
        ));
        // Reload comments
        await loadPostComments(postId);
      } else {
        alert('שגיאה ביצירת התגובה. אנא נסה שוב.');
      }
    } catch (error) {
      logError(error, 'handleSubmitReply');
      alert('שגיאה ביצירת התגובה. אנא נסה שוב.');
    }
  }

  async function handleDeleteComment(postId: string, commentId: string) {
    if (!confirm('האם אתה בטוח שברצונך למחוק את התגובה?')) return;
    
    try {
      const { error } = await deletePostComment(commentId);
      if (!error) {
        // Update comments count locally
        setAnnouncements(prev => prev.map(post => 
          post.id === postId 
            ? { ...post, comments_count: Math.max(0, (post.comments_count || 0) - 1) }
            : post
        ));
        // Reload comments
        await loadPostComments(postId);
      } else {
        alert('שגיאה במחיקת התגובה. אנא נסה שוב.');
      }
    } catch (error) {
      logError(error, 'handleDeleteComment');
      alert('שגיאה במחיקת התגובה. אנא נסה שוב.');
    }
  }

  async function handleToggleLike(postId: string) {
    if (!currentUser) {
      // Cannot toggle like: no current user
      return;
    }
    
    const userId = currentUser.user_id || currentUser.id;
    if (!userId) {
      // Cannot toggle like: no user ID
      return;
    }
    
    try {
      // Optimistically update UI
      const wasLiked = likedPosts[postId] || false;
      // Toggling like
      
      setLikedPosts(prev => ({ ...prev, [postId]: !wasLiked }));
      
      // Update likes count optimistically
      setAnnouncements(prev => prev.map(post => 
        post.id === postId 
          ? { 
              ...post, 
              likes_count: wasLiked 
                ? Math.max(0, (post.likes_count || 0) - 1)
                : (post.likes_count || 0) + 1
            }
          : post
      ));
      
      // Toggle like in database
      const result = await toggleLike(postId, userId);
      // Toggle like result
      
      const { data, error } = result;
      
      // If we have data, the operation succeeded - update state
      if (data) {
        // Like operation succeeded
        setLikedPosts(prev => ({ ...prev, [postId]: data.liked }));
      } else if (error) {
        // Check if error is meaningful
        const errorKeys = error && typeof error === 'object' ? Object.keys(error) : [];
        const isEmptyError = errorKeys.length === 0;
        const errorObj = error as any;
        const hasErrorDetails = errorObj?.message || errorObj?.code || errorObj?.details || errorObj?.hint;
        
        if (!isEmptyError && hasErrorDetails) {
          // Real error - revert optimistic update
          logError(error, 'handleToggleLike');
          setLikedPosts(prev => ({ ...prev, [postId]: wasLiked }));
          setAnnouncements(prev => prev.map(post => 
            post.id === postId 
              ? { 
                  ...post, 
                  likes_count: wasLiked 
                    ? (post.likes_count || 0) + 1
                    : Math.max(0, (post.likes_count || 0) - 1)
                }
              : post
          ));
        } else {
          // Empty error - operation likely succeeded, keep optimistic update
          // Empty error object, keeping optimistic update
        }
      } else {
        // No data and no error - this shouldn't happen, but keep optimistic update
        // Toggle like returned no data and no error
      }
    } catch (error) {
      logError(error, 'handleToggleLike:exception');
      // Revert on exception
      const wasLiked = likedPosts[postId] || false;
      setLikedPosts(prev => ({ ...prev, [postId]: wasLiked }));
    }
  }

  async function handleDeletePost(postId: string) {
    if (!confirm('האם אתה בטוח שברצונך למחוק את הפוסט הזה?')) {
      return;
    }
    
    try {
      const { error } = await deletePost(postId);
      
      if (!error) {
        // Remove post from local state
        setAnnouncements(prev => prev.filter(post => post.id !== postId));
        // Clear comments for this post
        setPostComments(prev => {
          const newComments = { ...prev };
          delete newComments[postId];
          return newComments;
        });
        // Clear expanded comments
        setExpandedComments(prev => {
          const newExpanded = { ...prev };
          delete newExpanded[postId];
          return newExpanded;
        });
        // Clear liked status
        setLikedPosts(prev => {
          const newLiked = { ...prev };
          delete newLiked[postId];
          return newLiked;
        });
      } else {
        alert('שגיאה במחיקת הפוסט. אנא נסה שוב.');
      }
    } catch (error) {
      logError(error, 'handleDeletePost');
      alert('שגיאה במחיקת הפוסט. אנא נסה שוב.');
    }
  }


  // Filter friends based on active tab - memoized for performance
  const filteredFriends = useMemo(() => {
    if (activeFriendsTab === 'active') {
      // Filter active friends and limit to 5
      return friends.filter((f: any) => f.is_online === true).slice(0, 5);
    } else {
      // Filter new friends: only those who registered in the last 3 days, limit to 5
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      
      return [...friends]
        .filter((f: any) => {
          if (!f.created_at) return false;
          const createdDate = new Date(f.created_at);
          return createdDate >= threeDaysAgo;
        })
        .sort((a: any, b: any) => {
          const aDate = new Date(a.created_at || 0).getTime();
          const bDate = new Date(b.created_at || 0).getTime();
          return bDate - aDate;
        })
        .slice(0, 5);
    }
  }, [friends, activeFriendsTab]);

  // Calculate remaining active friends count
  const activeFriendsCount = useMemo(() => {
    return friends.filter((f: any) => f.is_online === true).length;
  }, [friends]);

  const remainingActiveFriends = Math.max(0, activeFriendsCount - 5);

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-7xl mx-auto text-center py-12">טוען...</div>
      </div>
    );
  }

  return (
    <div className="px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6">
      {/* Reports News Ticker - Bulletproof Infinite Scrolling Marquee */}
      <style dangerouslySetInnerHTML={{__html: `
        @media (prefers-reduced-motion: no-preference) {
          @keyframes marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .animate-marquee {
            animation: marquee 40s linear infinite;
            display: flex;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-marquee {
            animation: none !important;
            display: flex;
          }
        }
        .paused {
          animation-play-state: paused;
        }
      `}} />
      <div className="max-w-7xl mx-auto mb-6">
        <div className={combineStyles(
          'w-full shadow-sm rounded-lg overflow-hidden h-12 flex items-center relative',
          getCardStyles(theme, 'glass'),
          theme !== 'light' && 'rounded-2xl'
        )}>
          {/* Badge - Absolutely positioned on the right with gradient fade */}
          <div className="absolute right-0 z-10 h-full flex items-center pr-4">
            {theme === 'light' && (
              <div className="bg-gradient-to-l from-white via-white to-transparent w-24 h-full absolute right-0"></div>
            )}
            {theme !== 'light' && (
              <div className="bg-gradient-to-l from-dark-purple via-dark-purple to-transparent w-24 h-full absolute right-0"></div>
            )}
            <div 
              className={`text-xs font-bold px-3 py-1 rounded-full relative z-10 ${
                theme === 'light'
                  ? 'bg-red-600'
                  : 'bg-hot-pink'
              }`}
              style={{ color: 'white' }}
            >
              דיווחים
            </div>
          </div>
          
          {/* Content - Scrolling marquee with two sets for seamless loop */}
          <div className="flex-1 overflow-hidden relative group pr-32">
            {reports.length > 0 ? (
              <div className="flex flex-row overflow-hidden relative">
                {/* Wrapper that contains BOTH sets - animation on this wrapper */}
                <div className="flex shrink-0 items-center gap-4 animate-marquee group-hover:paused whitespace-nowrap">
                  {/* Set 1 */}
                  {reports.map((report, index) => (
                    <span key={`report-1-${index}-${report.id}`} className="inline-flex items-center">
                      {index > 0 && <span className={combineStyles('mx-2', getTextStyles(theme, 'muted'))}>•</span>}
                      <Link
                        href={`/reports/${report.id}`}
                        dir="rtl"
                        className={`inline-flex items-center gap-2 text-sm font-medium transition-colors whitespace-nowrap px-4 ${
                          theme === 'light'
                            ? 'text-gray-800 hover:text-red-600'
                            : 'text-white hover:text-hot-pink'
                        }`}
                      >
                        <span className={`font-medium text-xs ${
                          theme === 'light' ? 'text-[var(--color-pink-700)]' : 'text-gray-300'
                        }`}>
                          {report.created_at ? formatTimeFromDate(report.created_at) : ''}
                        </span>
                        <span className={getTextStyles(theme, 'heading')}>
                          {report.title}
                        </span>
                      </Link>
                      <span className={`mx-4 ${theme === 'light' ? 'text-red-400' : 'text-gray-400'}`}>|</span>
                    </span>
                  ))}
                  {/* Set 2 - Duplicate for seamless loop */}
                  {reports.map((report, index) => (
                    <span key={`report-2-${index}-${report.id}`} className="inline-flex items-center">
                      {index > 0 && <span className={combineStyles('mx-2', getTextStyles(theme, 'muted'))}>•</span>}
                      <Link
                        href={`/reports/${report.id}`}
                        dir="rtl"
                        className={`inline-flex items-center gap-2 text-sm font-medium transition-colors whitespace-nowrap px-4 ${
                          theme === 'light'
                            ? 'text-gray-800 hover:text-red-600'
                            : 'text-white hover:text-hot-pink'
                        }`}
                      >
                        <span className={`font-medium text-xs ${
                          theme === 'light' ? 'text-[var(--color-pink-700)]' : 'text-gray-300'
                        }`}>
                          {report.created_at ? formatTimeFromDate(report.created_at) : ''}
                        </span>
                        <span className={getTextStyles(theme, 'heading')}>
                          {report.title}
                        </span>
                      </Link>
                      <span className={`mx-4 ${theme === 'light' ? 'text-red-400' : 'text-gray-400'}`}>|</span>
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center">
                <span className={combineStyles('text-sm font-medium', getTextStyles(theme, 'heading'))}>אין דיווחים חדשים</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-4 sm:gap-6">
        {/* Left Sidebar - Desktop */}
        <aside className="hidden lg:block w-80 flex-shrink-0 space-y-4 sm:space-y-6">
          {/* Who is Online */}
          <div className={`shadow-sm p-5 ${
            theme === 'light' 
              ? 'bg-white rounded-xl border border-gray-300' 
              : 'glass-card rounded-2xl'
          }`}>
            <h2 className={combineStyles(
              'text-lg font-semibold mb-4',
              getTextStyles(theme, 'heading')
            )}>מי מחובר?</h2>
            {onlineUsers.length === 0 ? (
              <div className={combineStyles(
                'p-4 rounded-lg border',
                getEmptyStateStyles(theme)
              )}>
                <p className={combineStyles(
                  'text-sm',
                  getTextStyles(theme, 'muted')
                )}>אין חברים מחוברים כרגע</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {onlineUsers.map((user: any) => (
                    <div
                      key={user.id || user.user_id}
                      className="relative group"
                      title={user.display_name || user.first_name || 'משתמש'}
                    >
                      {user.avatar_url ? (
                        <img
                          src={`${user.avatar_url}?t=${Date.now()}`}
                          alt={user.display_name || 'User'}
                          className="w-10 h-10 rounded-full border-2 border-green-500 cursor-pointer hover:scale-110 transition-transform"
                          key={`online-${user.id || user.user_id}-${user.avatar_url}`}
                        />
                      ) : (
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm border-2 border-green-500 cursor-pointer hover:scale-110 transition-transform ${
                          theme === 'light'
                            ? 'bg-blue-500'
                            : 'bg-gradient-to-br from-blue-500 to-purple-500'
                        }`}>
                          {getInitials(user.display_name || user.first_name)}
                        </div>
                      )}
                      <div className={`absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 z-10 ${
                        theme === 'light' ? 'border-white' : 'border-dark-purple'
                      }`}></div>
                      {/* Badge overlay - bottom left */}
                      {(() => {
                        const userBadge = friendsBadges[user.user_id || user.id];
                        if (userBadge?.badge) {
                          return (
                            <div className={`absolute bottom-0 left-0 w-5 h-5 rounded-full flex items-center justify-center shadow-lg border-2 z-10 ${
                              theme === 'light'
                                ? 'bg-orange-500 border-white'
                                : 'bg-gradient-to-br from-orange-400 to-orange-600 border-dark-purple'
                            }`}>
                              <span 
                                style={{ color: userBadge.badge.icon_color || '#FFD700', fontSize: '10px' }}
                                className="leading-none"
                              >
                                {userBadge.badge.icon || '⭐'}
                              </span>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  ))}
                </div>
                <p className={combineStyles(
                  'text-xs',
                  getTextStyles(theme, 'muted')
                )}>
                  {onlineUsers.length} {onlineUsers.length === 1 ? 'חבר מחובר' : 'חברים מחוברים'}
                </p>
              </div>
            )}
          </div>

          {/* Recent Updates */}
          <div className={combineStyles(
            'shadow-sm p-5',
            getCardStyles(theme, 'glass'),
            theme === 'light' ? 'rounded-xl' : 'rounded-2xl'
          )}>
            <h2 className={combineStyles(
              'text-lg font-semibold mb-4',
              getTextStyles(theme, 'heading')
            )}>עדכונים אחרונים</h2>
            {recentUpdates.length === 0 ? (
              <div className={`p-4 rounded-lg border ${
                theme === 'light'
                  ? 'bg-[#F3F4F6] border-pink-200'
                  : 'bg-white/10 border-white/20'
              }`}>
                <p className={`text-sm ${
                  theme === 'light' ? 'text-gray-500' : 'text-gray-300'
                }`}>מצטערים, לא נמצאה פעילות.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentUpdates.map((update, index) => {
                  const content = (
                    <div className={`flex items-start gap-3 cursor-pointer p-2 rounded-lg transition-colors ${
                      theme === 'light' ? 'hover:bg-gray-50' : 'hover:bg-white/10'
                    }`}>
                      {update.type === 'forum' && <MessageSquare className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                        theme === 'light' ? 'text-[#F52F8E]' : 'text-hot-pink'
                      }`} />}
                      {update.type === 'project' && <Briefcase className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                        theme === 'light' ? 'text-purple-600' : 'text-purple-400'
                      }`} />}
                      {update.type === 'recording' && <Video className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                        theme === 'light' ? 'text-blue-600' : 'text-blue-400'
                      }`} />}
                      {update.type === 'event' && <Calendar className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                        theme === 'light' ? 'text-[#F52F8E]' : 'text-hot-pink'
                      }`} />}
                      <div className="flex-1">
                        <p className={`text-sm ${
                          theme === 'light' ? 'text-gray-700' : 'text-gray-100'
                        }`}>{update.text}</p>
                        <p className={`text-xs mt-1 ${
                          theme === 'light' ? 'text-gray-500' : 'text-gray-300'
                        }`}>{update.time}</p>
                      </div>
                    </div>
                  );

                  if (update.link) {
                    return (
                      <Link key={update.id || index} href={update.link}>
                        {content}
                      </Link>
                    );
                  }

                  return <div key={update.id || index}>{content}</div>;
                })}
              </div>
            )}
          </div>

          {/* Upcoming Events */}
          <div className={`shadow-sm p-5 ${
            theme === 'light' 
              ? 'bg-white rounded-xl border border-gray-300' 
              : 'glass-card rounded-2xl'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-lg font-semibold ${
                theme === 'light' ? 'text-gray-800' : 'text-white'
              }`}>אירועים עתידיים</h2>
              <Link href="/live-log" className={combineStyles(
                'text-sm hover:underline',
                getTextStyles(theme, 'accent')
              )}>הכל ←</Link>
            </div>
            {upcomingEvents.length === 0 ? (
              <div className={`p-4 rounded-lg border ${
                theme === 'light'
                  ? 'bg-[#F3F4F6] border-pink-200'
                  : 'bg-white/10 border-white/20'
              }`}>
                <p className={`text-sm ${
                  theme === 'light' ? 'text-gray-500' : 'text-gray-300'
                }`}>כרגע אין אירועים קרובים</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.slice(0, 5).map((event) => (
                  <Link
                    key={event.id}
                    href={`/live/${event.id}`}
                    className={`flex items-start gap-3 p-2 rounded-lg transition-colors cursor-pointer group ${
                      theme === 'light' ? 'hover:bg-gray-50' : 'hover:bg-white/10'
                    }`}
                  >
                    <Calendar className={`w-5 h-5 flex-shrink-0 mt-0.5 transition-colors ${
                      theme === 'light' 
                        ? 'text-[#F52F8E] group-hover:text-[#E01E7A]' 
                        : 'text-hot-pink group-hover:text-hot-pink-light'
                    }`} />
                    <div className="flex-1">
                      <p className={`text-sm font-medium transition-colors ${
                        theme === 'light'
                          ? 'text-gray-800 group-hover:text-[#F52F8E]'
                          : 'text-gray-100 group-hover:text-white'
                      }`}>{event.title}</p>
                      <p className={`text-xs mt-1 ${
                        theme === 'light' ? 'text-gray-500' : 'text-gray-300'
                      }`}>
                        {new Date(event.event_date).toLocaleDateString('he-IL')} • {event.event_time}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Center Column - Announcements (Admin Posts Only) */}
        <main className="flex-1 min-w-0 space-y-4 sm:space-y-6">
          {/* News Carousel */}
          {news && news.length > 0 && (
            <div className={combineStyles(
              'shadow-sm p-4 sm:p-6 relative overflow-hidden',
              getCardStyles(theme, 'glass'),
              theme === 'light' ? 'rounded-xl' : 'rounded-2xl'
            )}>
              <div className="relative">
                {/* Carousel Container */}
                <div className="relative h-48 sm:h-64 overflow-hidden rounded-lg">
                  {news.map((item, index) => (
                    <div
                      key={item.id}
                      className={`absolute inset-0 transition-opacity duration-500 ${
                        index === currentNewsIndex ? 'opacity-100' : 'opacity-0'
                      }`}
                    >
                      {item.link_url ? (
                        <Link href={item.link_url} className="block h-full">
                          <div className={`relative h-full rounded-lg overflow-hidden ${
                            theme === 'light'
                              ? 'bg-[#F52F8E]'
                              : 'bg-gradient-to-br from-[#F52F8E] to-pink-500'
                          }`}>
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.title}
                                className="w-full h-full object-cover"
                              />
                            ) : null}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex items-end">
                              <div className="p-4 sm:p-6 text-white w-full">
                                <h3 className="text-lg sm:text-xl font-bold mb-2">{item.title}</h3>
                                {item.content && (
                                  <p className="text-sm sm:text-base opacity-90 line-clamp-2">{item.content}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </Link>
                      ) : (
                        <div className={`relative h-full rounded-lg overflow-hidden ${
                          theme === 'light'
                            ? 'bg-[#F52F8E]'
                            : 'bg-gradient-to-br from-[#F52F8E] to-pink-500'
                        }`}>
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                          ) : null}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex items-end">
                            <div className="p-4 sm:p-6 text-white w-full">
                              <h3 className="text-lg sm:text-xl font-bold mb-2">{item.title}</h3>
                              {item.content && (
                                <p className="text-sm sm:text-base opacity-90 line-clamp-2">{item.content}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Navigation Arrows */}
                {news.length > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentNewsIndex((prev) => (prev === 0 ? news.length - 1 : prev - 1))}
                      className={`absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-2 shadow-lg transition-all z-10 ${
                        theme === 'light'
                          ? 'bg-white/90 hover:bg-white text-gray-800'
                          : 'glass-card hover:bg-white/20 text-white'
                      }`}
                      aria-label="חדשה קודמת"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setCurrentNewsIndex((prev) => (prev === news.length - 1 ? 0 : prev + 1))}
                      className={`absolute left-4 top-1/2 -translate-y-1/2 rounded-full p-2 shadow-lg transition-all z-10 ${
                        theme === 'light'
                          ? 'bg-white/90 hover:bg-white text-gray-800'
                          : 'glass-card hover:bg-white/20 text-white'
                      }`}
                      aria-label="חדשה הבאה"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                  </>
                )}

                {/* Dots Indicator */}
                {news.length > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-4">
                    {news.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentNewsIndex(index)}
                        className={`w-2 h-2 rounded-full transition-all ${
                          index === currentNewsIndex
                            ? `${theme === 'light' ? 'bg-[#F52F8E]' : 'bg-hot-pink'} w-6`
                            : 'bg-gray-300 hover:bg-gray-400'
                        }`}
                        aria-label={`עבור לחדשה ${index + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Create Post Form (Admin Only) */}
          {userIsAdmin && (
            <div className={combineStyles(
              'shadow-sm p-4 sm:p-6',
              getCardStyles(theme, 'glass'),
              theme === 'light' ? 'rounded-xl' : 'rounded-2xl'
            )}>
              {!showPostForm ? (
                <button
                  onClick={() => setShowPostForm(true)}
                  className={`w-full px-4 py-3 rounded-lg transition-all flex items-center justify-center gap-2 font-semibold ${
                    theme === 'light'
                      ? 'bg-[#F52F8E] hover:bg-[#E01E7A]'
                      : 'bg-gradient-to-r from-hot-pink to-rose-500 rounded-full hover:from-hot-pink-dark hover:to-rose-600'
                  }`}
                  style={{ color: 'white' }}
                >
                  <Plus className="w-5 h-5" style={{ color: 'white' }} />
                  <span style={{ color: 'white' }}>פרסם הודעה חדשה</span>
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`text-lg font-semibold ${
                      theme === 'light' ? 'text-gray-800' : 'text-white'
                    }`}>פרסם הודעה חדשה</h3>
                    <button
                      onClick={() => {
                        setShowPostForm(false);
                        setNewPostContent('');
                        setNewPostImageUrl('');
                      }}
                      className={theme === 'light' ? 'text-gray-500 hover:text-gray-700' : 'text-gray-300 hover:text-white'}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <textarea
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    placeholder="מה אתה רוצה לשתף?"
                    dir="rtl"
                    lang="he"
                    className={combineStyles(
                      'w-full px-4 py-3 border rounded-lg focus:outline-none resize-none focus:ring-2 focus:ring-[#F52F8E]',
                      getInputStyles(theme)
                    )}
                    rows={4}
                  />
                  <input
                    type="text"
                    value={newPostImageUrl}
                    onChange={(e) => setNewPostImageUrl(e.target.value)}
                    placeholder="קישור לתמונה (אופציונלי)"
                    className={combineStyles(
                      'w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F52F8E]',
                      getInputStyles(theme)
                    )}
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        setShowPostForm(false);
                        setNewPostContent('');
                        setNewPostImageUrl('');
                      }}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        theme === 'light'
                          ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          : 'bg-white/10 text-gray-200 rounded-full hover:bg-white/20'
                      }`}
                    >
                      ביטול
                    </button>
                    <button
                      onClick={handleCreatePost}
                      disabled={!newPostContent.trim()}
                      className={`px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
                        theme === 'light'
                          ? 'bg-[#F52F8E] hover:bg-[#E01E7A]'
                          : 'bg-hot-pink rounded-full hover:bg-hot-pink-dark'
                      }`}
                      style={{ color: 'white' }}
                    >
                      <Send className="w-4 h-4" style={{ color: 'white' }} />
                      <span style={{ color: 'white' }}>פרסם</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {announcements.length === 0 ? (
            <div className={combineStyles(
              'shadow-sm p-4 sm:p-6',
              getCardStyles(theme, 'glass'),
              theme === 'light' ? 'rounded-xl' : 'rounded-2xl'
            )}>
              <div className={`p-3 sm:p-4 rounded-lg border-l-4 ${
                theme === 'light'
                  ? 'bg-[#F3F4F6] border-[#F52F8E]'
                  : 'bg-white/5 border-hot-pink'
              }`}>
                <p className={`text-xs sm:text-sm ${
                  theme === 'light' ? 'text-gray-500' : 'text-gray-300'
                }`}>מצטערים, לא נמצאה פעילות.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {announcements.map((post) => (
                <div key={post.id} className={`shadow-sm p-4 sm:p-6 ${
                  theme === 'light' 
                    ? 'bg-white rounded-xl border border-gray-300' 
                    : 'glass-card rounded-2xl'
                }`}>
                  <div className="flex gap-3 sm:gap-4">
                    <div className="relative w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0">
                      {post.profile?.avatar_url ? (
                        <img
                          src={`${post.profile.avatar_url}?t=${Date.now()}`}
                          alt={post.profile.display_name || 'User'}
                          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover shadow-lg shadow-pink-500/30 ring-2 ring-white/50"
                          key={`post-${post.id}-${post.profile.avatar_url}`}
                        />
                      ) : (
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white font-semibold shadow-lg ring-2 ring-white/50 text-sm sm:text-base ${
                          theme === 'light'
                            ? 'bg-[#F52F8E] shadow-pink-500/30'
                            : 'bg-gradient-to-br from-pink-500 via-rose-400 to-amber-300 shadow-pink-500/30'
                        }`}>
                          {getInitials(post.profile?.display_name || 'מ')}
                        </div>
                      )}
                      {/* Badge overlay - bottom left */}
                      {(() => {
                        const postAuthorId = post.user_id || post.profile?.user_id;
                        const postAuthorBadge = postAuthorId ? friendsBadges[postAuthorId] : null;
                        if (postAuthorBadge?.badge) {
                          return (
                            <div className={`absolute bottom-0 left-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center shadow-lg border-2 border-white z-10 ${
                              theme === 'light'
                                ? 'bg-orange-500'
                                : 'bg-gradient-to-br from-orange-400 to-orange-600'
                            }`}>
                              <span 
                                style={{ color: postAuthorBadge.badge.icon_color || '#FFD700', fontSize: '10px' }}
                                className="leading-none sm:text-xs"
                              >
                                {postAuthorBadge.badge.icon || '⭐'}
                              </span>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          <h3 className={combineStyles(
                            'font-semibold text-sm sm:text-base',
                            getTextStyles(theme, 'heading')
                          )}>
                            {post.profile?.display_name || 'מנהל'}
                          </h3>
                          <span 
                            className={`px-2 sm:px-2.5 py-0.5 sm:py-1 text-xs rounded-full font-medium shadow-md ${
                              theme === 'light'
                                ? 'bg-gradient-to-r from-pink-500 to-rose-500 shadow-pink-500/30'
                                : 'bg-gradient-to-r from-hot-pink to-rose-500 shadow-hot-pink/30'
                            }`}
                            style={{ color: 'white' }}
                          >
                            מנהל
                          </span>
                          <span className={combineStyles(
                            'text-xs sm:text-sm hidden sm:inline',
                            getTextStyles(theme, 'muted')
                          )}>•</span>
                          <span className={combineStyles(
                            'text-xs sm:text-sm',
                            getTextStyles(theme, 'muted')
                          )}>{formatTimeAgo(post.created_at)}</span>
                        </div>
                        {currentUser && (currentUser.id === post.user_id || currentUser.user_id === post.user_id) && (
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            className={`transition-colors p-1 rounded-lg ${
                              theme === 'light'
                                ? 'text-red-500 hover:text-red-700 hover:bg-red-50'
                                : 'text-red-400 hover:text-red-300 hover:bg-red-500/20'
                            }`}
                            title="מחק פוסט"
                          >
                            <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>
                        )}
                      </div>
                      <div className={combineStyles(
                        'text-sm sm:text-base mb-3 sm:mb-4 leading-relaxed whitespace-pre-line',
                        getTextStyles(theme, 'subheading')
                      )}>
                        {post.content}
                      </div>
                      {(post.image_url || post.media_url) && (
                        <div className="mb-3 sm:mb-4">
                          <img 
                            src={post.image_url || post.media_url} 
                            alt="Post media" 
                            className="w-full rounded-lg max-h-64 sm:max-h-96 object-cover"
                          />
                        </div>
                      )}
                      <div className={combineStyles(
                        'flex items-center gap-3 sm:gap-6 pt-3 sm:pt-4 border-t flex-wrap',
                        getBorderStyles(theme, 'default')
                      )}>
                        <button 
                          onClick={() => handleToggleLike(post.id)}
                          className={`flex items-center gap-1.5 sm:gap-2 transition-all group rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 ${
                            theme === 'light'
                              ? `hover:bg-pink-50 ${likedPosts[post.id] ? 'text-pink-500' : 'text-gray-600 hover:text-pink-500'}`
                              : `hover:bg-hot-pink/20 ${likedPosts[post.id] ? 'text-hot-pink' : 'text-gray-300 hover:text-hot-pink'}`
                          }`}
                        >
                          <Heart 
                            className={`w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform ${
                              likedPosts[post.id] ? 'fill-current' : ''
                            }`} 
                          />
                          <span className="text-xs sm:text-sm font-medium">{post.likes_count || 0}</span>
                        </button>
                        <button 
                          onClick={() => handleToggleComments(post.id)}
                          className={`flex items-center gap-1.5 sm:gap-2 transition-all group rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 ${
                            theme === 'light'
                              ? 'text-gray-600 hover:text-pink-500 hover:bg-pink-50'
                              : 'text-gray-300 hover:text-hot-pink hover:bg-hot-pink/20'
                          }`}
                        >
                          <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
                          <span className="text-xs sm:text-sm font-medium">{post.comments_count || 0} תגובות</span>
                          {expandedComments[post.id] ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                        <button className={`flex items-center gap-1.5 sm:gap-2 transition-all group rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 ${
                          theme === 'light'
                            ? 'text-gray-600 hover:text-pink-500 hover:bg-pink-50'
                            : 'text-gray-300 hover:text-hot-pink hover:bg-hot-pink/20'
                        }`}>
                          <Share2 className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
                          <span className="text-xs sm:text-sm font-medium">שיתוף</span>
                        </button>
                      </div>

                      {/* Comments Section */}
                      {expandedComments[post.id] && (
                        <div className={combineStyles(
                          'mt-4 pt-4 border-t',
                          getBorderStyles(theme, 'default')
                        )}>
                          <CommentsList
                            comments={postComments[post.id] || []}
                            currentUser={currentUser || undefined}
                            onSubmitComment={async (text) => {
                              await handleSubmitComment(post.id, text);
                            }}
                            onSubmitReply={async (commentId, text) => {
                              await handleSubmitReply(post.id, commentId, text);
                            }}
                            onDeleteComment={(commentId) => handleDeleteComment(post.id, commentId)}
                            badges={friendsBadges}
                            emptyMessage="אין תגובות עדיין. היה הראשון להגיב!"
                            showForm={true}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Mobile Sections - Show after posts */}
          <div className="lg:hidden space-y-4 sm:space-y-6">
            {/* Who is Online */}
            <div className={`shadow-sm p-5 ${
              theme === 'light' 
                ? 'bg-white rounded-xl border border-gray-300' 
                : 'glass-card rounded-2xl'
            }`}>
              <h2 className={`text-lg font-semibold mb-4 ${
                theme === 'light' ? 'text-gray-800' : 'text-white'
              }`}>מי מחובר?</h2>
              {onlineUsers.length === 0 ? (
                <div className={`p-4 rounded-lg border ${
                  theme === 'light'
                    ? 'bg-[#F3F4F6] border-pink-200'
                    : 'bg-white/5 border border-white/10'
                }`}>
                  <p className={`text-sm ${
                    theme === 'light' ? 'text-gray-500' : 'text-gray-300'
                  }`}>אין חברים מחוברים כרגע</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {onlineUsers.map((user: any) => (
                      <div
                        key={user.id || user.user_id}
                        className="relative group"
                        title={user.display_name || user.first_name || 'משתמש'}
                      >
                        {user.avatar_url ? (
                          <img
                            src={`${user.avatar_url}?t=${Date.now()}`}
                            alt={user.display_name || 'User'}
                            className="w-10 h-10 rounded-full border-2 border-green-500 cursor-pointer hover:scale-110 transition-transform"
                            key={`online-mobile-${user.id || user.user_id}-${user.avatar_url}`}
                          />
                        ) : (
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm border-2 border-green-500 cursor-pointer hover:scale-110 transition-transform ${
                            theme === 'light'
                              ? 'bg-blue-500'
                              : 'bg-gradient-to-br from-blue-500 to-purple-500'
                          }`}>
                            {getInitials(user.display_name || user.first_name)}
                          </div>
                        )}
                        <div className={`absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 z-10 ${
                          theme === 'light' ? 'border-white' : 'border-dark-purple'
                        }`}></div>
                        {/* Badge overlay - bottom left */}
                        {(() => {
                          const userBadge = friendsBadges[user.user_id || user.id];
                          if (userBadge?.badge) {
                            return (
                              <div className={`absolute bottom-0 left-0 w-5 h-5 rounded-full flex items-center justify-center shadow-lg border-2 z-10 ${
                              theme === 'light'
                                ? 'bg-orange-500'
                                : 'bg-gradient-to-br from-orange-400 to-orange-600'
                            } ${
                                theme === 'light' ? 'border-white' : 'border-dark-purple'
                              }`}>
                                <span 
                                  style={{ color: userBadge.badge.icon_color || '#FFD700', fontSize: '10px' }}
                                  className="leading-none"
                                >
                                  {userBadge.badge.icon || '⭐'}
                                </span>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    ))}
                  </div>
                  <p className={`text-xs ${
                    theme === 'light' ? 'text-gray-500' : 'text-gray-300'
                  }`}>
                    {onlineUsers.length} {onlineUsers.length === 1 ? 'חבר מחובר' : 'חברים מחוברים'}
                  </p>
                </div>
              )}
            </div>

            {/* Recent Updates */}
            <div className={`shadow-sm p-5 ${
              theme === 'light' 
                ? 'bg-white rounded-xl border border-gray-300' 
                : 'glass-card rounded-2xl'
            }`}>
              <h2 className={`text-lg font-semibold mb-4 ${
                theme === 'light' ? 'text-gray-800' : 'text-white'
              }`}>עדכונים אחרונים</h2>
              {recentUpdates.length === 0 ? (
                <div className={`p-4 rounded-lg border ${
                  theme === 'light'
                    ? 'bg-[#F3F4F6] border-pink-200'
                    : 'bg-white/5 border border-white/10'
                }`}>
                  <p className={`text-sm ${
                    theme === 'light' ? 'text-gray-500' : 'text-gray-300'
                  }`}>מצטערים, לא נמצאה פעילות.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentUpdates.map((update, index) => {
                    const content = (
                      <div className={`flex items-start gap-3 cursor-pointer p-2 rounded-lg transition-colors ${
                        theme === 'light' ? 'hover:bg-gray-50' : 'hover:bg-white/10'
                      }`}>
                        {update.type === 'forum' && <MessageSquare className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                          theme === 'light' ? 'text-[#F52F8E]' : 'text-hot-pink'
                        }`} />}
                        {update.type === 'project' && <Briefcase className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                          theme === 'light' ? 'text-purple-600' : 'text-purple-400'
                        }`} />}
                        {update.type === 'recording' && <Video className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                          theme === 'light' ? 'text-blue-600' : 'text-blue-400'
                        }`} />}
                        {update.type === 'event' && <Calendar className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                          theme === 'light' ? 'text-[#F52F8E]' : 'text-hot-pink'
                        }`} />}
                        <div className="flex-1">
                          <p className={`text-sm ${
                            theme === 'light' ? 'text-gray-700' : 'text-gray-100'
                          }`}>{update.text}</p>
                          <p className={`text-xs mt-1 ${
                            theme === 'light' ? 'text-gray-500' : 'text-gray-300'
                          }`}>{update.time}</p>
                        </div>
                      </div>
                    );

                    if (update.link) {
                      return (
                        <Link key={`mobile-${update.id || index}`} href={update.link}>
                          {content}
                        </Link>
                      );
                    }

                    return <div key={`mobile-${update.id || index}`}>{content}</div>;
                  })}
                </div>
              )}
            </div>

            {/* Upcoming Events */}
            <div className={combineStyles(
              'shadow-sm p-5',
              getCardStyles(theme, 'glass'),
              theme === 'light' ? 'rounded-xl' : 'rounded-2xl'
            )}>
              <div className="flex items-center justify-between mb-4">
                <h2 className={combineStyles(
                  'text-lg font-semibold',
                  getTextStyles(theme, 'heading')
                )}>אירועים עתידיים</h2>
                <Link href="/live-log" className={`text-sm hover:underline ${
                  theme === 'light' ? 'text-[#F52F8E]' : 'text-white'
                }`}>הכל ←</Link>
              </div>
              {upcomingEvents.length === 0 ? (
                <div className={`p-4 rounded-lg border ${
                  theme === 'light'
                    ? 'bg-[#F3F4F6] border-pink-200'
                    : 'bg-white/5 border border-white/10'
                }`}>
                  <p className={`text-sm ${
                    theme === 'light' ? 'text-gray-500' : 'text-gray-300'
                  }`}>כרגע אין אירועים קרובים</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.slice(0, 5).map((event) => (
                    <Link
                      key={`mobile-${event.id}`}
                      href={`/live/${event.id}`}
                      className={`flex items-start gap-3 p-2 rounded-lg transition-colors cursor-pointer group ${
                        theme === 'light' ? 'hover:bg-gray-50' : 'hover:bg-white/10'
                      }`}
                    >
                      <Calendar className={`w-5 h-5 flex-shrink-0 mt-0.5 transition-colors ${
                        theme === 'light' 
                          ? 'text-[#F52F8E] group-hover:text-[#E01E7A]' 
                          : 'text-hot-pink group-hover:text-hot-pink-light'
                      }`} />
                      <div className="flex-1">
                        <p className={`text-sm font-medium transition-colors ${
                          theme === 'light'
                            ? 'text-gray-800 group-hover:text-[#F52F8E]'
                            : 'text-gray-100 group-hover:text-white'
                        }`}>{event.title}</p>
                        <p className={`text-xs mt-1 ${
                          theme === 'light' ? 'text-gray-500' : 'text-gray-300'
                        }`}>
                          {new Date(event.event_date).toLocaleDateString('he-IL')} • {event.event_time}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Friends - Mobile */}
            <div className={`shadow-sm p-5 ${
              theme === 'light' 
                ? 'bg-white rounded-xl border border-gray-300' 
                : 'glass-card rounded-2xl'
            }`}>
              <h2 className={`text-lg font-semibold mb-4 ${
                theme === 'light' ? 'text-gray-800' : 'text-white'
              }`}>חברים</h2>
              
              {/* Tabs */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setActiveFriendsTab('active')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    activeFriendsTab === 'active'
                      ? theme === 'light'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-green-500/30 text-green-300 border border-green-500/50 rounded-full'
                      : theme === 'light'
                        ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10 rounded-full'
                  }`}
                >
                  פעילים
                </button>
                <button
                  onClick={() => setActiveFriendsTab('new')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    activeFriendsTab === 'new'
                      ? theme === 'light'
                        ? 'bg-pink-100 text-[#F52F8E]'
                        : 'bg-hot-pink/30 text-white border border-hot-pink/50 rounded-full'
                      : theme === 'light'
                        ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10 rounded-full'
                  }`}
                >
                  חדשים
                </button>
              </div>

              {/* Friends List */}
              {filteredFriends.length === 0 ? (
                <div className={`p-4 rounded-lg ${
                  theme === 'light' ? 'bg-[#F3F4F6]' : 'bg-white/5'
                }`}>
                  <p className={`text-sm ${
                    theme === 'light' ? 'text-gray-500' : 'text-gray-300'
                  }`}>אין חברים {activeFriendsTab === 'active' ? 'פעילים' : 'חדשים'}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredFriends.map((friend: any) => {
                    const friendUserId = friend.user_id || friend.id;
                    const handleFriendClick = () => {
                      if (friendUserId && typeof window !== 'undefined') {
                        localStorage.setItem('selectedUserId', friendUserId);
                        window.location.href = '/profile';
                      }
                    };
                    
                    return (
                      <div 
                        key={`mobile-${friend.id || friend.user_id}`} 
                        className={`flex items-center gap-3 cursor-pointer rounded-lg p-2 -mx-2 transition-colors ${
                          theme === 'light' ? 'hover:bg-gray-50' : 'hover:bg-white/10'
                        }`}
                        onClick={handleFriendClick}
                      >
                        <div className="relative">
                          {friend.avatar_url ? (
                            <img 
                              src={friend.avatar_url}
                              alt={friend.display_name || 'User'} 
                              className="w-10 h-10 rounded-full"
                              loading="lazy"
                              key={`friend-mobile-${friend.id || friend.user_id}`}
                            />
                          ) : (
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
                            theme === 'light'
                              ? 'bg-blue-500'
                              : 'bg-gradient-to-br from-blue-500 to-purple-500'
                          }`}>
                              {getInitials(friend.display_name || friend.full_name)}
                            </div>
                          )}
                          {friend.is_online && (
                            <div className={`absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 z-10 ${
                              theme === 'light' ? 'border-white' : 'border-white'
                            }`}></div>
                          )}
                          {/* Badge overlay - bottom left */}
                          {(() => {
                            const friendBadge = friendsBadges[friendUserId];
                            if (friendBadge?.badge) {
                              return (
                                <div className={`absolute bottom-0 left-0 w-5 h-5 rounded-full flex items-center justify-center shadow-lg border-2 z-10 ${
                              theme === 'light'
                                ? 'bg-orange-500'
                                : 'bg-gradient-to-br from-orange-400 to-orange-600'
                            } ${
                                  theme === 'light' ? 'border-white' : 'border-white'
                                }`}>
                                  <span 
                                    style={{ color: friendBadge.badge.icon_color || '#FFD700', fontSize: '10px' }}
                                    className="leading-none"
                                  >
                                    {friendBadge.badge.icon || '⭐'}
                                  </span>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${
                            theme === 'light' ? 'text-gray-800' : 'text-white'
                          }`}>
                            {friend.display_name || friend.full_name || 'משתמש'}
                          </p>
                          {activeFriendsTab === 'new' && friend.created_at && (
                            <p className={`text-xs ${
                              theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                            }`}>
                              הצטרף {formatTimeAgo(friend.created_at)}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {activeFriendsTab === 'active' && remainingActiveFriends > 0 && (
                    <div className={`pt-2 text-center ${
                      theme === 'light' ? 'text-gray-600' : 'text-gray-400'
                    }`}>
                      <p className="text-sm">
                        ועוד {remainingActiveFriends} חברים
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Right Sidebar - Friends */}
        <aside className="hidden lg:block w-80 flex-shrink-0">
          <div className={`shadow-sm p-5 ${
            theme === 'light' 
              ? 'bg-white rounded-xl border border-gray-300' 
              : 'glass-card rounded-2xl'
          }`}>
            <h2 className={`text-lg font-semibold mb-4 ${
              theme === 'light' ? 'text-gray-800' : 'text-white'
            }`}>חברים</h2>
            
            {/* Tabs */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setActiveFriendsTab('active')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeFriendsTab === 'active'
                    ? theme === 'light'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-green-500/30 text-green-300 border border-green-500/50 rounded-full'
                    : theme === 'light'
                      ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10 rounded-full'
                }`}
              >
                פעילים
              </button>
              <button
                onClick={() => setActiveFriendsTab('new')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeFriendsTab === 'new'
                    ? theme === 'light'
                      ? 'bg-pink-100 text-[#F52F8E]'
                      : 'bg-hot-pink/30 text-hot-pink-light border border-hot-pink/50 rounded-full'
                    : theme === 'light'
                      ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10 rounded-full'
                }`}
              >
                חדשים
              </button>
            </div>

            {/* Friends List */}
            {filteredFriends.length === 0 ? (
              <div className={`p-4 rounded-lg ${
                theme === 'light' ? 'bg-[#F3F4F6]' : 'bg-white/10'
              }`}>
                <p className={`text-sm ${
                  theme === 'light' ? 'text-gray-500' : 'text-gray-300'
                }`}>אין חברים {activeFriendsTab === 'active' ? 'פעילים' : 'חדשים'}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredFriends.slice(0, 10).map((friend: any) => {
                  const friendUserId = friend.user_id || friend.id;
                  const handleFriendClick = () => {
                    if (friendUserId && typeof window !== 'undefined') {
                      localStorage.setItem('selectedUserId', friendUserId);
                      window.location.href = '/profile';
                    }
                  };
                  
                  return (
                    <div 
                      key={friend.id || friend.user_id} 
                      className={`flex items-center gap-3 cursor-pointer rounded-lg p-2 -mx-2 transition-colors ${
                        theme === 'light' ? 'hover:bg-gray-50' : 'hover:bg-white/10'
                      }`}
                      onClick={handleFriendClick}
                    >
                      <div className="relative">
                        {friend.avatar_url ? (
                          <img 
                            src={friend.avatar_url}
                            loading="lazy"
                            alt={friend.display_name || 'User'} 
                            className="w-10 h-10 rounded-full"
                            key={`friend-${friend.id || friend.user_id}`}
                          />
                        ) : (
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
                            theme === 'light'
                              ? 'bg-blue-500'
                              : 'bg-gradient-to-br from-blue-500 to-purple-500'
                          }`}>
                            {getInitials(friend.display_name || friend.full_name)}
                          </div>
                        )}
                        {friend.is_online && (
                          <div className={`absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 z-10 ${
                            theme === 'light' ? 'border-white' : 'border-white'
                          }`}></div>
                        )}
                        {/* Badge overlay - bottom left */}
                        {(() => {
                          const friendBadge = friendsBadges[friendUserId];
                          if (friendBadge?.badge) {
                            return (
                              <div className={`absolute bottom-0 left-0 w-5 h-5 rounded-full flex items-center justify-center shadow-lg border-2 z-10 ${
                              theme === 'light'
                                ? 'bg-orange-500'
                                : 'bg-gradient-to-br from-orange-400 to-orange-600'
                            } ${
                                theme === 'light' ? 'border-white' : 'border-white'
                              }`}>
                                <span 
                                  style={{ color: friendBadge.badge.icon_color || '#FFD700', fontSize: '10px' }}
                                  className="leading-none"
                                >
                                  {friendBadge.badge.icon || '⭐'}
                                </span>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${
                          theme === 'light' ? 'text-gray-800' : 'text-white'
                        }`}>
                          {friend.display_name || friend.full_name || 'משתמש'}
                        </p>
                        {activeFriendsTab === 'new' && friend.created_at && (
                          <p className={`text-xs ${
                            theme === 'light' ? 'text-gray-500' : 'text-gray-300'
                          }`}>
                            הצטרף {formatTimeAgo(friend.created_at)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
