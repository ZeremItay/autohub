import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

// DELETE - Delete all forum posts (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerClient();
    
    // Check authorization - get session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        *,
        roles:role_id (
          id,
          name,
          display_name,
          description
        )
      `)
      .eq('user_id', session.user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = profile.roles || profile.role;
    const roleName = typeof role === 'object' ? role?.name : role;
    
    if (roleName !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    // Delete all forum posts
    // This will automatically delete:
    // - All forum_post_replies (due to CASCADE)
    // - All forum_post_likes (due to CASCADE)
    const { error: deleteError } = await supabase
      .from('forum_posts')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (using a condition that's always true)

    if (deleteError) {
      console.error('Error deleting forum posts:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // Update posts_count for all forums to 0
    const { error: updateError } = await supabase
      .from('forums')
      .update({ 
        posts_count: 0,
        updated_at: new Date().toISOString()
      })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all

    if (updateError) {
      console.error('Error updating forum posts_count:', updateError);
      // Don't fail the request if count update fails, but log it
    }

    // Get count of remaining posts to verify
    const { count: remainingCount } = await supabase
      .from('forum_posts')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({ 
      success: true,
      message: 'All forum posts deleted successfully',
      remainingPosts: remainingCount || 0
    });
  } catch (error: any) {
    console.error('Error deleting all forum posts:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

