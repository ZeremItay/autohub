import { NextRequest, NextResponse } from 'next/server';
import { incrementDownloadCount, getResourceById } from '@/lib/queries/resources';
import { createServerClient } from '@/lib/supabase-server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerClient();

    // SECURITY: Require authentication
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get the resource to check if it's premium
    const { data: resource, error: resourceError } = await getResourceById(id);

    if (resourceError || !resource) {
      return NextResponse.json(
        { error: 'Resource not found' },
        { status: 404 }
      );
    }

    // SECURITY: Check if resource is premium and verify user access
    if (resource.is_premium) {
      // Get user's role to verify premium access
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('role_id, roles:role_id(name)')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (profileError || !userProfile) {
        return NextResponse.json(
          { error: 'Failed to verify user access' },
          { status: 403 }
        );
      }

      const userRole = (userProfile?.roles as any)?.name || 'free';
      const isPremium = userRole === 'premium' || userRole === 'admin';

      if (!isPremium) {
        return NextResponse.json(
          { error: 'Premium subscription required to download this resource' },
          { status: 403 }
        );
      }
    }

    // User is authorized - increment download count
    const { error } = await incrementDownloadCount(id);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to increment download count' },
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

