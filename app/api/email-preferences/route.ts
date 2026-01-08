import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { getEmailPreferences, updateEmailPreferences } from '@/lib/queries/email-preferences';

// GET - Get email preferences for current user
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data, error } = await getEmailPreferences(user.id);

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to fetch email preferences' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('Error in GET /api/email-preferences:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update email preferences for current user
export async function PUT(request: NextRequest) {
  try {
    const supabase = createServerClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { forum_reply, new_project } = body;

    // Validate input
    if (forum_reply !== undefined && typeof forum_reply !== 'boolean') {
      return NextResponse.json(
        { error: 'forum_reply must be a boolean' },
        { status: 400 }
      );
    }

    if (new_project !== undefined && typeof new_project !== 'boolean') {
      return NextResponse.json(
        { error: 'new_project must be a boolean' },
        { status: 400 }
      );
    }

    const preferences: any = {};
    if (forum_reply !== undefined) {
      preferences.forum_reply = forum_reply;
    }
    if (new_project !== undefined) {
      preferences.new_project = new_project;
    }

    const { data, error } = await updateEmailPreferences(user.id, preferences);

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to update email preferences' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('Error in PUT /api/email-preferences:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

