import { NextRequest, NextResponse } from 'next/server';
import { getResourcesWithDetails, createResource } from '@/lib/queries/resources';
import { createServerClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';
import { assignTagsToContent } from '@/lib/queries/tags';

// GET - Get all resources with optional filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') as 'document' | 'video' | 'image' | 'link' | 'audio' | null;
    const category = searchParams.get('category');
    const search = searchParams.get('search');

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

    // Get resources with details
    let { data: resources, error } = await getResourcesWithDetails(userId);

    if (error) {
      console.error('Error fetching resources:', error);
      return NextResponse.json(
        { error: 'Failed to fetch resources' },
        { status: 500 }
      );
    }

    if (!resources) {
      resources = [];
    }

    // Apply filters
    if (type) {
      resources = resources.filter(r => r.type === type);
    }

    if (category) {
      resources = resources.filter(r => r.category === category);
    }

    if (search) {
      const lowerSearch = search.toLowerCase();
      resources = resources.filter(r =>
        r.title?.toLowerCase().includes(lowerSearch) ||
        r.description?.toLowerCase().includes(lowerSearch) ||
        r.category?.toLowerCase().includes(lowerSearch)
      );
    }

    return NextResponse.json({ data: resources }, { status: 200 });
  } catch (error: any) {
    console.error('Error in GET /api/resources:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new resource
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      file_url,
      file_name,
      file_size,
      file_type,
      category,
      type,
      thumbnail_url,
      external_url,
      is_premium = false,
      tagIds = []
    } = body;

    if (!title || !type) {
      return NextResponse.json(
        { error: 'Title and type are required' },
        { status: 400 }
      );
    }

    // Validate file_url or external_url based on type
    if (type === 'link') {
      if (!external_url) {
        return NextResponse.json(
          { error: 'External URL is required for link type' },
          { status: 400 }
        );
      }
    } else {
      if (!file_url) {
        return NextResponse.json(
          { error: 'File URL is required' },
          { status: 400 }
        );
      }
    }

    // Create resource
    const { data: resource, error: createError } = await createResource({
      title,
      description,
      file_url: file_url || external_url || '',
      file_name: file_name || title,
      file_size,
      file_type,
      category,
      type,
      thumbnail_url,
      external_url,
      is_premium,
      created_by: session.user.id
    });

    if (createError || !resource) {
      console.error('Error creating resource:', createError);
      return NextResponse.json(
        { error: 'Failed to create resource' },
        { status: 500 }
      );
    }

    // Assign tags if provided
    if (tagIds && tagIds.length > 0 && resource.id) {
      try {
        await assignTagsToContent('resource', resource.id, tagIds);
      } catch (tagError) {
        console.warn('Error assigning tags to resource:', tagError);
        // Don't fail the request if tags fail
      }
    }

    return NextResponse.json({ data: resource }, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/resources:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

