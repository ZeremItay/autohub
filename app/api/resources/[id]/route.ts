import { NextRequest, NextResponse } from 'next/server';
import { getResourceById, updateResource, deleteResource } from '@/lib/queries/resources';
import { createServerClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';

// GET - Get a specific resource
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get current user if authenticated
    let userId: string | undefined;
    try {
      const cookieStore = await cookies();
      const supabase = createServerClient(cookieStore);
      const { data: { session } } = await supabase.auth.getSession();
      userId = session?.user?.id;
    } catch (error) {
      // User not authenticated, continue without userId
    }

    const { data: resource, error } = await getResourceById(id);

    if (error || !resource) {
      return NextResponse.json(
        { error: 'Resource not found' },
        { status: 404 }
      );
    }

    // Get likes count and check if user liked
    const { getResourcesWithDetails } = await import('@/lib/queries/resources');
    const { data: resourcesWithDetails } = await getResourcesWithDetails(userId);
    const resourceWithDetails = resourcesWithDetails?.find((r: any) => r.id === id) || resource;

    return NextResponse.json({ data: resourceWithDetails }, { status: 200 });
  } catch (error: any) {
    console.error('Error in GET /api/resources/[id]:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update a resource
export async function PUT(
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

    // Get the resource to check ownership
    const { data: resource } = await getResourceById(id);
    if (!resource) {
      return NextResponse.json(
        { error: 'Resource not found' },
        { status: 404 }
      );
    }

    // Check if user is admin or owner
    const { data: profile } = await supabase
      .from('profiles')
      .select('role_id, roles:role_id(name)')
      .eq('user_id', session.user.id)
      .single();
    
    const roles = profile?.roles;
    let roleName: string | null = null;
    if (Array.isArray(roles) && roles.length > 0) {
      roleName = roles[0]?.name || null;
    } else if (roles && typeof roles === 'object' && !Array.isArray(roles)) {
      roleName = (roles as any).name || null;
    }
    
    const userIsAdmin = roleName === 'admin';
    const isOwner = resource.created_by === session.user.id;

    if (!userIsAdmin && !isOwner) {
      return NextResponse.json(
        { error: 'Forbidden - You can only edit your own resources' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const updates: any = {};

    // Only update provided fields
    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.file_url !== undefined) updates.file_url = body.file_url;
    if (body.file_name !== undefined) updates.file_name = body.file_name;
    if (body.file_size !== undefined) updates.file_size = body.file_size;
    if (body.file_type !== undefined) updates.file_type = body.file_type;
    if (body.category !== undefined) updates.category = body.category;
    if (body.type !== undefined) updates.type = body.type;
    if (body.thumbnail_url !== undefined) updates.thumbnail_url = body.thumbnail_url;
    if (body.external_url !== undefined) updates.external_url = body.external_url;
    if (body.is_premium !== undefined) updates.is_premium = body.is_premium;

    const { data: updatedResource, error: updateError } = await updateResource(id, updates);

    if (updateError || !updatedResource) {
      console.error('Error updating resource:', updateError);
      return NextResponse.json(
        { error: 'Failed to update resource' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: updatedResource }, { status: 200 });
  } catch (error: any) {
    console.error('Error in PUT /api/resources/[id]:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a resource
export async function DELETE(
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

    // Get the resource to check ownership
    const { data: resource } = await getResourceById(id);
    if (!resource) {
      return NextResponse.json(
        { error: 'Resource not found' },
        { status: 404 }
      );
    }

    // Check if user is admin or owner
    const { data: profile } = await supabase
      .from('profiles')
      .select('role_id, roles:role_id(name)')
      .eq('user_id', session.user.id)
      .single();
    
    const roles = profile?.roles;
    let roleName: string | null = null;
    if (Array.isArray(roles) && roles.length > 0) {
      roleName = roles[0]?.name || null;
    } else if (roles && typeof roles === 'object' && !Array.isArray(roles)) {
      roleName = (roles as any).name || null;
    }
    
    const userIsAdmin = roleName === 'admin';
    const isOwner = resource.created_by === session.user.id;

    if (!userIsAdmin && !isOwner) {
      return NextResponse.json(
        { error: 'Forbidden - You can only delete your own resources' },
        { status: 403 }
      );
    }

    const { error: deleteError } = await deleteResource(id);

    if (deleteError) {
      console.error('Error deleting resource:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete resource' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Error in DELETE /api/resources/[id]:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

