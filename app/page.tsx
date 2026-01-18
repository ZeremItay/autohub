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
  Edit,
  Save,
  ChevronLeft,
  ChevronRight,
  Radio,
  Megaphone,
  FileText,
  GraduationCap,
} from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { getPosts, createPost, deletePost, updatePost, toggleLike, checkUserLikedPost, checkUserLikedPosts, getPostLikes, type PostWithProfile } from '@/lib/queries/posts';
import { getAllProfiles, type ProfileWithRole } from '@/lib/queries/profiles';
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
import { formatTimeAgo } from '@/lib/utils/date';
import { getInitials } from '@/lib/utils/display';
import { lazyLoad } from '@/lib/utils/lazyLoad';
import Link from 'next/link';
import RecentUpdates, { type RecentUpdate } from '@/app/components/RecentUpdates';
import { ReportsTicker } from '@/app/components/home/ReportsTicker';
import ProfileCompletionModal from '@/app/components/ProfileCompletionModal';
import dynamic from 'next/dynamic';
import { stripHtml } from '@/lib/utils/stripHtml';

const RichTextEditor = dynamic(
  () => import('@/app/components/RichTextEditor'),
  { 
    ssr: false,
    loading: () => <div className="w-full h-32 bg-gray-100 rounded animate-pulse" />
  }
);

export default function Home() {
  // Use custom hooks for user data
  const { user: currentUser, isAdmin: userIsAdmin, isPremium: userIsPremium, refetch: refetchUser } = useCurrentUser();
  const [profiles, setProfiles] = useState<ProfileWithRole[]>([]);
  const { users: onlineUsers } = useOnlineUsers(profiles);
  
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
  const [news, setNews] = useState<News[]>([]);
  const [currentNewsIndex, setCurrentNewsIndex] = useState(0);
  const [reports, setReports] = useState<Report[]>([]);
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [editPostContent, setEditPostContent] = useState<string>('');
  const [editPostImageUrl, setEditPostImageUrl] = useState<string>('');
  const [showLikesModal, setShowLikesModal] = useState(false);
  const [selectedPostForLikes, setSelectedPostForLikes] = useState<string | null>(null);
  const [postLikes, setPostLikes] = useState<Record<string, Array<{user_id: string, display_name: string, avatar_url: string | null, created_at: string}>>>({});
  const [loadingLikes, setLoadingLikes] = useState<Record<string, boolean>>({});

  // Ref to prevent parallel calls to loadData
  const isLoadingDataRef = useRef(false);
  // Ref to track if the operation was cancelled (timeout or unmount)
  const isCancelledRef = useRef(false);
  // Ref to store currentUser to avoid adding it to loadData dependencies
  const currentUserRef = useRef(currentUser);
  
  // Update ref when currentUser changes
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // Load comments for all posts automatically
  useEffect(() => {
    if (announcements.length > 0) {
      announcements.forEach(post => {
        if (!postComments[post.id]) {
          loadPostComments(post.id);
        }
      });
    }
  }, [announcements]);

  const loadData = useCallback(async () => {
    // Prevent parallel calls
    if (isLoadingDataRef.current) {
      return;
    }
    
    isLoadingDataRef.current = true;
    isCancelledRef.current = false; // Reset cancellation flag
    setLoading(true);
    
    // Add timeout to prevent hanging (Chrome-specific issue)
    let timeoutId: NodeJS.Timeout | null = setTimeout(() => {
      console.warn('loadData taking too long, stopping loading state');
      isCancelledRef.current = true; // Mark as cancelled
      setLoading(false);
      isLoadingDataRef.current = false; // CRITICAL: Reset ref on timeout
    }, 20000); // 20 seconds timeout
    
    try {
      // Helper function to add timeout to promises
      const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number, name: string): Promise<T> => {
        return Promise.race([
          promise,
          new Promise<T>((_, reject) => 
            setTimeout(() => reject(new Error(`${name} timeout after ${timeoutMs}ms`)), timeoutMs)
          )
        ]);
      };
      
      // Load all data in parallel with individual timeouts
      // Use Promise.allSettled so one failure doesn't block others
      // Increased timeout to 20 seconds to handle slow Supabase queries
      const results = await Promise.allSettled([
        withTimeout(getPosts(), 20000, 'getPosts').catch(err => {
          console.error('getPosts failed:', err);
          return { data: null, error: err };
        }),
        withTimeout(getAllProfiles(), 20000, 'getAllProfiles').catch(err => {
          console.error('getAllProfiles failed:', err);
          return { data: null, error: err };
        }),
        withTimeout(getUpcomingEvents(5), 20000, 'getUpcomingEvents').catch(err => {
          console.error('getUpcomingEvents failed:', err);
          return { data: null, error: err };
        }),
        withTimeout(getActiveNews(), 20000, 'getActiveNews').catch(err => {
          console.error('getActiveNews failed:', err);
          return { data: null, error: err };
        }),
        withTimeout(getAllReports(10), 20000, 'getAllReports').catch(err => {
          console.error('getAllReports failed:', err);
          return { data: null, error: err };
        })
      ]);
      
      // Check if operation was cancelled (timeout occurred)
      if (isCancelledRef.current) {
        return;
      }
      
      // Extract results from Promise.allSettled
      const postsResult = results[0].status === 'fulfilled' ? results[0].value : { data: null, error: results[0].reason };
      const profilesResult = results[1].status === 'fulfilled' ? results[1].value : { data: null, error: results[1].reason };
      const eventsResult = results[2].status === 'fulfilled' ? results[2].value : { data: null, error: results[2].reason };
      const newsResult = results[3].status === 'fulfilled' ? results[3].value : { data: null, error: results[3].reason };
      const reportsResult = results[4].status === 'fulfilled' ? results[4].value : { data: null, error: results[4].reason };

      // Process announcements
      if (postsResult?.data && Array.isArray(postsResult.data)) {
        const adminPosts = postsResult.data.filter((post: any) => {
          const role = post.profile?.roles || post.profile?.role;
          const roleName = typeof role === 'object' ? role?.name : role;
          return roleName === 'admin' || post.is_announcement === true;
        });
        setAnnouncements(adminPosts);
        
        // Load liked posts for current user - use batch query for better performance
        if (currentUserRef.current) {
          const userId = currentUserRef.current.user_id || currentUserRef.current.id;
          if (userId && adminPosts.length > 0) {
            try {
              const postIds = adminPosts.map((post: any) => post.id);
              const { likedMap, error } = await checkUserLikedPosts(postIds, userId);
              
              // Check if cancelled before updating state
              if (!isCancelledRef.current && !error && likedMap) {
                setLikedPosts(likedMap);
              }
            } catch (error) {
              // Silently fail
            }
          }
        }
        
        // Check again before updating announcements
        if (!isCancelledRef.current) {
          setAnnouncements(adminPosts);
        }
      } else {
        if (!isCancelledRef.current) {
          setAnnouncements([]);
        }
      }

      // Process profiles
      if (!isCancelledRef.current) {
        if (profilesResult?.data && Array.isArray(profilesResult.data)) {
          setFriends(profilesResult.data);
          setProfiles(profilesResult.data);
        } else {
          setProfiles([]);
          setFriends([]);
        }
      }

      // Process events
      if (!isCancelledRef.current) {
        if (eventsResult?.data && Array.isArray(eventsResult.data)) {
          setUpcomingEvents(eventsResult.data);
        } else {
          setUpcomingEvents([]);
        }
      }

      // Load news
      if (!isCancelledRef.current) {
        if (newsResult?.data && Array.isArray(newsResult.data)) {
          setNews(newsResult.data);
        } else {
          setNews([]);
        }
      }

      // Load reports
      if (!isCancelledRef.current) {
        if (reportsResult?.data && Array.isArray(reportsResult.data) && reportsResult.data.length > 0) {
          const publishedReports = reportsResult.data.filter((r: any) => r.is_published === true);
          setReports(publishedReports);
        } else {
          setReports([]);
        }
      }

      // Load recent updates in background
      lazyLoad(() => loadRecentUpdates(eventsResult.data || []), 300).catch(() => {
        // Silently fail
      });
    } catch (error) {
      // Only log error if not cancelled
      if (!isCancelledRef.current) {
        console.error('Error loading data:', error);
      }
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      // Only update loading state if not cancelled
      if (!isCancelledRef.current) {
        setLoading(false);
      }
      isLoadingDataRef.current = false;
    }
  }, []); // Remove currentUser from dependencies - use ref instead

  useEffect(() => {
    let cancelled = false;
    
    // Load data on initial page load
    loadData().catch(error => {
      if (!cancelled) {
        console.error('Error in loadData effect:', error);
      }
    });
    
    return () => {
      cancelled = true;
      // Don't mark as cancelled here - only timeout should do that
      // This prevents race conditions when dependencies change
    };
    
    // Handle hash navigation (for notifications linking to posts)
    const handleHashChange = () => {
      if (cancelled) return;
      const hash = window.location.hash;
      if (hash && hash.startsWith('#post-')) {
        const postId = hash.replace('#post-', '');
        // Try multiple times in case posts haven't loaded yet
        let attempts = 0;
        const maxAttempts = 10;
        const tryScroll = () => {
          if (cancelled) return;
          attempts++;
          const element = document.getElementById(`post-${postId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Highlight the post briefly
            element.classList.add('ring-2', 'ring-pink-500', 'ring-offset-2');
            setTimeout(() => {
              element.classList.remove('ring-2', 'ring-pink-500', 'ring-offset-2');
            }, 2000);
          } else if (attempts < maxAttempts) {
            // Try again after a short delay
            setTimeout(tryScroll, 200);
          }
        };
        tryScroll();
      }
    };
    
    // Check hash on mount (with delay to allow posts to load)
    setTimeout(handleHashChange, 500);
    
    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);

    // Listen for profile updates
    const handleProfileUpdate = () => {
      if (cancelled) return;
      clearCache('profiles:all');
      loadData();
      refetchUser();
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);

    return () => {
      cancelled = true;
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, [loadData, refetchUser]); // Removed 'news' - it causes infinite reloads

  // REMOVED: onAuthStateChange listener - Layout.tsx already handles this
  // Having multiple listeners causes infinite loops

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

  // Poll for new reports every 30 seconds to keep ticker updated (optimized from 10s)
  useEffect(() => {
    // Only poll if reports section is likely visible (at top of page)
    let reportsInterval: NodeJS.Timeout | null = null;
    
    const pollReports = async () => {
      try {
        const reportsResult = await getAllReports(10);
        
        if (reportsResult?.data && Array.isArray(reportsResult.data) && reportsResult.data.length > 0) {
          const publishedReports = reportsResult.data.filter((r: any) => r.is_published === true);
          setReports(publishedReports);
        } else {
          setReports([]);
        }
      } catch (error) {
        console.error('Error polling for reports:', error);
      }
    };

    // Start polling after initial load
    const timeoutId = setTimeout(() => {
      reportsInterval = setInterval(pollReports, 30000); // Poll every 30 seconds
    }, 5000); // Wait 5 seconds before starting to poll

    return () => {
      if (reportsInterval) clearInterval(reportsInterval);
      clearTimeout(timeoutId);
    };
  }, []);

  // Format time from created_at to HH:MM
  function formatTimeFromDate(dateString: string): string {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    } catch (error) {
      return '';
    }
  }

  // Format current date to DD.MM.YYYY
  function formatCurrentDate(): string {
    const now = new Date();
    const day = now.getDate().toString().padStart(2, '0');
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const year = now.getFullYear();
    return `${day}.${month}.${year}`;
  }

  async function loadRecentUpdates(eventsData: Event[] = []) {
    try {
      const updates: RecentUpdate[] = [];
      
      // Get date from 30 days ago to filter only recent updates
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();
      
      // Optimized: Load only the most recent items instead of all data
      // Load all categories in parallel
      const [latestForumPostsResult, latestRecordingsResult, latestProjectsResult, latestBlogPostsResult, latestCoursesResult, latestAnnouncementsResult] = await Promise.all([
        // Get recent posts from ALL active forums with profile join - get 20 to ensure we have enough options
        supabase
          .from('forum_posts')
          .select('id, title, user_id, created_at, forum_id, forums(id, display_name, is_active)')
          .gte('created_at', thirtyDaysAgoISO)
          .order('created_at', { ascending: false })
          .limit(20),
        // Get recent recordings - get 20 to ensure we have enough (only from last 30 days)
        supabase.from('recordings').select('id, title, created_at').gte('created_at', thirtyDaysAgoISO).order('created_at', { ascending: false }).limit(20),
        // Get recent projects - get 20 to ensure we have enough with profile join (only from last 30 days)
        supabase.from('projects').select('id, title, user_id, created_at').gte('created_at', thirtyDaysAgoISO).order('created_at', { ascending: false }).limit(20),
        // Get recent blog posts - get 20 to ensure we have enough (only published, from last 30 days)
        supabase.from('blog_posts').select('id, title, slug, author_id, created_at').eq('is_published', true).gte('created_at', thirtyDaysAgoISO).order('created_at', { ascending: false }).limit(20),
        // Get recent courses - get 20 to ensure we have enough (only from last 30 days)
        supabase.from('courses').select('id, title, created_at').gte('created_at', thirtyDaysAgoISO).order('created_at', { ascending: false }).limit(20),
        // Get recent announcements (posts) - get 20 to ensure we have enough (only from last 30 days)
        supabase.from('posts').select('id, content, user_id, created_at').eq('is_announcement', true).gte('created_at', thirtyDaysAgoISO).order('created_at', { ascending: false }).limit(20)
      ]);

      // Get user IDs from all results to fetch profiles in one query
      const userIds = new Set<string>();
      if (latestForumPostsResult.data) {
        latestForumPostsResult.data.forEach((post: any) => {
          if (post.user_id) userIds.add(post.user_id);
        });
      }
      if (latestProjectsResult.data) {
        latestProjectsResult.data.forEach((project: any) => {
          if (project.user_id) userIds.add(project.user_id);
        });
      }
      if (latestBlogPostsResult.data) {
        latestBlogPostsResult.data.forEach((post: any) => {
          if (post.author_id) userIds.add(post.author_id);
        });
      }
      if (latestAnnouncementsResult.data) {
        latestAnnouncementsResult.data.forEach((post: any) => {
          if (post.user_id) userIds.add(post.user_id);
        });
      }

      // Fetch all profiles at once
      let profilesMap = new Map<string, any>();
      if (userIds.size > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, display_name, first_name, nickname')
          .in('user_id', Array.from(userIds));
        if (profilesData) {
          profilesMap = new Map(profilesData.map((p: any) => [p.user_id, p]));
        }
      }

      // Get recent forum posts (from all forums) - filter only active forums
      if (latestForumPostsResult.data && latestForumPostsResult.data.length > 0) {
        latestForumPostsResult.data
          .filter((post: any) => {
            const forum = post.forums as any;
            return forum?.is_active !== false; // Only include posts from active forums
          })
          .forEach((latestPostData: any) => {
            const profile = profilesMap.get(latestPostData.user_id);
            const displayName = profile?.display_name || profile?.first_name || profile?.nickname || 'משתמש';
            updates.push({
              type: 'forum',
              text: `${displayName} פרסם פוסט: ${latestPostData.title}`,
              time: formatTimeAgo(latestPostData.created_at),
              icon: '💬',
              link: `/forums/${latestPostData.forum_id}/posts/${latestPostData.id}`,
              id: latestPostData.id,
              created_at: latestPostData.created_at
            });
          });
      }

      // Get recent recordings
      if (latestRecordingsResult.data && latestRecordingsResult.data.length > 0) {
        latestRecordingsResult.data.forEach((recentRecording: any) => {
          updates.push({
            type: 'recording',
            text: `העלתה הדרכה חדשה: ${recentRecording.title}`,
            time: formatTimeAgo(recentRecording.created_at),
            icon: '🎥',
            link: `/recordings/${recentRecording.id}`,
            id: recentRecording.id,
            created_at: recentRecording.created_at
          });
        });
      }

      // Get recent projects
      if (latestProjectsResult.data && latestProjectsResult.data.length > 0) {
        latestProjectsResult.data.forEach((recentProject: any) => {
          const profile = profilesMap.get(recentProject.user_id);
          const userName = profile?.display_name || profile?.first_name || profile?.nickname || 'משתמש';
          updates.push({
            type: 'project',
            text: `${userName} העלה פרויקט חדש: ${recentProject.title}`,
            time: formatTimeAgo(recentProject.created_at),
            icon: '📄',
            link: `/projects#${recentProject.id}`,
            id: recentProject.id,
            created_at: recentProject.created_at
          });
        });
      }

      // Get recent blog posts
      if (latestBlogPostsResult.data && latestBlogPostsResult.data.length > 0) {
        latestBlogPostsResult.data.forEach((blogPost: any) => {
          const profile = profilesMap.get(blogPost.author_id);
          const authorName = profile?.display_name || profile?.first_name || profile?.nickname || 'משתמש';
          updates.push({
            type: 'blog',
            text: `${authorName} פרסם פוסט בבלוג: ${blogPost.title}`,
            time: formatTimeAgo(blogPost.created_at),
            icon: '📝',
            link: `/blog/${blogPost.slug}`,
            id: blogPost.id,
            created_at: blogPost.created_at
          });
        });
      }

      // Get recent courses
      if (latestCoursesResult.data && latestCoursesResult.data.length > 0) {
        latestCoursesResult.data.forEach((course: any) => {
          updates.push({
            type: 'course',
            text: `נוסף קורס חדש: ${course.title}`,
            time: formatTimeAgo(course.created_at),
            icon: '📚',
            link: `/courses#${course.id}`,
            id: course.id,
            created_at: course.created_at
          });
        });
      }

      // Get recent announcements (posts)
      if (latestAnnouncementsResult.data && latestAnnouncementsResult.data.length > 0) {
        latestAnnouncementsResult.data.forEach((announcement: any) => {
          const profile = profilesMap.get(announcement.user_id);
          const authorName = profile?.display_name || profile?.first_name || profile?.nickname || 'משתמש';
          // Only show "פרסם הכרזה" without HTML content
          updates.push({
            type: 'post',
            text: `${authorName} פרסם הכרזה`,
            time: formatTimeAgo(announcement.created_at),
            icon: '📢',
            link: `/#post-${announcement.id}`,
            id: announcement.id,
            created_at: announcement.created_at
          });
        });
      }

      // Get recent events (from parameter) - get up to 5 to ensure we have enough, filter by date
      if (eventsData.length > 0) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        eventsData
          .filter((event: any) => {
            if (!event.created_at) return false;
            const eventDate = new Date(event.created_at);
            return eventDate >= thirtyDaysAgo;
          })
          .slice(0, 5)
          .forEach((recentEvent: any) => {
            updates.push({
              type: 'event',
              text: `נוסף אירוע חדש: ${recentEvent.title}`,
              time: formatTimeAgo(recentEvent.created_at),
              icon: '📅',
              link: `/live/${recentEvent.id}`,
              id: recentEvent.id,
              created_at: recentEvent.created_at
            });
          });
      }

      // Sort by time (most recent first)
      updates.sort((a, b) => {
        // Parse dates for proper sorting - use created_at
        try {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dateB - dateA;
        } catch {
          return 0;
        }
      });
      
      // If we don't have 5 updates, try to load more without date filter
      if (updates.length < 5) {
        const [moreForumPostsResult, moreRecordingsResult, moreProjectsResult, moreBlogPostsResult, moreCoursesResult, moreAnnouncementsResult] = await Promise.all([
          supabase
            .from('forum_posts')
            .select('id, title, user_id, created_at, forum_id')
            .order('created_at', { ascending: false })
            .limit(5),
          supabase.from('recordings').select('id, title, created_at').order('created_at', { ascending: false }).limit(5),
          supabase.from('projects').select('id, title, user_id, created_at').order('created_at', { ascending: false }).limit(5),
          supabase.from('blog_posts').select('id, title, slug, author_id, created_at').eq('is_published', true).order('created_at', { ascending: false }).limit(5),
          supabase.from('courses').select('id, title, created_at').order('created_at', { ascending: false }).limit(5),
          supabase.from('posts').select('id, content, user_id, created_at').eq('is_announcement', true).order('created_at', { ascending: false }).limit(5)
        ]);

        // Get user IDs from fallback results
        const fallbackUserIds = new Set<string>();
        if (moreForumPostsResult.data) {
          moreForumPostsResult.data.forEach((post: any) => {
            if (post.user_id) fallbackUserIds.add(post.user_id);
          });
        }
        if (moreProjectsResult.data) {
          moreProjectsResult.data.forEach((project: any) => {
            if (project.user_id) fallbackUserIds.add(project.user_id);
          });
        }
        if (moreBlogPostsResult.data) {
          moreBlogPostsResult.data.forEach((post: any) => {
            if (post.author_id) fallbackUserIds.add(post.author_id);
          });
        }
        if (moreAnnouncementsResult.data) {
          moreAnnouncementsResult.data.forEach((post: any) => {
            if (post.user_id) fallbackUserIds.add(post.user_id);
          });
        }

        // Fetch fallback profiles
        let fallbackProfilesMap = new Map<string, any>();
        if (fallbackUserIds.size > 0) {
          const { data: fallbackProfilesData } = await supabase
            .from('profiles')
            .select('user_id, display_name, first_name, nickname')
            .in('user_id', Array.from(fallbackUserIds));
          if (fallbackProfilesData) {
            fallbackProfilesMap = new Map(fallbackProfilesData.map((p: any) => [p.user_id, p]));
          }
        }

        // Add more updates if we don't have enough
        const existingIds = new Set(updates.map(u => u.id));
        
        if (moreForumPostsResult.data) {
          moreForumPostsResult.data.forEach((post: any) => {
            if (!existingIds.has(post.id)) {
              const profile = fallbackProfilesMap.get(post.user_id);
              const displayName = profile?.display_name || profile?.first_name || profile?.nickname || 'משתמש';
              updates.push({
                type: 'forum',
                text: `${displayName} פרסם פוסט: ${post.title}`,
                time: formatTimeAgo(post.created_at),
                icon: '💬',
                link: `/forums/${post.forum_id}/posts/${post.id}`,
                id: post.id,
                created_at: post.created_at
              });
              existingIds.add(post.id);
            }
          });
        }

        if (moreRecordingsResult.data) {
          moreRecordingsResult.data.forEach((recording: any) => {
            if (!existingIds.has(recording.id)) {
              updates.push({
                type: 'recording',
                text: `העלתה הדרכה חדשה: ${recording.title}`,
                time: formatTimeAgo(recording.created_at),
                icon: '🎥',
                link: `/recordings/${recording.id}`,
                id: recording.id,
                created_at: recording.created_at
              });
              existingIds.add(recording.id);
            }
          });
        }

        if (moreProjectsResult.data) {
          moreProjectsResult.data.forEach((project: any) => {
            if (!existingIds.has(project.id)) {
              const profile = fallbackProfilesMap.get(project.user_id);
              const userName = profile?.display_name || profile?.first_name || profile?.nickname || 'משתמש';
              updates.push({
                type: 'project',
                text: `${userName} העלה פרויקט חדש: ${project.title}`,
                time: formatTimeAgo(project.created_at),
                icon: '📄',
                link: `/projects#${project.id}`,
                id: project.id,
                created_at: project.created_at
              });
              existingIds.add(project.id);
            }
          });
        }

        if (moreBlogPostsResult.data) {
          moreBlogPostsResult.data.forEach((blogPost: any) => {
            if (!existingIds.has(blogPost.id)) {
              const profile = fallbackProfilesMap.get(blogPost.author_id);
              const authorName = profile?.display_name || profile?.first_name || profile?.nickname || 'משתמש';
              updates.push({
                type: 'blog',
                text: `${authorName} פרסם פוסט בבלוג: ${blogPost.title}`,
                time: formatTimeAgo(blogPost.created_at),
                icon: '📝',
                link: `/blog/${blogPost.slug}`,
                id: blogPost.id,
                created_at: blogPost.created_at
              });
              existingIds.add(blogPost.id);
            }
          });
        }

        if (moreCoursesResult.data) {
          moreCoursesResult.data.forEach((course: any) => {
            if (!existingIds.has(course.id)) {
              updates.push({
                type: 'course',
                text: `נוסף קורס חדש: ${course.title}`,
                time: formatTimeAgo(course.created_at),
                icon: '📚',
                link: `/courses#${course.id}`,
                id: course.id,
                created_at: course.created_at
              });
              existingIds.add(course.id);
            }
          });
        }

        if (moreAnnouncementsResult.data) {
          moreAnnouncementsResult.data.forEach((announcement: any) => {
            if (!existingIds.has(announcement.id)) {
              const profile = fallbackProfilesMap.get(announcement.user_id);
              const authorName = profile?.display_name || profile?.first_name || profile?.nickname || 'משתמש';
              // Only show "פרסם הכרזה" without HTML content
              updates.push({
                type: 'post',
                text: `${authorName} פרסם הכרזה`,
                time: formatTimeAgo(announcement.created_at),
                icon: '📢',
                link: `/#post-${announcement.id}`,
                id: announcement.id,
                created_at: announcement.created_at
              });
              existingIds.add(announcement.id);
            }
          });
        }

        // Re-sort after adding more
        updates.sort((a, b) => {
          try {
            const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
            return dateB - dateA;
          } catch {
            return 0;
          }
        });
      }
      
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
        // Send email notification to all users (async, don't block UI)
        console.log('📧 Starting to send announcement emails...', { postId: data.id });
        try {
          // Get author name
          const authorName = currentUser?.display_name || currentUser?.first_name || currentUser?.nickname || 'המנהל';
          
          console.log('📧 Calling /api/announcements/send-email with:', {
            postId: data.id,
            postContent: newPostContent.substring(0, 50) + '...',
            postAuthorName: authorName
          });
          
          // Send emails in background (don't wait for response)
          fetch('/api/announcements/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              postId: data.id,
              postContent: newPostContent,
              postAuthorName: authorName
            })
          }).then(async (response) => {
            console.log('📧 Email API response status:', response.status);
            const result = await response.json();
            console.log('📧 Email API response data:', result);
            
            if (response.ok && result.success) {
              console.log(`✅ הודעה נשלחה בהצלחה ל-${result.sent || 0} משתמשים!`);
              alert(`✅ הודעה נשלחה בהצלחה ל-${result.sent || 0} משתמשים!`);
            } else {
              console.error('❌ Error sending announcement emails:', result);
              alert(`❌ שגיאה בשליחת הודעה: ${result.error || result.message || 'שגיאה לא ידועה'}\n\nפרטים: ${JSON.stringify(result, null, 2)}`);
            }
          }).catch((emailError) => {
            console.error('❌ Error sending announcement emails (catch):', emailError);
            alert(`❌ שגיאה בשליחת הודעה: ${emailError.message || 'שגיאה לא ידועה'}`);
          });
        } catch (emailError: any) {
          console.error('❌ Error initiating announcement emails:', emailError);
          alert(`❌ שגיאה בהתחלת שליחת הודעה: ${emailError.message || 'שגיאה לא ידועה'}`);
        }
        
        setNewPostContent('');
        setNewPostImageUrl('');
        setShowPostForm(false);
        await loadData();
      } else {
        const errorMessage = (error as any)?.message || (error as any)?.details || 'שגיאה לא ידועה';
        console.error('Full error object:', error);
        alert(`שגיאה ביצירת הפוסט: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error creating post:', error);
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
      console.error('Error loading comments:', error);
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
      console.error('Error submitting comment:', error);
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
      console.error('Error submitting reply:', error);
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
      console.error('Error deleting comment:', error);
      alert('שגיאה במחיקת התגובה. אנא נסה שוב.');
    }
  }

  async function handleShowLikes(postId: string) {
    setSelectedPostForLikes(postId);
    setShowLikesModal(true);
    
    // Always reload likes when opening modal to ensure fresh data
    setLoadingLikes(prev => ({ ...prev, [postId]: true }));
    try {
      const { data, error } = await getPostLikes(postId);
      if (error) {
        console.error('Error loading likes:', error);
      }
      if (data) {
        setPostLikes(prev => ({ ...prev, [postId]: data }));
      } else {
        // If no data, set empty array
        setPostLikes(prev => ({ ...prev, [postId]: [] }));
      }
    } catch (error) {
      console.error('Error loading likes:', error);
      setPostLikes(prev => ({ ...prev, [postId]: [] }));
    } finally {
      setLoadingLikes(prev => ({ ...prev, [postId]: false }));
    }
  }

  async function handleToggleLikeFromModal(postId: string) {
    if (!currentUser) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Cannot toggle like: no current user');
      }
      return;
    }
    
    const userId = currentUser.user_id || currentUser.id;
    if (!userId) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Cannot toggle like: no user ID');
      }
      return;
    }
    
    try {
      // Optimistically update UI
      const wasLiked = likedPosts[postId] || false;
      
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
      
      const { data, error } = result;
      
      // If we have data, the operation succeeded - update state
      if (data) {
        setLikedPosts(prev => ({ ...prev, [postId]: data.liked }));
        
        // Reload likes list in modal
        setLoadingLikes(prev => ({ ...prev, [postId]: true }));
        try {
          const { data: likesData, error: likesError } = await getPostLikes(postId);
          if (!likesError && likesData) {
            setPostLikes(prev => ({ ...prev, [postId]: likesData }));
          }
        } catch (error) {
          console.error('Error reloading likes:', error);
        } finally {
          setLoadingLikes(prev => ({ ...prev, [postId]: false }));
        }
        
        // Reload posts to get updated likes_count
        await loadData();
      } else if (error) {
        // Check if error is meaningful
        const errorKeys = error && typeof error === 'object' ? Object.keys(error) : [];
        const isEmptyError = errorKeys.length === 0;
        const errorObj = error as any;
        const hasErrorDetails = errorObj?.message || errorObj?.code || errorObj?.details || errorObj?.hint;
        
        if (!isEmptyError && hasErrorDetails) {
          // Real error - revert optimistic update
          if (process.env.NODE_ENV === 'development') {
            console.error('Error toggling like:', error);
          }
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
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Exception in handleToggleLikeFromModal:', error);
      }
      // Revert on exception
      const wasLiked = likedPosts[postId] || false;
      setLikedPosts(prev => ({ ...prev, [postId]: wasLiked }));
    }
  }

  async function handleToggleLike(postId: string) {
    if (!currentUser) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Cannot toggle like: no current user');
      }
      return;
    }
    
    const userId = currentUser.user_id || currentUser.id;
    if (!userId) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Cannot toggle like: no user ID');
      }
      return;
    }
    
    try {
      // Optimistically update UI
      const wasLiked = likedPosts[postId] || false;
      
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
      
      const { data, error } = result;
      
      // If we have data, the operation succeeded - update state
      if (data) {
        setLikedPosts(prev => ({ ...prev, [postId]: data.liked }));
        // Reload posts to get updated likes_count
        await loadData();
      } else if (error) {
        // Check if error is meaningful
        const errorKeys = error && typeof error === 'object' ? Object.keys(error) : [];
        const isEmptyError = errorKeys.length === 0;
        const errorObj = error as any;
        const hasErrorDetails = errorObj?.message || errorObj?.code || errorObj?.details || errorObj?.hint;
        
        if (!isEmptyError && hasErrorDetails) {
          // Real error - revert optimistic update
          if (process.env.NODE_ENV === 'development') {
            console.error('Error toggling like:', error);
          }
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
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Exception in handleToggleLike:', error);
      }
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
      console.error('Error deleting post:', error);
      alert('שגיאה במחיקת הפוסט. אנא נסה שוב.');
    }
  }

  function handleEditPost(post: PostWithProfile) {
    setEditingPost(post.id);
    setEditPostContent(post.content || '');
    setEditPostImageUrl(post.image_url || post.media_url || '');
  }

  function handleCancelEdit() {
    setEditingPost(null);
    setEditPostContent('');
    setEditPostImageUrl('');
  }

  async function handleSaveEdit(postId: string) {
    if (!editPostContent.trim()) {
      alert('אנא הזן תוכן לפוסט');
      return;
    }

    try {
      const updateData: any = {
        content: editPostContent
      };

      // Handle image_url - posts table uses media_url
      if (editPostImageUrl) {
        updateData.media_url = editPostImageUrl;
        updateData.media_type = 'image';
      }

      const { data, error } = await updatePost(postId, updateData);

      if (error) {
        console.error('Error updating post:', error);
        alert('שגיאה בעדכון הפוסט. אנא נסה שוב.');
      } else {
        // Update post in local state
        setAnnouncements(prev => prev.map(post => 
          post.id === postId 
            ? { ...post, content: editPostContent, media_url: editPostImageUrl || post.media_url, image_url: editPostImageUrl || post.image_url }
            : post
        ));
        setEditingPost(null);
        setEditPostContent('');
        setEditPostImageUrl('');
        alert('הפוסט עודכן בהצלחה!');
      }
    } catch (error) {
      console.error('Error updating post:', error);
      alert('שגיאה בעדכון הפוסט. אנא נסה שוב.');
    }
  }

  // Filter friends based on active tab
  // For "active" tab, show all friends (is_online is not reliable in real-time)
  // Only show online indicator for the current logged-in user
  const filteredFriends = activeFriendsTab === 'active' 
    ? friends // Show all friends, but only mark current user as online
    : friends.sort((a: any, b: any) => {
        const aDate = new Date(a.created_at || 0).getTime();
        const bDate = new Date(b.created_at || 0).getTime();
        return bDate - aDate;
      }).slice(0, 10);

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-7xl mx-auto text-center py-12">טוען...</div>
      </div>
    );
  }

  return (
    <div className="px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 overflow-x-hidden">
      {/* Reports News Ticker */}
      <ReportsTicker reports={reports} />

      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-4 sm:gap-6 min-w-0">
        {/* Left Sidebar - Desktop */}
        <aside className="hidden lg:block lg:w-[20%] xl:w-[22%] 2xl:w-[22%] space-y-4 sm:space-y-6 flex-shrink-0">
          {/* Who is Online */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">מי מחובר?</h2>
            {onlineUsers.length === 0 ? (
              <div className="p-4 bg-[#F3F4F6] rounded-lg border border-pink-200">
                <p className="text-sm text-gray-500">אין חברים מחוברים כרגע</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center" style={{ direction: 'rtl' }}>
                  {onlineUsers.slice(0, 5).map((user: any, index: number) => (
                    <div
                      key={user.id || user.user_id}
                      className="relative group"
                      title={user.display_name || user.first_name || 'משתמש'}
                      style={{
                        marginRight: index > 0 ? '-8px' : '0',
                        zIndex: 5 - index
                      }}
                    >
                      {user.avatar_url ? (
                        <img
                          src={`${user.avatar_url}?t=${Date.now()}`}
                          alt={user.display_name || 'User'}
                          className="w-10 h-10 rounded-full border-2 border-green-500 cursor-pointer hover:scale-110 transition-transform"
                          key={`online-${user.id || user.user_id}-${user.avatar_url}`}
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm border-2 border-green-500 cursor-pointer hover:scale-110 transition-transform">
                          {getInitials(user.display_name || user.first_name)}
                        </div>
                      )}
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white z-10"></div>
                      {/* Badge overlay - bottom left */}
                      {(() => {
                        const userBadge = friendsBadges[user.user_id || user.id];
                        if (userBadge?.badge) {
                          return (
                            <div className="absolute bottom-0 left-0 w-5 h-5 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg border-2 border-white z-10">
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
                <p className="text-xs text-gray-500">
                  {onlineUsers.length} {onlineUsers.length === 1 ? 'חבר מחובר' : 'חברים מחוברים'}
                </p>
              </div>
            )}
          </div>

          {/* Recent Updates */}
          <RecentUpdates 
            updates={recentUpdates} 
            showAllUpdatesLink={true}
            userIsPremium={userIsPremium}
          />

          {/* Upcoming Events */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">אירועים עתידיים</h2>
              <Link href="/live-log" className="text-sm text-[#F52F8E] hover:underline">הכל ←</Link>
            </div>
            {upcomingEvents.length === 0 ? (
              <div className="p-4 bg-[#F3F4F6] rounded-lg border border-pink-200">
                <p className="text-sm text-gray-500">כרגע אין אירועים קרובים</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.slice(0, 5).map((event) => (
                  <Link
                    key={event.id}
                    href={`/live/${event.id}`}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group"
                  >
                    <Calendar className="w-5 h-5 text-[#F52F8E] flex-shrink-0 mt-0.5 group-hover:text-[#E01E7A] transition-colors" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800 group-hover:text-[#F52F8E] transition-colors">{event.title}</p>
                      <p className="text-xs text-gray-500 mt-1">
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
        <main className="flex-1 min-w-0 lg:w-[60%] xl:w-[56%] 2xl:w-[56%] space-y-4 sm:space-y-6 flex-shrink">
          {/* News Carousel */}
          {news && news.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 relative overflow-hidden">
              <div className="relative">
                {/* Carousel Container */}
                <div className="relative h-48 sm:h-64 overflow-hidden rounded-lg">
                  {news.map((item, index) => (
                    <div
                      key={item.id}
                      className={`absolute inset-0 transition-opacity duration-500 ${
                        index === currentNewsIndex ? 'opacity-100' : 'opacity-0 pointer-events-none'
                      }`}
                    >
                      {item.link_url ? (
                        <Link href={item.link_url} className="block h-full">
                          <div className="relative h-full bg-gradient-to-br from-[#F52F8E] to-pink-500 rounded-lg overflow-hidden">
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.title}
                                className="w-full h-full object-cover"
                                loading={index === 0 ? 'eager' : 'lazy'}
                                decoding="async"
                              />
                            ) : null}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex items-end">
                              <div className="p-4 sm:p-6 text-white w-full">
                                <h3 className="text-lg sm:text-xl font-bold mb-2">{item.title}</h3>
                                {item.content && (() => {
                                  const hasHTML = /<[a-z][\s\S]*>/i.test(item.content);
                                  if (hasHTML) {
                                    // Strip HTML tags for preview
                                    const textContent = item.content.replace(/<[^>]*>/g, '').trim();
                                    return (
                                      <p className="text-sm sm:text-base opacity-90 line-clamp-2">{textContent}</p>
                                    );
                                  }
                                  return (
                                    <p className="text-sm sm:text-base opacity-90 line-clamp-2">{stripHtml(item.content)}</p>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                        </Link>
                      ) : (
                        <div className="relative h-full bg-gradient-to-br from-[#F52F8E] to-pink-500 rounded-lg overflow-hidden">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.title}
                              className="w-full h-full object-cover"
                              loading={index === 0 ? 'eager' : 'lazy'}
                              decoding="async"
                            />
                          ) : null}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex items-end">
                            <div className="p-4 sm:p-6 text-white w-full">
                              <h3 className="text-lg sm:text-xl font-bold mb-2">{item.title}</h3>
                              {item.content && (() => {
                                const hasHTML = /<[a-z][\s\S]*>/i.test(item.content);
                                if (hasHTML) {
                                  // Strip HTML tags for preview
                                  const textContent = item.content.replace(/<[^>]*>/g, '').trim();
                                  return (
                                    <p className="text-sm sm:text-base opacity-90 line-clamp-2">{textContent}</p>
                                  );
                                }
                                return (
                                  <p className="text-sm sm:text-base opacity-90 line-clamp-2">{stripHtml(item.content)}</p>
                                );
                              })()}
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
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-2 shadow-lg transition-all z-10"
                      aria-label="חדשה קודמת"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setCurrentNewsIndex((prev) => (prev === news.length - 1 ? 0 : prev + 1))}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-2 shadow-lg transition-all z-10"
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
                            ? 'bg-[#F52F8E] w-6'
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
              {!showPostForm ? (
                <button
                  onClick={() => setShowPostForm(true)}
                  className="w-full px-4 py-3 bg-gradient-to-r from-[#F52F8E] to-pink-500 text-white rounded-lg hover:from-[#E01E7A] hover:to-pink-600 transition-all flex items-center justify-center gap-2 font-semibold"
                >
                  <Plus className="w-5 h-5" />
                  <span>פרסם הודעה חדשה</span>
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">פרסם הודעה חדשה</h3>
                    <button
                      onClick={() => {
                        setShowPostForm(false);
                        setNewPostContent('');
                        setNewPostImageUrl('');
                      }}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="relative" dir="rtl">
                    <RichTextEditor
                      content={newPostContent}
                      onChange={setNewPostContent}
                      placeholder="מה אתה רוצה לשתף?"
                      userId={currentUser?.user_id || currentUser?.id}
                    />
                  </div>
                  <input
                    type="text"
                    value={newPostImageUrl}
                    onChange={(e) => setNewPostImageUrl(e.target.value)}
                    placeholder="קישור לתמונה (אופציונלי)"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F52F8E]"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        setShowPostForm(false);
                        setNewPostContent('');
                        setNewPostImageUrl('');
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      ביטול
                    </button>
                    <button
                    onClick={handleCreatePost}
                    disabled={!newPostContent.replace(/<[^>]*>/g, '').trim()}
                      className="px-4 py-2 bg-[#F52F8E] text-white rounded-lg hover:bg-[#E01E7A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      <span>פרסם</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {announcements.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
              <div className="p-3 sm:p-4 bg-[#F3F4F6] rounded-lg border-l-4 border-[#F52F8E]">
                <p className="text-xs sm:text-sm text-gray-500">מצטערים, לא נמצאה פעילות.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {announcements.map((post) => (
                <div key={post.id} id={`post-${post.id}`} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
                  <div className="flex gap-3 sm:gap-4">
                    <div className="relative w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0">
                      {post.profile?.avatar_url ? (
                        <img
                          src={`${post.profile.avatar_url}?t=${Date.now()}`}
                          alt={post.profile.display_name || 'User'}
                          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover shadow-lg shadow-pink-500/30 ring-2 ring-white/50"
                          key={`post-${post.id}-${post.profile.avatar_url}`}
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-pink-500 via-rose-400 to-amber-300 flex items-center justify-center text-white font-semibold shadow-lg shadow-pink-500/30 ring-2 ring-white/50 text-sm sm:text-base">
                          {getInitials(post.profile?.display_name || 'מ')}
                        </div>
                      )}
                      {/* Badge overlay - bottom left */}
                      {(() => {
                        const postAuthorId = post.user_id || post.profile?.user_id;
                        const postAuthorBadge = postAuthorId ? friendsBadges[postAuthorId] : null;
                        if (postAuthorBadge?.badge) {
                          return (
                            <div className="absolute bottom-0 left-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg border-2 border-white z-10">
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
                          <h3 className="font-semibold text-gray-800 text-sm sm:text-base">
                            {post.profile?.display_name || 'מנהל'}
                          </h3>
                          <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs rounded-full font-medium shadow-md shadow-pink-500/30">
                            מנהל
                          </span>
                          <span className="text-xs sm:text-sm text-gray-500 hidden sm:inline">•</span>
                          <span className="text-xs sm:text-sm text-gray-500">{formatTimeAgo(post.created_at)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {userIsAdmin && (
                            <button
                              onClick={() => handleEditPost(post)}
                              className="text-blue-500 hover:text-blue-700 transition-colors p-1 rounded-lg hover:bg-blue-50"
                              title="ערוך פוסט"
                            >
                              <Edit className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                          )}
                          {currentUser && (currentUser.id === post.user_id || currentUser.user_id === post.user_id) && (
                            <button
                              onClick={() => handleDeletePost(post.id)}
                              className="text-red-500 hover:text-red-700 transition-colors p-1 rounded-lg hover:bg-red-50"
                              title="מחק פוסט"
                            >
                              <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                          )}
                        </div>
                      </div>
                      {editingPost === post.id && userIsAdmin ? (
                        <div className="space-y-4 mb-3 sm:mb-4">
                          <RichTextEditor
                            content={editPostContent}
                            onChange={setEditPostContent}
                            placeholder="ערוך את תוכן הפוסט..."
                            userId={currentUser?.id || currentUser?.user_id || ''}
                          />
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="URL תמונה (אופציונלי)"
                              value={editPostImageUrl}
                              onChange={(e) => setEditPostImageUrl(e.target.value)}
                              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSaveEdit(post.id)}
                              className="flex items-center gap-2 px-4 py-2 bg-[#F52F8E] text-white rounded-lg hover:bg-[#E01E7A] transition-colors"
                            >
                              <Save className="w-4 h-4" />
                              שמור
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                            >
                              <X className="w-4 h-4" />
                              ביטול
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div 
                          className="text-sm sm:text-base text-gray-700 mb-3 sm:mb-4 leading-relaxed prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: post.content }}
                          dir="rtl"
                        />
                      )}
                      {(post.image_url || post.media_url) && (
                        <div className="mb-3 sm:mb-4">
                          <img 
                            src={post.image_url || post.media_url} 
                            alt="Post media" 
                            className="w-full rounded-lg max-h-64 sm:max-h-96 object-cover"
                          />
                        </div>
                      )}
                      {/* Likes and Comments Count */}
                      {((post.likes_count || 0) > 0 || (post.comments_count || 0) > 0) && (
                        <div className="flex items-center gap-4 text-xs sm:text-sm text-gray-600 pt-2 pb-1">
                          {(post.comments_count || 0) > 0 && (
                            <span className="font-medium">
                              {post.comments_count || 0} תגובות
                            </span>
                          )}
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center gap-3 sm:gap-6 pt-3 sm:pt-4 border-t border-gray-100 flex-wrap">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <button 
                            onClick={() => handleToggleLike(post.id)}
                            className={`transition-all group rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 hover:bg-pink-50 ${
                              likedPosts[post.id] 
                                ? 'text-pink-500' 
                                : 'text-gray-600 hover:text-pink-500'
                            }`}
                          >
                            <Heart 
                              className={`w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform ${
                                likedPosts[post.id] ? 'fill-current' : ''
                              }`} 
                            />
                          </button>
                          {(post.likes_count || 0) > 0 && (
                            <button
                              onClick={() => handleShowLikes(post.id)}
                              className="text-xs sm:text-sm font-medium text-gray-600 hover:text-pink-500 hover:underline cursor-pointer transition-colors"
                            >
                              {post.likes_count || 0}
                            </button>
                          )}
                        </div>
                        <button className="flex items-center gap-1.5 sm:gap-2 text-gray-600 hover:text-pink-500 transition-all group rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 hover:bg-pink-50">
                          <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
                          <span className="text-xs sm:text-sm font-medium">תגובה</span>
                        </button>
                        <button className="flex items-center gap-1.5 sm:gap-2 text-gray-600 hover:text-pink-500 transition-all group rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 hover:bg-pink-50">
                          <Share2 className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
                          <span className="text-xs sm:text-sm font-medium">שיתוף</span>
                        </button>
                      </div>

                      {/* Comments Section - Always Visible */}
                      <div className="mt-4 pt-4 border-t border-gray-200">
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
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Mobile Sections - Show after posts */}
          <div className="lg:hidden space-y-4 sm:space-y-6">
            {/* Who is Online */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">מי מחובר?</h2>
              {onlineUsers.length === 0 ? (
                <div className="p-4 bg-[#F3F4F6] rounded-lg border border-pink-200">
                  <p className="text-sm text-gray-500">אין חברים מחוברים כרגע</p>
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
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm border-2 border-green-500 cursor-pointer hover:scale-110 transition-transform">
                            {getInitials(user.display_name || user.first_name)}
                          </div>
                        )}
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white z-10"></div>
                        {/* Badge overlay - bottom left */}
                        {(() => {
                          const userBadge = friendsBadges[user.user_id || user.id];
                          if (userBadge?.badge) {
                            return (
                              <div className="absolute bottom-0 left-0 w-5 h-5 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg border-2 border-white z-10">
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
                  <p className="text-xs text-gray-500">
                    {onlineUsers.length} {onlineUsers.length === 1 ? 'חבר מחובר' : 'חברים מחוברים'}
                  </p>
                </div>
              )}
            </div>

            {/* Recent Updates */}
            <RecentUpdates 
              updates={recentUpdates} 
              showAllUpdatesLink={true}
              userIsPremium={userIsPremium}
            />

            {/* Upcoming Events */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">אירועים עתידיים</h2>
                <Link href="/live-log" className="text-sm text-[#F52F8E] hover:underline">הכל ←</Link>
              </div>
              {upcomingEvents.length === 0 ? (
                <div className="p-4 bg-[#F3F4F6] rounded-lg border border-pink-200">
                  <p className="text-sm text-gray-500">כרגע אין אירועים קרובים</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.slice(0, 5).map((event) => (
                    <Link
                      key={`mobile-${event.id}`}
                      href={`/live/${event.id}`}
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group"
                    >
                      <Calendar className="w-5 h-5 text-[#F52F8E] flex-shrink-0 mt-0.5 group-hover:text-[#E01E7A] transition-colors" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800 group-hover:text-[#F52F8E] transition-colors">{event.title}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(event.event_date).toLocaleDateString('he-IL')} • {event.event_time}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Friends - Mobile */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">חברים</h2>
              
              {/* Tabs */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setActiveFriendsTab('active')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    activeFriendsTab === 'active'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  פעילים
                </button>
                <button
                  onClick={() => setActiveFriendsTab('new')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    activeFriendsTab === 'new'
                      ? 'bg-pink-100 text-[#F52F8E]'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  חדשים
                </button>
              </div>

              {/* Friends List */}
              {filteredFriends.length === 0 ? (
                <div className="p-4 bg-[#F3F4F6] rounded-lg">
                  <p className="text-sm text-gray-500">אין חברים {activeFriendsTab === 'active' ? 'פעילים' : 'חדשים'}</p>
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
                        key={`mobile-${friend.id || friend.user_id}`} 
                        className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 rounded-lg p-2 -mx-2 transition-colors"
                        onClick={handleFriendClick}
                      >
                        <div className="relative">
                          {friend.avatar_url ? (
                            <img 
                              src={`${friend.avatar_url}?t=${Date.now()}`}
                              alt={friend.display_name || 'User'} 
                              className="w-10 h-10 rounded-full"
                              key={`friend-mobile-${friend.id || friend.user_id}-${friend.avatar_url}`}
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                              {getInitials(friend.display_name || friend.full_name)}
                            </div>
                          )}
                          {(() => {
                            // Only show online indicator for the current logged-in user
                            const friendUserId = friend.user_id || friend.id;
                            const currentUserId = currentUser?.user_id || currentUser?.id;
                            const isCurrentUser = friendUserId === currentUserId;
                            return isCurrentUser ? (
                              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white z-10"></div>
                            ) : null;
                          })()}
                          {/* Badge overlay - bottom left */}
                          {(() => {
                            const friendBadge = friendsBadges[friendUserId];
                            if (friendBadge?.badge) {
                              return (
                                <div className="absolute bottom-0 left-0 w-5 h-5 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg border-2 border-white z-10">
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
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {friend.display_name || friend.full_name || 'משתמש'}
                          </p>
                          {activeFriendsTab === 'new' && friend.created_at && (
                            <p className="text-xs text-gray-500">
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
          </div>
        </main>

        {/* Right Sidebar - Friends */}
        <aside className="hidden lg:block lg:w-[20%] xl:w-[22%] 2xl:w-[22%] flex-shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">חברים</h2>
            
            {/* Tabs */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setActiveFriendsTab('active')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeFriendsTab === 'active'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                פעילים
              </button>
              <button
                onClick={() => setActiveFriendsTab('new')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeFriendsTab === 'new'
                    ? 'bg-pink-100 text-[#F52F8E]'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                חדשים
              </button>
            </div>

            {/* Friends List */}
            {filteredFriends.length === 0 ? (
              <div className="p-4 bg-[#F3F4F6] rounded-lg">
                <p className="text-sm text-gray-500">אין חברים {activeFriendsTab === 'active' ? 'פעילים' : 'חדשים'}</p>
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
                      className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 rounded-lg p-2 -mx-2 transition-colors"
                      onClick={handleFriendClick}
                    >
                      <div className="relative">
                        {friend.avatar_url ? (
                          <img 
                            src={`${friend.avatar_url}?t=${Date.now()}`}
                            alt={friend.display_name || 'User'} 
                            className="w-10 h-10 rounded-full"
                            key={`friend-${friend.id || friend.user_id}-${friend.avatar_url}`}
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                            {getInitials(friend.display_name || friend.full_name)}
                          </div>
                        )}
                        {(() => {
                          // Only show online indicator for the current logged-in user
                          const friendUserId = friend.user_id || friend.id;
                          const currentUserId = currentUser?.user_id || currentUser?.id;
                          const isCurrentUser = friendUserId === currentUserId;
                          return isCurrentUser ? (
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white z-10"></div>
                          ) : null;
                        })()}
                        {/* Badge overlay - bottom left */}
                        {(() => {
                          const friendBadge = friendsBadges[friendUserId];
                          if (friendBadge?.badge) {
                            return (
                              <div className="absolute bottom-0 left-0 w-5 h-5 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg border-2 border-white z-10">
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
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {friend.display_name || friend.full_name || 'משתמש'}
                        </p>
                        {activeFriendsTab === 'new' && friend.created_at && (
                          <p className="text-xs text-gray-500">
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

      {/* Likes Modal */}
      {showLikesModal && selectedPostForLikes && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowLikesModal(false);
            setSelectedPostForLikes(null);
          }}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <h2 className="text-xl font-bold text-gray-800">אנשים שעשו לייק</h2>
              <button
                onClick={() => {
                  setShowLikesModal(false);
                  setSelectedPostForLikes(null);
                }}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingLikes[selectedPostForLikes] ? (
                <div className="text-center py-8 text-gray-500">טוען...</div>
              ) : !postLikes[selectedPostForLikes] || postLikes[selectedPostForLikes].length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Heart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg">אין לייקים עדיין</p>
                  <p className="text-sm mt-2">תהיה הראשון לעשות לייק!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {postLikes[selectedPostForLikes].map((like) => {
                    const userId = like.user_id;
                    const displayName = like.display_name || 'משתמש';
                    const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                    
                    return (
                      <Link
                        key={userId}
                        href={`/profile?userId=${userId}`}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                        onClick={(e) => {
                          // Don't close modal when clicking on profile link
                          e.stopPropagation();
                        }}
                      >
                        {like.avatar_url ? (
                          <img
                            src={`${like.avatar_url}?t=${Date.now()}`}
                            alt={displayName}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-white font-semibold text-sm">
                            {initials}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800 truncate">{displayName}</p>
                          {like.created_at && (
                            <p className="text-xs text-gray-500">
                              {new Date(like.created_at).toLocaleDateString('he-IL', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Profile Completion Modal */}
      {currentUser && (currentUser.user_id || currentUser.id) && (
        <ProfileCompletionModal 
          userId={(currentUser.user_id || currentUser.id) as string} 
        />
      )}
    </div>
  );
}
