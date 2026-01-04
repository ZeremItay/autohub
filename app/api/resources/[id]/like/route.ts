import { NextRequest, NextResponse } from 'next/server';
import { toggleResourceLike, getResourceLikesCount } from '@/lib/queries/resources';
import { createServerClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';

// POST - Toggle like on a resource
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data, error } = await toggleResourceLike(id, session.user.id);

    if (error) {
      console.error('Error toggling like:', error);
      return NextResponse.json(
        { error: 'Failed to toggle like' },
        { status: 500 }
      );
    }

    // Get updated likes count
    const { data: likesCount } = await getResourceLikesCount(id);

    return NextResponse.json({ 
      data: { 
        liked: data?.liked || false,
        likes_count: likesCount || 0
      } 
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error in POST /api/resources/[id]/like:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Get like status for current user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json({ 
        data: { liked: false, likes_count: 0 } 
      }, { status: 200 });
    }

    // Check if user liked this resource
    const { data: like, error } = await supabase
      .from('resource_likes')
      .select('id')
      .eq('resource_id', id)
      .eq('user_id', session.user.id)
      .single();

    // Get likes count
    const { data: likesCount } = await getResourceLikesCount(id);

    return NextResponse.json({ 
      data: { 
        liked: !!like && !error,
        likes_count: likesCount || 0
      } 
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error in GET /api/resources/[id]/like:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

