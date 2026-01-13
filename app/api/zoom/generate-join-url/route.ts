import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';

// Generate secure Zoom join URL - only for authenticated premium users
export async function POST(request: NextRequest) {
  try {
    const { meetingNumber, userName, userEmail } = await request.json();

    if (!meetingNumber) {
      return NextResponse.json(
        { error: 'Missing required field: meetingNumber' },
        { status: 400 }
      );
    }

    // Check authentication
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    // Get user profile to check premium status
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*, roles:role_id (*)')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Check if user has live access (basic, premium, admin)
    const roleName = (profile.roles as any)?.name || (profile.roles as any)?.[0]?.name;
    const hasAccess = roleName === 'basic' || roleName === 'premium' || roleName === 'admin';
    
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied - Subscription required for live events' },
        { status: 403 }
      );
    }

    // Get meeting password from database (server-side only)
    // This ensures password is never exposed to client
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('zoom_meeting_id, zoom_meeting_password')
      .eq('zoom_meeting_id', meetingNumber)
      .maybeSingle();

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Meeting not found' },
        { status: 404 }
      );
    }

    // Update meeting settings to disable registration requirement
    // This ensures users can join directly without registration
    try {
      await fetch(`${request.nextUrl.origin}/api/zoom/update-meeting-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId: meetingNumber }),
      });
    } catch (err) {
      console.warn('Could not update meeting settings (this is OK):', err);
    }

    // Generate Zoom Web Client join URL
    // Using /wc/join/ endpoint which forces web client (no app redirect)
    const params = new URLSearchParams({
      role: '0', // 0 = participant
      uname: userName || profile.display_name || profile.first_name || 'משתמש',
      email: userEmail || session.user.email || '',
      browser: '1', // Force browser/web client
      // Note: Zoom will still ask for audio/video permissions - this is normal
      // User can enable them in the meeting or click "Continue without audio or video"
    });

    // Add password if exists (server-side only - never exposed to client)
    if (event.zoom_meeting_password) {
      params.append('pwd', event.zoom_meeting_password);
    }

    // Use /wc/join/ endpoint - this forces web client only (no app redirect)
    const joinUrl = `https://zoom.us/wc/join/${meetingNumber}?${params.toString()}`;

    return NextResponse.json({ 
      joinUrl,
      // Don't return password - it's already in the URL but not exposed separately
    });
  } catch (error: any) {
    console.error('Error generating Zoom join URL:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate join URL' },
      { status: 500 }
    );
  }
}

