import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

// GET - Get user's badges
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('user_badges')
      .select(`
        *,
        badge:badge_id (
          id,
          name,
          icon,
          icon_color,
          points_threshold,
          description,
          display_order
        )
      `)
      .eq('user_id', userId)
      .order('earned_at', { ascending: false });

    if (error) {
      console.error('Error fetching user badges:', error);
      return NextResponse.json(
        { error: 'Failed to fetch badges', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data, error: null });
  } catch (error: any) {
    console.error('Error in GET /api/admin/users/[userId]/badges:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

// POST - Award a badge to a user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const body = await request.json();
    const { badge_id } = body;

    if (!badge_id) {
      return NextResponse.json(
        { error: 'Missing required field: badge_id' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Check if user already has this badge
    const { data: existing } = await supabase
      .from('user_badges')
      .select('id')
      .eq('user_id', userId)
      .eq('badge_id', badge_id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'User already has this badge' },
        { status: 400 }
      );
    }

    // Award the badge
    const { data, error } = await supabase
      .from('user_badges')
      .insert([{
        user_id: userId,
        badge_id: badge_id
      }])
      .select(`
        *,
        badge:badge_id (
          id,
          name,
          icon,
          icon_color,
          points_threshold,
          description,
          display_order
        )
      `)
      .single();

    if (error) {
      console.error('Error awarding badge:', error);
      return NextResponse.json(
        { error: 'Failed to award badge', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data, error: null });
  } catch (error: any) {
    console.error('Error in POST /api/admin/users/[userId]/badges:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Remove a badge from a user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const { searchParams } = new URL(request.url);
    const badge_id = searchParams.get('badge_id');

    if (!badge_id) {
      return NextResponse.json(
        { error: 'Missing required parameter: badge_id' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const { error } = await supabase
      .from('user_badges')
      .delete()
      .eq('user_id', userId)
      .eq('badge_id', badge_id);

    if (error) {
      console.error('Error removing badge:', error);
      return NextResponse.json(
        { error: 'Failed to remove badge', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, error: null });
  } catch (error: any) {
    console.error('Error in DELETE /api/admin/users/[userId]/badges:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
