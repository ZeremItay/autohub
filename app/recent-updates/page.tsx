'use client';

import { useState, useEffect } from 'react';
import { 
  MessageSquare,
  Briefcase,
  Video,
  Calendar,
  FileText,
  GraduationCap,
  Megaphone,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getUpcomingEvents, type Event } from '@/lib/queries/events';
import { formatTimeAgo } from '@/lib/utils/date';

interface RecentUpdate {
  type: 'forum' | 'project' | 'recording' | 'event' | 'blog' | 'course' | 'post';
  text: string;
  time: string;
  icon: string;
  link?: string;
  id?: string;
  created_at?: string;
}

export default function RecentUpdatesPage() {
  const [updates, setUpdates] = useState<RecentUpdate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllRecentUpdates();
  }, []);

  async function loadAllRecentUpdates() {
    try {
      setLoading(true);
      const allUpdates: RecentUpdate[] = [];
      
      // Get date from 7 days ago (last week)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoISO = sevenDaysAgo.toISOString();
      
      // Load events first (needed for processing)
      const { data: eventsData } = await getUpcomingEvents();
      
      // Load all categories in parallel - NO LIMIT for this page
      const [latestForumPostsResult, latestRecordingsResult, latestProjectsResult, latestBlogPostsResult, latestCoursesResult, latestAnnouncementsResult] = await Promise.all([
        // Get all recent posts from ALL active forums (no limit)
        supabase
          .from('forum_posts')
          .select('id, title, user_id, created_at, forum_id, forums(id, display_name, is_active)')
          .gte('created_at', sevenDaysAgoISO)
          .order('created_at', { ascending: false }),
        // Get all recent recordings (no limit)
        supabase.from('recordings').select('id, title, created_at').gte('created_at', sevenDaysAgoISO).order('created_at', { ascending: false }),
        // Get all recent projects (no limit)
        supabase.from('projects').select('id, title, user_id, created_at').gte('created_at', sevenDaysAgoISO).order('created_at', { ascending: false }),
        // Get all recent blog posts (no limit, only published)
        supabase.from('blog_posts').select('id, title, slug, author_id, created_at').eq('is_published', true).gte('created_at', sevenDaysAgoISO).order('created_at', { ascending: false }),
        // Get all recent courses (no limit)
        supabase.from('courses').select('id, title, created_at').gte('created_at', sevenDaysAgoISO).order('created_at', { ascending: false }),
        // Get all recent announcements (no limit)
        supabase.from('posts').select('id, content, user_id, created_at').eq('is_announcement', true).gte('created_at', sevenDaysAgoISO).order('created_at', { ascending: false })
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
            allUpdates.push({
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
          allUpdates.push({
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
          allUpdates.push({
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
          allUpdates.push({
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
          allUpdates.push({
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
          allUpdates.push({
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

      // Get recent events (from parameter) - filter by date (7 days)
      if (eventsData && eventsData.length > 0) {
        eventsData
          .filter((event: any) => {
            if (!event.created_at) return false;
            const eventDate = new Date(event.created_at);
            return eventDate >= sevenDaysAgo;
          })
          .forEach((recentEvent: any) => {
            allUpdates.push({
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
      allUpdates.sort((a, b) => {
        try {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dateB - dateA;
        } catch {
          return 0;
        }
      });
      
      setUpdates(allUpdates);
    } catch (error) {
      console.error('Error loading recent updates:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-[#F52F8E] mb-4 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
            <span>חזרה לדף הבית</span>
          </Link>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">כל העדכונים</h1>
        </div>

        {/* Updates List */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F52F8E] mx-auto mb-4"></div>
            <p className="text-gray-600">טוען עדכונים...</p>
          </div>
        ) : updates.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
            <p className="text-gray-500">לא נמצאו עדכונים בשבוע האחרון</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="space-y-4">
              {updates.map((update, index) => {
                const content = (
                  <div className="flex items-start gap-3 cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors">
                    {update.type === 'forum' && <MessageSquare className="w-5 h-5 text-[#F52F8E] flex-shrink-0 mt-0.5" />}
                    {update.type === 'project' && <Briefcase className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />}
                    {update.type === 'recording' && <Video className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />}
                    {update.type === 'event' && <Calendar className="w-5 h-5 text-[#F52F8E] flex-shrink-0 mt-0.5" />}
                    {update.type === 'blog' && <FileText className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />}
                    {update.type === 'course' && <GraduationCap className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />}
                    {update.type === 'post' && <Megaphone className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />}
                    <div className="flex-1">
                      <p className="text-sm text-gray-700">{update.text}</p>
                      <p className="text-xs text-gray-500 mt-1">{update.time}</p>
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
          </div>
        )}
      </div>
    </div>
  );
}

