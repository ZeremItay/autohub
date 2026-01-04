import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase-server';
import { deleteForumPost } from '@/lib/queries/forums';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);
    
    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Delete post - Session check:', {
        hasSession: !!session,
        sessionError: sessionError?.message,
        userId: session?.user?.id
      });
    }
    
    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized', details: sessionError?.message || 'No session found' },
        { status: 401 }
      );
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

    if (process.env.NODE_ENV === 'development') {
      console.log('Delete post - Profile check:', {
        hasProfile: !!profile,
        profileError: profileError?.message,
        role: profile?.roles || (profile as any)?.role
      });
    }

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found', details: profileError?.message },
        { status: 404 }
      );
    }

    const role = profile.roles || (profile as any).role;
    const roleName = typeof role === 'object' ? role?.name : role;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Delete post - Role check:', {
        role,
        roleName,
        isAdmin: roleName === 'admin'
      });
    }
    
    if (roleName !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin only', details: `User role: ${roleName}` },
        { status: 403 }
      );
    }
    const { success, error } = await deleteForumPost(postId);

    if (!success || error) {
      return NextResponse.json(
        { error: error?.message || 'Failed to delete post' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

