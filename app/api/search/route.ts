import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ 
      data: {
        recordings: [],
        forums: [],
        forumPosts: [],
        forumReplies: [],
        posts: [],
        projects: [],
        courses: []
      },
        error: null 
      });
    }

    const searchTerm = `%${query.trim()}%`;
    const cookieStore = await cookies();
    const authSupabase = createServerClient(cookieStore);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    // Use service role (if configured) to allow public search without RLS blocks
    const dataSupabase = supabaseServiceKey
      ? createClient(supabaseUrl, supabaseServiceKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        })
      : authSupabase;

    // Determine user's role (default to free for public/anonymous)
    let isPremium = false;
    let hasSession = false;
    try {
      const { data: { session } } = await authSupabase.auth.getSession();
      if (session?.user?.id) {
        hasSession = true;
        const { data: userProfile } = await authSupabase
          .from('public_profiles')
          .select('role_id, roles:role_id(name)')
          .eq('user_id', session.user.id)
          .maybeSingle();

        const userRole = (userProfile?.roles as any)?.name || 'free';
        isPremium = userRole === 'premium' || userRole === 'admin';
      }
    } catch (error) {
      console.warn('[Search] Failed to resolve user role, defaulting to free:', error);
    }

    // Search in all tables in parallel
    const [
      recordingsResult,
      forumsResult,
      forumPostsResult,
      forumRepliesResult,
      postsResult,
      projectsResult,
      coursesResult
    ] = await Promise.all([
      // Search recordings
      // Note: category is now TEXT[], so we search in title and description
      // For array search, we'll use a different approach
      dataSupabase
        .from('recordings')
        .select('id, title, description, category, created_at')
        .or(`title.ilike."${searchTerm}",description.ilike."${searchTerm}"`)
        .limit(10),

      // Search forums
      dataSupabase
        .from('forums')
        .select('id, name, display_name, description, created_at')
        .or(`name.ilike."${searchTerm}",display_name.ilike."${searchTerm}",description.ilike."${searchTerm}"`)
        .limit(10),

      // Search forum posts
      dataSupabase
        .from('forum_posts')
        .select('id, title, content, forum_id, created_at, forums:forum_id(id, display_name)')
        .or(`title.ilike."${searchTerm}",content.ilike."${searchTerm}"`)
        .limit(10),

      // Search forum post replies (comments)
      dataSupabase
        .from('forum_post_replies')
        .select('id, content, post_id, created_at, forum_posts:post_id(id, title, forum_id, forums:forum_id(id, display_name))')
        .ilike('content', searchTerm)
        .limit(10),

      // Search posts (announcements)
      dataSupabase
        .from('posts')
        .select('id, content, created_at, profiles:user_id!inner(display_name)')
        .ilike('content', searchTerm)
        .limit(10),

      // Search projects
      dataSupabase
        .from('projects')
        .select('id, title, description, status, created_at')
        .or(`title.ilike."${searchTerm}",description.ilike."${searchTerm}"`)
        .limit(10),

      // Search courses
      dataSupabase
        .from('courses')
        .select('id, title, description, category, created_at')
        .or(`title.ilike."${searchTerm}",description.ilike."${searchTerm}",category.ilike."${searchTerm}"`)
        .limit(10)
    ]);

    // Handle errors - if any critical error, return it
    const errors = [
      recordingsResult.error,
      forumsResult.error,
      forumPostsResult.error,
      forumRepliesResult.error,
      postsResult.error,
      projectsResult.error,
      coursesResult.error
    ].filter(Boolean);

    // Log all errors
    errors.forEach(error => {
      console.error('Search error:', error);
    });

    // If there are critical errors (permission denied, etc.), return error
    // But allow partial results if some queries succeeded
    const hasCriticalError = errors.some(err => 
      err?.code === '42501' || // permission denied
      err?.message?.includes('permission') ||
      err?.message?.includes('row-level security') ||
      err?.message?.includes('Authentication required')
    );

    if (hasCriticalError && errors.length === 7) {
      // All queries failed - return error
      const firstError = errors[0];
      console.error('[Search] All queries failed with critical errors:', firstError);
      if (!supabaseServiceKey && !hasSession) {
        return NextResponse.json({
          data: {
            recordings: [],
            forums: [],
            forumPosts: [],
            forumReplies: [],
            posts: [],
            projects: [],
            courses: []
          },
          error: 'Public search requires SUPABASE_SERVICE_ROLE_KEY in local env'
        }, { status: 500 });
      }
      return NextResponse.json({
        data: null,
        error: firstError?.message || 'Search failed due to permissions'
      }, { status: 500 });
    }
    
    // If some queries failed but not all, log warning but continue
    if (errors.length > 0 && errors.length < 7) {
      console.warn('[Search] Some queries failed, returning partial results:', errors.length, 'errors');
    }

    // Also search recordings by category if category is an array
    // Fetch all recordings and filter by category manually
    let recordingsWithCategoryMatch: any[] = [];
    try {
      const { data: allRecordings, error: allRecordingsError } = await dataSupabase
        .from('recordings')
        .select('id, title, description, category, created_at')
        .limit(100); // Get more recordings to search in categories
      
      if (!allRecordingsError && allRecordings) {
        const searchLower = query.trim().toLowerCase();
        recordingsWithCategoryMatch = allRecordings.filter((recording: any) => {
          // Check if any category in the array matches
          if (Array.isArray(recording.category)) {
            return recording.category.some((cat: string) => 
              cat && cat.toLowerCase().includes(searchLower)
            );
          }
          return false;
        });
      }
    } catch (err) {
      console.error('Error fetching all recordings for category search:', err);
    }

    // Combine title/description matches with category matches, removing duplicates
    const recordingsMap = new Map();
    (recordingsResult.data || []).forEach((r: any) => recordingsMap.set(r.id, r));
    recordingsWithCategoryMatch.forEach((r: any) => {
      if (!recordingsMap.has(r.id)) {
        recordingsMap.set(r.id, r);
      }
    });
    const allRecordings = Array.from(recordingsMap.values());

    let filteredCourses = coursesResult.data || [];
    if (!isPremium && filteredCourses.length > 0) {
      const courseIds = filteredCourses.map((c: any) => c.id);
      const { data: fullCourses } = await dataSupabase
        .from('courses')
        .select('id, title, description, category, created_at, is_premium_only, is_free')
        .in('id', courseIds);

      if (fullCourses) {
        filteredCourses = fullCourses.filter((course: any) =>
          !course.is_premium_only || course.is_free
        );
      }
    }

    return NextResponse.json({
      data: {
        recordings: allRecordings,
        forums: forumsResult.data || [],
        forumPosts: forumPostsResult.data || [],
        forumReplies: forumRepliesResult.data || [],
        posts: postsResult.data || [],
        projects: projectsResult.data || [],
        courses: filteredCourses
      },
      error: null
    });
  } catch (error: any) {
    console.error('Search error:', error);
    return NextResponse.json(
      { data: null, error: error.message || 'Search failed' },
      { status: 500 }
    );
  }
}
