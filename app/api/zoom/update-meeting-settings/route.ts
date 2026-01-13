import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Load environment variables manually if needed
function loadEnvVars() {
  if (!process.env.ZOOM_ACCOUNT_ID && !process.env.ZOOM_OAUTH_CLIENT_ID && !process.env.ZOOM_OAUTH_CLIENT_SECRET) {
    try {
      const envLocalPath = path.join(process.cwd(), '.env.local');
      if (fs.existsSync(envLocalPath)) {
        const envContent = fs.readFileSync(envLocalPath, 'utf-8');
        const envLines = envContent.split('\n');
        for (const line of envLines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const [key, ...valueParts] = trimmed.split('=');
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=').trim();
            if (key === 'ZOOM_ACCOUNT_ID' || key === 'ZOOM_OAUTH_CLIENT_ID' || key === 'ZOOM_OAUTH_CLIENT_SECRET') {
              process.env[key] = value;
            }
          }
        }
      }
    } catch (e) {
      console.error('Error loading .env.local:', e);
    }
  }
}

// Fetch access token from Zoom using Server-to-Server OAuth
async function getZoomAccessToken(): Promise<string> {
  loadEnvVars();

  const accountId = process.env.ZOOM_ACCOUNT_ID;
  const clientId = process.env.ZOOM_OAUTH_CLIENT_ID || process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_OAUTH_CLIENT_SECRET || process.env.ZOOM_CLIENT_SECRET;

  if (!accountId || !clientId || !clientSecret) {
    throw new Error('Missing Zoom credentials: ZOOM_ACCOUNT_ID, ZOOM_OAUTH_CLIENT_ID, or ZOOM_OAUTH_CLIENT_SECRET');
  }

  const authString = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  
  const params = new URLSearchParams();
  params.append('grant_type', 'account_credentials');
  params.append('account_id', accountId);

  const response = await fetch(`https://zoom.us/oauth/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${authString}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Failed to get access token details:', {
      status: response.status,
      statusText: response.statusText,
      error: errorText,
    });
    throw new Error(`Failed to get access token: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  if (!data.access_token) {
    throw new Error('No access token in response: ' + JSON.stringify(data));
  }
  
  return data.access_token;
}

// Update Zoom meeting settings to disable participant invites and registration
async function updateMeetingSettings(accessToken: string, meetingId: string) {
  const response = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      settings: {
        participants_can_invite_others: false, // Disable invite option - prevents users from inviting others
        approval_type: 2, // No registration required (0 = Automatically approve, 1 = Manually approve, 2 = No registration required)
        registration_type: 3, // No registration required (0 = Attendees register once, 1 = Register for each occurrence, 2 = Register once, 3 = No registration required)
        join_before_host: false, // Disable join before host - forces waiting room for unauthorized access
        waiting_room: true, // Enable waiting room - blocks app users, allows web users from our site
        allow_multiple_devices: true, // Allow multiple devices
        show_share_button: false, // Hide share button in meeting
        show_join_info: false, // Hide join info (meeting ID, password) from participants
        participants_can_rename: false, // Prevent participants from renaming themselves
        mute_upon_entry: false, // Don't mute participants on entry
        watermark: false, // Disable watermark (optional)
        // Additional security settings
        meeting_authentication: false, // We handle auth on our side
        authentication_option: '', // No additional auth required
        authentication_domains: '', // No domain restriction (we handle it)
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update meeting settings: ${response.status} ${errorText}`);
  }

  return await response.json();
}

export async function POST(request: NextRequest) {
  try {
    const { meetingId } = await request.json();

    if (!meetingId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Meeting ID is required',
        },
        { status: 400 }
      );
    }

    // Get access token
    const accessToken = await getZoomAccessToken();

    // Update meeting settings
    await updateMeetingSettings(accessToken, meetingId);

    return NextResponse.json({
      success: true,
      message: 'Meeting settings updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating Zoom meeting settings:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update meeting settings',
      },
      { status: 500 }
    );
  }
}

