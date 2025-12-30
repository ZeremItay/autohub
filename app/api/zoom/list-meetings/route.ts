import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

// Load environment variables manually if needed
function loadEnvVars() {
  if (!process.env.ZOOM_ACCOUNT_ID && !process.env.ZOOM_CLIENT_ID && !process.env.ZOOM_CLIENT_SECRET) {
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
            if (key === 'ZOOM_ACCOUNT_ID' || key === 'ZOOM_OAUTH_CLIENT_ID' || key === 'ZOOM_OAUTH_CLIENT_SECRET' || key === 'ZOOM_CLIENT_ID' || key === 'ZOOM_CLIENT_SECRET') {
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

// Generate JWT token for Zoom Server-to-Server OAuth
function generateZoomJWT(): string {
  loadEnvVars();

  // Use OAuth-specific credentials for API calls
  const clientId = process.env.ZOOM_OAUTH_CLIENT_ID || process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_OAUTH_CLIENT_SECRET || process.env.ZOOM_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing Zoom OAuth credentials: ZOOM_OAUTH_CLIENT_ID (or ZOOM_CLIENT_ID) or ZOOM_OAUTH_CLIENT_SECRET (or ZOOM_CLIENT_SECRET)');
  }

  const payload = {
    iss: clientId,
    exp: Math.floor(Date.now() / 1000) + 3600, // Token expires in 1 hour
  };

  const token = jwt.sign(payload, clientSecret, {
    algorithm: 'HS256',
  });

  return token;
}

// Fetch access token from Zoom using Server-to-Server OAuth
async function getZoomAccessToken(): Promise<string> {
  loadEnvVars();

  const accountId = process.env.ZOOM_ACCOUNT_ID;
  // Use OAuth-specific credentials if available, otherwise fall back to SDK credentials
  const clientId = process.env.ZOOM_OAUTH_CLIENT_ID || process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_OAUTH_CLIENT_SECRET || process.env.ZOOM_CLIENT_SECRET;

  if (!accountId || !clientId || !clientSecret) {
    throw new Error('Missing Zoom OAuth credentials: ZOOM_ACCOUNT_ID, ZOOM_OAUTH_CLIENT_ID (or ZOOM_CLIENT_ID), or ZOOM_OAUTH_CLIENT_SECRET (or ZOOM_CLIENT_SECRET)');
  }

  // Zoom Server-to-Server OAuth uses Basic Auth with account_credentials grant type
  const authString = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  
  // Use POST with form data
  const formData = new URLSearchParams();
  formData.append('grant_type', 'account_credentials');
  formData.append('account_id', accountId);

  const response = await fetch('https://zoom.us/oauth/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${authString}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Zoom OAuth error:', {
      status: response.status,
      statusText: response.statusText,
      error: errorText,
      accountId: accountId?.substring(0, 10) + '...',
      clientId: clientId?.substring(0, 10) + '...',
    });
    throw new Error(`Failed to get access token: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  if (!data.access_token) {
    throw new Error('No access token in response: ' + JSON.stringify(data));
  }
  
  return data.access_token;
}

// Fetch meetings from Zoom API
async function fetchZoomMeetings(accessToken: string) {
  const response = await fetch('https://api.zoom.us/v2/users/me/meetings?type=upcoming&page_size=100', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch meetings: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.meetings || [];
}

export async function GET(request: NextRequest) {
  try {
    // Get access token
    const accessToken = await getZoomAccessToken();

    // Fetch meetings
    const meetings = await fetchZoomMeetings(accessToken);

    // Format meetings for frontend
    const formattedMeetings = meetings.map((meeting: any) => ({
      id: meeting.id.toString(),
      topic: meeting.topic || 'Untitled Meeting',
      start_time: meeting.start_time,
      duration: meeting.duration,
      password: meeting.password || '',
      join_url: meeting.join_url,
      settings: meeting.settings || {},
    }));

    return NextResponse.json({
      success: true,
      meetings: formattedMeetings,
    });
  } catch (error: any) {
    console.error('Error fetching Zoom meetings:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch Zoom meetings',
      },
      { status: 500 }
    );
  }
}

