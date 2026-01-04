import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase-server';

// DELETE - Delete a recent update item by type and id
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  try {
    const { type, id } = await params;
    
    if (!type || !id) {
      return NextResponse.json(
        { error: 'Type and ID are required' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);
    
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
          display_name
        )
      `)
      .eq('user_id', session.user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const role = profile.roles || (profile as any).role;
    const roleName = typeof role === 'object' ? role?.name : role;
    
    if (roleName !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    // Map update types to table names
    const tableMap: { [key: string]: string } = {
      'forum': 'forum_posts',
      'project': 'projects',
      'recording': 'recordings',
      'event': 'events',
      'blog': 'blog_posts',
      'course': 'courses',
      'post': 'posts'
    };

    const tableName = tableMap[type];
    if (!tableName) {
      return NextResponse.json(
        { error: `Invalid update type: ${type}` },
        { status: 400 }
      );
    }

    // Delete the item
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error deleting ${type} with id ${id}:`, error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting recent update:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

