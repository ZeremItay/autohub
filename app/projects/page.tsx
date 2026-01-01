'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
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
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { useOnlineUsers } from '@/lib/hooks/useOnlineUsers';
import { isPremiumUser } from '@/lib/utils/user';
import { useTheme } from '@/lib/contexts/ThemeContext';
import {
  getCardStyles,
  getTextStyles,
  getInputStyles,
  getButtonStyles,
  getBorderStyles,
  combineStyles
} from '@/lib/utils/themeStyles';
import { formatTimeAgo } from '@/lib/utils/date';
import { getInitials } from '@/lib/utils/display';
import { supabase } from '@/lib/supabase';
import { clearCache } from '@/lib/cache';
import { useRouter } from 'next/navigation';
import ProtectedAction from '@/app/components/ProtectedAction';

export default function ProjectsPage() {
  const router = useRouter();
  const { user: currentUser, isPremium: userIsPremium } = useCurrentUser();
  const { users: onlineUsers } = useOnlineUsers();
  const { theme } = useTheme();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [recentUpdates, setRecentUpdates] = useState<Array<{
    type: 'forum' | 'project' | 'recording' | 'event';
    text: string;
    time: string;
    icon: string;
    link?: string;
    id?: string;
  }>>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    budget_min: '',
    budget_max: '',
    budget_currency: 'ILS',
    technologies: ''
  });
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [offerForm, setOfferForm] = useState({
    message: '',
    offer_amount: ''
  });
  const [submittingOffer, setSubmittingOffer] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Load only essential data first
      const [projectsRes, eventsRes] = await Promise.all([
        getAllProjects(),
        getAllEvents()
      ]);

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
      loadRecentUpdates(projectsRes.data || [], eventsRes.data || []).catch(err => {
        console.error('Error loading recent updates:', err);
      });
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    loadData();
    
    // Listen for auth state changes to reload data when user logs out/in
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' || event === 'SIGNED_IN') {
        // Clear cache and reload data when auth state changes
        clearCache('profiles:all');
        loadData();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadData]);

  const handleCreateProject = useCallback(async () => {
    if (!newProject.title || !newProject.description) {
      alert('אנא מלא את כל השדות הנדרשים');
      return;
    }

    try {
      if (!currentUser) {
        alert('לא נמצא משתמש מחובר');
        return;
      }

      // Split technologies by comma, handle spaces, and filter empty strings
      const technologies = newProject.technologies
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0)
        .map(t => t.replace(/\s+/g, ' ')); // Normalize multiple spaces to single space

      console.log('Technologies input:', newProject.technologies);
      console.log('Technologies array:', technologies);

      if (!currentUser) {
        alert('אנא התחבר כדי ליצור פרויקט');
        return;
      }

      const userId = currentUser.user_id || currentUser.id;
      if (!userId) {
        alert('שגיאה: לא נמצא מזהה משתמש');
        return;
      }

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          title: newProject.title,
          description: newProject.description,
          budget_min: newProject.budget_min ? parseFloat(newProject.budget_min) : null,
          budget_max: newProject.budget_max ? parseFloat(newProject.budget_max) : null,
          budget_currency: 'ILS',
          technologies: technologies
        })
      });

      if (response.ok) {
        setNewProject({
          title: '',
          description: '',
          budget_min: '',
          budget_max: '',
          budget_currency: 'ILS',
          technologies: ''
        });
        setShowNewProjectForm(false);
        // Clear cache and reload
        const { clearCache } = await import('@/lib/cache');
        clearCache('projects');
        await loadData();
      } else {
        alert('שגיאה ביצירת הפרויקט');
      }
    } catch (error) {
      console.error('Error creating project:', error);
      alert('שגיאה ביצירת הפרויקט');
    }
  }, [newProject, loadData]);


  const loadRecentUpdates = useCallback(async (projects: Project[], events: any[]) => {
    try {
      const updates: Array<{
        type: 'forum' | 'project' | 'recording' | 'event';
        text: string;
        time: string;
        icon: string;
        link?: string;
        id?: string;
      }> = [];

      // Get recent projects (already loaded, no need to fetch)
      if (projects && projects.length > 0) {
        const recentProject = projects[0];
        updates.push({
          type: 'project',
          text: `${recentProject.user?.display_name || 'משתמש'} העלה פרויקט חדש: ${recentProject.title}`,
          time: formatTimeAgo(recentProject.created_at || ''),
          icon: '📄',
          link: `/projects#${recentProject.id}`,
          id: recentProject.id
        });
      }

      // Get recent events (already loaded)
      if (events && events.length > 0) {
        const recentEvent = events[0];
        updates.push({
          type: 'event',
          text: `נוסף אירוע חדש: ${recentEvent.title}`,
          time: formatTimeAgo(recentEvent.created_at || recentEvent.event_date || ''),
          icon: '📅',
          link: `/live/${recentEvent.id}`,
          id: recentEvent.id
        });
      }

      // Load forum posts and recordings in parallel (limit to 1 forum to reduce queries)
      const [forumsRes, recordingsRes] = await Promise.all([
        getAllForums().then(res => res.data ? res.data.slice(0, 1) : []),
        getAllRecordings().then(res => res.data || [])
      ]);

      // Get recent forum post (only from first forum to reduce queries)
      if (forumsRes && forumsRes.length > 0) {
        const { data: forumPosts } = await getForumPosts(forumsRes[0].id);
        if (forumPosts && forumPosts.length > 0) {
          const recentPost = forumPosts[0];
          updates.push({
            type: 'forum',
            text: `${recentPost.profile?.display_name || 'משתמש'} פרסם פוסט: ${recentPost.title}`,
            time: formatTimeAgo(recentPost.created_at),
            icon: '💬',
            link: `/forums/${forumsRes[0].id}/posts/${recentPost.id}`,
            id: recentPost.id
          });
        }
      }

      // Get recent recording
      if (recordingsRes && recordingsRes.length > 0) {
        const recentRecording = recordingsRes[0];
        updates.push({
          type: 'recording',
          text: `העלתה הדרכה חדשה: ${recentRecording.title}`,
          time: formatTimeAgo(recentRecording.created_at || ''),
          icon: '🎥',
          link: `/recordings/${recentRecording.id}`,
          id: recentRecording.id
        });
      }

      setRecentUpdates(updates.slice(0, 4));
    } catch (error) {
      console.error('Error loading recent updates:', error);
    }
  }, []);

  function getStatusColor(status: string) {
    if (theme === 'light') {
      switch (status) {
        case 'open':
          return 'bg-green-100 text-green-700 border border-green-300';
        case 'in_progress':
          return 'bg-yellow-100 text-yellow-700 border border-yellow-300';
        case 'completed':
          return 'bg-blue-100 text-blue-700 border border-blue-300';
        case 'closed':
          return 'bg-gray-100 text-gray-600 border border-gray-300';
        default:
          return 'bg-gray-100 text-gray-600 border border-gray-300';
      }
    } else {
      switch (status) {
        case 'open':
          return 'bg-green-500/20 text-green-400 border border-green-500/30';
        case 'in_progress':
          return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
        case 'completed':
          return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
        case 'closed':
          return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
        default:
          return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
      }
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
    
    // Premium check - for future use (currently disabled per user request)
    // if (!userIsPremium) {
    //   alert('הגשת הצעות לפרויקטים זמינה למנויי פרימיום בלבד. אנא שדרג את המנוי שלך כדי להגיש הצעות לפרויקטים.');
    //   return;
    // }
    
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
    
    setSelectedProject(project);
    setOfferForm({ message: '', offer_amount: '' });
    setShowOfferModal(true);
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
      const userId = currentUser.user_id || currentUser.id;
      
      if (!userId) {
        alert('שגיאה: לא נמצא מזהה משתמש');
        setSubmittingOffer(false);
        return;
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
        alert('שגיאה בשליחת ההצעה. נסה שוב.');
        return;
      }

      // Send notification to project owner
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

      // Award points for submitting an offer
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

      // Close modal and refresh data
      setShowOfferModal(false);
      setSelectedProject(null);
      setOfferForm({ message: '', offer_amount: '' });
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
    <div className="min-h-screen relative">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* Main Content - First on Mobile */}
          <main className="flex-1 min-w-0 order-1 lg:order-2">
            {/* Header with Search and View Toggle */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <h1 className={`text-3xl font-bold ${
                theme === 'light' ? 'text-gray-900' : 'text-white'
              }`}>לוח פרויקטים</h1>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                {/* Search Bar */}
                <div className="flex-1 sm:flex-none relative">
                  <Search className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
                    theme === 'light' ? 'text-gray-400' : 'text-gray-400'
                  }`} />
                  <input
                    type="text"
                    placeholder="חפש פרויקטים..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full sm:w-64 pr-10 pl-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F52F8E] text-sm ${
                      theme === 'light'
                        ? 'bg-white border border-gray-300 text-gray-800 placeholder-gray-500'
                        : 'modern-input'
                    }`}
                  />
                </div>
                {/* View Toggle */}
                <div className={`flex items-center gap-1 rounded-full p-1 ${
                  theme === 'light'
                    ? 'bg-gray-100 border border-gray-300'
                    : 'glass-card border-white/20'
                }`}>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-full transition-colors ${
                      viewMode === 'list' 
                        ? theme === 'light'
                          ? 'bg-[#F52F8E] text-white shadow-sm'
                          : 'bg-hot-pink text-white shadow-sm'
                        : theme === 'light'
                          ? 'text-gray-600 hover:bg-gray-200'
                          : 'text-gray-300 hover:bg-white/10'
                    }`}
                    title="תצוגת רשימה"
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-full transition-colors ${
                      viewMode === 'grid' 
                        ? theme === 'light'
                          ? 'bg-[#F52F8E] text-white shadow-sm'
                          : 'bg-hot-pink text-white shadow-sm'
                        : theme === 'light'
                          ? 'text-gray-600 hover:bg-gray-200'
                          : 'text-gray-300 hover:bg-white/10'
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
              <div className={`text-center py-8 ${
                theme === 'light' ? 'text-gray-600' : 'text-gray-300'
              }`}>טוען...</div>
            ) : filteredProjects.length === 0 ? (
              <div className={`text-center py-8 ${
                theme === 'light' ? 'text-gray-600' : 'text-gray-300'
              }`}>אין פרויקטים זמינים</div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProjects.map((project) => (
                  <div key={project.id} className={`rounded-3xl p-5 animate-fade-in flex flex-col ${
                    theme === 'light'
                      ? 'bg-white border border-gray-300 shadow-sm'
                      : 'glass-card'
                  }`}>
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
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold ${
                            theme === 'light' ? 'bg-[#F52F8E]' : 'bg-gradient-to-br from-[#F52F8E] to-pink-400'
                          }`}>
                            {(project.user?.display_name || 'U').charAt(0)}
                          </div>
                        )}
                        <div className="text-right">
                          <p className={`text-xs font-medium ${
                            theme === 'light' ? 'text-gray-800' : 'text-white'
                          }`}>{project.user?.display_name || 'משתמש'}</p>
                          <p className={`text-xs ${
                            theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                          }`}>
                            {mounted ? formatTimeAgo(project.created_at || '') : ''}
                          </p>
                        </div>
                      </div>
                    </div>

                    <h3 className={`text-lg font-semibold mb-2 line-clamp-2 ${
                      theme === 'light' ? 'text-gray-800' : 'text-white'
                    }`}>{project.title}</h3>
                    <p className={`text-sm mb-4 leading-relaxed line-clamp-3 flex-1 ${
                      theme === 'light' ? 'text-gray-600' : 'text-gray-200'
                    }`}>{project.description}</p>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {project.technologies?.slice(0, 4).map((tech, idx) => (
                        <span key={idx} className={`px-2 py-1 rounded text-xs border ${
                          theme === 'light'
                            ? 'bg-gray-100 text-gray-700 border-gray-300'
                            : 'bg-white/10 text-gray-200 border-white/10'
                        }`}>
                          {tech}
                        </span>
                      ))}
                      {project.technologies && project.technologies.length > 4 && (
                        <span className={`px-2 py-1 rounded text-xs border ${
                          theme === 'light'
                            ? 'bg-gray-100 text-gray-700 border-gray-300'
                            : 'bg-white/10 text-gray-200 border-white/10'
                        }`}>
                          +{project.technologies.length - 4}
                        </span>
                      )}
                    </div>

                    <div className={`pt-4 border-t space-y-3 ${
                      theme === 'light' ? 'border-gray-300' : 'border-white/20'
                    }`}>
                      <div className="flex items-center justify-between text-sm">
                        <div className={`flex items-center gap-1 ${
                          theme === 'light' ? 'text-gray-700' : 'text-gray-200'
                        }`}>
                          <UserIcon className="w-4 h-4" />
                          <span>{project.offers_count || 0} הצעות</span>
                        </div>
                        {project.budget_min && project.budget_max && (
                          <div className={`flex items-center gap-1 ${
                            theme === 'light' ? 'text-gray-700' : 'text-gray-200'
                          }`}>
                            <span>
                              ₪ {Number(project.budget_min).toLocaleString('he-IL')} - {Number(project.budget_max).toLocaleString('he-IL')}
                            </span>
                          </div>
                        )}
                      </div>
                      {project.status === 'closed' ? (
                        <button 
                          disabled
                          className={`w-full px-5 py-2.5 rounded-full text-sm font-medium cursor-not-allowed ${
                            theme === 'light'
                              ? 'bg-gray-100 text-gray-500 border border-gray-300'
                              : 'bg-white/10 text-gray-400 border border-white/10'
                          }`}
                        >
                          פרויקט סגור
                        </button>
                      ) : (
                        <ProtectedAction
                          requireAuth={true}
                          disabledMessage="התחבר כדי להגיש הצעה"
                        >
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSubmitOffer(project.id);
                            }}
                            className={`w-full px-5 py-2.5 text-sm font-medium rounded-full ${
                              theme === 'light'
                                ? 'bg-[#F52F8E] text-white hover:bg-[#E01E7A]'
                                : 'btn-primary'
                            }`}
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
                  <div key={project.id} className={`rounded-3xl p-5 sm:p-6 animate-fade-in ${
                    theme === 'light'
                      ? 'bg-white border border-gray-300 shadow-sm'
                      : 'glass-card'
                  }`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {project.user?.avatar_url ? (
                          <img 
                            src={project.user.avatar_url} 
                            alt={project.user.display_name || 'User'} 
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                            theme === 'light'
                              ? 'bg-[#F52F8E]'
                              : 'bg-gradient-to-br from-hot-pink to-pink-400'
                          }`}>
                            {(project.user?.display_name || 'U').charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className={`text-sm font-medium ${
                            theme === 'light' ? 'text-gray-800' : 'text-white'
                          }`}>{project.user?.display_name || 'משתמש'}</p>
                          <p className={`text-xs flex items-center gap-1 ${
                            theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                          }`}>
                            <Clock className="w-3 h-3" />
                            {mounted ? formatTimeAgo(project.created_at || '') : ''}
                          </p>
                        </div>
                      </div>
                      <span className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-md ${getStatusColor(project.status)}`}>
                        {getStatusText(project.status)}
                      </span>
                    </div>

                    <h3 className={`text-lg font-semibold mb-2 ${
                      theme === 'light' ? 'text-gray-800' : 'text-white'
                    }`}>{project.title}</h3>
                    <p className={`text-sm mb-4 leading-relaxed ${
                      theme === 'light' ? 'text-gray-600' : 'text-gray-200'
                    }`}>{project.description}</p>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {project.technologies?.map((tech, idx) => (
                        <span key={idx} className={`px-2 py-1 rounded text-xs border ${
                          theme === 'light'
                            ? 'bg-gray-100 text-gray-700 border-gray-300'
                            : 'bg-white/10 text-gray-200 border-white/10'
                        }`}>
                          {tech}
                        </span>
                      ))}
                    </div>

                    <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-4 border-t ${
                      theme === 'light' ? 'border-gray-300' : 'border-white/20'
                    }`}>
                      <div className={`flex items-center gap-4 text-sm ${
                        theme === 'light' ? 'text-gray-700' : 'text-gray-200'
                      }`}>
                        {project.budget_min && project.budget_max && (
                          <div className="flex items-center gap-1">
                            <span>
                              ₪ {Number(project.budget_min).toLocaleString('he-IL')} - {Number(project.budget_max).toLocaleString('he-IL')}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <UserIcon className="w-4 h-4" />
                          <span>{project.offers_count || 0} הצעות</span>
                        </div>
                      </div>
                      {project.status === 'closed' ? (
                        <button 
                          disabled
                          className={`px-5 py-2.5 rounded-full text-sm font-medium cursor-not-allowed ${
                            theme === 'light'
                              ? 'bg-gray-100 text-gray-500 border border-gray-300'
                              : 'bg-white/10 text-gray-400 border border-white/10'
                          }`}
                        >
                          פרויקט סגור
                        </button>
                      ) : (
                        <ProtectedAction
                          requireAuth={true}
                          disabledMessage="התחבר כדי להגיש הצעה"
                        >
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSubmitOffer(project.id);
                            }}
                            className={`px-5 py-2.5 text-sm font-medium rounded-full ${
                              theme === 'light'
                                ? 'bg-[#F52F8E] text-white hover:bg-[#E01E7A]'
                                : 'btn-primary'
                            }`}
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
          <aside className="w-full lg:w-64 flex-shrink-0 space-y-4 order-2 lg:order-1">
            {/* Who's Online */}
            <div className={`rounded-2xl shadow-sm p-4 ${
              theme === 'light'
                ? 'bg-white border border-gray-300'
                : 'glass-card'
            }`}>
              <h3 className={`text-sm font-semibold mb-4 ${
                theme === 'light' ? 'text-gray-800' : 'text-white'
              }`}>מי מחובר?</h3>
              {onlineUsers.length === 0 ? (
                <div className={`p-4 rounded-lg border ${
                  theme === 'light'
                    ? 'bg-gray-50 border-gray-300'
                    : 'bg-white/10 border-white/20'
                }`}>
                  <p className={`text-sm ${
                    theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                  }`}>אין חברים מחוברים כרגע</p>
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
                  <p className={`text-xs ${
                    theme === 'light' ? 'text-gray-600' : 'text-gray-500'
                  }`}>
                    {onlineUsers.length} {onlineUsers.length === 1 ? 'חבר מחובר' : 'חברים מחוברים'}
                  </p>
                </div>
              )}
            </div>

            {/* Post Project Button */}
            <div className={`rounded-2xl p-5 animate-fade-in ${
              theme === 'light'
                ? 'bg-white border border-gray-300'
                : 'modern-card'
            }`}>
              <button
                onClick={() => setShowNewProjectForm(true)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium w-full justify-center rounded-lg ${
                  theme === 'light'
                    ? 'bg-[#F52F8E] text-white hover:bg-[#E01E7A]'
                    : 'btn-primary'
                }`}
              >
                <Plus className="w-4 h-4" />
                פרסם פרויקט
              </button>
            </div>

            {/* New Project Modal */}
            {showNewProjectForm && (
              <div 
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm"
                onClick={() => {
                  setShowNewProjectForm(false);
                  setNewProject({
                    title: '',
                    description: '',
                    budget_min: '',
                    budget_max: '',
                    budget_currency: 'ILS',
                    technologies: ''
                  });
                }}
              >
                <div 
                  className={`rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto ${
                    theme === 'light'
                      ? 'bg-white'
                      : 'glass-card'
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Modal Header */}
                  <div className={`sticky top-0 border-b px-6 py-4 flex items-center justify-between rounded-t-3xl ${
                    theme === 'light'
                      ? 'bg-white border-gray-300'
                      : 'glass-card border-hot-pink/30'
                  }`}>
                    <h2 className={`text-2xl font-bold ${
                      theme === 'light' ? 'text-gray-800' : 'text-white'
                    }`}>פרסם פרויקט חדש</h2>
                    <button
                      onClick={() => {
                        setShowNewProjectForm(false);
                        setNewProject({
                          title: '',
                          description: '',
                          budget_min: '',
                          budget_max: '',
                          budget_currency: 'ILS',
                          technologies: ''
                        });
                      }}
                      className={`p-2 rounded-full transition-colors ${
                        theme === 'light'
                          ? 'hover:bg-gray-100'
                          : 'hover:bg-white/10'
                      }`}
                    >
                      <X className={`w-5 h-5 ${
                        theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                      }`} />
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div className="p-6 space-y-5">
                    <div>
                      <label className={`block text-sm font-semibold mb-2 ${
                        theme === 'light' ? 'text-gray-800' : 'text-white'
                      }`}>
                        כותרת הפרויקט *
                      </label>
                      <input
                        type="text"
                        placeholder="לדוגמה: פיתוח בוט טלגרם לניהול הזמנות"
                        value={newProject.title}
                        onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                        className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F52F8E] focus:border-transparent text-sm ${
                          theme === 'light'
                            ? 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                            : 'modern-input border-white/20 text-white placeholder:text-gray-400'
                        }`}
                      />
                    </div>

                    <div>
                      <label className={`block text-sm font-semibold mb-2 ${
                        theme === 'light' ? 'text-gray-800' : 'text-white'
                      }`}>
                        תיאור הפרויקט *
                      </label>
                      <textarea
                        placeholder="תאר בפירוט את הפרויקט, מה נדרש, מה המטרה וכו'..."
                        value={newProject.description}
                        onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                        rows={5}
                        className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F52F8E] focus:border-transparent text-sm resize-none ${
                          theme === 'light'
                            ? 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                            : 'modern-input border-white/20 text-white placeholder:text-gray-400'
                        }`}
                      />
                    </div>

                    <div>
                      <label className={`block text-sm font-semibold mb-2 ${
                        theme === 'light' ? 'text-gray-800' : 'text-white'
                      }`}>
                        תקציב (בשקלים ₪)
                      </label>
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <input
                            type="number"
                            placeholder="מינימום"
                            value={newProject.budget_min}
                            onChange={(e) => setNewProject({ ...newProject, budget_min: e.target.value })}
                            className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F52F8E] focus:border-transparent text-sm ${
                              theme === 'light'
                                ? 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                                : 'modern-input border-white/20 text-white placeholder:text-gray-400'
                            }`}
                          />
                        </div>
                        <div className="flex-1">
                          <input
                            type="number"
                            placeholder="מקסימום"
                            value={newProject.budget_max}
                            onChange={(e) => setNewProject({ ...newProject, budget_max: e.target.value })}
                            className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F52F8E] focus:border-transparent text-sm ${
                              theme === 'light'
                                ? 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                                : 'modern-input border-white/20 text-white placeholder:text-gray-400'
                            }`}
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className={`block text-sm font-semibold mb-2 ${
                        theme === 'light' ? 'text-gray-800' : 'text-white'
                      }`}>
                        יש מערכות ספציפיות שהיית רוצה שישתמשו בהן?
                      </label>
                      <input
                        type="text"
                        placeholder="לדוגמה: Make, Airtable, Zapier, API, Node.js (מופרדות בפסיקים)"
                        value={newProject.technologies}
                        onChange={(e) => setNewProject({ ...newProject, technologies: e.target.value })}
                        className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F52F8E] focus:border-transparent text-sm ${
                          theme === 'light'
                            ? 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                            : 'modern-input border-white/20 text-white placeholder:text-gray-400'
                        }`}
                      />
                      <p className={`text-xs mt-1 ${
                        theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                      }`}>הזן את הטכנולוגיות או המערכות, מופרדות בפסיקים</p>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className={`sticky bottom-0 border-t px-6 py-4 flex items-center justify-end gap-3 rounded-b-3xl ${
                    theme === 'light'
                      ? 'bg-white border-gray-300'
                      : 'glass-card border-hot-pink/30'
                  }`}>
                    <button
                      onClick={() => {
                        setShowNewProjectForm(false);
                        setNewProject({
                          title: '',
                          description: '',
                          budget_min: '',
                          budget_max: '',
                          budget_currency: 'ILS',
                          technologies: ''
                        });
                      }}
                      className={`px-6 py-2.5 rounded-full transition-colors text-sm font-medium ${
                        theme === 'light'
                          ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          : 'bg-white/10 text-gray-200 hover:bg-white/20'
                      }`}
                    >
                      ביטול
                    </button>
                    <button
                      onClick={handleCreateProject}
                      className={`px-6 py-2.5 rounded-full transition-colors text-sm font-medium ${
                        theme === 'light'
                          ? 'bg-[#F52F8E] text-white hover:bg-[#E01E7A]'
                          : 'bg-hot-pink text-white hover:bg-hot-pink-dark'
                      }`}
                    >
                      פרסם פרויקט
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Updates */}
            <div className={`rounded-3xl p-5 animate-fade-in ${
              theme === 'light'
                ? 'bg-white border border-gray-300'
                : 'glass-card'
            }`}>
              <h3 className={`text-sm font-semibold mb-3 ${
                theme === 'light' ? 'text-gray-800' : 'text-white'
              }`}>עדכונים אחרונים</h3>
              <div className="space-y-3">
                {recentUpdates.length === 0 ? (
                  <p className={`text-xs ${
                    theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                  }`}>אין עדכונים אחרונים</p>
                ) : (
                  recentUpdates.map((update, idx) => {
                    const content = (
                      <div className={`flex items-start gap-2 text-xs cursor-pointer p-2 rounded-lg transition-colors ${
                        theme === 'light'
                          ? 'hover:bg-gray-50'
                          : 'hover:bg-white/10'
                      }`}>
                        <span className="text-lg">{update.icon}</span>
                        <div className="flex-1">
                          <p className={theme === 'light' ? 'text-gray-800' : 'text-gray-100'}>{update.text}</p>
                          <p className={`text-xs mt-0.5 ${
                            theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                          }`}>{update.time}</p>
                        </div>
                      </div>
                    );

                    if (update.link) {
                      // Check if it's a recording link and user is not premium
                      if (update.type === 'recording' && !userIsPremium) {
                        return (
                          <div 
                            key={update.id || idx}
                            onClick={() => {
                              alert('גישה להקלטות זמינה למנויי פרימיום בלבד. אנא שדרג את המנוי שלך כדי לצפות בהקלטות.');
                            }}
                          >
                            {content}
                          </div>
                        );
                      }
                      
                      return (
                        <Link key={update.id || idx} href={update.link}>
                          {content}
                        </Link>
                      );
                    }

                    return <div key={update.id || idx}>{content}</div>;
                  })
                )}
              </div>
            </div>

            {/* Upcoming Events */}
            <div className={`rounded-3xl p-5 animate-fade-in ${
              theme === 'light'
                ? 'bg-white border border-gray-300'
                : 'glass-card'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className={`text-sm font-semibold ${
                  theme === 'light' ? 'text-gray-800' : 'text-white'
                }`}>אירועים קרובים</h3>
                <Link href="/live-log" className={`text-xs hover:underline ${
                  theme === 'light' ? 'text-[#F52F8E]' : 'text-hot-pink'
                }`}>
                  הכל ←
                </Link>
              </div>
              {upcomingEvents.length === 0 ? (
                <p className={`text-xs ${
                  theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                }`}>כרגע אין אירועים קרובים</p>
              ) : (
                <div className="space-y-2">
                  {upcomingEvents.map((event) => (
                    <div key={event.id} className="flex items-start gap-2 text-xs">
                      <span className={theme === 'light' ? 'text-[#F52F8E]' : 'text-hot-pink'}>📅</span>
                      <div className="flex-1">
                        <p className={theme === 'light' ? 'text-gray-800' : 'text-gray-100'}>{event.title}</p>
                        <p className={`text-xs mt-0.5 ${
                          theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                        }`}>
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
            className={`rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto ${
              theme === 'light'
                ? 'bg-white'
                : 'glass-card'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={`sticky top-0 border-b px-6 py-4 flex items-center justify-between rounded-t-3xl z-10 ${
              theme === 'light'
                ? 'bg-white border-gray-300'
                : 'glass-card border-hot-pink/30'
            }`}>
              <h2 className={`text-2xl font-bold ${
                theme === 'light' ? 'text-gray-800' : 'text-white'
              }`}>הגשת הצעה</h2>
              <button
                onClick={() => {
                  if (!submittingOffer) {
                    setShowOfferModal(false);
                    setSelectedProject(null);
                    setOfferForm({ message: '', offer_amount: '' });
                  }
                }}
                className={`transition-colors ${
                  theme === 'light'
                    ? 'text-gray-600 hover:text-gray-800'
                    : 'text-gray-300 hover:text-white'
                }`}
                disabled={submittingOffer}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Recipient Info */}
              <div className="space-y-2">
                <p className={`text-sm ${
                  theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                }`}>שליחת הצעה אל</p>
                <div className="flex items-center gap-3">
                  {selectedProject.user?.avatar_url ? (
                    <img 
                      src={selectedProject.user.avatar_url} 
                      alt={selectedProject.user.display_name || 'User'} 
                      className="w-12 h-12 rounded-full"
                    />
                  ) : (
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg ${
                      theme === 'light'
                        ? 'bg-[#F52F8E]'
                        : 'bg-gradient-to-br from-hot-pink to-pink-400'
                    }`}>
                      {(selectedProject.user?.display_name || 'U').charAt(0)}
                    </div>
                  )}
                  <div>
                    <p className={`font-semibold ${
                      theme === 'light' ? 'text-gray-800' : 'text-white'
                    }`}>{selectedProject.user?.display_name || 'משתמש'}</p>
                    <p className={`text-sm ${
                      theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                    }`}>{selectedProject.title}</p>
                  </div>
                </div>
              </div>

              {/* Project Description */}
              <div className={`rounded-lg p-4 border ${
                theme === 'light'
                  ? 'bg-gray-50 border-gray-300'
                  : 'bg-white/5 border-white/10'
              }`}>
                <p className={`text-sm leading-relaxed ${
                  theme === 'light' ? 'text-gray-700' : 'text-gray-200'
                }`}>{selectedProject.description}</p>
              </div>

              {/* Offer Message */}
              <div>
                <label className={`block text-sm font-semibold mb-2 ${
                  theme === 'light' ? 'text-gray-800' : 'text-white'
                }`}>
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
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F52F8E] focus:border-transparent text-sm min-h-[120px] resize-y ${
                    theme === 'light'
                      ? 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                      : 'modern-input border-white/20 text-white placeholder:text-gray-400'
                  }`}
                  maxLength={500}
                />
                <p className={`text-xs mt-1 text-right ${
                  theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                }`}>
                  {offerForm.message.length}/500
                </p>
              </div>

              {/* Price Offer */}
              <div>
                <label className={`block text-sm font-semibold mb-2 ${
                  theme === 'light' ? 'text-gray-800' : 'text-white'
                }`}>
                  הצעת מחיר ({selectedProject.budget_currency || 'USD'}) *
                </label>
                <input
                  type="number"
                  value={offerForm.offer_amount}
                  onChange={(e) => setOfferForm({ ...offerForm, offer_amount: e.target.value })}
                  placeholder={`תקציב הלקוח: ${selectedProject.budget_min ? Number(selectedProject.budget_min).toLocaleString('he-IL') : ''}${selectedProject.budget_min && selectedProject.budget_max ? ' - ' : ''}${selectedProject.budget_max ? Number(selectedProject.budget_max).toLocaleString('he-IL') : ''}`}
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F52F8E] focus:border-transparent text-sm ${
                    theme === 'light'
                      ? 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                      : 'modern-input border-white/20 text-white placeholder:text-gray-400'
                  }`}
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className={`sticky bottom-0 border-t px-6 py-4 flex items-center justify-end gap-3 rounded-b-3xl ${
              theme === 'light'
                ? 'bg-white border-gray-300'
                : 'glass-card border-hot-pink/30'
            }`}>
              <button
                onClick={() => {
                  if (!submittingOffer) {
                    setShowOfferModal(false);
                    setSelectedProject(null);
                    setOfferForm({ message: '', offer_amount: '' });
                  }
                }}
                className={`px-6 py-2.5 border rounded-full transition-colors font-medium text-sm ${
                  theme === 'light'
                    ? 'border-gray-300 text-gray-700 hover:bg-gray-100'
                    : 'border-white/20 text-gray-200 hover:bg-white/10'
                }`}
                disabled={submittingOffer}
              >
                ביטול
              </button>
              <button
                onClick={submitOffer}
                disabled={submittingOffer || !offerForm.message.trim() || !offerForm.offer_amount}
                className={`px-6 py-2.5 font-medium text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed rounded-full ${
                  theme === 'light'
                    ? 'bg-[#F52F8E] text-white hover:bg-[#E01E7A]'
                    : 'btn-primary'
                }`}
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
    </div>
  );
}

