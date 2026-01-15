import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

/**
 * User Search API Endpoint
 *
 * Provides autocomplete functionality for @ mentions
 * Searches profiles by display_name, username, or nickname (case-insensitive)
 * Returns top 10 matching users
 *
 * GET /api/users/search?q=<search_term>
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    const supabase = createServerClient();
    const searchTerm = query?.trim() || '';

    let profiles;
    let error;

    if (searchTerm.length === 0) {
      // Show recent users when no search term (just typed @)
      const result = await supabase
        .from('profiles')
        .select('id, user_id, display_name, avatar_url, nickname, first_name, last_name')
        .not('display_name', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10);
      profiles = result.data;
      error = result.error;
    } else {
      // Search profiles by display_name, nickname, first_name, last_name
      // Using ilike for case-insensitive search
      const result = await supabase
        .from('profiles')
        .select('id, user_id, display_name, avatar_url, nickname, first_name, last_name')
        .or(`display_name.ilike.%${searchTerm}%,nickname.ilike.%${searchTerm}%,first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`)
        .limit(10);
      profiles = result.data;
      error = result.error;
    }

    if (error) {
      console.error('Error searching users:', error);
      return NextResponse.json({ users: [] });
    }

    console.log(`[User Search] Query: "${searchTerm}", Found: ${profiles?.length || 0} profiles`);

    // Format for mention dropdown
    const users = (profiles || []).map(p => ({
      id: p.user_id || p.id,
      label: p.display_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.nickname || 'משתמש',
      username: p.display_name || p.nickname || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'משתמש',
      avatar_url: p.avatar_url
    }));

    console.log(`[User Search] Returning ${users.length} users`);

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error in user search API:', error);
    return NextResponse.json({ users: [] }, { status: 500 });
  }
}
