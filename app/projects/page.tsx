'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Search,
  Plus,
  List,
  Grid,
  Clock,
  User as UserIcon,
  X,
  Send,
} from 'lucide-react';
import Link from 'next/link';
import { getAllProjects, Project } from '@/lib/queries/projects';
import { getAllEvents } from '@/lib/queries/events';
import { getAllForums, getForumPosts } from '@/lib/queries/forums';
import { getAllRecordings } from '@/lib/queries/recordings';
import { getAllTags, suggestTag, assignTagsToContent, type Tag } from '@/lib/queries/tags';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { useOnlineUsers } from '@/lib/hooks/useOnlineUsers';
import { isPremiumUser } from '@/lib/utils/user';
import { formatTimeAgo } from '@/lib/utils/date';
import { getInitials } from '@/lib/utils/display';
import { supabase } from '@/lib/supabase';
import { clearCache } from '@/lib/cache';
import { useRouter } from 'next/navigation';
import ProtectedAction from '@/app/components/ProtectedAction';
import RecentUpdates from '@/app/components/RecentUpdates';

// Enhanced Tag Selector with create capability
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
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTags = useMemo(() => {
    if (!searchQuery) return availableTags;
    const query = searchQuery.toLowerCase().trim();
    if (!query) return availableTags;
    return availableTags.filter(tag => 
      tag.name.toLowerCase().includes(query) ||
      tag.description?.toLowerCase().includes(query)
    );
  }, [availableTags, searchQuery]);

  const selectedTags = useMemo(() => {
    return availableTags.filter(tag => selectedTagIds.includes(tag.id));
  }, [availableTags, selectedTagIds]);

  // Check if search query doesn't match any existing tag
  const shouldShowCreateOption = useMemo(() => {
    if (!searchQuery || !searchQuery.trim()) return false;
    const query = searchQuery.toLowerCase().trim();
    const exists = availableTags.some(tag => 
      tag.name.toLowerCase() === query ||
      tag.name.toLowerCase().includes(query)
    );
    return !exists && query.length > 0;
  }, [searchQuery, availableTags]);

  function toggleTag(tagId: string) {
    const newSelection = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter(id => id !== tagId)
      : [...selectedTagIds, tagId];
    onSelectionChange(newSelection);
  }

  async function handleCreateNewTag() {
    if (!searchQuery.trim()) return;
    await onNewTagCreate(searchQuery.trim());
    setSearchQuery('');
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
                e.stopPropagation();
                toggleTag(tag.id);
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
              setIsOpen(false);
              setSearchQuery('');
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
                    e.preventDefault();
                    handleCreateNewTag();
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
                    e.stopPropagation();
                    await handleCreateNewTag();
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
                      e.stopPropagation();
                      toggleTag(tag.id);
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
  );
}

export default function ProjectsPage() {
  const router = useRouter();
  const { user: currentUser, isPremium: userIsPremium } = useCurrentUser();
  const { users: onlineUsers } = useOnlineUsers();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [recentUpdates, setRecentUpdates] = useState<Array<{
    type: 'forum' | 'project' | 'recording' | 'event' | 'blog' | 'course' | 'post';
    text: string;
    time: string;
    icon: string;
    link?: string;
    id?: string;
    created_at?: string;
  }>>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [showGuestChoiceModal, setShowGuestChoiceModal] = useState(false);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    budget_min: '',
    budget_max: '',
    budget_currency: 'ILS',
    selectedTagIds: [] as string[]
  });
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [guestInfo, setGuestInfo] = useState({
    name: '',
    email: ''
  });
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [offerForm, setOfferForm] = useState({
    message: '',
    offer_amount: ''
  });
  const [submittingOffer, setSubmittingOffer] = useState(false);
  const [showProjectDetailsModal, setShowProjectDetailsModal] = useState(false);
  const [selectedProjectForDetails, setSelectedProjectForDetails] = useState<Project | null>(null);
  const [showPointsConfirmationModal, setShowPointsConfirmationModal] = useState(false);
  const [showInsufficientPointsModal, setShowInsufficientPointsModal] = useState(false);
  const [userPoints, setUserPoints] = useState<number>(0);
  const [pointsConfirmed, setPointsConfirmed] = useState(false);

  // Ref to prevent parallel calls to loadData
  const isLoadingDataRef = useRef(false);

  const loadData = useCallback(async () => {
    // Prevent parallel calls
    if (isLoadingDataRef.current) {
      console.log('loadData already running, skipping...');
      return;
    }
    
    isLoadingDataRef.current = true;
    setLoading(true);
    
    // Add timeout to prevent hanging (Chrome-specific issue)
    let timeoutId: NodeJS.Timeout | null = setTimeout(() => {
      console.warn('loadData taking too long, stopping loading state');
      setLoading(false);
      isLoadingDataRef.current = false; // CRITICAL: Reset ref on timeout
    }, 20000); // 20 seconds timeout
    
    try {
      // Load only essential data first
      const [projectsRes, eventsRes, tagsRes] = await Promise.all([
        getAllProjects(),
        getAllEvents(),
        getAllTags(false) // Only approved tags
      ]);
      
      if (tagsRes.data && Array.isArray(tagsRes.data)) {
        setAvailableTags(tagsRes.data);
      }

      if (projectsRes.data) {
        // Sort projects: closed projects go to the end
        if (Array.isArray(projectsRes.data)) {
          const sortedProjects = [...projectsRes.data].sort((a, b) => {
            // If one is closed and the other is not, closed goes to the end
            if (a.status === 'closed' && b.status !== 'closed') return 1;
            if (a.status !== 'closed' && b.status === 'closed') return -1;
            // Otherwise maintain original order (by created_at DESC from query)
            return 0;
          });
          setProjects(sortedProjects);
        } else {
          setProjects([]);
        }
      }

      if (eventsRes.data) {
        const now = new Date();
        const upcoming = eventsRes.data
          .filter((e: any) => {
            if (!e.event_date) return false;
            try {
              const eventDate = new Date(e.event_date);
              return !isNaN(eventDate.getTime()) && eventDate >= now;
            } catch {
              return false;
            }
          })
          .slice(0, 3);
        setUpcomingEvents(upcoming);
      }

      // Mark loading as complete first, then load recent updates in background
      setLoading(false);
      
      // Load recent updates in background (non-blocking)
      loadRecentUpdates(eventsRes.data || []).catch(err => {
        console.error('Error loading recent updates:', err);
      });
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      isLoadingDataRef.current = false;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    
    setMounted(true);
    loadData().catch(error => {
      if (!cancelled) {
        console.error('Error in loadData effect:', error);
      }
    });
    
    // Listen for auth state changes to reload data when user logs out/in
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (cancelled) return;
      if (event === 'SIGNED_OUT' || event === 'SIGNED_IN') {
        // Clear cache and reload data when auth state changes
        clearCache('profiles:all');
        loadData();
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [loadData]);

  const handleCreateProject = useCallback(async () => {
    if (!newProject.title || !newProject.description) {
      alert('אנא מלא את כל השדות הנדרשים');
      return;
    }

    // If guest mode, validate guest info
    if (isGuestMode) {
      if (!guestInfo.name || !guestInfo.email) {
        alert('אנא מלא את שמך המלא וכתובת האימייל');
        return;
      }
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(guestInfo.email)) {
        alert('אנא הכנס כתובת אימייל תקינה');
        return;
      }
    } else {
      // If not guest mode, require user
      if (!currentUser) {
        alert('לא נמצא משתמש מחובר');
        return;
      }
    }

    try {
      const userId = isGuestMode ? null : (currentUser?.user_id || currentUser?.id);
      
      // All selected tags (already created via onNewTagCreate in TagSelectorWithCreate)
      const allTagIds = newProject.selectedTagIds;

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          guest_name: isGuestMode ? guestInfo.name : null,
          guest_email: isGuestMode ? guestInfo.email : null,
          title: newProject.title,
          description: newProject.description,
          budget_min: newProject.budget_min ? parseFloat(newProject.budget_min) : null,
          budget_max: newProject.budget_max ? parseFloat(newProject.budget_max) : null,
          budget_currency: 'ILS',
          tagIds: allTagIds // Send tag IDs instead of technologies
        })
      });

      if (response.ok) {
        const projectData = await response.json();
        
        // Assign tags to the project
        if (allTagIds.length > 0 && projectData.id) {
          await assignTagsToContent('project', projectData.id, allTagIds);
        }
        
        setNewProject({
          title: '',
          description: '',
          budget_min: '',
          budget_max: '',
          budget_currency: 'ILS',
          selectedTagIds: []
        });
        setGuestInfo({
          name: '',
          email: ''
        });
        setIsGuestMode(false);
        setShowNewProjectForm(false);
        // Clear cache and reload
        const { clearCache } = await import('@/lib/cache');
        clearCache('projects');
        await loadData();
        alert('הפרויקט נוצר בהצלחה!');
      } else {
        const errorData = await response.json();
        alert(`שגיאה ביצירת הפרויקט: ${errorData.error || 'שגיאה לא ידועה'}`);
      }
    } catch (error) {
      console.error('Error creating project:', error);
      alert('שגיאה ביצירת הפרויקט');
    }
  }, [newProject, guestInfo, isGuestMode, currentUser, loadData]);

  const loadRecentUpdates = useCallback(async (eventsData: any[] = []) => {
    try {
      const updates: Array<{
        type: 'forum' | 'project' | 'recording' | 'event' | 'blog' | 'course' | 'post';
        text: string;
        time: string;
        icon: string;
        link?: string;
        id?: string;
        created_at?: string;
      }> = [];
      
      // Get date from 30 days ago to filter only recent updates
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();
      
      // Load all categories in parallel - same as homepage
      const [latestForumPostsResult, latestRecordingsResult, latestProjectsResult, latestBlogPostsResult, latestCoursesResult, latestAnnouncementsResult] = await Promise.all([
        // Get recent posts from ALL active forums
        supabase
          .from('forum_posts')
          .select('id, title, user_id, created_at, forum_id, forums(id, display_name, is_active)')
          .gte('created_at', thirtyDaysAgoISO)
          .order('created_at', { ascending: false })
          .limit(20),
        // Get recent recordings
        supabase.from('recordings').select('id, title, created_at').gte('created_at', thirtyDaysAgoISO).order('created_at', { ascending: false }).limit(20),
        // Get recent projects
        supabase.from('projects').select('id, title, user_id, guest_name, created_at').gte('created_at', thirtyDaysAgoISO).order('created_at', { ascending: false }).limit(20),
        // Get recent blog posts
        supabase.from('blog_posts').select('id, title, slug, author_id, created_at').eq('is_published', true).gte('created_at', thirtyDaysAgoISO).order('created_at', { ascending: false }).limit(20),
        // Get recent courses
        supabase.from('courses').select('id, title, created_at').gte('created_at', thirtyDaysAgoISO).order('created_at', { ascending: false }).limit(20),
        // Get recent announcements
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
            return forum?.is_active !== false;
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
          const profile = recentProject.user_id ? profilesMap.get(recentProject.user_id) : null;
          const userName = profile?.display_name || profile?.first_name || profile?.nickname || recentProject.guest_name || 'אורח';
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

      // Get recent events (from parameter)
      if (eventsData && eventsData.length > 0) {
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
        try {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dateB - dateA;
        } catch {
          return 0;
        }
      });
      
      setRecentUpdates(updates.slice(0, 5));
    } catch (error) {
      console.error('Error loading recent updates:', error);
    }
  }, []);

  function getStatusColor(status: string) {
    switch (status) {
      case 'open':
        return 'bg-green-100 text-green-700';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-700';
      case 'completed':
        return 'bg-blue-100 text-blue-700';
      case 'closed':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  }

  function getStatusText(status: string) {
    switch (status) {
      case 'open':
        return 'פתוח';
      case 'in_progress':
        return 'בביצוע';
      case 'completed':
        return 'הושלם';
      case 'closed':
        return 'סגור';
      default:
        return status;
    }
  }

  function handleSubmitOffer(projectId: string) {
    // ProtectedAction already handles auth check, but keep this as a safety check
    if (!currentUser) {
      return; // ProtectedAction will show tooltip
    }
    
    // Find the project
    const project = projects.find(p => p.id === projectId);
    if (!project) {
      alert('פרויקט לא נמצא');
      return;
    }
    
    // Check if project is closed
    if (project.status === 'closed') {
      alert('לא ניתן להגיש הצעות לפרויקט סגור');
      return;
    }
    
    // If user is premium, proceed normally
    if (userIsPremium) {
      setSelectedProject(project);
      setOfferForm({ message: '', offer_amount: '' });
      setShowOfferModal(true);
      return;
    }
    
    // For free users, check points balance
    const pointsCost = 50;
    const currentPoints = userPoints || (currentUser as any)?.points || 0;
    
    if (currentPoints >= pointsCost) {
      // User has enough points - show confirmation modal
      setSelectedProject(project);
      setShowPointsConfirmationModal(true);
    } else {
      // User doesn't have enough points - show insufficient points modal
      setSelectedProject(project);
      setShowInsufficientPointsModal(true);
    }
  }

  async function submitOffer() {
    if (!selectedProject || !currentUser) {
      alert('שגיאה: חסר מידע נדרש');
      return;
    }

    if (!offerForm.message.trim()) {
      alert('אנא הזן תיאור ההצעה');
      return;
    }

    if (!offerForm.offer_amount || isNaN(Number(offerForm.offer_amount)) || Number(offerForm.offer_amount) <= 0) {
      alert('אנא הזן הצעת מחיר תקינה');
      return;
    }

    setSubmittingOffer(true);
    try {
      const { createProjectOffer } = await import('@/lib/queries/projects');
      const { deductPoints } = await import('@/lib/queries/gamification');
      const userId = currentUser.user_id || currentUser.id;
      
      if (!userId) {
        alert('שגיאה: לא נמצא מזהה משתמש');
        setSubmittingOffer(false);
        return;
      }
      
      // For free users, deduct points before creating offer
      if (!userIsPremium) {
        const pointsCost = 50;
        const deductionResult = await deductPoints(userId, pointsCost);
        
        if (!deductionResult.success) {
          console.error('Error deducting points:', deductionResult.error);
          alert(`שגיאה בהפחתת נקודות: ${deductionResult.error || 'שגיאה לא ידועה'}`);
          setSubmittingOffer(false);
          return;
        }
        
        // Update local points state
        setUserPoints(deductionResult.points || 0);
        console.log(`✅ Deducted ${pointsCost} points. New balance: ${deductionResult.points}`);
      }
      
      const { data, error } = await createProjectOffer({
        project_id: selectedProject.id,
        user_id: userId,
        offer_amount: Number(offerForm.offer_amount),
        offer_currency: selectedProject.budget_currency || 'USD',
        message: offerForm.message.trim(),
        status: 'pending'
      });

      if (error) {
        console.error('Error submitting offer:', error);
        // If offer creation failed, refund points (for free users)
        if (!userIsPremium) {
          try {
            const { awardPoints } = await import('@/lib/queries/gamification');
            await awardPoints(userId, 'הגשת הצעה', {}).catch(() => {
              // If awardPoints fails, manually add points back
              return supabase
                .from('profiles')
                .update({ points: (userPoints || 0) + 50 })
                .eq('user_id', userId);
            });
          } catch (refundError) {
            console.error('Error refunding points:', refundError);
          }
        }
        alert('שגיאה בשליחת ההצעה. נסה שוב.');
        return;
      }

      // Send notification to project owner (only if project has user_id, not guest)
      if (selectedProject.user_id) {
        try {
          const { createNotification } = await import('@/lib/queries/notifications');
          const offererName = currentUser.display_name || currentUser.first_name || 'משתמש';
          
          await createNotification({
            user_id: selectedProject.user_id,
            type: 'project_offer',
            title: 'הצעה חדשה לפרויקט שלך',
            message: `${offererName} הגיש הצעה לפרויקט "${selectedProject.title}"`,
            link: `/projects`,
            related_id: selectedProject.id,
            related_type: 'project',
            is_read: false
          }).catch((error) => {
            console.warn('Error sending notification:', error);
          });
        } catch (error) {
          console.warn('Error in notification system:', error);
        }
      }

      // Award points only for premium users (free users already paid with points)
      if (userIsPremium) {
        try {
          const { awardPoints } = await import('@/lib/queries/gamification');
          await awardPoints(userId, 'הגשת הצעה', {}).catch(() => {
            return awardPoints(userId, 'submit_project_offer', {});
          }).catch((error) => {
            console.warn('Error awarding points:', error);
          });
        } catch (error) {
          console.warn('Error in gamification:', error);
        }
      }

      // Close modals and refresh data
      setShowOfferModal(false);
      setShowPointsConfirmationModal(false);
      setShowInsufficientPointsModal(false);
      setSelectedProject(null);
      setOfferForm({ message: '', offer_amount: '' });
      setPointsConfirmed(false);
      // Clear cache and reload to get updated offers_count
      const { clearCache } = await import('@/lib/cache');
      clearCache('profiles:all');
      clearCache('projects');
      await loadData();
      alert('ההצעה נשלחה בהצלחה!');
    } catch (error) {
      console.error('Error submitting offer:', error);
      alert('שגיאה בשליחת ההצעה. נסה שוב.');
    } finally {
      setSubmittingOffer(false);
    }
  }

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const query = searchQuery.toLowerCase();
    return projects.filter(project =>
      project.title.toLowerCase().includes(query) ||
      project.description.toLowerCase().includes(query)
    );
  }, [projects, searchQuery]);

  return (
    <div className="min-h-screen bg-[#F3F4F6]">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 overflow-x-hidden">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 min-w-0">
          {/* Main Content - First on Mobile */}
          <main className="flex-1 min-w-0 lg:w-[60%] xl:w-[56%] 2xl:flex-1 order-1 lg:order-2 flex-shrink">
            {/* Header with Title */}
            <div className="mb-4">
              <h1 className="text-3xl font-bold text-gray-800 mb-4">לוח פרויקטים</h1>
              {/* Post Project Button - Mobile Only - At Top */}
              <div className="lg:hidden">
                <div className="modern-card rounded-2xl p-5 animate-fade-in">
                  <button
                    onClick={() => {
                      if (!currentUser) {
                        setShowGuestChoiceModal(true);
                      } else {
                        setShowNewProjectForm(true);
                      }
                    }}
                    className="btn-modern flex items-center gap-2 px-4 py-2.5 text-white rounded-xl text-sm font-medium w-full justify-center"
                  >
                    <Plus className="w-4 h-4" />
                    פרסם פרויקט
                  </button>
                </div>
              </div>
            </div>
            {/* Header with Search and View Toggle */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                {/* Search Bar */}
                <div className="flex-1 sm:flex-none relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="חפש פרויקטים..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="modern-input w-full sm:w-64 pr-10 pl-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/20 text-sm"
                  />
                </div>
                {/* View Toggle */}
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded transition-colors ${
                      viewMode === 'list' 
                        ? 'bg-[#F52F8E] text-white shadow-sm' 
                        : 'text-gray-600 hover:bg-gray-200'
                    }`}
                    title="תצוגת רשימה"
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded transition-colors ${
                      viewMode === 'grid' 
                        ? 'bg-[#F52F8E] text-white shadow-sm' 
                        : 'text-gray-600 hover:bg-gray-200'
                    }`}
                    title="תצוגת רשת"
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Projects List/Grid */}
            {loading ? (
              <div className="text-center py-8 text-gray-500">טוען...</div>
            ) : filteredProjects.length === 0 ? (
              <div className="text-center py-8 text-gray-500">אין פרויקטים זמינים</div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProjects.map((project) => (
                  <div 
                    key={project.id} 
                    className="modern-card rounded-2xl p-5 animate-fade-in flex flex-col cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => {
                      setSelectedProjectForDetails(project);
                      setShowProjectDetailsModal(true);
                    }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(project.status)}`}>
                        {getStatusText(project.status)}
                      </span>
                      <div className="flex items-center gap-2">
                        {project.user?.avatar_url ? (
                          <img 
                            src={project.user.avatar_url} 
                            alt={project.user.display_name || 'User'} 
                            className="w-8 h-8 rounded-full"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#F52F8E] to-pink-400 flex items-center justify-center text-white text-xs font-semibold">
                            {(() => {
                              if (project.user?.display_name) {
                                return project.user.display_name.charAt(0);
                              } else if (project.guest_name) {
                                return project.guest_name.charAt(0);
                              }
                              return 'א';
                            })()}
                          </div>
                        )}
                        <div className="text-right">
                          <p className="text-xs font-medium text-gray-800">
                            {project.user?.display_name || project.guest_name || 'אורח'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {mounted ? formatTimeAgo(project.created_at || '') : ''}
                          </p>
                        </div>
                      </div>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-800 mb-2 line-clamp-2">{project.title}</h3>
                    <p className="text-sm text-gray-600 mb-4 leading-relaxed line-clamp-3 flex-1">{project.description}</p>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {project.technologies?.slice(0, 4).map((tech, idx) => (
                        <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                          {tech}
                        </span>
                      ))}
                      {project.technologies && project.technologies.length > 4 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                          +{project.technologies.length - 4}
                        </span>
                      )}
                    </div>

                    <div className="pt-4 border-t border-gray-100 space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1 text-gray-700">
                          <UserIcon className="w-4 h-4" />
                          <span>{project.offers_count || 0} הצעות</span>
                        </div>
                        {project.budget_min && project.budget_max && (
                          <div className="flex items-center gap-1 text-gray-700">
                            <span>
                              ₪ {Number(project.budget_min).toLocaleString('he-IL')} - {Number(project.budget_max).toLocaleString('he-IL')}
                            </span>
                          </div>
                        )}
                      </div>
                      {project.status === 'closed' ? (
                        <button 
                          disabled
                          className="w-full px-5 py-2.5 bg-gray-300 text-gray-500 rounded-xl text-sm font-medium cursor-not-allowed"
                        >
                          פרויקט סגור
                        </button>
                      ) : (
                        <ProtectedAction
                          requireAuth={true}
                          requirePremium={true}
                          pointsCost={50}
                          disabledMessage="התחבר כדי להגיש הצעה"
                        >
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSubmitOffer(project.id);
                            }}
                            className="w-full btn-modern px-5 py-2.5 text-white rounded-xl text-sm font-medium"
                          >
                            הגש הצעה
                          </button>
                        </ProtectedAction>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredProjects.map((project) => (
                  <div 
                    key={project.id} 
                    className="modern-card rounded-2xl p-5 sm:p-6 animate-fade-in cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => {
                      setSelectedProjectForDetails(project);
                      setShowProjectDetailsModal(true);
                    }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {project.user?.avatar_url ? (
                          <img 
                            src={project.user.avatar_url} 
                            alt={project.user.display_name || 'User'} 
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#F52F8E] to-pink-400 flex items-center justify-center text-white font-semibold">
                            {(() => {
                              if (project.user?.display_name) {
                                return project.user.display_name.charAt(0);
                              } else if (project.guest_name) {
                                return project.guest_name.charAt(0);
                              }
                              return 'א';
                            })()}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-800">
                            {project.user?.display_name || project.guest_name || 'אורח'}
                          </p>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {mounted ? formatTimeAgo(project.created_at || '') : ''}
                          </p>
                        </div>
                      </div>
                      <span className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-md ${getStatusColor(project.status)}`}>
                        {getStatusText(project.status)}
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-800 mb-2">{project.title}</h3>
                    <p className="text-sm text-gray-600 mb-4 leading-relaxed">{project.description}</p>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {project.technologies?.map((tech, idx) => (
                        <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                          {tech}
                        </span>
                      ))}
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-4 text-sm">
                        {project.budget_min && project.budget_max && (
                          <div className="flex items-center gap-1 text-gray-700">
                            <span>
                              ₪ {Number(project.budget_min).toLocaleString('he-IL')} - {Number(project.budget_max).toLocaleString('he-IL')}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-gray-700">
                          <UserIcon className="w-4 h-4" />
                          <span>{project.offers_count || 0} הצעות</span>
                        </div>
                      </div>
                      {project.status === 'closed' ? (
                        <button 
                          disabled
                          className="px-5 py-2.5 bg-gray-300 text-gray-500 rounded-xl text-sm font-medium cursor-not-allowed"
                        >
                          פרויקט סגור
                        </button>
                      ) : (
                        <ProtectedAction
                          requireAuth={true}
                          requirePremium={true}
                          pointsCost={50}
                          disabledMessage="התחבר כדי להגיש הצעה"
                        >
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSubmitOffer(project.id);
                            }}
                            className="btn-modern px-5 py-2.5 text-white rounded-xl text-sm font-medium"
                          >
                            הגש הצעה
                          </button>
                        </ProtectedAction>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>

          {/* Left Sidebar - Second on Mobile */}
          <aside className="w-full lg:w-[20%] xl:w-[22%] 2xl:w-64 flex-shrink space-y-4 order-2 lg:order-1">
            {/* Who's Online */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-4">מי מחובר?</h3>
              {onlineUsers.length === 0 ? (
                <div className="p-4 bg-[#F3F4F6] rounded-lg border border-pink-200">
                  <p className="text-sm text-gray-500">אין חברים מחוברים כרגע</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {onlineUsers.map((user: any) => (
                      <Link
                        key={user.id || user.user_id}
                        href={`/profile?userId=${user.user_id || user.id}`}
                        className="relative group"
                        title={user.display_name || user.first_name || 'משתמש'}
                      >
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={user.display_name || 'User'}
                            className="w-10 h-10 rounded-full border-2 border-green-500 cursor-pointer hover:scale-110 transition-transform"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm border-2 border-green-500 cursor-pointer hover:scale-110 transition-transform">
                            {getInitials(user.display_name || user.first_name)}
                          </div>
                        )}
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                      </Link>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">
                    {onlineUsers.length} {onlineUsers.length === 1 ? 'חבר מחובר' : 'חברים מחוברים'}
                  </p>
                </div>
              )}
            </div>

            {/* Post Project Button - Desktop Only */}
            <div className="hidden lg:block modern-card rounded-2xl p-5 animate-fade-in">
              <button
                onClick={() => {
                  if (!currentUser) {
                    setShowGuestChoiceModal(true);
                  } else {
                    setShowNewProjectForm(true);
                  }
                }}
                className="btn-modern flex items-center gap-2 px-4 py-2.5 text-white rounded-xl text-sm font-medium w-full justify-center"
              >
                <Plus className="w-4 h-4" />
                פרסם פרויקט
              </button>
            </div>

            {/* Guest Choice Modal */}
            {showGuestChoiceModal && (
              <div 
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm"
                onClick={() => setShowGuestChoiceModal(false)}
              >
                <div 
                  className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Modal Header */}
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-800">פרסם פרויקט</h2>
                  </div>

                  {/* Modal Body */}
                  <div className="p-6 space-y-4">
                    <p className="text-gray-700">
                      אני רואה שאתה לא מחובר. אפשר לפרסם פרויקט בלי להתחבר אבל לא תקבל על זה עדכונים. האם אתה רוצה לעשות זאת?
                    </p>
                  </div>

                  {/* Modal Footer */}
                  <div className="px-6 py-4 border-t border-gray-200 flex flex-col gap-3">
                    <button
                      onClick={() => {
                        setShowGuestChoiceModal(false);
                        router.push('/auth/login');
                      }}
                      className="w-full px-6 py-3 bg-[#F52F8E] text-white rounded-xl hover:bg-[#E01E7A] transition-colors text-sm font-medium"
                    >
                      אני מעוניין להתחבר
                    </button>
                    <button
                      onClick={() => {
                        setShowGuestChoiceModal(false);
                        router.push('/auth/signup');
                      }}
                      className="w-full px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      להירשם
                    </button>
                    <button
                      onClick={() => {
                        setShowGuestChoiceModal(false);
                        setIsGuestMode(true);
                        setShowNewProjectForm(true);
                      }}
                      className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors text-sm font-medium"
                    >
                      המשך בלי להתחבר
                    </button>
                    <button
                      onClick={() => setShowGuestChoiceModal(false)}
                      className="w-full px-6 py-2 text-gray-500 hover:text-gray-700 transition-colors text-sm"
                    >
                      ביטול
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* New Project Modal */}
            {showNewProjectForm && (
              <div 
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm"
                onClick={() => {
                  setShowNewProjectForm(false);
                  setIsGuestMode(false);
                  setNewProject({
                    title: '',
                    description: '',
                    budget_min: '',
                    budget_max: '',
                    budget_currency: 'ILS',
                    selectedTagIds: []
                  });
                  setGuestInfo({
                    name: '',
                    email: ''
                  });
                }}
              >
                <div 
                  className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Modal Header */}
                  <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between rounded-t-2xl">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800">פרסם פרויקט חדש</h2>
                    <button
                onClick={() => {
                  setShowNewProjectForm(false);
                  setIsGuestMode(false);
                  setNewProject({
                    title: '',
                    description: '',
                    budget_min: '',
                    budget_max: '',
                    budget_currency: 'ILS',
                    selectedTagIds: []
                  });
                  setGuestInfo({
                    name: '',
                    email: ''
                  });
                }}
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div className="p-4 sm:p-6 space-y-5">
                    {/* Guest Info Fields - Only show if guest mode */}
                    {isGuestMode && (
                      <>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            שם מלא *
                          </label>
                          <input
                            type="text"
                            placeholder="הכנס את שמך המלא"
                            value={guestInfo.name}
                            onChange={(e) => setGuestInfo({ ...guestInfo, name: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F52F8E] focus:border-transparent text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            כתובת אימייל *
                          </label>
                          <input
                            type="email"
                            placeholder="הכנס את כתובת האימייל שלך"
                            value={guestInfo.email}
                            onChange={(e) => setGuestInfo({ ...guestInfo, email: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F52F8E] focus:border-transparent text-sm"
                          />
                          <p className="text-xs text-gray-500 mt-1">נשלח אליך עדכונים על הפרויקט שלך</p>
                        </div>
                      </>
                    )}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        כותרת הפרויקט *
                      </label>
                      <input
                        type="text"
                        placeholder="לדוגמה: פיתוח בוט טלגרם לניהול הזמנות"
                        value={newProject.title}
                        onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F52F8E] focus:border-transparent text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        תיאור הפרויקט *
                      </label>
                      <textarea
                        placeholder="תאר בפירוט את הפרויקט, מה נדרש, מה המטרה וכו'..."
                        value={newProject.description}
                        onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                        rows={5}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F52F8E] focus:border-transparent text-sm resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        תקציב (בשקלים ₪)
                      </label>
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <input
                            type="number"
                            placeholder="מינימום"
                            value={newProject.budget_min}
                            onChange={(e) => setNewProject({ ...newProject, budget_min: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F52F8E] focus:border-transparent text-sm"
                          />
                        </div>
                        <div className="flex-1">
                          <input
                            type="number"
                            placeholder="מקסימום"
                            value={newProject.budget_max}
                            onChange={(e) => setNewProject({ ...newProject, budget_max: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F52F8E] focus:border-transparent text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        תגיות / מערכות
                      </label>
                      
                      {/* Tag Selector */}
                      <TagSelectorWithCreate
                        selectedTagIds={newProject.selectedTagIds}
                        onSelectionChange={(tagIds) => setNewProject({ ...newProject, selectedTagIds: tagIds })}
                        availableTags={availableTags}
                        onNewTagCreate={async (tagName: string) => {
                          const { data: newTag, error: tagError } = await suggestTag(tagName);
                          if (newTag && !tagError) {
                            // Add to available tags for immediate use
                            setAvailableTags(prev => [...prev, newTag]);
                            // Add to selected tags
                            setNewProject({ 
                              ...newProject, 
                              selectedTagIds: [...newProject.selectedTagIds, newTag.id] 
                            });
                          }
                        }}
                      />
                      
                      <p className="text-xs text-gray-500 mt-1">בחר תגיות קיימות או חפש תגית חדשה להוספה</p>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3 rounded-b-2xl">
                    <button
                onClick={() => {
                  setShowNewProjectForm(false);
                  setIsGuestMode(false);
                  setNewProject({
                    title: '',
                    description: '',
                    budget_min: '',
                    budget_max: '',
                    budget_currency: 'ILS',
                    selectedTagIds: []
                  });
                  setGuestInfo({
                    name: '',
                    email: ''
                  });
                }}
                      className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors text-sm font-medium"
                    >
                      ביטול
                    </button>
                    <button
                      onClick={handleCreateProject}
                      disabled={isGuestMode && (!guestInfo.name || !guestInfo.email)}
                      className="px-6 py-2.5 bg-[#F52F8E] text-white rounded-xl hover:bg-[#E01E7A] transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      פרסם פרויקט
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Updates */}
            <RecentUpdates 
              updates={recentUpdates} 
              showAllUpdatesLink={false}
              userIsPremium={userIsPremium}
            />

            {/* Upcoming Events */}
            <div className="modern-card rounded-2xl p-5 animate-fade-in">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-800">אירועים קרובים</h3>
                <Link href="/live-log" className="text-xs text-[#F52F8E] hover:underline">
                  הכל ←
                </Link>
              </div>
              {upcomingEvents.length === 0 ? (
                <p className="text-xs text-gray-500">כרגע אין אירועים קרובים</p>
              ) : (
                <div className="space-y-2">
                  {upcomingEvents.map((event) => (
                    <div key={event.id} className="flex items-start gap-2 text-xs">
                      <span className="text-[#F52F8E]">📅</span>
                      <div className="flex-1">
                        <p className="text-gray-700">{event.title}</p>
                        <p className="text-gray-500 text-xs mt-0.5">
                          {event.event_date ? (() => {
                            try {
                              const date = new Date(event.event_date);
                              if (isNaN(date.getTime())) return '';
                              return date.toLocaleDateString('he-IL', { day: 'numeric', month: 'long' });
                            } catch {
                              return '';
                            }
                          })() : ''} - {event.event_time || ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* Offer Submission Modal */}
      {showOfferModal && selectedProject && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            if (!submittingOffer) {
              setShowOfferModal(false);
              setSelectedProject(null);
              setOfferForm({ message: '', offer_amount: '' });
            }
          }}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <h2 className="text-2xl font-bold text-gray-800">הגשת הצעה</h2>
              <button
                onClick={() => {
                  if (!submittingOffer) {
                    setShowOfferModal(false);
                    setSelectedProject(null);
                    setOfferForm({ message: '', offer_amount: '' });
                  }
                }}
                className="text-gray-500 hover:text-gray-700 transition-colors"
                disabled={submittingOffer}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Recipient Info */}
              <div className="space-y-2">
                <p className="text-sm text-gray-600">שליחת הצעה אל</p>
                <div className="flex items-center gap-3">
                  {selectedProject.user?.avatar_url ? (
                    <img 
                      src={selectedProject.user.avatar_url} 
                      alt={selectedProject.user.display_name || 'User'} 
                      className="w-12 h-12 rounded-full"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#F52F8E] to-pink-400 flex items-center justify-center text-white font-semibold text-lg">
                      {(selectedProject.user?.display_name || 'U').charAt(0)}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-gray-800">{selectedProject.user?.display_name || 'משתמש'}</p>
                    <p className="text-sm text-gray-600">{selectedProject.title}</p>
                  </div>
                </div>
              </div>

              {/* Project Description */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-700 leading-relaxed">{selectedProject.description}</p>
              </div>

              {/* Offer Message */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  למה אתה מתאים לפרויקט? *
                </label>
                <textarea
                  value={offerForm.message}
                  onChange={(e) => {
                    if (e.target.value.length <= 500) {
                      setOfferForm({ ...offerForm, message: e.target.value });
                    }
                  }}
                  placeholder="תאר את הניסיון שלך, גישה מוצעת וזמן אספקה משוער"
                  className="w-full px-4 py-3 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F52F8E] focus:border-transparent text-sm min-h-[120px] resize-y"
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 mt-1 text-right">
                  {offerForm.message.length}/500
                </p>
              </div>

              {/* Price Offer */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  הצעת מחיר ({selectedProject.budget_currency || 'USD'}) *
                </label>
                <input
                  type="number"
                  value={offerForm.offer_amount}
                  onChange={(e) => setOfferForm({ ...offerForm, offer_amount: e.target.value })}
                  placeholder={`תקציב הלקוח: ${selectedProject.budget_min ? Number(selectedProject.budget_min).toLocaleString('he-IL') : ''}${selectedProject.budget_min && selectedProject.budget_max ? ' - ' : ''}${selectedProject.budget_max ? Number(selectedProject.budget_max).toLocaleString('he-IL') : ''}`}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F52F8E] focus:border-transparent text-sm"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3 rounded-b-2xl">
              <button
                onClick={() => {
                  if (!submittingOffer) {
                    setShowOfferModal(false);
                    setSelectedProject(null);
                    setOfferForm({ message: '', offer_amount: '' });
                  }
                }}
                className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors font-medium text-sm"
                disabled={submittingOffer}
              >
                ביטול
              </button>
              <button
                onClick={submitOffer}
                disabled={submittingOffer || !offerForm.message.trim() || !offerForm.offer_amount}
                className="px-6 py-2.5 bg-[#F52F8E] text-white rounded-xl hover:bg-[#E01E7A] transition-colors font-medium text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingOffer ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    שולח...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    שלח הצעה
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Project Details Modal */}
      {showProjectDetailsModal && selectedProjectForDetails && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowProjectDetailsModal(false);
            setSelectedProjectForDetails(null);
          }}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <h2 className="text-2xl font-bold text-gray-800">{selectedProjectForDetails.title}</h2>
              <button
                onClick={() => {
                  setShowProjectDetailsModal(false);
                  setSelectedProjectForDetails(null);
                }}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Project Owner Info */}
              <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                {selectedProjectForDetails.user?.avatar_url ? (
                  <img 
                    src={selectedProjectForDetails.user.avatar_url} 
                    alt={selectedProjectForDetails.user.display_name || 'User'} 
                    className="w-12 h-12 rounded-full"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#F52F8E] to-pink-400 flex items-center justify-center text-white font-semibold text-lg">
                    {(selectedProjectForDetails.user?.display_name || selectedProjectForDetails.guest_name || 'U').charAt(0)}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-gray-800">
                    {selectedProjectForDetails.user?.display_name || selectedProjectForDetails.guest_name || 'אורח'}
                  </p>
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {mounted ? formatTimeAgo(selectedProjectForDetails.created_at || '') : ''}
                  </p>
                </div>
                <div className="mr-auto">
                  <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${getStatusColor(selectedProjectForDetails.status)}`}>
                    {getStatusText(selectedProjectForDetails.status)}
                  </span>
                </div>
              </div>

              {/* Project Description */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">תיאור הפרויקט</h3>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedProjectForDetails.description}</p>
              </div>

              {/* Technologies */}
              {selectedProjectForDetails.technologies && selectedProjectForDetails.technologies.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">טכנולוגיות נדרשות</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedProjectForDetails.technologies.map((tech, idx) => (
                      <span key={idx} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Budget */}
              {(selectedProjectForDetails.budget_min || selectedProjectForDetails.budget_max) && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">תקציב</h3>
                  <p className="text-gray-700">
                    {selectedProjectForDetails.budget_min && selectedProjectForDetails.budget_max ? (
                      <>₪ {Number(selectedProjectForDetails.budget_min).toLocaleString('he-IL')} - {Number(selectedProjectForDetails.budget_max).toLocaleString('he-IL')}</>
                    ) : selectedProjectForDetails.budget_min ? (
                      <>מינימום: ₪ {Number(selectedProjectForDetails.budget_min).toLocaleString('he-IL')}</>
                    ) : (
                      <>מקסימום: ₪ {Number(selectedProjectForDetails.budget_max).toLocaleString('he-IL')}</>
                    )}
                  </p>
                </div>
              )}

              {/* Offers Count */}
              <div className="flex items-center gap-2 text-gray-700">
                <UserIcon className="w-5 h-5" />
                <span className="font-medium">{selectedProjectForDetails.offers_count || 0} הצעות</span>
              </div>
            </div>

            {/* Modal Footer */}
            {selectedProjectForDetails.status !== 'closed' && (
              <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3 rounded-b-2xl">
                <button
                  onClick={() => {
                    setShowProjectDetailsModal(false);
                    setSelectedProjectForDetails(null);
                  }}
                  className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors font-medium text-sm"
                >
                  סגור
                </button>
                <ProtectedAction
                  requireAuth={true}
                  requirePremium={true}
                  pointsCost={50}
                  disabledMessage="התחבר כדי להגיש הצעה"
                >
                  <button 
                    onClick={() => {
                      setShowProjectDetailsModal(false);
                      setSelectedProjectForDetails(null);
                      handleSubmitOffer(selectedProjectForDetails.id);
                    }}
                    className="btn-modern px-6 py-2.5 text-white rounded-xl text-sm font-medium flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    הגש הצעה
                  </button>
                </ProtectedAction>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

