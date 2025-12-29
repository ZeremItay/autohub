import { NextRequest, NextResponse } from 'next/server';
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
    const supabase = createServerClient();

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
      supabase
        .from('recordings')
        .select('id, title, description, category, created_at')
        .or(`title.ilike."${searchTerm}",description.ilike."${searchTerm}"`)
        .limit(10),

      // Search forums
      supabase
        .from('forums')
        .select('id, name, display_name, description, created_at')
        .or(`name.ilike."${searchTerm}",display_name.ilike."${searchTerm}",description.ilike."${searchTerm}"`)
        .limit(10),

      // Search forum posts
      supabase
        .from('forum_posts')
        .select('id, title, content, forum_id, created_at, forums:forum_id(id, display_name)')
        .or(`title.ilike."${searchTerm}",content.ilike."${searchTerm}"`)
        .limit(10),

      // Search forum post replies (comments)
      supabase
        .from('forum_post_replies')
        .select('id, content, post_id, created_at, forum_posts:post_id(id, title, forum_id, forums:forum_id(id, display_name))')
        .ilike('content', searchTerm)
        .limit(10),

      // Search posts (announcements)
      supabase
        .from('posts')
        .select('id, content, created_at, profiles:user_id(display_name)')
        .ilike('content', searchTerm)
        .limit(10),

      // Search projects
      supabase
        .from('projects')
        .select('id, title, description, status, created_at')
        .or(`title.ilike."${searchTerm}",description.ilike."${searchTerm}"`)
        .limit(10),

      // Search courses
      supabase
        .from('courses')
        .select('id, title, description, category, created_at')
        .or(`title.ilike."${searchTerm}",description.ilike."${searchTerm}",category.ilike."${searchTerm}"`)
        .limit(10)
    ]);

    // Handle errors and log them
    if (recordingsResult.error) {
      console.error('Error searching recordings:', recordingsResult.error);
    }
    if (forumsResult.error) {
      console.error('Error searching forums:', forumsResult.error);
    }
    if (forumPostsResult.error) {
      console.error('Error searching forum posts:', forumPostsResult.error);
    }
    if (forumRepliesResult.error) {
      console.error('Error searching forum replies:', forumRepliesResult.error);
    }
    if (postsResult.error) {
      console.error('Error searching posts:', postsResult.error);
    }
    if (projectsResult.error) {
      console.error('Error searching projects:', projectsResult.error);
    }
    if (coursesResult.error) {
      console.error('Error searching courses:', coursesResult.error);
    }

    // Also search recordings by category if category is an array
    // Fetch all recordings and filter by category manually
    let recordingsWithCategoryMatch: any[] = [];
    try {
      const { data: allRecordings, error: allRecordingsError } = await supabase
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

    return NextResponse.json({
      data: {
        recordings: allRecordings,
        forums: forumsResult.data || [],
        forumPosts: forumPostsResult.data || [],
        forumReplies: forumRepliesResult.data || [],
        posts: postsResult.data || [],
        projects: projectsResult.data || [],
        courses: coursesResult.data || []
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

